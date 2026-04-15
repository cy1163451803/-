const DATA_PARTS = [
  "./data/part-00.txt",
  "./data/part-01.txt",
  "./data/part-02.txt",
  "./data/part-03.txt",
  "./data/part-04.txt",
  "./data/part-05.txt",
  "./data/part-06.txt",
];

async function ensureDataLoaded() {
  if (window.AI_LIBRARY_DATA) return window.AI_LIBRARY_DATA;
  const chunks = await Promise.all(
    DATA_PARTS.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
      }
      return response.text();
    })
  );
  const scriptText = chunks.join("");
  window.eval(scriptText);
  return window.AI_LIBRARY_DATA;
}

function startApp(data) {
  const statsGrid = document.getElementById("stats-grid");
  const topicBars = document.getElementById("topic-bars");
  const spotlightList = document.getElementById("spotlight-list");
  const timelineChart = document.getElementById("timeline-chart");
  const countryCloud = document.getElementById("country-cloud");
  const topicFilter = document.getElementById("topic-filter");
  const countryFilter = document.getElementById("country-filter");
  const keywordInput = document.getElementById("keyword-input");
  const resultCount = document.getElementById("result-count");
  const recordGrid = document.getElementById("record-grid");
  const issueList = document.getElementById("issue-list");
  const recentList = document.getElementById("recent-list");
  const updatedAt = document.getElementById("updated-at");
  const workbookName = document.getElementById("workbook-name");

  function formatCount(value) {
    return new Intl.NumberFormat("zh-CN").format(value);
  }

  function escapeHtml(value = "") {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function buildStats() {
    const stats = [
      { label: "总条目数", value: data.meta.totalRecords, note: "工作簿跨 7 个主题表整合" },
      { label: "问题条目", value: data.meta.issueRecords, note: "需要补链、补日期或修正字段" },
      { label: "覆盖主题", value: data.topicBreakdown.filter((item) => item.count > 0).length, note: "战略、机构、规范、评估、标准、立法、国际治理" },
      { label: "国际/地区节点", value: data.countryBreakdown.length, note: "按国家/地区字段聚合后的重点节点" },
    ];
    statsGrid.innerHTML = stats.map((item) => `
      <article class="stat-card">
        <div class="label">${item.label}</div>
        <div class="value">${formatCount(item.value)}</div>
        <div class="note">${item.note}</div>
      </article>
    `).join("");
  }

  function buildTopicBars() {
    const max = Math.max(...data.topicBreakdown.map((item) => item.count));
    topicBars.innerHTML = data.topicBreakdown.map((item) => `
      <div class="bar-row">
        <div class="bar-meta">
          <strong>${item.name}</strong>
          <span>${formatCount(item.count)} 条</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(item.count / max) * 100}%"></div>
        </div>
      </div>
    `).join("");
  }

  function buildSpotlight() {
    spotlightList.innerHTML = data.spotlight.map((item) => `
      <article class="spotlight-item">
        <span class="spotlight-topic">${item.topic}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="spotlight-meta">${item.date || "日期待补"} · ${item.country} · ${item.id}</div>
      </article>
    `).join("");
  }

  function buildTimeline() {
    const max = Math.max(...data.timeline.map((item) => item.count));
    timelineChart.innerHTML = data.timeline.map((item) => `
      <div class="year-column">
        <div class="year-count">${item.count}</div>
        <div class="year-bar-wrap">
          <div class="year-bar" style="height:${Math.max(14, (item.count / max) * 220)}px"></div>
        </div>
        <div class="year-label">${item.year}</div>
      </div>
    `).join("");
  }

  function buildCountryCloud() {
    countryCloud.innerHTML = data.countryBreakdown.map((item) => `
      <div class="country-pill">
        <strong>${item.name}</strong>
        <span>${item.count} 条</span>
      </div>
    `).join("");
  }

  function buildFilters() {
    const topics = ["全部主题", ...new Set(data.records.map((item) => item["主题"]))];
    const countries = ["全部国家/地区", ...new Set(data.records.map((item) => item["国家/地区"]))];
    topicFilter.innerHTML = topics.map((item) => `<option value="${item}">${item}</option>`).join("");
    countryFilter.innerHTML = countries.map((item) => `<option value="${item}">${item}</option>`).join("");
  }

  function linkMarkup(record) {
    const links = [];
    if (record["主参考链接"]) links.push(`<a href="${record["主参考链接"]}" target="_blank" rel="noreferrer">主链接</a>`);
    if (record["补充链接"]) links.push(`<a href="${record["补充链接"]}" target="_blank" rel="noreferrer">补充链接</a>`);
    return links.join("");
  }

  function renderRecords(records) {
    resultCount.textContent = formatCount(records.length);
    if (!records.length) {
      recordGrid.innerHTML = `<div class="empty-state">当前筛选条件下没有结果，可以换一个主题或缩短关键词。</div>`;
      return;
    }
    recordGrid.innerHTML = records.slice(0, 80).map((record) => `
      <article class="record-card">
        <div class="card-head">
          <div>
            <div class="card-id">${record["DataID"]}</div>
            <h3>${escapeHtml(record["名称（中文）"] || record["名称（英文）"])}</h3>
          </div>
          <span class="chip">${record["主题"]}</span>
        </div>
        <div class="record-meta">${record["日期"] || "日期待补"} · ${record["国家/地区"] || "地区待补"} · ${escapeHtml(record["发布/主管机构"] || "机构待补")}</div>
        <div class="card-summary">${escapeHtml(record["核心摘要"] || record["备注"] || "暂无摘要")}</div>
        <div class="card-links">${linkMarkup(record)}</div>
      </article>
    `).join("");
  }

  function applyFilters() {
    const topic = topicFilter.value;
    const country = countryFilter.value;
    const keyword = keywordInput.value.trim().toLowerCase();
    const filtered = data.records.filter((record) => {
      if (topic !== "全部主题" && record["主题"] !== topic) return false;
      if (country !== "全部国家/地区" && record["国家/地区"] !== country) return false;
      if (!keyword) return true;
      const haystack = Object.values(record).join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
    renderRecords(filtered);
  }

  function buildIssues() {
    issueList.innerHTML = data.issueRecords.map((record) => `
      <article class="issue-item">
        <div class="issue-meta">${record["DataID"]} · ${record["主题"]}</div>
        <h3>${escapeHtml(record["名称（中文）"] || record["名称（英文）"])}</h3>
        <div class="issue-meta">${record["日期"] || "日期待补"} · ${record["国家/地区"]}</div>
        <div class="issue-flag">${escapeHtml(record["问题标记"])}</div>
      </article>
    `).join("");
  }

  function buildRecent() {
    recentList.innerHTML = data.recentRecords.map((record) => `
      <article class="recent-item">
        <div class="recent-meta">${record["日期"] || "日期待补"} · ${record["主题"]} · ${record["国家/地区"]}</div>
        <h3>${escapeHtml(record["名称（中文）"] || record["名称（英文）"])}</h3>
      </article>
    `).join("");
  }

  function initMeta() {
    updatedAt.textContent = data.meta.updatedAt;
    workbookName.textContent = data.meta.title;
    document.title = data.meta.title;
  }

  function attachEvents() {
    topicFilter.addEventListener("change", applyFilters);
    countryFilter.addEventListener("change", applyFilters);
    keywordInput.addEventListener("input", applyFilters);
  }

  initMeta();
  buildStats();
  buildTopicBars();
  buildSpotlight();
  buildTimeline();
  buildCountryCloud();
  buildFilters();
  buildIssues();
  buildRecent();
  attachEvents();
  applyFilters();
}

ensureDataLoaded()
  .then(startApp)
  .catch((error) => {
    document.body.innerHTML = `<pre style=\"white-space:pre-wrap;padding:24px;font:14px/1.6 monospace;\">页面数据加载失败：${String(error)}</pre>`;
  });
