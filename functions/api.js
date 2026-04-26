function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
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

function clamp(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function levelFromScore(score) {
  if (score >= 80) return "主经历";
  if (score >= 60) return "可写经历";
  if (score >= 40) return "辅助经历";
  return "暂不建议写";
}

function frontFeedbackForLevel(level) {
  if (level === "主经历") {
    return "这段经历挺适合作为主经历来写。它有明确场景和动作，我们接下来把结果和数据补实一点，就能写得比较有竞争力。";
  }
  if (level === "可写经历") {
    return "这段经历可以写，只是现在还稍微有点薄。我再问你一两个小问题，把它写得更实一点。";
  }
  if (level === "辅助经历") {
    return "这件事可以作为辅助经历，但如果要放在简历最显眼的位置，可能还不够有重量。我们可以先记下来，再看看有没有更适合作为主经历的事。";
  }
  return "这件事目前能写出的内容比较有限，不是不能写，只是可能不适合作为主经历。我们先换个方向找找，也许你还有更值得写的一段。";
}

function defaultNextQuestion(priority) {
  const questions = {
    "事实具体性": "你当时具体做的第一步是什么？很小的一步也可以。",
    "角色贡献": "这件事里面，有没有哪一小块是你自己完成的？",
    "结果影响": "你做完之后，这些东西后来给谁用了？或者帮别人省了哪一步？",
    "规模数据": "这件事大概涉及多少人、多少份资料、几次活动，或者持续了多久？大概数也可以。",
    "岗位相关性": "你现在更想投哪类岗位？我可以按那个方向帮你判断这段经历值不值得重点写。",
    "表达潜力": "这件事里有没有一个你觉得最具体、最能说明你做过事的细节？",
    "无": "",
  };
  return questions[priority] || questions["表达潜力"];
}

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {}

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {}
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (_) {}
  }
  return null;
}

function normalizeEvaluation(rawEvaluation) {
  const dimensionScores = rawEvaluation?.dimension_scores || {};
  const normalized = {
    score: clamp(rawEvaluation?.score, 0, 100),
    level: rawEvaluation?.level || "",
    recommended_section: rawEvaluation?.recommended_section || "校园经历",
    is_main_experience_candidate: Boolean(rawEvaluation?.is_main_experience_candidate),
    dimension_scores: {
      specificity: clamp(dimensionScores.specificity, 0, 20),
      role_contribution: clamp(dimensionScores.role_contribution, 0, 20),
      impact: clamp(dimensionScores.impact, 0, 20),
      scale_data: clamp(dimensionScores.scale_data, 0, 15),
      job_relevance: clamp(dimensionScores.job_relevance, 0, 15),
      expression_potential: clamp(dimensionScores.expression_potential, 0, 10),
    },
    strengths: Array.isArray(rawEvaluation?.strengths) ? rawEvaluation.strengths.slice(0, 5) : [],
    weaknesses: Array.isArray(rawEvaluation?.weaknesses) ? rawEvaluation.weaknesses.slice(0, 5) : [],
    missing_info_priority: rawEvaluation?.missing_info_priority || "表达潜力",
    next_question: rawEvaluation?.next_question || "",
    rewrite_risk: rawEvaluation?.rewrite_risk || "",
    allowed_positioning: rawEvaluation?.allowed_positioning || "",
    forbidden_claims: Array.isArray(rawEvaluation?.forbidden_claims)
      ? rawEvaluation.forbidden_claims.slice(0, 8)
      : [],
    user_feedback: rawEvaluation?.user_feedback || "",
  };

  const scoreFromDimensions = Object.values(normalized.dimension_scores).reduce(
    (sum, value) => sum + value,
    0
  );
  if (!Number.isFinite(Number(rawEvaluation?.score))) {
    normalized.score = scoreFromDimensions;
  }
  normalized.level = ["主经历", "可写经历", "辅助经历", "暂不建议写"].includes(
    normalized.level
  )
    ? normalized.level
    : levelFromScore(normalized.score);
  normalized.is_main_experience_candidate = normalized.score >= 80;

  if (!normalized.next_question && normalized.score < 80) {
    normalized.next_question = defaultNextQuestion(normalized.missing_info_priority);
  }
  if (!normalized.user_feedback) {
    normalized.user_feedback = frontFeedbackForLevel(normalized.level);
  }
  return normalized;
}

function fallbackEvaluation({ targetRole, experience, structureText }) {
  const text = `${experience}\n${structureText}`;
  const hasNumber = /\d|一|二|三|四|五|六|七|八|九|十|百|千|万|多|几/.test(text);
  const hasAction = /整理|核对|记录|对接|沟通|执行|发布|收集|分类|维护|协助|参与|完成|跟进/.test(text);
  const hasImpact = /支持|用于|帮助|交付|发布|完成|服务|反馈|统计|管理|报名|审核/.test(text);
  const hasRole = /我|自己|独立|协助|参与|负责|主导|完成/.test(text);
  const hasTarget = String(targetRole || "").trim().length > 0;

  const dimensionScores = {
    specificity: hasAction ? 14 : 6,
    role_contribution: hasRole ? 12 : 6,
    impact: hasImpact ? 12 : 6,
    scale_data: hasNumber ? 9 : 2,
    job_relevance: hasTarget ? 9 : 5,
    expression_potential: hasAction ? 7 : 3,
  };
  const score = Object.values(dimensionScores).reduce((sum, value) => sum + value, 0);
  const level = levelFromScore(score);
  const missing = !hasAction
    ? "事实具体性"
    : !hasRole
      ? "角色贡献"
      : !hasImpact
        ? "结果影响"
        : !hasNumber
          ? "规模数据"
          : !hasTarget
            ? "岗位相关性"
            : score >= 80
              ? "无"
              : "表达潜力";

  return normalizeEvaluation({
    score,
    level,
    recommended_section: score >= 80 ? "项目经历" : score >= 40 ? "校园经历" : "暂不建议写",
    dimension_scores: dimensionScores,
    strengths: [hasAction ? "有可描述的基础动作" : "已有初步经历线索"],
    weaknesses: [
      !hasNumber ? "缺少数量、周期或规模" : "规模信息已初步出现",
      !hasImpact ? "缺少结果、用途或影响对象" : "已有初步结果线索",
    ],
    missing_info_priority: missing,
    next_question: defaultNextQuestion(missing),
    rewrite_risk: "当前评估来自规则兜底，建议继续补充事实后再生成最终表达。",
    allowed_positioning: score >= 60 ? "可作为可写经历继续深挖。" : "可先作为经历线索保留。",
    forbidden_claims: ["不能写主导", "不能编造百分比", "不能把一次性帮忙写成长期项目"],
  });
}

async function callChatCompletion(apiURL, apiKey, payload) {
  const resp = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`LLM request failed: ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function buildEvaluationPrompt({ targetRole, experience, structureText, mode }) {
  return `
你是一个面向低经历大学生的简历经历评估助手。

你的任务不是评价用户是否优秀，而是判断用户提供的这段经历：
1. 是否适合写进简历；
2. 适合放在简历哪个位置；
3. 当前信息还缺什么；
4. 下一步应该追问什么；
5. 哪些表达可以使用，哪些表达会构成夸大或虚构。

重要原则：
- 只拔高表达，不拔高事实。
- 不允许编造用户没有提供的事实、数字、结果、职位或职责。
- 不要因为经历普通就否定用户。
- 评估要温和，但判断要清楚。
- 如果经历较弱，要建议作为辅助经历或继续寻找更强经历，而不是硬写成主经历。
- 每次只提出一个最关键的追问。

请根据以下评分维度打分，总分 100：
A. 事实具体性 20 分：是否说清楚具体做了什么。
B. 角色贡献 20 分：用户是否有明确贡献。
C. 结果影响 20 分：是否有产出、用途、反馈或影响对象。
D. 规模数据 15 分：是否有数量、周期、频率或范围。
E. 岗位相关性 15 分：是否能对应目标岗位能力。
F. 表达潜力 10 分：是否能转成可信简历语言。

分级：
80-100：主经历
60-79：可写经历
40-59：辅助经历
0-39：暂不建议写

推荐动词：协助、参与、整理、核对、分类、记录、对接、跟进、支持、完成、维护、发布、收集、归档。
谨慎使用动词：负责、主导、统筹、优化、搭建、策划、推动、提升、管理。

输入信息：
- 目标岗位：${targetRole || "未提供"}
- 用户当前经历描述：${experience || "未提供"}
- 已知结构化事实：${structureText || "未提供"}
- 当前对话模式：${mode || "soft"}

请输出 JSON，字段如下：
{
  "score": number,
  "level": "主经历 | 可写经历 | 辅助经历 | 暂不建议写",
  "recommended_section": "实习经历 | 项目经历 | 校园经历 | 技能支撑 | 暂不建议写",
  "is_main_experience_candidate": boolean,
  "dimension_scores": {
    "specificity": number,
    "role_contribution": number,
    "impact": number,
    "scale_data": number,
    "job_relevance": number,
    "expression_potential": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "missing_info_priority": "事实具体性 | 角色贡献 | 结果影响 | 规模数据 | 岗位相关性 | 表达潜力 | 无",
  "next_question": string,
  "rewrite_risk": string,
  "allowed_positioning": string,
  "forbidden_claims": string[],
  "user_feedback": string
}

输出要求：
- 只输出 JSON。
- next_question 必须是低压力、口语化、容易回答的问题。
- user_feedback 必须温和，不要直接说用户不行。
- 如果信息已经足够生成，next_question 写空字符串。
- forbidden_claims 必须明确指出不能夸大的方向。
`;
}

async function evaluateExperience({ apiURL, apiKey, targetRole, experience, structureText, mode }) {
  const evaluationPrompt = buildEvaluationPrompt({
    targetRole,
    experience,
    structureText,
    mode,
  });

  try {
    const content = await callChatCompletion(apiURL, apiKey, {
      model: "glm-4-flash",
      messages: [
        { role: "system", content: "你是简历经历价值评估助手，只输出 JSON。" },
        { role: "user", content: evaluationPrompt },
      ],
      temperature: 0.2,
    });
    const parsed = extractJsonObject(content);
    if (parsed) return normalizeEvaluation(parsed);
  } catch (_) {
    // 评估失败不阻断简历生成，走规则兜底。
  }

  return fallbackEvaluation({ targetRole, experience, structureText });
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
  const targetRole = body.job || "";
  const mode = body.mode || "soft";

  const apiKey = env.ZHIPU_API_KEY;
  const apiURL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  // =========================
  // Step1：经历结构提取
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

  const structureText = await callChatCompletion(apiURL, apiKey, {
    model: "glm-4-flash",
    messages: [
      { role: "system", content: "你是结构信息提取助手" },
      { role: "user", content: structurePrompt },
    ],
    temperature: 0.3,
  });

  // =========================
  // Step2：经历价值评估
  // =========================

  const evaluation = await evaluateExperience({
    apiURL,
    apiKey,
    targetRole,
    experience,
    structureText,
    mode,
  });

  // =========================
  // Step3：经历表达生成
  // =========================

  const expressionPrompt = `
你的任务是：将结构化经历转为“可投递简历表达”。

【要求】

1. 输出2条经历
2. 每条 15-25字
3. 只允许基于输入结构生成，不得补充新信息
4. 不允许出现“包括/例如/等”
5. 不允许成果数据（如提升XX%）
6. 不允许高级词（优化/主导/负责/策略）
7. 必须遵守经历价值评估中的 forbidden_claims

【表达风格】

更像：
- 协助整理商品信息，保证数据准确
- 记录销售数据，支持日常运营

而不是：
- 负责xxx
- 优化xxx

【经历价值评估】
${JSON.stringify(evaluation, null, 2)}

【输入】
${structureText}

直接输出：
- xxx
- xxx
`;

  const experienceResult = await callChatCompletion(apiURL, apiKey, {
    model: "glm-4-flash",
    messages: [
      { role: "system", content: "你是简历表达生成助手" },
      { role: "user", content: expressionPrompt },
    ],
    temperature: 0.5,
  });

  // =========================
  // Step4：技能模块生成
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

  const skillResult = await callChatCompletion(apiURL, apiKey, {
    model: "glm-4-flash",
    messages: [
      { role: "system", content: "你是技能模块生成助手" },
      { role: "user", content: skillPrompt },
    ],
    temperature: 0.4,
  });

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
  // 最终返回
  // =========================

  return new Response(
    JSON.stringify({
      resume: finalResume,
      experience: experienceResult.trim(),
      skills: skillResult.trim(),
      evaluation,
      next_question: evaluation.next_question,
      user_feedback: evaluation.user_feedback,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
