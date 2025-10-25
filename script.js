// ==== Resume Agent vFinal — script.js (六字段版) ====
// 依赖：config.js 中已定义全局常量 API_URL
// 激活码白名单（可在此增删）
const VALID_KEYS = ["RA2025", "SISDEV", "TRYAGENT"];

// 元素引用
const form     = document.getElementById("resumeForm");
const resultEl = document.getElementById("result");
const loading  = document.getElementById("loading");
const copyBtn  = document.getElementById("copyBtn");
const pdfBtn   = document.getElementById("pdfBtn");
const wordBtn  = document.getElementById("wordBtn");

// 工具：启用/禁用导出按钮
function setExportEnabled(enabled) {
  copyBtn.disabled = !enabled;
  pdfBtn.disabled  = !enabled;
  wordBtn.disabled = !enabled;
}
setExportEnabled(false);

// 生成简历
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setExportEnabled(false);
  resultEl.innerHTML = "";
  loading.style.display = "block";

  // 读取表单
  const code   = document.getElementById("activationCode")?.value.trim();
  const name   = document.getElementById("name")?.value.trim();
  const school = document.getElementById("school")?.value.trim();
  const major  = document.getElementById("major")?.value.trim();
  const job    = document.getElementById("job")?.value.trim();
  const skills = document.getElementById("skills")?.value.trim();
  const extra  = document.getElementById("extra")?.value.trim();

 
  // 组装发给 Worker 的 payload（与你的后端字段一致）
  const payload = { name, school, major, job, skills, extra };

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    loading.style.display = "none";

    // 兼容两种返回结构：
    // A) { result: "...markdown..." }  —— 你的 Cloudflare Worker 当前版本
    // B) { success: true, output: "..." } —— 旧版脚本的预期
    const content = data?.result ?? data?.output ?? "";
    if (content) {
      resultEl.innerHTML = `<h2>生成结果</h2><div class="resume-content">${content}</div>`;
      setExportEnabled(true);
    } else {
      resultEl.innerHTML = `<p>生成失败：后端未返回内容。</p>`;
    }
  } catch (err) {
    loading.style.display = "none";
    resultEl.innerHTML = `<p>请求出错：${err.message}</p>`;
  }
});

// 复制
copyBtn.addEventListener("click", async () => {
  const text = document.querySelector(".resume-content")?.innerText || "";
  await navigator.clipboard.writeText(text);
  alert("内容已复制到剪贴板");
});

// 导出 PDF（简易文本版）
pdfBtn.addEventListener("click", () => {
  const text = document.querySelector(".resume-content")?.innerText || "";
  const blob = new Blob([text], { type: "application/pdf" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "简历.pdf"; a.click();
  URL.revokeObjectURL(url);
});

// 导出 Word
wordBtn.addEventListener("click", () => {
  const text = document.querySelector(".resume-content")?.innerText || "";
  const blob = new Blob(["\ufeff" + text], { type: "application/msword" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "简历.doc"; a.click();
  URL.revokeObjectURL(url);
});
