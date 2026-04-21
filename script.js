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

// Google 試算表 CSV 匯出網址 (請確保試算表已設定為「知道連結的人即可檢視」)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C3Nxm5wBejO3-snx2KgbranXoaLPiHFmWvrb9Sf_CAs/gviz/tq?tqx=out:csv';

const CLASS_LOCATION_MAP = {
  "3-1": { "building": "書香樓", "floor": "三樓", "room": "A309" },
  "3-2": { "building": "書香樓", "floor": "三樓", "room": "A308" },
  "3-3": { "building": "書香樓", "floor": "三樓", "room": "A307" },
  "3-4": { "building": "書香樓", "floor": "三樓", "room": "A306" },
  "3-5": { "building": "書香樓", "floor": "三樓", "room": "A305" },
  "3-6": { "building": "書香樓", "floor": "三樓", "room": "A304" },
  "3-7": { "building": "書香樓", "floor": "三樓", "room": "A303" },
  "3-8": { "building": "書香樓", "floor": "四樓", "room": "A403" },
  "4-1": { "building": "書香樓", "floor": "四樓", "room": "A404" },
  "4-2": { "building": "書香樓", "floor": "四樓", "room": "A405" },
  "4-3": { "building": "書香樓", "floor": "四樓", "room": "A406" },
  "4-4": { "building": "書香樓", "floor": "四樓", "room": "A407" },
  "4-5": { "building": "書香樓", "floor": "四樓", "room": "A408" },
  "4-6": { "building": "書香樓", "floor": "四樓", "room": "A409" },
  "4-7": { "building": "星空樓", "floor": "一樓", "room": "B401" },
  "4-8": { "building": "星空樓", "floor": "二樓", "room": "B402" },
  "5-1": { "building": "星空樓", "floor": "二樓", "room": "B403" },
  "5-2": { "building": "星空樓", "floor": "三樓", "room": "B408" },
  "5-3": { "building": "星空樓", "floor": "四樓", "room": "B409" },
  "5-4": { "building": "星空樓", "floor": "五樓", "room": "B410" },
  "5-5": { "building": "星空樓", "floor": "五樓", "room": "B510" },
  "5-6": { "building": "星空樓", "floor": "四樓", "room": "B509" },
  "5-7": { "building": "星空樓", "floor": "三樓", "room": "B508" },
  "5-8": { "building": "星空樓", "floor": "一樓", "room": "B503" },
  "5-9": { "building": "星空樓", "floor": "一樓", "room": "B502" },
  "6-1": { "building": "星空樓", "floor": "一樓", "room": "B501" },
  "6-2": { "building": "書香樓", "floor": "五樓", "room": "A509" },
  "6-3": { "building": "星空樓", "floor": "一樓", "room": "B102" },
  "6-4": { "building": "書香樓", "floor": "五樓", "room": "A508" },
  "6-5": { "building": "書香樓", "floor": "五樓", "room": "A507" },
  "6-6": { "building": "書香樓", "floor": "五樓", "room": "A506" },
  "6-7": { "building": "書香樓", "floor": "五樓", "room": "A505" },
  "6-8": { "building": "書香樓", "floor": "五樓", "room": "A504" },
  "6-9": { "building": "書香樓", "floor": "五樓", "room": "A503" },
  "朝陽": { "building": "星空樓", "floor": "二樓", "room": "B202" }
};

async function loadData() {
  console.log('正在嘗試載入資料...');
  try {
    const [sheetsRes, eventsRes] = await Promise.all([
      fetch(SHEET_URL),
      fetch('./data/events.json')
    ]);

    if (!sheetsRes.ok) throw new Error(`Google 試算表連線失敗 (HTTP ${sheetsRes.status})`);
    if (!eventsRes.ok) throw new Error(`events.json 載入失敗 (HTTP ${eventsRes.status})`);

    const csvText = await sheetsRes.text();
    console.log('成功獲取 CSV 資料，長度：', csvText.length);
    
    try {
      events = await eventsRes.json();
    } catch (e) {
      console.error('events.json 格式錯誤', e);
      events = [];
    }

    stalls = parseCSVToStalls(csvText);
    console.log('解析完成，攤位總數：', stalls.length);

    if (stalls.length === 0) {
      throw new Error('試算表內容解析後為空，請檢查試算表欄位順序。');
    }

    initFilters();
    renderTagChips();
    renderStalls();
    renderEvents();
  } catch (error) {
    console.error('主程式錯誤：', error);
    showErrorState(error.message);
  }
}

function parseCSVToStalls(csvText) {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    
    const grade = cols[0];
    const className = cols[1];
    const rawProducts = cols[2] || '';

    if (!grade || grade === '年級') continue;

    let displayName = '';
    let shortName = '';

    if (grade === '朝陽班' || grade.includes('朝陽')) {
      displayName = '朝陽班';
      shortName = '朝陽';
    } else {
      const gNum = grade.replace(/[^0-9]/g, '');
      displayName = `${grade}${className}班`;
      shortName = `${gNum}-${className}`;
    }

    const loc = CLASS_LOCATION_MAP[shortName] || { building: '待定', floor: '待定', room: '' };
    const items = rawProducts.split(/[0-9]\.|\s+|，|、|,/).map(item => item.trim()).filter(Boolean);

    const tags = [];
    if (/飲|水|茶|奶|汁/.test(rawProducts)) tags.push('飲料');
    if (/冰|凍/.test(rawProducts)) tags.push('冰品');
    if (/餅乾|蛋|豆干|捲|麵|糖|米粉/.test(rawProducts)) tags.push('食物');
    if (/布蕾|奶酪|甜甜圈|鬆餅/.test(rawProducts)) tags.push('甜點'); // 修正：此處原為 .push 誤植
    if (/遊戲|抽|套|圈|球|射|彈|戳|洞|扭蛋/.test(rawProducts)) tags.push('遊戲');
    if (/二手|拍|布偶|娃娃|玩具|卡/.test(rawProducts)) tags.push('義賣');
    if (tags.length === 0) tags.push('其他');

    result.push({
      grade,
      class: className,
      displayName,
      shortName,
      rawProducts,
      items,
      tags: [...new Set(tags)],
      building: loc.building,
      floor: loc.floor,
      estimatedRoomCode: loc.room,
      estimatedLocationName: loc.room ? `${shortName} 教室` : '請參考平面圖'
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
        <div style="margin-top:6px;">${msg}</div>
        <div style="margin-top:12px; font-size:12px; color:var(--muted);">請確認：<br>1. 網路連線是否正常<br>2. 試算表共用設定是否改為「知道連結的人即可檢視」<br>3. 試算表是否已執行「發布到網路」</div>
      </div>
    `;
  }
}

function uniqueValues(list, key) {
  return [...new Set(list.map(item => item?.[key]).filter(Boolean))];
}

function populateSelect(select, values) {
  if (!select) return;
  values.sort().forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function initFilters() {
  if (gradeFilter) gradeFilter.innerHTML = '<option value="">全部年級</option>';
  if (buildingFilter) buildingFilter.innerHTML = '<option value="">全部樓別</option>';
  if (floorFilter) floorFilter.innerHTML = '<option value="">全部樓層</option>';
  
  populateSelect(gradeFilter, uniqueValues(stalls, 'grade'));
  populateSelect(buildingFilter, uniqueValues(stalls, 'building'));
  populateSelect(floorFilter, uniqueValues(stalls, 'floor'));
}

function renderTagChips() {
  if (!tagChips) return;
  const tags = [...new Set(stalls.flatMap(item => item.tags))];
  tagChips.innerHTML = '';
  const allChip = createChip('全部類型', '');
  tagChips.appendChild(allChip);
  tags.forEach(tag => tagChips.appendChild(createChip(tag, tag)));
}

function createChip(text, value) {
  const btn = document.createElement('button');
  btn.className = `chip ${activeTag === value ? 'active' : ''}`;
  btn.textContent = text;
  btn.onclick = () => { activeTag = value; renderTagChips(); renderStalls(); };
  return btn;
}

function filterStalls() {
  const keyword = (searchInput?.value || '').trim().toLowerCase();
  const grade = gradeFilter?.value || '';
  const building = buildingFilter?.value || '';
  const floor = floorFilter?.value || '';

  return stalls.filter(item => {
    const matchedKeyword = !keyword || 
      item.displayName.toLowerCase().includes(keyword) || 
      item.shortName.toLowerCase().includes(keyword) ||
      item.rawProducts.toLowerCase().includes(keyword) ||
      item.estimatedRoomCode.toLowerCase().includes(keyword);
    
    return matchedKeyword && 
           (!grade || item.grade === grade) && 
           (!building || item.building === building) && 
           (!floor || item.floor === floor) && 
           (!activeTag || item.tags.includes(activeTag));
  });
}

function renderStalls() {
  if (!stallGrid || !resultCount) return;
  const filtered = filterStalls();
  resultCount.textContent = `共 ${filtered.length} 筆`;
  
  if (!filtered.length) {
    stallGrid.innerHTML = '<div class="empty" style="grid-column:1/-1;">🔎 查無符合條件的攤位</div>';
    return;
  }

  stallGrid.innerHTML = filtered.map(item => `
    <article class="card">
      <div class="card-top">
        <div class="title-wrap">
          <h4>${item.displayName}</h4>
          <p>${item.shortName}｜${item.estimatedRoomCode}｜${item.estimatedLocationName}</p>
        </div>
      </div>
      <div class="meta-list">
        <div class="meta-item"><span>樓別</span><strong>${item.building}</strong></div>
        <div class="meta-item"><span>樓層</span><strong>${item.floor}</strong></div>
      </div>
      <div class="tags">${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="items">
        <strong>販賣／活動品項</strong>
        <ul>${item.items.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
    </article>
  `).join('');
}

function renderEvents() {
  if (!eventGrid || !events.length) return;
  eventGrid.innerHTML = events.map(event => `
    <article class="card">
      <div class="card-top">
        <div class="title-wrap">
          <h4>${event.venue}</h4>
          <p>${event.unit}</p>
        </div>
        <span class="pill pill-event">其他活動</span>
      </div>
      <div class="meta-list">
        <div class="meta-item"><span>時間</span><strong>${event.startTime}-${event.endTime}</strong></div>
      </div>
      <div class="items">
        <strong>活動名稱</strong>
        <ul><li>${event.activityName}</li></ul>
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
  el?.addEventListener('input', renderStalls);
  el?.addEventListener('change', renderStalls);
});

resetBtn?.addEventListener('click', resetFilters);

loadData();

const backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) {
  backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}
