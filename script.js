const searchInput = document.getElementById('searchInput');
const gradeFilter = document.getElementById('gradeFilter');
const buildingFilter = document.getElementById('buildingFilter');
const floorFilter = document.getElementById('floorFilter');
const tagChips = document.getElementById('tagChips');
const stallGrid = document.getElementById('stallGrid');
const resultCount = document.getElementById('resultCount');
const currentFilters = document.getElementById('currentFilters');
const eventGrid = document.getElementById('eventGrid');
const resetBtn = document.getElementById('resetBtn');


let stalls = [];
let events = [];
let activeTag = '';

// Google 試算表 CSV 匯出網址
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C3Nxm5wBejO3-snx2KgbranXoaLPiHFmWvrb9Sf_CAs/gviz/tq?tqx=out:csv';

async function loadData() {
  try {
    // 同時讀取 Google 試算表與本地 events.json
    const [sheetsRes, eventsRes] = await Promise.all([
      fetch(SHEET_URL),
      fetch('./data/events.json')
    ]);

    if (!sheetsRes.ok) throw new Error('無法連線至 Google 試算表');
    if (!eventsRes.ok) throw new Error('events.json 載入失敗');

    const csvText = await sheetsRes.text();
    events = await eventsRes.json();

    // 解析 CSV 資料並轉換格式
    stalls = parseCSVToStalls(csvText);

    if (!Array.isArray(stalls)) stalls = [];
    if (!Array.isArray(events)) events = [];

    initFilters();
    renderTagChips();
    renderStalls();
    renderEvents();
  } catch (error) {
    console.error('資料同步失敗：', error);
    showErrorState(error.message);
  }
}

// 輔助函式：解析 CSV 並轉換為攤位格式
function parseCSVToStalls(csvText) {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  
  // 假設第一行是標題，從第二行開始處理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // 處理 CSV 欄位（考慮引號內可能有逗點的情況）
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    
    const grade = cols[0];
    const className = cols[1];
    const rawProducts = cols[2] || '';

    if (!grade || grade === '年級') continue;

    let displayName = '';
    let shortName = '';

    if (grade === '朝陽班') {
      displayName = '朝陽班';
      shortName = '朝陽';
    } else {
      const gNum = grade.replace(/[^0-9]/g, '');
      displayName = `${grade}${className}班`;
      shortName = `${gNum}-${className}`;
    }

    // 拆分產品 (依據數字編號、空格、逗點、頓號)
    const items = rawProducts
      .split(/[0-9]\.|\s+|，|、|,/)
      .map(item => item.trim())
      .filter(item => item !== '');

    // 自動判斷標籤
    const tags = [];
    if (/飲|水|茶|奶|汁|冰/.test(rawProducts)) tags.push('飲食');
    if (/遊戲|抽|套|圈|球|射|彈|戳|洞/.test(rawProducts)) tags.push('遊戲');
    if (/二手|拍|布偶|玩具|卡/.test(rawProducts)) tags.push('義賣');
    if (tags.length === 0) tags.push('其他');

    result.push({
      grade,
      class: className,
      displayName,
      shortName,
      rawProducts,
      items,
      tags,
      building: '待定', 
      floor: '待定',    
      estimatedRoomCode: '',
      estimatedLocationName: '請參考平面圖'
    });
  }
  return result;
}

function showErrorState(msg) {
  if (stallGrid) {
    stallGrid.innerHTML = `
      <div class="empty" style="grid-column:1/-1;">
        <div style="font-size:40px;">⚠️</div>
        <strong style="display:block; margin-top:8px; color:#4f473f;">資料同步失敗</strong>
        <div style="margin-top:6px;">錯誤訊息：${msg}</div>
        <div style="margin-top:12px; font-size:12px; color:var(--muted);">請確認網路連線或試算表共用設定。</div>
      </div>
    `;
  }
}

function uniqueValues(list, key) {
 return [...new Set(
 list
 .map(item => item?.[key])
 .filter(Boolean)
 )];
}

function populateSelect(select, values) {
 if (!select) return;
 values.forEach(value => {
 const option = document.createElement('option');
 option.value = value;
 option.textContent = value;
 select.appendChild(option);
 });
}

function normalizeKeyword(text) {
 return (text || '').trim().toLowerCase();
}

function parseClassKeyword(keyword) {
 const normalized = (keyword || '').replace(/\s+/g, '');
 const match = normalized.match(/^([3-6])[-－_]?([1-9])$/);
 if (!match) return null;

 return {
 displayName: `${match[1]}年級${match[2]}班`,
 shortName: `${match[1]}-${match[2]}`
 };
}

function initFilters() {
 populateSelect(gradeFilter, uniqueValues(stalls, 'grade'));
 populateSelect(buildingFilter, uniqueValues(stalls, 'building'));
 populateSelect(floorFilter, uniqueValues(stalls, 'floor'));
}

function renderTagChips() {
 if (!tagChips) return;

 const tags = [...new Set(
 stalls.flatMap(item => Array.isArray(item?.tags) ? item.tags : [])
 )];

 tagChips.innerHTML = '';

 const allChip = document.createElement('button');
 allChip.className = `chip ${activeTag === '' ? 'active' : ''}`;
 allChip.textContent = '全部類型';
 allChip.addEventListener('click', () => {
 activeTag = '';
 renderTagChips();
 renderStalls();
 });
 tagChips.appendChild(allChip);

 tags.forEach(tag => {
 const btn = document.createElement('button');
 btn.className = `chip ${activeTag === tag ? 'active' : ''}`;
 btn.textContent = tag;
 btn.addEventListener('click', () => {
 activeTag = activeTag === tag ? '' : tag;
 renderTagChips();
 renderStalls();
 });
 tagChips.appendChild(btn);
 });
}

function filterStalls() {
 const rawKeyword = searchInput?.value || '';
 const keyword = normalizeKeyword(rawKeyword);
 const classKeyword = parseClassKeyword(keyword);

 const grade = gradeFilter?.value || '';
 const building = buildingFilter?.value || '';
 const floor = floorFilter?.value || '';

 return stalls.filter(item => {
 const displayName = item?.displayName || '';
 const shortName = item?.shortName || '';
 const rawProducts = item?.rawProducts || '';
 const items = Array.isArray(item?.items) ? item.items : [];
 const estimatedRoomCode = item?.estimatedRoomCode || '';
 const estimatedLocationName = item?.estimatedLocationName || '';
 const itemFloor = item?.floor || '';
 const itemBuilding = item?.building || '';
 const tags = Array.isArray(item?.tags) ? item.tags : [];

 const keywordMatched =
 !keyword ||
 displayName.toLowerCase().includes(keyword) ||
 shortName.toLowerCase().includes(keyword) ||
 rawProducts.toLowerCase().includes(keyword) ||
 items.some(i => String(i).toLowerCase().includes(keyword)) ||
 estimatedRoomCode.toLowerCase().includes(keyword) ||
 estimatedLocationName.toLowerCase().includes(keyword) ||
 itemFloor.toLowerCase().includes(keyword) ||
 itemBuilding.toLowerCase().includes(keyword) ||
 (classKeyword && (
 displayName === classKeyword.displayName ||
 shortName === classKeyword.shortName
 ));

 const gradeMatched = !grade || item?.grade === grade;
 const buildingMatched = !building || itemBuilding === building;
 const floorMatched = !floor || itemFloor === floor;
 const tagMatched = !activeTag || tags.includes(activeTag);

 return keywordMatched && gradeMatched && buildingMatched && floorMatched && tagMatched;
 });
}

function updateCurrentFilters(filteredCount) {
 if (!currentFilters) return;

 const parts = [];

 const keyword = searchInput?.value?.trim() || '';
 const grade = gradeFilter?.value || '';
 const building = buildingFilter?.value || '';
 const floor = floorFilter?.value || '';

 if (keyword) parts.push(`關鍵字：${keyword}`);
 if (grade) parts.push(`年級：${grade}`);
 if (building) parts.push(`樓別：${building}`);
 if (floor) parts.push(`樓層：${floor}`);
 if (activeTag) parts.push(`類型：${activeTag}`);

 if (!parts.length) {
 currentFilters.textContent = `目前條件：全部（共 ${filteredCount} 筆）`;
 return;
 }

 currentFilters.textContent = `目前條件：${parts.join('／')}（共 ${filteredCount} 筆）`;
}

function renderStalls() {
 if (!stallGrid || !resultCount) return;

 const filtered = filterStalls();
 resultCount.textContent = `共 ${filtered.length} 筆`;
 updateCurrentFilters(filtered.length);

 if (!filtered.length) {
 stallGrid.innerHTML = `
 <div class="empty" style="grid-column:1/-1;">
 <div style="font-size:40px;">🔎</div>
 <strong style="display:block; margin-top:8px; color:#4f473f;">查無符合條件的攤位</strong>
 <div style="margin-top:6px;">試試看輸入 3-1、朝陽班、套圈圈、奶茶，或調整篩選條件。</div>
 </div>
 `;
 return;
 }

 stallGrid.innerHTML = filtered.map(item => {
 const tags = Array.isArray(item?.tags) ? item.tags : [];
 const items = Array.isArray(item?.items) ? item.items : [];

 return `
 <article class="card">
 <div class="card-top">
 <div class="title-wrap">
 <h4>${item?.displayName || ''}</h4>
 <p>${item?.shortName || ''}｜${item?.estimatedRoomCode || ''}｜${item?.estimatedLocationName || ''}</p>
 </div>
 </div>

 <div class="meta-list">
 <div class="meta-item">
 <span>樓別</span>
 <strong>${item?.building || ''}</strong>
 </div>
 <div class="meta-item">
 <span>樓層</span>
 <strong>${item?.floor || ''}</strong>
 </div>
 <div class="meta-item">
 <span>教室代碼</span>
 <strong>${item?.estimatedRoomCode || ''}</strong>
 </div>
 <div class="meta-item">
 <span>位置名稱</span>
 <strong>${item?.estimatedLocationName || ''}</strong>
 </div>
 </div>

 <div class="tags">
 ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
 </div>

 <div class="items">
 <strong>販賣／活動品項</strong>
 <ul>
 ${items.map(i => `<li>${i}</li>`).join('')}
 </ul>
 </div>
 </article>
 `;
 }).join('');
}

function renderEvents() {
 if (!eventGrid) return;

 if (!Array.isArray(events) || !events.length) {
 eventGrid.innerHTML = `
 <div class="empty" style="grid-column:1/-1;">
 <div style="font-size:36px;">📭</div>
 <strong style="display:block; margin-top:8px; color:#4f473f;">目前沒有其他已佔用場地資料</strong>
 </div>
 `;
 return;
 }

 eventGrid.innerHTML = events.map(event => `
 <article class="card">
 <div class="card-top">
 <div class="title-wrap">
 <h4>${event?.venue || ''}</h4>
 <p>${event?.unit || ''}</p>
 </div>
 <span class="pill pill-event">其他活動</span>
 </div>

 <div class="meta-list">
 <div class="meta-item">
 <span>開始時間</span>
 <strong>${event?.startTime || ''}</strong>
 </div>
 <div class="meta-item">
 <span>結束時間</span>
 <strong>${event?.endTime || ''}</strong> 
 </div>

 <div class="items">
 <strong>活動名稱</strong>
 <ul>
 <li>${event?.activityName || ''}</li>
 </ul>
 </div>
 </article>
 `).join('');
}

function resetFilters() {
 if (searchInput) searchInput.value = '';
 if (gradeFilter) gradeFilter.value = '';
 if (buildingFilter) buildingFilter.value = '';
 if (floorFilter) floorFilter.value = '';
 activeTag = '';
 renderTagChips();
 renderStalls();
}

[searchInput, gradeFilter, buildingFilter, floorFilter].forEach(el => {
 if (!el) return;
 el.addEventListener('input', renderStalls);
 el.addEventListener('change', renderStalls);
});

if (resetBtn) {
 resetBtn.addEventListener('click', resetFilters);
}

loadData();

// 回到最上方按鈕邏輯
const backToTopButton = document.getElementById('backToTopBtn');
if (backToTopButton) {
 backToTopButton.onclick = function () {
 window.scrollTo({
 top: 0,
 behavior: 'smooth'
 });
 };
}
