let dongbaData = [];

async function loadData() {
  const response = await fetch("../data/dongba.json");
  dongbaData = await response.json();

  document.getElementById("stats").innerText =
    `已加载 ${dongbaData.length} 个东巴文符号。`;

  renderResults(dongbaData.slice(0, 24));
}

function renderResults(items) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (items.length === 0) {
    results.innerHTML = "<p>没有找到结果。</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="symbol">
        <img src="../${item.svg_path}" alt="${item.name}" />
      </div>
      <h2>${item.name}</h2>
      <p><span class="label">中文：</span>${item.chinese}</p>
      <p><span class="label">英文：</span>${item.english}</p>
      <p><span class="label">IPA：</span>${item.ipa}</p>
      <p><span class="label">分类：</span>${item.reference}</p>
      <p><span class="label">文件：</span>${item.unicode}</p>
    `;

    results.appendChild(card);
  });
}

function searchDongba() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!keyword) {
    renderResults(dongbaData.slice(0, 24));
    document.getElementById("stats").innerText =
      `已加载 ${dongbaData.length} 个东巴文符号。`;
    return;
  }

  const filtered = dongbaData.filter(item => {
    return (
      item.name.toLowerCase().includes(keyword) ||
      item.english.toLowerCase().includes(keyword) ||
      item.chinese.toLowerCase().includes(keyword) ||
      item.reference.toLowerCase().includes(keyword) ||
      item.unicode.toLowerCase().includes(keyword)
    );
  });

  document.getElementById("stats").innerText =
    `找到 ${filtered.length} 个结果。`;

  renderResults(filtered.slice(0, 100));
}

document.getElementById("searchButton").addEventListener("click", searchDongba);

document.getElementById("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchDongba();
  }
});

loadData();
