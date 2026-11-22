let dongbaData = [];

/* ---------- IPA cleanup ---------- */
// 原始数据里的音标字段混了一些没渲染好的 LaTeX 片段（例如 \$a^{33}\$、^{h}）。
// 这里做"高确定性"的清理：去掉包裹符号、调值数字转上标、送气符号转 ʰ。
// 少数几个用了 \eta / \xi / \mathcal / \angle 这类宏的条目，原始对应符号无法
// 100% 确认，会保留宏名并标注待核实，不做猜测替换。
const SUP_MAP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const UNCERTAIN_MACROS = ['eta', 'xi', 'mathcal', 'angle'];

function formatIPA(raw) {
  if (!raw) return { text: '', uncertain: false };
  let s = raw;
  let uncertain = false;

  s = s.replace(/\\\$/g, '').replace(/\$/g, '');
  s = s.replace(/\\epsilon/g, 'ɛ');

  // composite/subscript symbols that didn't render cleanly, e.g. t_{\xi}, t_{\mathcal{S}}
  s = s.replace(/([a-zA-Z])_\{([^}]*)\}/g, (m, base, inner) => {
    uncertain = true;
    const cleanInner = inner.replace(/\\/g, '').replace(/[{}]/g, '');
    return `${base}[${cleanInner}?]`;
  });

  s = s.replace(/\^\{h\}/g, 'ʰ');
  s = s.replace(/\^\{([0-9]+)\}/g, (m, digits) => digits.split('').map(d => SUP_MAP[d] || d).join(''));

  UNCERTAIN_MACROS.forEach(macro => {
    const re = new RegExp('\\\\' + macro, 'g');
    if (re.test(s)) {
      uncertain = true;
      s = s.replace(re, `[${macro}?]`);
    }
  });
  s = s.replace(/[{}]/g, '');
  return { text: s.trim(), uncertain };
}

/* ---------- Load + render ---------- */
async function loadData() {
  const response = await fetch("../data/dongba.json");
  dongbaData = await response.json();

  document.getElementById("totalBadge").innerText = `${dongbaData.length} 条目`;
  document.getElementById("stats").innerHTML =
    `显示 <b>${Math.min(24, dongbaData.length)}</b> / ${dongbaData.length} 条`;

  renderResults(dongbaData.slice(0, 24));
}

function renderResults(items) {
  const results = document.getElementById("results");

  if (items.length === 0) {
    results.innerHTML = `<p class="no-image">没有匹配的条目 — 试试别的关键词。</p>`;
    return;
  }

  results.innerHTML = items.map(item => {
    const ipa = formatIPA(item.ipa);
    return `
    <div class="card" data-unicode="${item.unicode}">
      <div class="glyph-slot">
        <img src="../${item.svg_path}" alt="${item.name}"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'暂无图片',className:'no-image'}))" />
        <span class="slot-tag">${item.unicode.replace('.svg','')}</span>
      </div>
      <div class="zh">${item.chinese}</div>
      <div class="en">${item.english}</div>
      <div class="meta-row">
        <span class="naxi">${item.name}</span>
        <span class="ipa">${ipa.text}${ipa.uncertain ? ' ⚠︎' : ''}<button class="play-btn" data-unicode="${item.unicode}" title="试听">🔊</button></span>
        <span class="ref">${item.reference}</span>
      </div>
    </div>
  `;
  }).join("");

  // bind click-to-detail
  results.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const item = dongbaData.find(d => d.unicode === card.dataset.unicode);
      if (item) openDetail(item);
    });
  });

  // bind pronunciation buttons (stop propagation so it doesn't also open the modal)
  results.querySelectorAll(".play-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const item = dongbaData.find(d => d.unicode === btn.dataset.unicode);
      if (item) playPronunciation(item, btn);
    });
  });
}

/* ---------- Search ---------- */
function searchDongba() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!keyword) {
    renderResults(dongbaData.slice(0, 24));
    document.getElementById("stats").innerHTML =
      `显示 <b>${Math.min(24, dongbaData.length)}</b> / ${dongbaData.length} 条`;
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

  document.getElementById("stats").innerHTML =
    `显示 <b>${Math.min(100, filtered.length)}</b> / ${filtered.length} 条`;

  renderResults(filtered.slice(0, 100));
}

document.getElementById("searchButton").addEventListener("click", searchDongba);
document.getElementById("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") searchDongba(); });
document.getElementById("searchInput").addEventListener("input", searchDongba);

/* ---------- Pronunciation playback ---------- */
// 优先播放真人录音（放在 ../audio/U+XXXX.mp3，文件名跟 unicode 字段对应）。
// 没有录音时，用浏览器自带的语音合成引擎"近似拟读"罗马转写名称——
// 这绝不是真实纳西语发音，只是退而求其次的占位方案，UI 上会一直提示清楚。
function playPronunciation(item, btn) {
  const unicodeBase = item.unicode.replace(".svg", "");
  const audioPath = `../audio/${unicodeBase}.mp3`;
  const audio = new Audio(audioPath);
  let usedRealAudio = true;

  audio.addEventListener("error", () => {
    usedRealAudio = false;
    speakApprox(item.name);
  });

  audio.play().catch(() => {
    usedRealAudio = false;
    speakApprox(item.name);
  });

  if (btn) {
    setTimeout(() => {
      btn.title = usedRealAudio
        ? "播放真人录音"
        : "未找到真人录音，已用浏览器语音引擎近似拟读罗马转写（非纳西语真实发音）";
    }, 50);
  }
}

function speakApprox(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.85;
  speechSynthesis.speak(utter);
}

/* ---------- Detail modal ---------- */
function openDetail(item) {
  const ipa = formatIPA(item.ipa);
  const modalCard = document.getElementById("modalCard");
  modalCard.innerHTML = `
    <button class="modal-close" id="modalCloseBtn">关闭 ✕</button>
    <div class="modal-glyph">
      <img src="../${item.svg_path}" alt="${item.name}"
           onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'暂无图片',className:'no-image'}))" />
    </div>
    <div class="zh">${item.chinese}</div>
    <div class="en">${item.english}</div>
    <div class="modal-field"><span class="f-label">罗马转写</span><span>${item.name}</span></div>
    <div class="modal-field"><span class="f-label">国际音标</span><span>${ipa.text}${ipa.uncertain ? ' ⚠︎ 个别符号待核实，详见音标说明页' : ''}<button class="play-btn modal-play" id="modalPlayBtn" title="试听">🔊</button></span></div>
    <div class="audio-note">点击试听：若该字有真人录音会优先播放；否则用浏览器语音引擎近似拟读罗马转写，不代表真实纳西语发音。</div>
    <div class="modal-field"><span class="f-label">分类</span><span>${item.reference}</span></div>
    <div class="modal-field"><span class="f-label">文件</span><span>${item.unicode}</span></div>
    <div class="modal-field"><span class="f-label">序号</span><span>#${item.index}</span></div>
  `;
  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById("modalCloseBtn").addEventListener("click", closeDetail);
  document.getElementById("modalPlayBtn").addEventListener("click", e => {
    e.stopPropagation();
    playPronunciation(item, e.currentTarget);
  });
}
function closeDetail() {
  document.getElementById("modalOverlay").classList.add("hidden");
}
document.getElementById("modalOverlay").addEventListener("click", e => {
  if (e.target.id === "modalOverlay") closeDetail();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });

/* ---------- Settings / API key ---------- */
const KEY_STORAGE = "dongba_claude_api_key";
function refreshKeyStatus() {
  const key = localStorage.getItem(KEY_STORAGE);
  document.getElementById("apiKeyStatus").textContent = key
    ? `已设置（${key.slice(0, 8)}…${key.slice(-4)}）`
    : "未设置";
}
document.getElementById("settingsToggle").addEventListener("click", () => {
  document.getElementById("settingsPanel").classList.toggle("hidden");
});
document.getElementById("apiKeySave").addEventListener("click", () => {
  const val = document.getElementById("apiKeyInput").value.trim();
  if (val) {
    localStorage.setItem(KEY_STORAGE, val);
    document.getElementById("apiKeyInput").value = "";
    refreshKeyStatus();
  }
});
document.getElementById("apiKeyClear").addEventListener("click", () => {
  localStorage.removeItem(KEY_STORAGE);
  refreshKeyStatus();
});
refreshKeyStatus();

/* ---------- Phrase decomposition (offline, always available) ---------- */
function decomposePhrase(phrase) {
  const chars = Array.from(phrase.trim()).filter(c => c.trim().length > 0);
  return chars.map(ch => {
    let match = dongbaData.find(item => item.chinese === ch);
    if (!match) match = dongbaData.find(item => item.chinese.includes(ch));
    return { char: ch, match };
  });
}

function renderPhraseChips(parts) {
  return `
    <div class="phrase-chip-row">
      ${parts.map((p, i) => `
        ${i > 0 ? '<span class="plus">+</span>' : ''}
        ${p.match
          ? `<span class="chip" data-unicode="${p.match.unicode}">
               <img src="../${p.match.svg_path}" alt="${p.match.name}" onerror="this.remove()" />
               ${p.char}
             </span>`
          : `<span class="chip unmapped">${p.char} · 未收录</span>`
        }
      `).join("")}
    </div>
  `;
}

function runPhraseDecompose() {
  const phrase = document.getElementById("phraseInput").value;
  const resultBox = document.getElementById("phraseResult");
  if (!phrase.trim()) {
    resultBox.innerHTML = "";
    return;
  }
  const parts = decomposePhrase(phrase);
  const mappedCount = parts.filter(p => p.match).length;
  resultBox.innerHTML =
    renderPhraseChips(parts) +
    `<p class="phrase-note">逐字查表结果：${mappedCount} / ${parts.length} 个字在词典中找到对应符号。
     这是字符级的直接匹配，不代表东巴文的真实语法或习惯写法，仅供参考。</p>`;

  resultBox.querySelectorAll(".chip[data-unicode]").forEach(chip => {
    chip.addEventListener("click", () => {
      const item = dongbaData.find(d => d.unicode === chip.dataset.unicode);
      if (item) openDetail(item);
    });
  });
}
document.getElementById("phraseButton").addEventListener("click", runPhraseDecompose);
document.getElementById("phraseInput").addEventListener("keydown", e => { if (e.key === "Enter") runPhraseDecompose(); });

/* ---------- AI-assisted suggestion (optional, needs user's own API key) ---------- */
async function callClaude(userPrompt) {
  const apiKey = localStorage.getItem(KEY_STORAGE);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  const block = data.content.find(b => b.type === "text");
  return block ? block.text : "";
}

function buildDictionarySummary() {
  // 精简字段，控制每次请求的数据量
  return dongbaData
    .map(item => `${item.unicode.replace(".svg", "")}|${item.name}|${item.chinese}|${item.english}|${item.reference}`)
    .join("\n");
}

async function runAISuggestion() {
  const phrase = document.getElementById("phraseInput").value.trim();
  const resultBox = document.getElementById("phraseResult");
  if (!phrase) return;

  if (!localStorage.getItem(KEY_STORAGE)) {
    resultBox.insertAdjacentHTML("beforeend",
      `<div class="phrase-ai-block"><h4>需要先设置 API Key</h4>
       <p>点击页头的"AI 设置 ⚙"，填入你自己的 Claude API Key 后再试。</p></div>`);
    document.getElementById("settingsPanel").classList.remove("hidden");
    return;
  }

  resultBox.insertAdjacentHTML("beforeend",
    `<div class="phrase-ai-block" id="aiBlock"><h4>AI 组合建议</h4><p>正在请求…</p></div>`);

  const prompt = `你是研究东巴文（纳西族象形文字）的助手。下面是词典的全部条目，格式为「Unicode文件名|罗马转写名称|中文释义|英文释义|分类」，一行一条：

${buildDictionarySummary()}

用户给出的现代中文词语/短语是：「${phrase}」

请你：
1. 判断这个词语在东巴文里有没有自然、合理的象形组合表达方式（东巴文是表意象形文字，主要记录具体事物，不要为抽象成语强行拼凑）。
2. 如果存在合理组合，按顺序列出建议使用的字符（必须是上面列表里真实存在的条目，用"罗马转写名称"标注），并简要说明每个字符为何贴切。
3. 如果词典里没有任何合适的字符，或者只能勉强凑，请直接诚实说明"这个词在现有1188字范围内没有自然对应"，不要编造。
4. 用简体中文回答，控制在150字以内，语气像专业但坦诚的研究者。直接给出结论性的文字说明即可，不需要JSON或代码格式。`;

  try {
    const text = await callClaude(prompt);
    document.getElementById("aiBlock").innerHTML =
      `<h4>AI 组合建议</h4><p>${text.replace(/\n/g, "<br>")}</p>`;
  } catch (err) {
    document.getElementById("aiBlock").innerHTML =
      `<h4>AI 组合建议</h4><p style="color:var(--vermilion)">请求出错：${err.message}</p>`;
  }
}
document.getElementById("aiSuggestButton").addEventListener("click", runAISuggestion);

loadData();
