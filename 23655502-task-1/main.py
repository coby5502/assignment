import xml.etree.ElementTree as ET
import csv
import math
import os

# OSM 파일을 파싱하여 노드와 웨이 정보를 반환
def parse_osm(osm_path):
    """OSM 파일에서 노드와 웨이 정보를 파싱합니다."""
    nodes = {}
    ways = []
    tree = ET.parse(osm_path)
    root = tree.getroot()
    for node in root.findall('node'):
        nid = int(node.attrib['id'])
        lat = float(node.attrib['lat'])
        lon = float(node.attrib['lon'])
        nodes[nid] = (lat, lon)
    for way in root.findall('way'):
        way_id = int(way.attrib['id'])
        nds = [int(nd.attrib['ref']) for nd in way.findall('nd')]
        tags = {tag.attrib['k']: tag.attrib['v'] for tag in way.findall('tag')}
        ways.append({'id': way_id, 'nds': nds, 'tags': tags})
    return nodes, ways

# GPS CSV 파일을 읽어서 리스트로 반환
def load_gps_csv(csv_path):
    """GPS CSV 파일을 읽어 각 포인트를 리스트로 반환합니다."""
    gps_points = []
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            gps_points.append({
                'lat': float(row['Latitude']),
                'lon': float(row['Longitude']),
                'angle': float(row['Angle']),
                'speed': float(row['Speed (km/h)']),
                'hdop': float(row['HDOP'])
            })
    return gps_points

# 두 GPS 포인트(위경도) 사이의 거리(미터, 근사)를 계산
def point_distance(lat1, lon1, lat2, lon2):
    """위경도 두 점 사이의 거리(미터, 근사)를 계산합니다."""
    dx = (lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
    dy = lat2 - lat1
    return math.hypot(dx, dy) * 111000

# 점과 선분 사이의 최소거리(위경도 근사)
def point_to_segment_distance(px, py, x1, y1, x2, y2):
    """GPS 포인트와 도로 segment(선분) 사이의 최소 거리를 계산합니다."""
    dx, dy = x2-x1, y2-y1
    if dx == dy == 0:
        return math.hypot(px-x1, py-y1)
    t = max(0, min(1, ((px-x1)*dx + (py-y1)*dy) / (dx*dx + dy*dy)))
    proj_x, proj_y = x1 + t*dx, y1 + t*dy
    return math.hypot(px-proj_x, py-proj_y)

# 두 node로 segment 방향 각도(0~360, 북쪽 기준 시계방향)
def calculate_segment_angle(n1, n2):
    """도로 segment의 방향 각도를 계산합니다."""
    dy = n2[0] - n1[0]  # 위도 차이
    dx = n2[1] - n1[1]  # 경도 차이
    # 경도 차이를 위도에 맞게 보정
    dx = dx * math.cos(math.radians((n1[0] + n2[0]) / 2))
    angle = math.degrees(math.atan2(dx, dy))
    return (angle + 360) % 360

# speed(속도) 기반 이상치(OUTLIER) 감지
def is_speed_outlier(prev_gps, curr_gps, max_speed=180.0):
    """이전 GPS와의 실제 이동 속도 또는 기록된 speed가 max_speed를 초과하면 이상치로 간주."""
    if prev_gps is None:
        return False
    dist = point_distance(prev_gps['lat'], prev_gps['lon'], curr_gps['lat'], curr_gps['lon'])
    time_sec = 1  # 샘플링 주기(초)
    real_speed = (dist / 1000) / (time_sec / 3600)
    if curr_gps['speed'] > max_speed or real_speed > max_speed:
        return True
    return False

# GPS 오차(이상치) 예외처리: HDOP, 거리, speed, angle 모두 고려 (multipath 대응, 완화)
def is_gps_outlier(gps, matched_dist, hdop, prev_gps=None, max_dist=0.0007, max_hdop=2.0, max_angle_diff=120):
    """HDOP, 도로와의 거리, speed, angle이 기준을 벗어나면 이상치로 간주 (multipath 대응, 완화)."""
    if hdop > max_hdop:
        return True
    if matched_dist > max_dist:
        return True
    if is_speed_outlier(prev_gps, gps, max_speed=180.0):
        return True
    # angle 차이(직진인데 갑자기 급격히 꺾임 등)
    if prev_gps is not None:
        angle_diff = abs(gps['angle'] - prev_gps['angle'])
        angle_diff = min(angle_diff, 360 - angle_diff)
        if angle_diff > max_angle_diff:
            return True
    return False

# 공식 경로 way만 대상으로 가장 가까운 segment를 찾는 함수
def find_nearest_route_segment(gps, ways, nodes, route_way_ids):
    min_dist = float('inf')
    best = None
    for way in ways:
        if way['id'] not in route_way_ids:
            continue
        nds = way['nds']
        for i in range(len(nds)-1):
            if nds[i] not in nodes or nds[i+1] not in nodes:
                continue
            n1, n2 = nodes[nds[i]], nodes[nds[i+1]]
            dist = point_to_segment_distance(gps['lat'], gps['lon'], n1[0], n1[1], n2[0], n2[1])
            if dist < min_dist:
                min_dist = dist
                best = (way['id'], nds[i], nds[i+1], dist)
    return best

# 결과 출력 함수 (공식 경로 way만 각도 비교)
def print_matching_result(gps, nodes, prev_gps=None, ways=None, route_way_ids=None):
    """공식 경로 way만 각도 비교에 사용하여 ON ROUTE/REVERSE/ROUTE DEVIATION을 판정합니다."""
    # 공식 경로 way에서 가장 가까운 segment 찾기
    route_result = find_nearest_route_segment(gps, ways, nodes, route_way_ids)
    if route_result is not None:
        way_id, n1_id, n2_id, dist = route_result
        n1, n2 = nodes[n1_id], nodes[n2_id]
        segment_angle = calculate_segment_angle(n1, n2)  # 원래 도로 방향 사용
        diff = abs(gps['angle'] - segment_angle)
        diff = min(diff, 360 - diff)
        # 오차(OUTLIER) 판정
        if is_gps_outlier(gps, dist, gps['hdop'], prev_gps=prev_gps, max_dist=0.001, max_hdop=2.0, max_angle_diff=120):
            print(f"[OUTLIER] {gps['lat']:.6f},{gps['lon']:.6f}")
            return
        if dist <= 0.0006:
            if diff <= 140:  # multipath 대응
                print(f"[ON ROUTE] {gps['lat']:.6f},{gps['lon']:.6f}")
            elif 160 <= diff <= 200:  # 역주행 판정
                print(f"[REVERSE] {gps['lat']:.6f},{gps['lon']:.6f}")
            else:
                print(f"[ROUTE DEVIATION] {gps['lat']:.6f},{gps['lon']:.6f}")
        else:
            print(f"[ROUTE DEVIATION] {gps['lat']:.6f},{gps['lon']:.6f}")
    else:
        print(f"[ROUTE DEVIATION] {gps['lat']:.6f},{gps['lon']:.6f}")

# 데이터 로드 함수
def load_data(osm_path, gps_path):
    """OSM, GPS 파일을 읽어 파싱된 데이터 반환."""
    nodes, ways = parse_osm(osm_path)
    gps_points = load_gps_csv(gps_path)
    return nodes, ways, gps_points

# GPS 포인트 전체 처리 함수
def process_gps_points(gps_points, ways, nodes, route_way_ids):
    prev_gps = None
    for gps in gps_points:
        print_matching_result(gps, nodes, prev_gps=prev_gps, ways=ways, route_way_ids=route_way_ids)
        prev_gps = gps

# 메인 함수
def main():
    # 파일 경로 설정
    osm_path = os.path.join('data', 'roads.osm')
    gps_path = os.path.join('data', 'gps_straight01.csv')  # 필요시 파일명 변경
    # 데이터 로드
    nodes, ways, gps_points = load_data(osm_path, gps_path)
    print(f"Loaded {len(nodes)} nodes, {len(ways)} ways, {len(gps_points)} GPS points.")
    # 문제에서 제시한 경로선 way ID (1번~5번)
    route_way_ids = [
        521766182,
        990628459,
        472042763,
        218864485,
        520307304
    ]
    # GPS 포인트별로 처리
    process_gps_points(gps_points, ways, nodes, route_way_ids)

if __name__ == "__main__":
    main()