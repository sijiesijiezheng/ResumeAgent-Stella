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
请基于以下信息，为学生生成一份完整的中文简历，输出为纯文本格式，不要添加任何代码块或说明性标记。

【学生信息】
- 姓名：${name}
- 学校：${school}
- 专业：${major}
- 申请岗位：${job}
- 简历风格：${style}
- 技能关键词：${skills}
- 相关经历：${experience}
- 补充说明：${extra}

${industryHints}

【写作要求】
1. 使用如下结构：
   个人信息
   教育背景
   实践 / 实习经历
   技能特长
   获奖与证书
   自我评价
   思考与延伸（生成五个针对该简历的面试或自我反思问题）

2. “实践 / 实习经历”部分：
   - 至少2段；
   - 每段以列表形式呈现；
   - 每段150到200字；
   - 内容应贴合专业领域与岗位类型。

3. 优先基于用户提供的“相关经历”进行扩写，严禁凭空编造完全不存在的经历。

4. 如果用户提供的经历较少，可以做适度补充，但必须贴合学生背景，避免夸大。

5. 根据用户选择的简历风格，强制使用对应表达方式：

   - normal：
     使用标准校招表达，描述清晰自然，不刻意强调结果数据。

   - internet：
  必须以“结果或优化动作”开头描述经历，而不是以“负责/参与”开头。
  每段优先写成果，再写做法，例如：
  - 通过优化XX，使XX提升XX%
  - 通过数据分析，提升XX
  必须体现执行力、增长意识和结果导向。

   - finance：
  每一条经历必须以“分析或支持”开头，而不是描述执行动作。

  优先使用如下句式：
  - 对XX进行整理与分析，得出XX结论
  - 基于数据分析，支持XX决策或优化方向
  - 协助完成XX分析工作，为XX提供依据

  禁止使用“负责、主导、推动、提升”等执行型表达。

  整体角色应呈现为“分析支持者”，而不是“执行者”。

  避免使用“负责、主导、推动、提升”等执行或结果导向词汇。
  整体语气应偏理性、克制、偏分析，而不是强调成果。

6. 输出中不要出现代码围栏，不要出现 markdown、md 等说明性文字。
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
