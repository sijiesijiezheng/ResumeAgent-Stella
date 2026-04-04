// ==== Resume Agent vFinal — script.js（结构版）====
// 依赖：config.js 中已定义 API_URL

const VALID_KEYS = ["RA2025", "SISDEV", "TRYAGENT"];

const form     = document.getElementById("resumeForm");
const resultEl = document.getElementById("result");
const loading  = document.getElementById("loading");
const copyBtn  = document.getElementById("copyBtn");
const pdfBtn   = document.getElementById("pdfBtn");
const wordBtn  = document.getElementById("wordBtn");

function setExportEnabled(enabled) {
  copyBtn.disabled = !enabled;
  pdfBtn.disabled  = !enabled;
  wordBtn.disabled = !enabled;
}
setExportEnabled(false);

/** 与 globals.css 中 body.has-resume 配合，避免使用 :has() */
function syncResumeBodyClass() {
  document.body.classList.toggle("has-resume", !!document.querySelector(".resume-block"));
}

/** 与 functions/api.js 中 finalResume 相同的 HTML 结构（本地预览用） */
const MOCK_RESUME_HTML = `
<section>
  <h2>基本信息</h2>
  <p>姓名：张示例</p>
  <p>学校：示例大学</p>
  <p>专业：信息管理与信息系统</p>
</section>
<section>
  <h2>求职意向</h2>
  <p>目标岗位：产品运营实习生</p>
</section>
<section>
  <h2>教育背景</h2>
  <p>示例大学 · 信息管理与信息系统</p>
</section>
<section>
  <h2>实习经历</h2>
  <h3>校园电商实践项目</h3>
  <ul>
    <li>协助整理商品信息与上架资料，核对基础数据</li>
    <li>记录订单与用户咨询内容，配合完成日常运营事务</li>
    <li>参与线下物资清点与分类，保证库存信息一致</li>
  </ul>
</section>
<section>
  <h2>技能</h2>
  <h3>办公与数据</h3>
  <ul>
    <li>Excel 基础表格与简单统计</li>
    <li>文档整理与信息归档</li>
  </ul>
  <h3>内容协作</h3>
  <ul>
    <li>图文素材整理与发布协助</li>
    <li>活动通知与基础文案校对</li>
  </ul>
</section>
`.trim();

function buildResultMarkup(resumeHtml, showExportHint) {
  const hint = showExportHint
    ? `<p class="export-ready-hint">简历已生成，推荐导出 Word 编辑使用；也可复制或导出文本。</p>`
    : "";
  return `
    ${hint}
    <h2>生成结果</h2>
    <div class="resume-block">
      ${resumeHtml}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deriveMockExperienceTitle(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "实习与项目经历";
  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return lines[0].slice(0, 120);
  return "实习与项目经历";
}

function mockExperienceBullets(experience) {
  const raw = String(experience ?? "").trim();
  if (!raw) {
    return ["（可补充经历：如整理资料、协助活动、数据统计等）"];
  }
  const items = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^[-•*]\s*(.+)$/) || t.match(/^\d+[.)、]\s*(.+)$/);
    if (m) items.push(m[1].trim());
    else if (!items.length) items.push(t);
  }
  return items.length ? items : [raw];
}

function mockSkillsInnerHtml(skills) {
  const s = String(skills ?? "").trim();
  if (!s) {
    return "<ul><li>可填写与岗位相关的工具或能力关键词</li></ul>";
  }
  const parts = s.split(/[/，、,]/).map((x) => x.trim()).filter(Boolean);
  const lis = parts.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
  return `<h3>技能关键词</h3><ul>${lis}</ul>`;
}

/** 与接口返回同结构的简历 HTML（无外层 .resume-block），供 file:// 或 fetch 失败时使用 */
function buildMockResumeHtml(payload) {
  const { name, school, major, job, skills, experience } = payload;
  const expTitle = deriveMockExperienceTitle(experience);
  const bullets = mockExperienceBullets(experience);
  const expList = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  const skillsInner = mockSkillsInnerHtml(skills);

  return `
<section>
  <h2>基本信息</h2>
  <p>姓名：${escapeHtml(name)}</p>
  <p>学校：${escapeHtml(school)}</p>
  <p>专业：${escapeHtml(major)}</p>
</section>
<section>
  <h2>求职意向</h2>
  <p>目标岗位：${escapeHtml(job)}</p>
</section>
<section>
  <h2>教育背景</h2>
  <p>${escapeHtml(school)} · ${escapeHtml(major)}</p>
</section>
<section>
  <h2>实习经历</h2>
  <h3>${escapeHtml(expTitle)}</h3>
  <ul>${expList}</ul>
</section>
<section>
  <h2>技能</h2>
  ${skillsInner}
</section>
`.trim();
}

async function fetchResumeOrMock(payload) {
  if (typeof USE_LOCAL_MOCK !== "undefined" && USE_LOCAL_MOCK) {
    return { resume: buildMockResumeHtml(payload) };
  }
  if (location.protocol === "file:") {
    return { resume: buildMockResumeHtml(payload) };
  }
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(String(resp.status));
    const data = await resp.json();
    if (data && typeof data.resume === "string" && data.resume.trim()) {
      return data;
    }
  } catch (_) {
    /* 网络错误、非 JSON、无 resume 时走本地模拟 */
  }
  return { resume: buildMockResumeHtml(payload) };
}

function getResumeExportText() {
  return document.querySelector(".resume-block")?.innerText.trim() || "";
}

const WORD_FONT =
  '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Heiti SC",SimSun,Arial,sans-serif';

/**
 * Word 打开本地 .doc（实为 HTML）时常忽略 <head> 里的样式，必须在节点上写内联 style。
 * 仅用 .resume-block 的 innerHTML 结构（clone），不使用 innerText。
 */
function applyWordInlineLayout(rootEl) {
  rootEl.style.cssText = [
    `font-family:${WORD_FONT}`,
    "font-size:11pt",
    "color:#000000",
    "line-height:1.4",
    "max-width:520pt",
    "margin:0 auto",
    "padding:12pt 16pt",
    "background:#ffffff",
    "box-sizing:border-box",
  ].join(";");

  rootEl.querySelectorAll("section").forEach((el) => {
    el.style.cssText = "margin:0 0 14pt 0;padding:0;";
  });

  rootEl.querySelectorAll("section > h2").forEach((el) => {
    el.style.cssText = [
      "font-size:11pt",
      "font-weight:bold",
      "color:#000000",
      "border-bottom:1pt solid #000000",
      "padding-bottom:4pt",
      "margin:0 0 6pt 0",
      "letter-spacing:0",
    ].join(";");
  });

  rootEl.querySelectorAll("h3").forEach((el) => {
    el.style.cssText = [
      "font-size:10.5pt",
      "font-weight:bold",
      "color:#000000",
      "margin:8pt 0 4pt 0",
      "line-height:1.3",
    ].join(";");
  });

  rootEl.querySelectorAll("p").forEach((el) => {
    el.style.cssText =
      "margin:0 0 4pt 0;text-align:left;font-size:11pt;color:#000000;";
  });

  rootEl.querySelectorAll("ul").forEach((el) => {
    el.style.cssText =
      "margin:4pt 0 8pt 0;padding-left:22pt;list-style-type:disc;list-style-position:outside;";
  });

  rootEl.querySelectorAll("li").forEach((el) => {
    el.style.cssText =
      "margin:0 0 3pt 0;line-height:1.35;font-size:11pt;color:#000000;";
  });
}

function buildResumeWordDocumentHtml() {
  const block = document.querySelector(".resume-block");
  if (!block) return "";
  const clone = block.cloneNode(true);
  if (!clone.innerHTML.trim()) return "";
  applyWordInlineLayout(clone);
  const bodyInner = clone.outerHTML;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Resume Agent">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<title>简历</title>
<style type="text/css">
body{margin:0;padding:12pt;background:#fff;font-family:${WORD_FONT};font-size:11pt;color:#000;}
</style>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

function isLikelyLocalDevPage() {
  const { hostname, protocol, search } = location;
  if (/\bmock=1\b/.test(search) || /\bmock_resume=1\b/.test(search)) {
    return true;
  }
  return (
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

if (resultEl && isLikelyLocalDevPage()) {
  resultEl.innerHTML = buildResultMarkup(MOCK_RESUME_HTML, false);
  setExportEnabled(true);
  syncResumeBodyClass();
}

// =========================
// 🚀 主提交逻辑
// =========================

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    alert("请先填写信息");
    form.reportValidity();
    return;
  }

  setExportEnabled(false);
  resultEl.innerHTML = "";
  syncResumeBodyClass();
  loading.textContent = "正在生成中…";
  loading.style.display = "block";

  const code   = document.getElementById("activationCode")?.value.trim();
  const name   = document.getElementById("name")?.value.trim();
  const school = document.getElementById("school")?.value.trim();
  const major  = document.getElementById("major")?.value.trim();
  const job    = document.getElementById("job")?.value.trim();
  const skills = document.getElementById("skills")?.value.trim();
  const experience = document.getElementById("experience")?.value.trim();
  const extra  = document.getElementById("extra")?.value.trim();

  const payload = { name, school, major, job, skills, experience, extra };

  try {
    const data = await fetchResumeOrMock(payload);
    loading.style.display = "none";

    if (data.resume) {
      resultEl.innerHTML = buildResultMarkup(data.resume, true);
      setExportEnabled(true);
      alert("简历已生成");
    } else {
      resultEl.innerHTML = `<p>生成失败：未能生成简历内容。</p>`;
    }
    syncResumeBodyClass();
  } catch (err) {
    loading.style.display = "none";
    resultEl.innerHTML = buildResultMarkup(buildMockResumeHtml(payload), true);
    setExportEnabled(true);
    alert("简历已生成");
    syncResumeBodyClass();
  }
});

// =========================
// 📋 复制
// =========================

copyBtn.addEventListener("click", async () => {
  const text = document.querySelector(".resume-block")?.innerText || "";
  await navigator.clipboard.writeText(text);
  alert("内容已复制");
});

// =========================
// 📄 导出 Word（主路径：HTML .doc，中文与版式稳定）
// =========================

wordBtn.addEventListener("click", () => {
  const html = buildResumeWordDocumentHtml();
  if (!html) {
    alert("请先生成内容");
    return;
  }

  const blob = new Blob(["\ufeff" + html], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "简历.doc";
  a.click();
  URL.revokeObjectURL(url);
});

// =========================
// 📄 导出纯文本（备用）
// =========================

pdfBtn.addEventListener("click", () => {
  const content = getResumeExportText();

  if (!content) {
    alert("请先生成内容");
    return;
  }

  const blob = new Blob(["\ufeff" + content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "简历.txt";
  link.click();
  URL.revokeObjectURL(url);
});
