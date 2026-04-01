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
- 若专业包含“计算机”“软件”“人工智能”“信息”：偏重数据处理、编程、系统开发、分析能力。
- 若专业包含“教育”“英语”“汉语言”：偏重教学辅助、文案撰写、课程设计。
- 若专业包含“生物”“化学”“环境”：偏重实验、数据记录、研究报告。
- 其他情况：以“校内活动经验 + 学习能力 + 通用办公技能”为主。
`;

  // ====== Prompt 模块开始 ======

  const userInfoBlock = `
【用户信息】
- 姓名：${name}
- 学校：${school}
- 专业：${major}
- 目标岗位 / JD：${job}
- 简历风格：${style}
- 技能关键词：${skills}
- 相关经历：${experience}
- 补充说明：${extra}
`;

  const outputRules = `
【最重要的输出规则】
你在内部可以执行“生成、检查、修正”三个步骤，但这些步骤的过程内容绝对不能展示给用户。

用户最终只能看到两部分：
1. 优化后的完整简历
2. 待补充信息

严禁输出以下任何内容：
- Step 1 / Step 2 / Step 3
- Generator / Reviewer / Refiner
- 核心原则
- 生成策略
- 输出结构
- 写作要求
- 自我检查
- 问题列表
- 优化建议
- markdown、md、代码围栏、星号加粗格式
`;

  const generalModeBlock = `
【当前生成模式：通用结构模式（general_mode）】

适用场景：
- 用户没有提供明确的岗位JD
- 用户只想先生成一版通用简历
- 当前目标是“先把简历立起来”

你的重点是：
1. 先把用户已有信息结构化表达出来
2. 优先把模糊经历拆成更清晰的“动作 + 方法 + 基础结果”
3. 如果经历较少，可以补充“能力 / 品质 / 可迁移能力”，但不能喧宾夺主
4. 表达必须保守、真实、可解释，不要拔高
5. 输出要像一份通用版可修改简历，而不是素材清单或说明书

通用模式下的经历表达要求：
- 每段经历尽量拆成 2–3 条
- 每条优先包含：
  - 做了什么
  - 如何做
  - 体现了什么基础能力
- 如果没有明确成果，不要硬编数据，可写成：
  - 支持活动执行
  - 协助完成整理
  - 提升流程清晰度
  - 保证任务顺利推进
- 避免只写“参与过”“负责过”而没有具体动作

最终目标：
生成一版结构稳定、表达清晰、可信可改的通用简历
`;

  const matchModeBlock = `
【当前生成模式：岗位匹配模式（match_mode）】

适用场景：
- 用户提供了明确的岗位描述 / JD / 明确岗位要求
- 当前目标是“生成一版更贴近目标岗位的简历”

你的重点是：
1. 优先展示与岗位最相关的经历、技能、能力
2. 对已有经历做“岗位相关性重写”，但不得编造新经历、新成果
3. 可以使用JD中的关键词重写表达方式，但不得虚构事实
4. 弱化与岗位无关的信息，强化与岗位有关的动作、能力与场景
5. 整体输出要让人感觉“这是为这个岗位准备的简历”

岗位匹配模式下的经历表达要求：
- 先判断JD最看重什么能力，例如：
  - 文案撰写
  - 数据整理
  - 活动执行
  - 沟通协调
  - 复盘分析
- 再从用户已有经历中，优先抽取最贴近这些能力的部分来写
- 每段经历尽量写成 2–3 条，且每条都尽量体现：
  - 岗位相关动作
  - 使用的方法或工具
  - 对任务推进的实际支持
- 如果没有明确数据，不要编造数字，但可以写成：
  - 支持活动推进
  - 协助完成文案整理
  - 进行基础数据整理与分析
  - 为后续复盘提供支持

匹配模式下的表达原则：
- 不只是“把JD关键词塞进去”
- 而是让经历的重心更靠近岗位要求
- 让简历看起来更像这个岗位的候选人

最终目标：
生成一版岗位相关性明显更强、但仍真实可信的定制简历
`;

  const commonWorkflowBlock = `
==============================
Step 1：生成初版简历（Generator）
==============================

请先生成一份“可修改简历初稿”。

【真实性约束】
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

【低信息输入处理策略（关键规则）】
当用户提供的信息非常简单或模糊（例如只有一句经历）时，请按以下步骤处理：

1. 信息拆解：
将用户提供的一句话经历，拆解为以下结构：
- 场景（在哪里做）
- 行为（做了什么）
- 基础能力（体现了什么能力）

2. 合理结构补全（不允许编造事实）：
允许补充以下“通用行为动作”，但必须符合常识：
- 内容整理 / 撰写
- 基础数据处理
- 协助执行
- 简单分析
- 沟通协调

禁止补充：
- 明确成果数据（如提升XX%）
- 未提到的公司/项目
- 未提供的具体职责

3. 表达生成：
将拆解后的内容转化为简历表达，要求：
- 使用动词开头
- 拆成2–3条
- 表达具体但不过度夸大

目标：
在不编造事实的前提下，让“简单经历”看起来结构清晰、可用于简历。

【写作要求】
1. 输出必须是纯中文简历文本，不允许出现 markdown、md、代码围栏、星号加粗、井号标题、数字标题样式。
2. 避免空话、套话，如“具备良好能力”“学习能力强”等。
3. 优先保留用户真实亮点，不要机械重复原句。
4. 最终输出必须接近“用户可以直接复制后修改”的简历草稿。
5. “实践 / 项目 / 实习经历”部分：
   - 如果用户提供了相关经历，优先基于这些经历扩写；
   - 不要新增用户未提到的新经历；
   - 表达尽量清晰、具体；
   - 尽量使用动词开头；
   - 避免空话套话。
6. 技能特长部分：
   - 仅总结用户已有技能信息；
   - 不要自行推断用户会的工具或技能。
7. 教育背景部分：
   - 仅写用户明确提供的学校、专业；
   - 如果没有 GPA，不要补 GPA。
8. 获奖与证书部分：
   - 如果用户未提供，默认不生成该模块内容。
9. 自我评价部分：
   - 必须尽量贴合用户的真实背景与目标岗位；
   - 尽量减少模板化表达。
10. 思考与延伸部分：
   - 生成 3–5 个与该简历相关的面试或自我反思问题。

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

注意：以上 Reviewer 内容仅用于内部检查，不允许出现在最终对用户展示的结果中。

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

【最终输出结构】
请按以下结构输出最终版本：
个人信息
教育背景
实践 / 项目 / 实习经历
技能特长
自我评价
思考与延伸

【必须新增的最后模块】
在最终简历末尾增加：

待补充信息：
1.
2.
3.

这一部分用于提醒用户补充关键信息，例如：
- 联系方式 / 邮箱
- GPA（如需要）
- 获奖与证书
- 更具体的项目细节
- 可量化成果
- 毕业时间
- 其他简历关键信息

最终对用户展示时，只允许输出以下两部分：
第一部分：优化后的完整简历
第二部分：待补充信息

除此之外，任何内部过程、检查内容、规则说明、步骤标题、解释文字，一律禁止输出。
同时禁止使用 markdown 格式、星号、编号标题样式，只输出正常中文简历文本。
`;

  // ====== 最小策略层 v1：有 JD / 无 JD ======
  const hasJD =
    job &&
    job.trim().length > 12 &&
    (
      job.includes("职责") ||
      job.includes("要求") ||
      job.includes("负责") ||
      job.includes("任职") ||
      job.includes("岗位") ||
      job.includes("JD") ||
      job.includes("job description") ||
      job.includes("Job Description")
    );

  const modeBlock = hasJD ? matchModeBlock : generalModeBlock;

  const prompt = `
你是一位专业的中文简历顾问。

${outputRules}

${userInfoBlock}

${industryHints}

${modeBlock}

${commonWorkflowBlock}
`;

  // ====== Prompt 模块结束 ======

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
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/gm, "")
      .trim();

    return new Response(
      JSON.stringify({
        result: raw,
        format: "text",
        mode: hasJD ? "match_mode" : "general_mode",
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
