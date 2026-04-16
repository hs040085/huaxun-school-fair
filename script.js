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

async function loadData() {
  try {
    const [stallsRes, eventsRes] = await Promise.all([
      fetch('./data/stalls.json'),
      fetch('./data/events.json')
    ]);

    if (!stallsRes.ok) {
      throw new Error(`stalls.json 載入失敗：${stallsRes.status}`);
    }

    if (!eventsRes.ok) {
      throw new Error(`events.json 載入失敗：${eventsRes.status}`);
    }

    stalls = await stallsRes.json();
    events = await eventsRes.json();

    if (!Array.isArray(stalls)) stalls = [];
    if (!Array.isArray(events)) events = [];

    initFilters();
    renderTagChips();
    renderStalls();
    renderEvents();
  } catch (error) {
    console.error('資料載入失敗：', error);

    if (stallGrid) {
      stallGrid.innerHTML = `
        <div class="empty" style="grid-column:1/-1;">
          <div style="font-size:40px;">⚠️</div>
          <strong style="display:block; margin-top:8px; color:#4f473f;">資料載入失敗</strong>
          <div style="margin-top:6px;">請確認 data 資料夾、JSON 格式與檔案路徑是否正確。</div>
        </div>
      `;
    }

    if (resultCount) {
      resultCount.textContent = '資料載入失敗';
    }

    if (currentFilters) {
      currentFilters.textContent = '請檢查 stalls.json / events.json';
    }

    if (eventGrid) {
      eventGrid.innerHTML = `
        <div class="empty" style="grid-column:1/-1;">
          <div style="font-size:36px;">⚠️</div>
          <strong style="display:block; margin-top:8px; color:#4f473f;">其他活動資料載入失敗</strong>
          <div style="margin-top:6px;">請確認 <code>data/events.json</code> 是否存在且格式正確。</div>
        </div>
      `;
    }
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
const backToTopButton = document.getElementById('backToTopBtn');

if (backToTopButton) {
  backToTopButton.onclick = function () {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
}
