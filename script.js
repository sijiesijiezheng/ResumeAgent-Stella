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

// =========================
// 🚀 主提交逻辑
// =========================

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  setExportEnabled(false);
  resultEl.innerHTML = "";
  loading.style.display = "block";

  const code   = document.getElementById("activationCode")?.value.trim();
  const name   = document.getElementById("name")?.value.trim();
  const school = document.getElementById("school")?.value.trim();
  const major  = document.getElementById("major")?.value.trim();
  const job    = document.getElementById("job")?.value.trim();
  const style  = document.getElementById("style").value;
  const skills = document.getElementById("skills")?.value.trim();
  const experience = document.getElementById("experience")?.value.trim();
  const extra  = document.getElementById("extra")?.value.trim();

  const payload = { name, school, major, job, style, skills, experience, extra };

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    console.log("🔥 返回数据:", data);

    loading.style.display = "none";

    // =========================
    // 🧠 新结构解析（关键修复点）
    // =========================

    if (data.experience || data.skills) {

      const html = `
        <h2>生成结果</h2>

        <div class="resume-block">
          <h3>📌 经历描述</h3>
          <pre>${data.experience || "暂无"}</pre>
        </div>

        <div class="resume-block">
          <h3>🧩 技能模块</h3>
          <pre>${data.skills || "暂无"}</pre>
        </div>
      `;

      resultEl.innerHTML = html;
      setExportEnabled(true);

    } else {
      resultEl.innerHTML = `<p>生成失败：后端未返回有效内容。</p>`;
    }

  } catch (err) {
    loading.style.display = "none";
    resultEl.innerHTML = `<p>请求出错：${err.message}</p>`;
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
// 📄 导出 TXT（替代PDF）
// =========================

pdfBtn.addEventListener("click", () => {
  const content = document.getElementById("result").innerText.trim();

  if (!content) {
    alert("请先生成内容");
    return;
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "简历.txt";
  link.click();
});

// =========================
// 📄 导出 Word
// =========================

wordBtn.addEventListener("click", () => {
  const text = document.getElementById("result").innerText || "";

  const blob = new Blob(["\ufeff" + text], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "简历.doc";
  a.click();

  URL.revokeObjectURL(url);
});
