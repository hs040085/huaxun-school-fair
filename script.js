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

const mapMarker = document.getElementById('map-marker');
const markerText = document.getElementById('marker-text');
const mapHint = document.getElementById('map-hint');

let stalls = [];
let events = [];
let activeTag = '';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1C3Nxm5wBejO3-snx2KgbranXoaLPiHFmWvrb9Sf_CAs/gviz/tq?tqx=out:csv';

/**
 * 全校教室總表
 */
const FULL_SCHOOL_REGISTRY = {
  "6-2":"A509", "6-4":"A508", "6-5":"A507", "6-6":"A506", "6-7":"A505", "6-8":"A504", "6-9":"A503",
  "4-6":"A409", "4-5":"A408", "4-4":"A407", "4-3":"A406", "4-2":"A405", "4-1":"A404", "3-8":"A403",
  "3-1":"A309", "3-2":"A308", "3-3":"A307", "3-4":"A306", "3-5":"A305", "3-6":"A304", "3-7":"A303",
  "A209":"A209", "A208":"A208", "A207":"A207", "A206":"A206", "A205":"A205", "A204":"A204", "A203":"A203",
  "A109":"A109", "A108":"A108", "A107":"A107", "A106":"A106", "A105":"A105", "A104":"A104", "A103":"A103",
  "5-5":"B510", "5-6":"B509", "5-7":"B508", "5-8":"B503", "5-9":"B502", "6-1":"B501",
  "5-4":"B410", "5-3":"B409", "5-2":"B408", "5-1":"B403", "4-8":"B402", "4-7":"B401",
  "2-8":"B310", "2-7":"B309", "2-6":"B308", "2-5":"B307", "2-4":"B304", "2-3":"B303", "2-2":"B302", "2-1":"B301",
  "1-5":"B110", "1-4":"B109", "1-3":"B108", "1-2":"B104", "1-1":"B103", "6-3":"B102",
  "1-6":"B210", "1-7":"B209", "朝陽":"B202",
  "C503":"C503", "C502":"C502", "C501":"C501", "C403":"C403", "C402":"C402", "C401":"C401",
  "C303":"C303", "C302":"C302", "C301":"C301", "C203":"C203", "C202":"C202", "C201":"C201",
  "C103":"C103", "C102":"C102", "C101":"C101",
  "D401":"D401", "D402":"D402", "D403":"D403", "D404":"D404", "D405":"D405", "D406":"D406",
  "D301":"D301", "D302":"D302", "D303":"D303", "D304":"D304", "D305":"D305", "D306":"D306", "D307":"D307", "D308":"D308",
  "D201":"D201", "D202":"D202", "D203":"D203", "D204":"D204", "D205":"D205", "D206":"D206", "D207":"D207", "D208":"D208",
  "D101":"D101", "D102":"D102", "D103":"D103", "D104":"D104", "D105":"D105", "D106":"D106", "D107":"D107", "D108":"D108"
};

const BUILDING_NAMES = { "A": "書香樓", "B": "星空樓", "C": "星空樓", "D": "樂動樓" };
const FLOOR_NAMES = { "1": "一樓", "2": "二樓", "3": "三樓", "4": "四樓", "5": "五樓" };

/**
 * 核心功能：計算精確座標
 */
function getRoomCoordinates(roomCode) {
  const b = roomCode.charAt(0).toUpperCase();
  const f = parseInt(roomCode.charAt(1));
  const r = parseInt(roomCode.substring(2));

  // --- 書香樓 (A) ---
  if (b === 'A') {
    const yMap = { 1: 86.0, 2: 81.0, 3: 77.6, 4: 73.4, 5: 69.8 };
    return { x: 7.8, y: yMap[f] || 81.0, w: 84.4, h: 4.2 };
  }

  // --- 星空樓 (B - 左直列) ---
  if (b === 'B') {
    const xMap = { 1: 35.5, 2: 29.2, 3: 22.9, 4: 16.6, 5: 10.3 };
    return { x: xMap[f] || 20, y: 26.5, w: 6.3, h: 40.0 };
  }

  // --- 星空樓 (C - 右側區域) ---
  if (b === 'C') {
    // 使用者要求：直接框住整個 C 棟區域
    return { x: 53.8, y: 26.5, w: 32.5, h: 38.5 };
  }

  // --- 樂動樓 (D - 上方) ---
  if (b === 'D') {
    const yMapD = { 4: 4.5, 3: 8.2, 2: 12.2, 1: 16.8 }; // 精確跳動座標
    return { x: 7.8, y: yMapD[f] || 4.5, w: 84.4, h: 4.5 };
  }

  return null;
}

/**
 * 預設班級資料 (備援方案)
 */
const DEFAULT_STALLS_DATA = [
  {"shortName":"3-1","tags":["甜點","玩具","遊戲"],"items":["棉花糖","盲盒","抽抽樂","手工餅乾"]},
  {"shortName":"3-2","tags":["飲料","食物","甜點","遊戲"],"items":["檸檬水","香蕉牛奶","手工餅乾","糖葫蘆"]},
  {"shortName":"3-3","tags":["飲料","食物","遊戲"],"items":["飲料","餅乾","遊戲"]},
  {"shortName":"3-4","tags":["遊戲","布偶娃娃"],"items":["抽抽樂","射擊遊戲","套圈圈","布偶"]},
  {"shortName":"3-5","tags":["遊戲"],"items":["多樣遊戲項目"]},
  {"shortName":"3-6","tags":["飲料","食物"],"items":["飲料","餅乾","糖果"]},
  {"shortName":"3-7","tags":["飲料","食物","遊戲"],"items":["珍珠奶茶","茶葉蛋","滷豆干","戳戳樂"]},
  {"shortName":"3-8","tags":["甜點","遊戲"],"items":["棉花糖","洞洞樂","童玩"]},
  {"shortName":"4-1","tags":["遊戲","飲料","甜點"],"items":["射擊遊戲","乒乓球","布丁奶茶"]},
  {"shortName":"4-2","tags":["二手商品","冰品","飲料"],"items":["二手商品","冰淇淋","飲料"]},
  {"shortName":"4-3","tags":["食物","遊戲"],"items":["手工餅乾","寶可夢卡","抽抽樂","打彈珠"]},
  {"shortName":"4-4","tags":["食物","甜點","飲料"],"items":["甜甜圈","鬆餅","紅茶","冬瓜茶"]},
  {"shortName":"4-5","tags":["二手商品","玩具"],"items":["二手物品","遊戲卡","飲品","小玩具"]},
  {"shortName":"4-6","tags":["飲料","食物","甜點"],"items":["梅子可樂","茶葉蛋","冬瓜茶","杯子蛋糕"]},
  {"shortName":"4-7","tags":["遊戲"],"items":["套圈圈","戳戳樂"]},
  {"shortName":"4-8","tags":["甜點","遊戲"],"items":["奶酪","保齡球","許願池","乒乓球"]},
  {"shortName":"5-1","tags":["玩具","遊戲"],"items":["玩具","娃娃","桌球遊戲"]},
  {"shortName":"5-2","tags":["遊戲","冰品","飲料"],"items":["保齡球","DIY冰沙","飲料","果凍"]},
  {"shortName":"5-3","tags":["食物","遊戲"],"items":["飲食","遊戲"]},
  {"shortName":"5-4","tags":["飲料","食物","遊戲"],"items":["乾冰汽水","糖果","卡牌","套圈圈"]},
  {"shortName":"5-5","tags":["二手商品"],"items":["二手商品"]},
  {"shortName":"5-6","tags":["飲料","食物"],"items":["飲料","點心"]},
  {"shortName":"5-7","tags":["食物","飲料","遊戲"],"items":["墨西哥捲","冰淇淋","套圈圈"]},
  {"shortName":"5-8","tags":["二手商品","飲料","遊戲"],"items":["泰式奶茶","拼豆","抽抽樂"]},
  {"shortName":"5-9","tags":["遊戲","飲料"],"items":["套圈圈","冬瓜茶"]},
  {"shortName":"6-1","tags":["飲料","食物"],"items":["飲料","糖果","餅乾"]},
  {"shortName":"6-2","tags":["遊戲","飲料","玩具"],"items":["套圈圈","飲料","盲盒"]},
  {"shortName":"6-3","tags":["冰品","食物"],"items":["冰棒","餅乾","髮飾"]},
  {"shortName":"6-4","tags":["飲料","食物"],"items":["飲料","餅乾"]},
  {"shortName":"6-5","tags":["二手商品","飲料"],"items":["二手商品","手作小物","飲料"]},
  {"shortName":"6-6","tags":["遊戲","飲料"],"items":["戳戳樂","飲料","卡片"]},
  {"shortName":"6-7","tags":["飲料","遊戲"],"items":["飲料","遊戲"]},
  {"shortName":"6-8","tags":["飲料","冰品"],"items":["飲料","冰品"]},
  {"shortName":"6-9","tags":["遊戲","食物"],"items":["遊戲","炒米粉","棉花糖"]},
  {"shortName":"朝陽","tags":["甜點","玩具","飲料"],"items":["布蕾","奶酪","扭蛋","蝶豆花汽水"]}
];

/**
 * 預設活動資料 (備援方案)
 */
const DEFAULT_EVENTS_DATA = [
  { "id": "event-001", "unit": "學務處、輔導室", "venue": "英語情境教室", "activityName": "健康促進學校有獎徵答活動、「心手相連」親子闖關體驗活動", "startTime": "10:00", "endTime": "11:00" },
  { "id": "event-002", "unit": "教務處", "venue": "C401", "activityName": "Nga'ay ho! 太陽的部落（阿美族）", "startTime": "09:30", "endTime": "11:30" },
  { "id": "event-003", "unit": "教務處", "venue": "B404", "activityName": "台語大賣場（閩語）", "startTime": "09:30", "endTime": "11:30" },
  { "id": "event-004", "unit": "教務處", "venue": "C403", "activityName": "客家米食文化闖關（客語）", "startTime": "09:30", "endTime": "11:30" },
  { "id": "event-005", "unit": "元智", "venue": "星空樓川堂", "activityName": "國際暨本土多元文化闖關體驗活動（含元智國際文化、印尼、泰國文化體驗及 SEL 親子抓寶）", "startTime": "09:30", "endTime": "11:30" }
];

async function loadData() {
  if (resultCount) resultCount.textContent = '載入中...';
  try {
    const [sheetsRes, eventsRes] = await Promise.all([
      fetch(SHEET_URL).catch(() => null),
      fetch('./data/events.json').catch(() => null)
    ]);

    let csvData = [];
    if (sheetsRes && sheetsRes.ok) {
      const csvText = await sheetsRes.text();
      if (csvText && !csvText.includes('<!doctype html>')) {
        csvData = parseCSVToData(csvText);
      }
    }

    // 優先使用本地 JSON，失敗則使用內建 DEFAULT_EVENTS_DATA
    try {
      events = (eventsRes && eventsRes.ok) ? await eventsRes.json() : DEFAULT_EVENTS_DATA;
    } catch(e) {
      events = DEFAULT_EVENTS_DATA;
    }

    stalls = mergeRegistryWithData(csvData, DEFAULT_STALLS_DATA);
    
    renderAll();
  } catch (error) {
    console.error("資料解析出錯:", error);
    events = DEFAULT_EVENTS_DATA;
    stalls = mergeRegistryWithData([], DEFAULT_STALLS_DATA);
    renderAll();
  }
}

function parseCSVToData(csvText) {
  const lines = csvText.split(/\r?\n/);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    if (cols[0]) {
      data.push({ grade: cols[0], class: cols[1] || "", rawProducts: cols[2] || "" });
    }
  }
  return data;
}

function mergeRegistryWithData(csvData, localData) {
  const merged = [];
  const csvMap = {};
  csvData.forEach(item => {
    let sName = item.grade.includes('朝陽') ? '朝陽' : `${item.grade.replace(/[^0-9]/g, '')}-${item.class}`;
    csvMap[sName] = item;
  });

  const localMap = {};
  localData.forEach(s => localMap[s.shortName] = s);

  Object.keys(FULL_SCHOOL_REGISTRY).forEach(shortName => {
    const roomCode = FULL_SCHOOL_REGISTRY[shortName];
    const bLetter = roomCode.charAt(0).toUpperCase();
    const fDigit = roomCode.charAt(1);
    const csvItem = csvMap[shortName];
    const localItem = localMap[shortName];

    let grade = shortName.includes('-') ? `${shortName.split('-')[0]}年級` : (shortName === '朝陽' ? '朝陽班' : '校園位置');
    let className = shortName.includes('-') ? shortName.split('-')[1] : '';
    
    // 產品資料整合
    const rawProducts = csvItem ? csvItem.rawProducts : (localItem ? "備援資料: " + localItem.items.join('、') : "（目前無設攤資訊）");
    let items = csvItem ? rawProducts.split(/[0-9]\.|\s+|，|、|,/).map(i => i.trim()).filter(Boolean) : (localItem ? localItem.items : []);

    // 標籤邏輯
    let tags = (localItem && localItem.tags) ? [...localItem.tags] : [];
    if (csvItem && rawProducts) {
      if (rawProducts.match(/飲|奶茶|可樂|水|汁|茶/)) if(!tags.includes("飲料")) tags.push("飲料");
      if (rawProducts.match(/戲|抽|戳|彈珠|射|套圈|桌球|保齡球/)) if(!tags.includes("遊戲")) tags.push("遊戲");
      if (rawProducts.match(/餅乾|糖|棉花糖|布蕾|奶酪|蛋糕|鬆餅/)) if(!tags.includes("甜點")) tags.push("甜點");
      if (rawProducts.match(/二手|拍賣/)) if(!tags.includes("二手商品")) tags.push("二手商品");
    }
    
    merged.push({
      grade, class: className, displayName: shortName.includes('-') ? `${grade}${className}班` : shortName,
      shortName, rawProducts, items, tags,
      building: BUILDING_NAMES[bLetter] || "待定",
      floor: FLOOR_NAMES[fDigit] || "待定",
      estimatedRoomCode: roomCode,
      hasStall: !!csvItem || !!localItem
    });
  });
  return merged;
}

function renderAll() {
  initFilters();
  renderTagChips();
  renderStalls();
  renderEvents();
}

function highlightOnMap(roomCode, shortName) {
  if (!mapMarker || !roomCode) return;
  const coord = getRoomCoordinates(roomCode);
  if (!coord) { mapMarker.style.display = 'none'; return; }

  mapMarker.style.display = 'block';
  mapMarker.style.left = coord.x + '%';
  mapMarker.style.top = coord.y + '%';
  mapMarker.style.width = coord.w + '%';
  mapMarker.style.height = coord.h + '%';
  
  const bName = BUILDING_NAMES[roomCode.charAt(0)];
  const fName = FLOOR_NAMES[roomCode.charAt(1)];
  
  if (markerText) markerText.textContent = (roomCode.startsWith('C')) ? `${bName} C 棟` : `${bName} ${fName}`;
  if (mapHint) mapHint.innerHTML = `已定位 <strong>${shortName}</strong> (${roomCode})`;
  
  document.getElementById('map-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderStalls() {
  if (!stallGrid || !resultCount) return;
  const filtered = stalls.filter(item => {
    const k = (searchInput?.value || '').trim().toLowerCase();
    
    // 強化搜尋比對：包含班級名稱、簡稱、教室編號(轉小寫比對)、以及產品內容
    const matched = !k || 
      item.displayName.toLowerCase().includes(k) || 
      item.shortName.toLowerCase().includes(k) || 
      item.estimatedRoomCode.toLowerCase().includes(k) ||
      item.rawProducts.toLowerCase().includes(k);

    const matchGrade = !gradeFilter.value || item.grade === gradeFilter.value;
    const matchBuilding = !buildingFilter.value || item.building === buildingFilter.value;
    const matchFloor = !floorFilter.value || item.floor === floorFilter.value;
    const matchTag = !activeTag || (item.tags && item.tags.includes(activeTag));

    return matched && matchGrade && matchBuilding && matchFloor && matchTag;
  });

  resultCount.textContent = `共 ${filtered.length} 筆`;
  
  if (filtered.length === 0) {
    stallGrid.innerHTML = '<div class="empty">找不到符合條件的攤位 🔍</div>';
    return;
  }

  stallGrid.innerHTML = filtered.map(item => `
    <article class="card ${item.hasStall ? '' : 'no-stall'}" onclick="highlightOnMap('${item.estimatedRoomCode}', '${item.displayName}')" style="cursor:pointer; border-style: ${item.hasStall ? 'solid' : 'dashed'};">
      <div class="card-top">
        <div class="title-wrap">
          <h4>${item.displayName}</h4>
          <p>${item.shortName}｜${item.estimatedRoomCode}</p>
        </div>
        <span class="pill">${item.hasStall ? '看位置' : '找教室'}</span>
      </div>
      
      <div class="meta-list">
        <div class="meta-item"><span>樓別</span><strong>${item.building}</strong></div>
        <div class="meta-item"><span>樓層</span><strong>${item.floor}</strong></div>
      </div>

      ${item.tags && item.tags.length > 0 ? `
        <div class="tags">
          ${item.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
        </div>
      ` : ''}

      <div class="items">
        <strong>販賣品項 / 活動</strong>
        <ul>
          ${item.items.length > 0 ? 
            item.items.map(i => `<li>${i}</li>`).join('') : 
            `<li>${item.rawProducts}</li>`}
        </ul>
      </div>
    </article>
  `).join('');

  if (filtered.length === 1) {
    setTimeout(() => highlightOnMap(filtered[0].estimatedRoomCode, filtered[0].displayName), 200);
  }
}

function renderEvents() {
  if (!eventGrid || !events.length) return;
  eventGrid.innerHTML = events.map(event => {
    const canLocate = event.venue.match(/[A-D][1-5][0-9]{2}/);
    const roomCode = canLocate ? canLocate[0] : null;
    return `
      <article class="card card-event" ${roomCode ? `onclick="highlightOnMap('${roomCode}', '${event.venue}')" style="cursor:pointer;"` : ''}>
        <div class="card-top">
          <div class="title-wrap"><h4>${event.venue}</h4><p>${event.unit}</p></div>
          <span class="pill pill-event">${roomCode ? '看位置' : '其他活動'}</span>
        </div>
        <div class="meta-list"><div class="meta-item"><span>時間</span><strong>${event.startTime}-${event.endTime}</strong></div></div>
        <div class="items"><strong>活動名稱</strong><ul><li>${event.activityName}</li></ul></div>
      </article>
    `;
  }).join('');
}

function initFilters() {
  const grades = [...new Set(stalls.map(s => s.grade))].sort();
  gradeFilter.innerHTML = '<option value="">全部年級</option>';
  grades.forEach(v => gradeFilter.add(new Option(v, v)));
  buildingFilter.innerHTML = '<option value="">全部樓別</option>';
  [...new Set(stalls.map(s => s.building))].sort().forEach(v => buildingFilter.add(new Option(v, v)));
  floorFilter.innerHTML = '<option value="">全部樓層</option>';
  [...new Set(stalls.map(s => s.floor))].sort().forEach(v => floorFilter.add(new Option(v, v)));
}

function renderTagChips() {
  if (!tagChips) return;
  const tags = [...new Set(stalls.flatMap(item => item.tags))];
  tagChips.innerHTML = '';
  tagChips.appendChild(createChip('全部類型', ''));

  // 新增：其他活動快速連結標籤
  const eventBtn = document.createElement('button');
  eventBtn.className = 'chip';
  eventBtn.textContent = '其他活動 🚩';
  eventBtn.onclick = () => {
    document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
  };
  tagChips.appendChild(eventBtn);

  tags.forEach(tag => tagChips.appendChild(createChip(tag, tag)));
}

function createChip(text, value) {
  const btn = document.createElement('button');
  btn.className = `chip ${activeTag === value ? 'active' : ''}`;
  btn.textContent = text;
  btn.onclick = () => { activeTag = value; renderTagChips(); renderStalls(); };
  return btn;
}

[searchInput, gradeFilter, buildingFilter, floorFilter].forEach(el => {
  el?.addEventListener('input', renderStalls);
  el?.addEventListener('change', renderStalls);
});

resetBtn?.addEventListener('click', () => {
  searchInput.value = ''; gradeFilter.value = ''; buildingFilter.value = ''; floorFilter.value = ''; activeTag = '';
  if (mapMarker) mapMarker.style.display = 'none'; renderTagChips(); renderStalls();
});

loadData();
const backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
