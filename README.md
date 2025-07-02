# 과제 제출 - 23655502

## 지원자 정보
- **이름**: 김도영
- **연락처**: 010-2365-5502
- **이메일**: coby5502@gmail.com

## 프로젝트 개요

이 저장소는 두 개의 주요 과제를 포함하고 있습니다:

### Task 1: GPS 경로 매칭 시스템
**위치**: `23655502-task-1/`

**프로젝트 설명**:
- GPS 데이터와 OSM(OpenStreetMap) 도로 데이터를 활용한 경로 매칭 시스템
- GPS 포인트가 도로 위에 있는지, 역주행 중인지, 경로를 벗어났는지 판정
- 다양한 GPS 시나리오 지원:
  - 직진 경로 (straight01~04)
  - 좌회전/우회전 (left_turn, right_turn)
  - 역주행 (reverse_direction)
  - 멀티패스 (multipath)

**주요 기능**:
- OSM 파일 파싱 및 노드/웨이 정보 추출
- GPS 이상치 감지 (HDOP, 속도, 각도 기반)
- 도로 세그먼트와의 최소 거리 계산
- 실시간 경로 상태 판정 (ON ROUTE/REVERSE/ROUTE DEVIATION)

**기술 스택**:
- Python 3.x
- XML 파싱 (ElementTree)
- CSV 데이터 처리
- 수학적 계산 (거리, 각도)

### Task 2: 이름 검색 시스템
**위치**: `23655502-task-2/`

**프로젝트 설명**:
- 대용량 이름 데이터를 대상으로 한 실시간 검색 시스템
- 자동완성 기능과 페이지네이션 지원
- Web Worker를 활용한 비동기 검색 처리

**주요 기능**:
- 실시간 이름 검색 및 자동완성
- 대용량 데이터 처리 (Web Worker 활용)
- 반응형 페이지네이션
- 외부 API 연동 (나이 예측 서비스)
- 모바일 친화적 UI

**기술 스택**:
- HTML5, CSS3, JavaScript (ES6+)
- Web Workers (비동기 처리)
- Fetch API
- 반응형 웹 디자인

## 개발 환경
- **OS**: macOS (darwin 25.0.0)
- **Shell**: zsh
- **Python**: 3.x
- **브라우저**: 최신 웹 브라우저 (Web Worker 지원)