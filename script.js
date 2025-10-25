/* ===========================================================
   Resume Agent Frontend Script v3.1｜导出增强版
   Author: SIS 主控人格
   Date: 2025-10-25
   =========================================================== */

const form = document.getElementById('resumeForm');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');
const pdfBtn = document.getElementById('pdfBtn');
const wordBtn = document.getElementById('wordBtn');

const validKeys = ['RA2025FREE', 'RA2025CAMPUS', 'RA2025PRO', 'RA2025DEV'];

// 初始化按钮状态
[copyBtn, pdfBtn, wordBtn].forEach(btn => {
  btn.disabled = true;
  btn.title = "请先生成简历";
});

/* ==============================
   简历生成逻辑
   ============================== */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const key = document.getElementById('license').value.trim();
  if (!validKeys.includes(key)) {
    alert('无效激活码');
    return;
  }

  const name = document.getElementById('name').value;
  const job = document.getElementById('job').value;
  const experience = document.getElementById('experience').value;

  output.innerHTML = '<p>⏳ 正在生成，请稍候...</p>';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input: `为 ${name} 生成一份 ${job} 岗位的简历，经历：${experience}`
      })
    });

    const data = await response.json();
    const text = data.output[0].content[0].text;
    output.innerHTML = `<pre id="result" style="white-space: pre-wrap; font-family: inherit;">${text}</pre>`;

    enableExportButtons();
    showSuccessMessage();

  } catch (error) {
    console.error('生成错误:', error);
    output.innerHTML = '<p style="color:red;">❌ 简历生成失败，请重试。</p>';
  }
});

/* ==============================
   启用导出功能
   ============================== */
function enableExportButtons() {
  [copyBtn, pdfBtn, wordBtn].forEach(btn => {
    btn.disabled = false;
  });
  copyBtn.title = "复制简历内容";
  pdfBtn.title = "导出 PDF";
  wordBtn.title = "导出 Word";
}

function showSuccessMessage() {
  const msg = document.createElement('p');
  msg.textContent = "✅ 简历生成成功，可导出或复制。";
  msg.style.color = "#059669";
  msg.style.textAlign = "center";
  msg.style.marginTop = "10px";
  output.appendChild(msg);
}

/* ==============================
   复制简历功能
   ============================== */
copyBtn.addEventListener('click', () => {
  const result = document.getElementById('result');
  if (!result) {
    alert("请先生成简历");
    return;
  }
  navigator.clipboard.writeText(result.innerText);
  alert("✅ 已复制到剪贴板");
});

/* ==============================
   导出 PDF 功能
   ============================== */
pdfBtn.addEventListener('click', () => {
  const result = document.getElementById('result');
  if (!result) {
    alert("请先生成简历");
    return;
  }

  // 动态加载 jsPDF
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onload = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const text = result.innerText;
    const pageWidth = doc.internal.pageSize.getWidth() - 80;
    const lineHeight = 16;
    const lines = doc.splitTextToSize(text, pageWidth);

    let y = 60;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Resume Agent 智能简历", 40, y);
    y += 30;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    for (let i = 0; i < lines.length; i++) {
      if (y > 770) {
        doc.addPage();
        y = 60;
      }
      doc.text(lines[i], 40, y);
      y += lineHeight;
    }

    doc.save("ResumeAgent_简历.pdf");
  };
  document.body.appendChild(script);
});

/* ==============================
   导出 Word 功能
   ============================== */
wordBtn.addEventListener('click', () => {
  const result = document.getElementById('result');
  if (!result) {
    alert("请先生成简历");
    return;
  }

  const content = result.innerText;
  const blob = new Blob(
    [`<html><head><meta charset='utf-8'></head><body><pre>${content}</pre></body></html>`],
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  );

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "ResumeAgent_简历.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

/* ==============================
   辅助函数
   ============================== */
function resetButtons() {
  [copyBtn, pdfBtn, wordBtn].forEach(btn => (btn.disabled = true));
}
