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
  const name = body.name || "";
  const school = body.school || "";
  const major = body.major || "";
  const job = body.job || body.position || "";
  const style = body.style || "normal";
  const skills = body.skills || "";
  const experience = body.experience || "";
  const extra = body.extra || "";

  const apiKey = env.ZHIPU_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "后端未配置智谱 API Key" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const apiURL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  const industryHints = `
【行业提示模板】（供模型参考）
- 若专业包含“建筑”“土木”“设计”：偏重方案设计、图纸绘制、项目配合。
- 若专业包含“经济”“管理”“市场”“国贸”：偏重调研、活动策划、数据分析。
- 若专业包含“计算机”“软件”“人工智能”：偏重编程、系统开发、算法优化。
- 若专业包含“教育”“英语”“汉语言”：偏重教学辅助、文案撰写、课程设计。
- 若专业包含“生物”“化学”“环境”：偏重实验、数据记录、研究报告。
- 其他情况：以“校内活动经验 + 学习能力 + 通用办公技能”为主。
`;

const prompt = `
你是一位专业的中文简历顾问。

你的任务不是凭空“写一份好看的简历”，而是基于用户已经提供的信息，生成一份**真实、可信、可修改、接近可直接投递**的简历初稿，并通过“生成—检查—修正”的流程提升质量。

【学生信息】
- 姓名：${name}
- 学校：${school}
- 专业：${major}
- 申请岗位：${job}
- 技能关键词：${skills}
- 相关经历：${experience}
- 补充说明：${extra}

${industryHints}

==============================
Step 1：生成初版简历（Generator）
==============================

请先生成一份“可修改简历初稿”。

【核心原则】
1. 严格基于用户提供的信息生成内容。
2. 严禁编造用户未提供的事实信息。
3. 严禁“合理补全”以下高风险信息：
   - GPA
   - 获奖与证书
   - 具体公司名称
   - 具体项目成果数据
   - 毕业时间
   - 任何用户未明确提供的经历
4. 如果某些重要信息用户未提供：
   - 不要生成虚假内容
   - 可以不写
   - 或在最终结果中放入“待补充信息”

【生成策略】
请将重点放在：
- 整理已有信息
- 优化表达
- 提升结构清晰度
- 帮助用户快速得到第一版可修改简历

而不是：
- 凭空补全经历
- 生成看似完整但不可信的内容

【输出结构（必须遵守）】
请按照以下结构输出：

1. 个人信息
2. 教育背景
3. 实践 / 项目 / 实习经历
4. 技能特长
5. 自我评价
6. 思考与延伸（生成5个针对该简历的面试或自我反思问题）

【写作要求】
1. “实践 / 项目 / 实习经历”部分：
   - 如果用户提供了相关经历，优先基于这些经历扩写；
   - 不要新增用户未提到的新经历；
   - 表达尽量清晰、具体；
   - 尽量使用动词开头；
   - 避免空话套话。

2. 技能特长部分：
   - 仅总结用户已有技能信息；
   - 不要自行推断用户会的工具或技能。

3. 教育背景部分：
   - 仅写用户明确提供的学校、专业；
   - 如果没有 GPA，不要补 GPA。

4. 获奖与证书部分：
   - 如果用户未提供，默认不生成该模块内容。

5. 自我评价部分：
   - 避免“具备良好能力”“学习能力强”等空泛表述；
   - 必须尽量贴合用户的真实背景与目标岗位。

6. 输出中不要出现代码围栏，不要出现 markdown、md 等说明性文字。

==============================
Step 2：自我检查（Reviewer）
==============================

请你扮演一位严格的HR / 简历审核官，对刚才生成的简历初稿进行检查。

请重点检查以下问题：

1. 是否存在编造信息或用户未提供却被补全的信息
2. 是否存在难以自述、看起来不真实的内容
3. 是否存在空话 / 套话 / 无信息量表达
4. 是否存在结构不清晰、不像“可修改简历”的内容
5. 是否遗漏了用户原本已有的亮点
6. 是否有应该补充但当前缺失的重要信息

请严格按如下格式输出：

问题列表：
1.
2.
3.

优化建议：
1.
2.
3.

==============================
Step 3：优化生成最终版本（Refiner）
==============================

请根据 Reviewer 的问题和优化建议，重新生成“优化后的最终简历版本”。

【Refiner 要求】
1. 删除所有不可信、编造、难以自述的内容
2. 收紧表达，减少空话和模板化措辞
3. 保留真实信息和用户已有亮点
4. 强化结构清晰度，让输出更接近“可直接修改使用的简历”
5. 不新增任何用户未提供的关键信息

【必须新增的最后模块】
在最终简历末尾增加：

待补充信息：
1.
2.
3.

这一部分用于提醒用户补充关键信息，例如：
- GPA（如需要）
- 获奖与证书
- 更具体的项目细节
- 可量化成果
- 其他简历关键信息

最终只输出“优化后的完整简历”以及“待补充信息”。
不要输出 Reviewer 检查过程，不要输出解释文字。
`;

  try {
    const aiResp = await fetch(apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: "你是一位专业的中文简历生成顾问。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = await aiResp.json();
    let raw = data.choices?.[0]?.message?.content ?? "";

    raw = raw
      .replace(/```(markdown|md)?/gi, "")
      .replace(/```/g, "")
      .replace(/^\s*(markdown|md)\s*\n/i, "")
      .trim();

    return new Response(
      JSON.stringify({
        result: raw,
        format: "markdown",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "生成失败：" + e.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
