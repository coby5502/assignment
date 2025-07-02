// ===================== 데이터 로딩 =====================
let names = [];
async function loadNames() {
    try {
        const res = await fetch('./data/names.csv');
        if (!res.ok) throw new Error('No CSV');
        const text = await res.text();
        names = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    } catch (e) {
        // fallback: 기존 하드코딩 데이터
        names = `Alexander,Alice,Amanda,Andrew,Angela,Anna,Anthony,Ashley,Barbara,Benjamin,Betty,Brian,Carol,Charles,Christopher,Daniel,David,Deborah,Donald,Donna,Dorothy,Edward,Elizabeth,Emily,Emma,Eric,Frances,Frank,Gary,George,Helen,Henry,James,Jason,Jennifer,Jessica,John,Joseph,Joshua,Karen,Kimberly,Larry,Laura,Linda,Lisa,Margaret,Maria,Mark,Mary,Matthew,Michael,Michelle,Nancy,Nicole,Noah,Olivia,Patricia,Paul,Rachel,Rebecca,Richard,Robert,Ronald,Ruth,Sandra,Sarah,Scott,Sharon,Sophia,Stephen,Steven,Susan,Thomas,Timothy,Victoria,Virginia,Walter,Wayne,William,Abigail,Adam,Adrian,Albert,Andrea,Annie,Arthur,Austin,Brenda,Bruce,Carl,Catherine,Christine,Cynthia,Diane,Douglas,Eugene,Hannah,Harold,Isabella,Jack,Jacob,Jane,Janet,Jerry,Joan,Jonathan,Juan,Julie,Justin,Katherine,Keith,Kevin,Laura,Louis,Martha,Mason,Nathan,Noah,Peter,Ralph,Raymond,Roger,Ryan,Samantha,Sean,Shirley,Tyler,Virginia,Willie`.split(',').map(x => x.trim());
    }
}
// ===================== 검색/자동완성 로직 =====================
function filterNames(query) {
    if (!query.trim()) return [];
    return names.filter(name => name.toLowerCase().includes(query.toLowerCase()));
}
function autocompleteName(query) {
    if (!query.trim()) return null;
    return names.find(name => name.toLowerCase().startsWith(query.toLowerCase())) || null;
}
// ===================== 렌더링 함수 =====================
function renderResults(query) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    const filtered = filterNames(query);
    if (filtered.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-results';
        li.textContent = query.trim() ? '검색 결과가 없습니다' : '검색어를 입력해주세요';
        resultsList.appendChild(li);
    } else {
        filtered.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.onclick = () => showDetail(name);
            resultsList.appendChild(li);
        });
    }
}
function renderAutocomplete(query) {
    const overlay = document.getElementById('autocompleteOverlay');
    overlay.innerHTML = '';
    const match = autocompleteName(query);
    if (match && query.length > 0) {
        overlay.style.display = 'block';
        const prefix = document.createElement('span');
        prefix.style.color = 'transparent';
        prefix.textContent = query;
        overlay.appendChild(prefix);
        const hint = document.createElement('span');
        hint.className = 'autocomplete-hint';
        hint.textContent = match.slice(query.length);
        overlay.appendChild(hint);
    } else {
        overlay.style.display = 'none';
    }
}
// ===================== 상세 정보 모달 =====================
async function showDetail(name) {
    let info = '';
    try {
        const res = await fetch(`https://api.agify.io/?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        info = `예상 나이: ${data.age || '정보 없음'}<br>예상 샘플 수: ${data.count || '정보 없음'}`;
    } catch {
        info = '상세 정보를 불러올 수 없습니다.';
    }
    showModal(`<b>${name}</b><br>${info}`);
}
function showModal(html) {
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.onclick = () => { modal.remove(); };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class='modal-content'>${html}<br><button onclick='document.getElementById("modal").remove();event.stopPropagation();'>닫기</button></div>`;
}
// ===================== 이벤트 바인딩 및 초기화 =====================
function onInput(e) {
    const query = e.target.value;
    renderAutocomplete(query);
    renderResults(query);
}
async function init() {
    await loadNames();
    const input = document.getElementById('searchInput');
    input.addEventListener('input', onInput);
    renderAutocomplete('');
    renderResults('');
}
document.addEventListener('DOMContentLoaded', init); 