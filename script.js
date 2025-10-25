import { API_URL } from "./config.js";

const validKeys = ["RA2025", "SISDEV", "TRYAGENT"];
const form = document.getElementById("resumeForm");
const resultDiv = document.getElementById("result");
const loadingDiv = document.getElementById("loading");
const copyBtn = document.getElementById("copyBtn");
const pdfBtn = document.getElementById("pdfBtn");
const wordBtn = document.getElementById("wordBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultDiv.innerHTML = "";
  loadingDiv.style.display = "block";

  const code = document.getElementById("activationCode").value.trim();
  if (!validKeys.includes(code)) {
    loadingDiv.style.display = "none";
    alert("激活码无效，请联系管理员获取授权。");
    return;
  }

  const payload = {
    name: document.getElementById("name").value.trim(),
    school: document.getElementById("school").value.trim(),
    major: document.getElementById("major").value.trim(),
    job: document.getElementById("job").value.trim(),
    skills: document.getElementById("skills").value.trim(),
    extra: document.getElementById("extra").value.trim(),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    loadingDiv.style.display = "none";

    if (data.result) {
      resultDiv.innerHTML = `<h2>生成结果</h2><div class="resume-content">${data.result}</div>`;
      copyBtn.disabled = false;
      pdfBtn.disabled = false;
      wordBtn.disabled = false;
    } else {
      resultDiv.innerHTML = `<p>生成失败，请稍后再试。</p>`;
    }
  } catch (error) {
    loadingDiv.style.display = "none";
    resultDiv.innerHTML = `<p>发生错误：${error.message}</p>`;
  }
});

// --- 导出与复制功能 ---
copyBtn.addEventListener("click", () => {
  const text = document.querySelector(".resume-content")?.innerText;
  if (text) navigator.clipboard.writeText(text);
  alert("内容已复制到剪贴板！");
});

pdfBtn.addEventListener("click", () => {
  const text = document.querySelector(".resume-content")?.innerText;
  const blob = new Blob([text], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "简历.pdf";
  a.click();
});

wordBtn.addEventListener("click", () => {
  const text = document.querySelector(".resume-content")?.innerText;
  const blob = new Blob([text], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "简历.doc";
  a.click();
});
