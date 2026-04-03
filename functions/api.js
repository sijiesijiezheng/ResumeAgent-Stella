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

// =========================
// 🧩 Step4：简历整合
// =========================

const finalPrompt = `
你的任务是：将用户信息 + 经历 + 技能，整合为一份简历片段

【基础信息】
姓名：${body.name}
学校：${body.school}
专业：${body.major}
岗位：${body.job}

【经历描述】
${experienceResult}

【技能模块】
${skillResult}

【输出要求】

1. 必须包含：姓名 / 学校 / 专业 / 求职岗位
2. 按简历格式输出
3. 不允许编造信息
4. 不要新增经历

直接输出完整简历
`;

const finalResumeResp = await fetch(apiURL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "glm-4-flash",
    messages: [
      { role: "system", content: "你是简历整合助手" },
      { role: "user", content: finalPrompt },
    ],
    temperature: 0.5,
  }),
});



const finalResume = `
姓名：${body.name}

教育背景：
- ${body.school} ${body.major}

求职岗位：
- ${body.job}

实习经历：
${experienceResult}

技能模块：
${skillResult}
`;


  // =========================
  // ✅ 最终返回
  // =========================

 return new Response(
  JSON.stringify({
    resume: finalResume   // ⭐ 新增
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
