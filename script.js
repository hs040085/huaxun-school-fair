let allStalls = [];

function getGradeFromName(name) {
  const match = String(name).match(/^(\d)/);
  return match ? match[1] + "年級" : "其他";
}

function normalizeFloorText(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text === "一樓") return "1樓";
  if (text === "二樓") return "2樓";
  if (text === "三樓") return "3樓";
  if (text === "四樓") return "4樓";
  if (text === "五樓") return "5樓";
  if (text === "六樓") return "6樓";
  if (text === "七樓") return "7樓";
  if (text === "八樓") return "8樓";

  return text;
}

function getFloorFromRoomCode(roomCode, fallbackFloor) {
  const code = String(roomCode || "").trim().toUpperCase();

  if (code) {
    const match = code.match(/^[A-Z]+(\d)/);
    if (match) {
      return match[1] + "樓";
    }
  }

  return normalizeFloorText(fallbackFloor);
}

function getUniqueValues(list, getter) {
  const values = list
    .map(getter)
    .filter(function(value) { return value !== ""; });

  return Array.from(new Set(values)).sort(function(a, b) {
    return a.localeCompare(b, "zh-Hant-u-nu-latn");
  });
}

function populateSelect(selectId, options, defaultLabel) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">' + defaultLabel + '</option>'
    + options.map(function(option) {
      return '<option value="' + option + '">' + option + '</option>';
    }).join("");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
}

function highlightText(text, keyword) {
  const safeText = escapeHtml(text);

  if (!keyword) {
    return safeText;
  }

  const escapedKeyword = escapeRegExp(keyword);
  const regex = new RegExp("(" + escapedKeyword + ")", "gi");

  return safeText.replace(regex, '<span class="highlight">$1</span>');
}

function updateActiveFilters() {
  const activeFilters = document.getElementById("activeFilters");
  const keyword = document.getElementById("searchInput").value.trim();
  const building = document.getElementById("buildingFilter").value;
  const floor = document.getElementById("floorFilter").value;
  const grade = document.getElementById("gradeFilter").value;

  const chips = [];

  if (keyword) {
    chips.push('<span class="filter-chip">關鍵字：' + escapeHtml(keyword) + '</span>');
  }
  if (building) {
    chips.push('<span class="filter-chip">大樓：' + escapeHtml(building) + '</span>');
  }
  if (floor) {
    chips.push('<span class="filter-chip">樓層：' + escapeHtml(floor) + '</span>');
  }
  if (grade) {
    chips.push('<span class="filter-chip">年級：' + escapeHtml(grade) + '</span>');
  }

  activeFilters.innerHTML = chips.length > 0 ? chips.join("") : '<span class="muted">目前未套用篩選條件</span>';
}

function renderStalls(list) {
  const app = document.getElementById("app");
  const resultInfo = document.getElementById("resultInfo");
  const keyword = document.getElementById("searchInput").value.trim();

  resultInfo.textContent = "共 " + list.length + " 筆結果";

  if (list.length === 0) {
    app.innerHTML = '<div class="empty">查無符合資料，請調整篩選條件或按下「重置篩選」。</div>';
    return;
  }

  app.innerHTML = list.map(function(item) {
    const grade = getGradeFromName(item.shortName);
    const floorText = getFloorFromRoomCode(item.estimatedRoomCode, item.floor);

    const tags = (item.items || []).map(function(name) {
      return '<span class="tag">' + highlightText(name, keyword) + '</span>';
    }).join("");

    const locationText = [
      item.building || "",
      floorText || "",
      item.estimatedRoomCode || "",
      item.estimatedLocationName || ""
    ].join(" ").trim();

    return '<div class="card">'
      + '<h3>' + highlightText(item.displayName, keyword) + '</h3>'
      + '<div class="line"><strong>簡稱：</strong>' + highlightText(item.shortName, keyword) + '</div>'
      + '<div class="line"><strong>年級：</strong>' + highlightText(grade, keyword) + '</div>'
      + '<div class="line"><strong>位置：</strong>' + highlightText(locationText, keyword) + '</div>'
      + '<div class="line"><strong>販售品項：</strong></div>'
      + '<div class="tag-list">' + tags + '</div>'
      + '</div>';
  }).join("");
}

function renderEvents(events) {
  const eventsBox = document.getElementById("events");

  eventsBox.innerHTML = events.map(function(item) {
    return '<div class="card">'
      + '<h3>' + escapeHtml(item.venue) + '</h3>'
      + '<div class="line"><strong>單位：</strong>' + escapeHtml(item.unit) + '</div>'
      + '<div class="line"><strong>活動：</strong>' + escapeHtml(item.activityName) + '</div>'
      + '<div class="line"><strong>時間：</strong>' + escapeHtml(item.startTime) + ' - ' + escapeHtml(item.endTime) + '</div>'
      + '</div>';
  }).join("");
}

function applyFilters() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const building = document.getElementById("buildingFilter").value;
  const floor = document.getElementById("floorFilter").value;
  const grade = document.getElementById("gradeFilter").value;

  const filtered = allStalls.filter(function(item) {
    const itemGrade = getGradeFromName(item.shortName);
    const itemFloor = getFloorFromRoomCode(item.estimatedRoomCode, item.floor);

    const text = [
      item.displayName,
      item.shortName,
      item.building,
      itemFloor,
      item.estimatedRoomCode,
      item.estimatedLocationName
    ].concat(item.items || []).join(" ").toLowerCase();

    const matchKeyword = text.includes(keyword);
    const matchBuilding = !building || item.building === building;
    const matchFloor = !floor || itemFloor === floor;
    const matchGrade = !grade || itemGrade === grade;

    return matchKeyword && matchBuilding && matchFloor && matchGrade;
  });

  updateActiveFilters();
  renderStalls(filtered);
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("buildingFilter").value = "";
  document.getElementById("floorFilter").value = "";
  document.getElementById("gradeFilter").value = "";
  applyFilters();
}

function bindFilters() {
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("buildingFilter").addEventListener("change", applyFilters);
  document.getElementById("floorFilter").addEventListener("change", applyFilters);
  document.getElementById("gradeFilter").addEventListener("change", applyFilters);
  document.getElementById("resetFiltersBtn").addEventListener("click", resetFilters);
}

function setupFilters() {
  const buildings = getUniqueValues(allStalls, function(item) {
    return item.building || "";
  });

  const floors = getUniqueValues(allStalls, function(item) {
    return getFloorFromRoomCode(item.estimatedRoomCode, item.floor);
  });

  const grades = getUniqueValues(allStalls, function(item) {
    return getGradeFromName(item.shortName);
  });

  populateSelect("buildingFilter", buildings, "全部大樓");
  populateSelect("floorFilter", floors, "全部樓層");
  populateSelect("gradeFilter", grades, "全部年級");
}

async function loadData() {
  const app = document.getElementById("app");
  const eventsBox = document.getElementById("events");

  try {
    const stallsRes = await fetch("./data/stalls.json");
    const eventsRes = await fetch("./data/events.json");

    allStalls = await stallsRes.json();
    const events = await eventsRes.json();

    setupFilters();
    renderStalls(allStalls);
    renderEvents(events);
    bindFilters();
    updateActiveFilters();
  } catch (error) {
    app.innerHTML = '<div class="empty">資料載入失敗</div>';
    eventsBox.innerHTML = '<div class="empty">資料載入失敗</div>';
    console.error(error);
  }
}

loadData();
