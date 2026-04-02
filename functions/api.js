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
你不是在写简历。

你的任务是：把用户的一段经历，拆解为结构化信息。

【结构拆解】

场景：
行为：
支撑动作：
能力标签：

【行为规则】

只允许使用以下基础动作：
整理 / 协助 / 执行 / 记录 / 沟通 / 分类 / 收集

禁止使用：
策划 / 负责 / 主导 / 优化 / 复盘 / 设计 / 运营 / 管理

【约束】

1. 严禁编造信息
2. 不允许补充成果（如提升XX%）
3. 只允许低经验学生能完成的动作
4. 行为必须控制在2-3个

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
你的任务是：将结构化经历转成简历表达。

【输入结构】
${structureText}

【输出要求】

1. 输出2条简历描述
2. 每条必须动词开头
3. 不允许夸大
4. 不允许新增信息
5. 不允许出现成果数据
6. 必须符合低经验学生表达

【表达等级限制】

只允许执行层表达：
协助 / 参与 / 完成 / 整理 / 沟通

禁止：
策划 / 设计 / 优化 / 主导 / 负责

直接输出
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
你的任务是：将用户提供的技能关键词，扩展为简历技能模块。

【输入】
${skills}

【规则】

1. 每个技能扩展为2-4个子技能
2. 只允许基础技能
3. 不允许新增用户未提及的技术（如Python、SQL）
4. 不允许高级能力（如建模、策略、优化）

【输出格式】

技能名称：
- 子技能1
- 子技能2
- 子技能3
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

const finalResumeData = await finalResumeResp.json();
const finalResume =
  finalResumeData.choices?.[0]?.message?.content || "";


  // =========================
  // ✅ 最终返回
  // =========================

 return new Response(
  JSON.stringify({
    resume: finalResume.trim(),     // ⭐ 新增
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
