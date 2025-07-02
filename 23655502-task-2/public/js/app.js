// ===================== 데이터 로딩 =====================
let names = [];
let worker = null;
let workerReady = false;
let currentPage = 1;
let lastResults = [];
const PAGE_SIZE = 10;
let PAGE_BLOCK = getPageBlock();

function getPageBlock() {
    const w = window.innerWidth;
    if (w <= 480) return 4;
    if (w <= 800) return 6;
    return 10;
}
window.addEventListener('resize', () => {
    PAGE_BLOCK = getPageBlock();
    renderPagination(lastResults.length);
});

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

function setupWorker() {
    worker = new Worker('./js/searchWorker.js');
    worker.onmessage = function(e) {
        const { type, result } = e.data;
        if (type === 'ready') {
            workerReady = true;
            document.getElementById('searchInput').disabled = false;
            renderAutocomplete('');
            renderResults('');
        } else if (type === 'search') {
            lastResults = result;
            currentPage = 1;
            renderResultsList(result, 1);
            renderPagination(result.length);
        } else if (type === 'autocomplete') {
            renderAutocompleteOverlay(result, document.getElementById('searchInput').value);
        }
    };
    worker.postMessage({ type: 'init', payload: { names } });
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
    if (!workerReady) return;
    worker.postMessage({ type: 'search', payload: { query } });
}
function renderAutocomplete(query) {
    if (!workerReady) return;
    worker.postMessage({ type: 'autocomplete', payload: { query } });
}
function renderResultsList(filtered, page) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    if (filtered.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-results';
        li.textContent = document.getElementById('searchInput').value.trim() ? '검색 결과가 없습니다' : '검색어를 입력해주세요';
        resultsList.appendChild(li);
    } else {
        const start = ((page || 1) - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        filtered.slice(start, end).forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.onclick = () => showDetail(name);
            resultsList.appendChild(li);
        });
    }
}
function renderPagination(total) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (total <= PAGE_SIZE) return;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const blockIdx = Math.floor((currentPage - 1) / PAGE_BLOCK);
    const blockStart = blockIdx * PAGE_BLOCK + 1;
    const blockEnd = Math.min(blockStart + PAGE_BLOCK - 1, totalPages);

    // 이전 블록 버튼
    if (blockStart > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '<';
        prevBtn.onclick = () => {
            currentPage = blockStart - 1;
            renderResultsList(lastResults, currentPage);
            renderPagination(lastResults.length);
        };
        pagination.appendChild(prevBtn);
    }
    // 페이지 버튼
    for (let i = blockStart; i <= blockEnd; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.onclick = () => {
            currentPage = i;
            renderResultsList(lastResults, currentPage);
            renderPagination(lastResults.length);
        };
        pagination.appendChild(btn);
    }
    // 다음 블록 버튼
    if (blockEnd < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '>';
        nextBtn.onclick = () => {
            currentPage = blockEnd + 1;
            renderResultsList(lastResults, currentPage);
            renderPagination(lastResults.length);
        };
        pagination.appendChild(nextBtn);
    }
}
function renderAutocompleteOverlay(match, query) {
    const overlay = document.getElementById('autocompleteOverlay');
    overlay.innerHTML = '';
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
    document.getElementById('searchInput').disabled = true;
    await loadNames();
    setupWorker();
    const input = document.getElementById('searchInput');
    input.addEventListener('input', onInput);
}
document.addEventListener('DOMContentLoaded', init); 