// ==================== 初始化配置 ====================
let apiKey = localStorage.getItem("apiKey") || "https://resume-api.sijiesijiezheng.workers.dev";

const elements = {
  name: document.getElementById("name"),
  school: document.getElementById("school"),
  major: document.getElementById("major"),
  position: document.getElementById("position"),
  skills: document.getElementById("skills"),
  extra: document.getElementById("extra"),
  generateBtn: document.getElementById("generate"),
  output: document.getElementById("output"),
  loading: document.getElementById("loading"),
  quotaInfo: document.getElementById("quotaInfo"),
  exportPDF: document.getElementById("exportPDF"),
  exportWord: document.getElementById("exportWord"),
  openSettings: document.getElementById("openSettings"),
  settingsModal: document.getElementById("settingsModal"),
  closeModal: document.getElementById("closeModal"),
  newKey: document.getElementById("newKey"),
  saveKey: document.getElementById("saveKey"),
};

// ==================== 弹窗控制 ====================
elements.openSettings.onclick = () => (elements.settingsModal.style.display = "block");
elements.closeModal.onclick = () => (elements.settingsModal.style.display = "none");
elements.saveKey.onclick = () => {
  const val = elements.newKey.value.trim();
  if (!val) return alert("请输入 Key 或 API 地址");
  localStorage.setItem("apiKey", val);
  apiKey = val;
  elements.settingsModal.style.display = "none";
  alert("Key 已更新，刷新页面后生效。");
};

// ==================== Markdown 转换 ====================
function renderMarkdown(text) {
  if (!text) return "";
  // 用 marked.js 渲染成真正 HTML
  return marked.parse(text, {
    breaks: true,
    gfm: true
  });
}


// ==================== 主功能：生成简历 ====================
elements.generateBtn.addEventListener("click", async () => {
  const name = elements.name.value.trim();
  const school = elements.school.value.trim();
  const major = elements.major.value.trim();
  const position = elements.position.value.trim();
  const skills = elements.skills.value.trim();
  const extra = elements.extra.value.trim();

  if (!name || !school || !major || !position)
    return alert("请填写姓名、学校、专业和岗位。");

  elements.loading.style.display = "block";
  elements.output.innerHTML = "";

  try {
    console.log("📡 正在向 Worker 发送请求...");

    const res = await fetch(apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        school,
        major,
        job: position,
        skills,
        extra,
      }),
    });

    console.log("🌐 Worker 返回状态：", res.status);

    const data = await res.json();
    console.log("📦 返回数据：", data);

    const result =
      data.result ||
      data.output ||
      (typeof data === "string" ? data : JSON.stringify(data)) ||
      "⚠️ 生成失败，请稍后重试。";

    if (result.includes("上限")) {
      elements.output.innerHTML = `
        <div class="photo-area"><div class="photo-placeholder"></div></div>
        <p style="text-align:center;">${result}</p>`;
      alert("已达今日次数上限。如需更多生成，请升级专业版。");
    } else {
      elements.output.innerHTML = `
        <div class="photo-area"><div class="photo-placeholder"></div></div>
        ${renderMarkdown(result)}`;
      updateQuota();
    }
  } catch (err) {
    console.error("❌ 请求错误：", err);
    elements.output.innerHTML =
      "<p style='color:red;'>❌ 请求失败，请稍后重试。</p>";
  } finally {
    elements.loading.style.display = "none";
  }
});

// ==================== 剩余额度逻辑 ====================
function updateQuota() {
  let current = parseInt(localStorage.getItem("quota") || "5");
  if (current > 0) current--;
  localStorage.setItem("quota", current);
  elements.quotaInfo.innerText = `今日剩余额度：${current} 次`;
}
elements.quotaInfo.innerText = `今日剩余额度：${
  localStorage.getItem("quota") || 5
} 次`;

// ==================== 导出功能 ====================
elements.exportPDF.onclick = () => {
  const win = window.open("", "_blank");
  win.document.write(
    `<html><head><title>简历导出</title></head><body>${elements.output.innerHTML}</body></html>`
  );
  win.document.close();
  win.print();
};
elements.exportWord.onclick = () => {
  const blob = new Blob(["\ufeff" + elements.output.innerHTML], {
    type: "application/msword",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "AI简历.doc";
  link.click();
};
