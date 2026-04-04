function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 实习经历标题：多行时取首行，否则默认 */
function deriveExperienceTitle(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "实习与项目经历";
  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return lines[0].slice(0, 120);
  return "实习与项目经历";
}

/** 从模型输出的经历文本中抽出若干条 bullet 文案 */
function bulletsFromExperienceText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) {
    return ["（暂无行为描述，请补充经历后重新生成）"];
  }
  const items = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^[-•*]\s*(.+)$/) || t.match(/^\d+[.)、]\s*(.+)$/);
    if (m) items.push(m[1].trim());
    else if (!items.length && t.length > 0) items.push(t);
  }
  return items.length ? items : [raw];
}

/** 技能模块：品类行「xxx：」+ 后续「-」行为 ul/li */
function skillsToStructuredHtml(skillText) {
  const lines = String(skillText ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "<ul><li>暂无</li></ul>";

  let out = "";
  let openUl = false;
  const closeUl = () => {
    if (openUl) {
      out += "</ul>";
      openUl = false;
    }
  };

  for (const line of lines) {
    const catOnly = line.match(/^(.+)[：:]\s*$/);
    if (catOnly && !/^\s*[-•*]/.test(line)) {
      closeUl();
      out += `<h3>${escapeHtml(catOnly[1])}</h3><ul>`;
      openUl = true;
      continue;
    }
    const bullet = line.match(/^\s*[-•*]\s*(.+)$/);
    if (bullet) {
      if (!openUl) {
        out += "<ul>";
        openUl = true;
      }
      out += `<li>${escapeHtml(bullet[1])}</li>`;
      continue;
    }
    closeUl();
    out += `<p>${escapeHtml(line)}</p>`;
  }
  closeUl();
  return out || `<ul><li>${escapeHtml(skillText)}</li></ul>`;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.json();

  const experience = body.experience || "";
  const skills = body.skills || "";

  const apiKey = env.ZHIPU_API_KEY;
  const apiURL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  // =========================
  // 🧩 Step1：经历结构提取
  // =========================

  const structurePrompt = `
你的任务是：把用户输入拆成结构化信息。

【结构】

场景：
行为：
支撑动作：

【规则】

1. 只使用用户提供的信息
2. 不允许补充、推测或总结
3. 不输出能力标签
4. 行为控制在2-3个
5. 只使用基础动作（整理 / 协助 / 执行 / 记录 / 沟通 / 分类 / 收集）

【输入】
${experience}
`;

  const structureResp = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        { role: "system", content: "你是结构信息提取助手" },
        { role: "user", content: structurePrompt },
      ],
      temperature: 0.3,
    }),
  });

  const structureData = await structureResp.json();
  const structureText =
    structureData.choices?.[0]?.message?.content || "";

  // =========================
  // 🧩 Step2：经历表达生成
  // =========================

  const expressionPrompt = `
你的任务是：将结构化经历转为“可投递简历表达”。

【要求】

1. 输出2条经历
2. 每条 15–25字
3. 只允许基于输入结构生成，不得补充新信息
4. 不允许出现“包括/例如/等”
5. 不允许成果数据（如提升XX%）
6. 不允许高级词（优化/主导/负责/策略）

【表达风格】

更像：
- 协助整理商品信息，保证数据准确
- 记录销售数据，支持日常运营

而不是：
- 负责xxx
- 优化xxx

【输入】
${structureText}

直接输出：
- xxx
- xxx
`;

  const finalResp = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        { role: "system", content: "你是简历表达生成助手" },
        { role: "user", content: expressionPrompt },
      ],
      temperature: 0.5,
    }),
  });

  const finalData = await finalResp.json();
  const experienceResult =
    finalData.choices?.[0]?.message?.content || "";

  // =========================
  // 🧩 Step3：技能模块生成
  // =========================

  const skillPrompt = `
你的任务是：将技能关键词扩展为“可投递简历技能模块”。

【输入】
${skills}

【要求】

1. 每个技能拆成2-3个子技能
2. 只允许基础能力
3. 不允许新增技术（如Python/SQL）
4. 不允许高级能力（建模/策略/优化）
5. 表达要具体、日常
6. 禁止抽象能力词（如：沟通能力、表达能力、理解能力）
【输出格式】

数据分析：
- Excel基础操作
- 数据整理
- 基础数据统计

新媒体运营：
- 内容发布
- 数据统计
- 信息整理
`;

  const skillResp = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        { role: "system", content: "你是技能模块生成助手" },
        { role: "user", content: skillPrompt },
      ],
      temperature: 0.4,
    }),
  });

  const skillData = await skillResp.json();
  const skillResult =
    skillData.choices?.[0]?.message?.content || "";

  const expTitle = deriveExperienceTitle(experience);
  const expBullets = bulletsFromExperienceText(experienceResult);
  const expListHtml = expBullets
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("");
  const skillsInnerHtml = skillsToStructuredHtml(skillResult);

  const finalResume = `
<section>
  <h2>基本信息</h2>
  <p>姓名：${escapeHtml(body.name)}</p>
  <p>学校：${escapeHtml(body.school)}</p>
  <p>专业：${escapeHtml(body.major)}</p>
</section>
<section>
  <h2>求职意向</h2>
  <p>目标岗位：${escapeHtml(body.job)}</p>
</section>
<section>
  <h2>教育背景</h2>
  <p>${escapeHtml(body.school)} · ${escapeHtml(body.major)}</p>
</section>
<section>
  <h2>实习经历</h2>
  <h3>${escapeHtml(expTitle)}</h3>
  <ul>
    ${expListHtml}
  </ul>
</section>
<section>
  <h2>技能</h2>
  ${skillsInnerHtml}
</section>
`.trim();

  // =========================
  // ✅ 最终返回
  // =========================

  return new Response(
    JSON.stringify({
      resume: finalResume,
      experience: experienceResult.trim(),
      skills: skillResult.trim(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
