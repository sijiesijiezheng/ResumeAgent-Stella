document.getElementById("resumeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const school = document.getElementById("school").value.trim();
  const major = document.getElementById("major").value.trim();
  const job = document.getElementById("job").value.trim();
  const skills = document.getElementById("skills").value.trim();
  const extra = document.getElementById("extra").value.trim();
  const output = document.getElementById("output");
  output.innerHTML = "⏳ 正在生成简历，请稍候...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, school, major, job, skills, extra }),
    });
    if (!res.ok) throw new Error(`请求失败 (${res.status})`);
    const data = await res.json();
    output.innerHTML = `<h2>✅ 简历生成成功</h2><pre>${data.result}</pre>`;
  } catch (err) {
    output.innerHTML = `<p style='color:red;'>❌ 生成失败：${err.message}</p>`;
  }
});
