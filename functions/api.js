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

  const apiKey = env.ZHIPU_API_KEY;
  const apiURL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  // =========================
  // 🧩 Prompt1：结构提取
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

  // 调用 Step1
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
  // 🧩 Prompt2：表达生成
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

【风格】

优先使用：
协助 / 参与 / 完成 / 整理 / 沟通

禁止：
负责 / 主导 / 策划 / 优化

直接输出，不要解释
【表达等级限制（必须执行）】

所有表达必须保持“执行层”，禁止升级为“策略层”。

允许表达：
- 协助执行
- 参与整理
- 完成基础任务
- 进行沟通

禁止表达：
- 策划
- 设计
- 优化
- 复盘
- 主导

如果输入中没有明确“策划/设计”：
绝对不允许出现这些词。
`;

  // 调用 Step2
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
  let result = finalData.choices?.[0]?.message?.content || "";

  result = result.trim();

  return new Response(
    JSON.stringify({
      structure: structureText,
      result: result,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
