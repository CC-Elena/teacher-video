/**
 * AnimAgent 流水线的提示词模板
 *
 * 三层架构：
 *   1. SYSTEM_PROMPT   – 角色 + 组件文档 + 硬约束
 *   2. FEW_SHOT_EXAMPLES – 3 个高质量的 输入→spec 对
 *   3. buildUserPrompt  – 当前任务 (+ 重试时的错误信息)
 */

import { ANIMATION_TOOLS } from "../components/animationTools";
import { ANIMATION_TEMPLATES } from "./templates";

const TOOL_DOCS = ANIMATION_TOOLS.map(
  (t) =>
    `### ${t.name}\n${t.description}\n参数: ${JSON.stringify(t.parameters.properties, null, 2)}`
).join("\n\n");

export const SYSTEM_PROMPT = `你是一个 AnimAgent，专业的数学动画代码生成专家。
你的工作是产生一个结构化的 AnimationSpec JSON，描述一系列工具调用，
以此为 SAT/AP 学生渲染教学数学动画。

## 可用动画工具
${TOOL_DOCS}

## 输出格式
你必须返回一个符合此 schema 的有效 JSON 对象：
{
  "concept": "简短的概念名称",
  "animationType": "derivative|integral|limit|function_graph|geometry|algebra_steps",
  "steps": [
    {
      "toolName": "<可用工具名称之一>",
      "params": { ...工具参数... },
      "startMs": 0,
      "durationMs": 2000,
      "description": "此步骤显示的内容"
    }
  ],
  "narration": ["第 1 行旁白", "第 2 行旁白"],
  "durationMs": 8000,
  "expectedOutcome": "学生将理解..."
}

## 硬约束
- 只能使用上方列表中的工具名称
- params 必须严格符合工具的参数 schema
- 每个步骤的 durationMs 必须为正且合理 (500–5000ms)
- 总时长 durationMs 应在 5000–15000ms 之间
- narration 数组必须至少包含 3 个条目，并遵循教学三段式：引入 → 动态演示 → 总结
- 不要在 JSON 之外包含任何解释
- 如果被要求修复错误，仅输出修正后的 JSON`;

export const FEW_SHOT_EXAMPLES = ANIMATION_TEMPLATES.slice(0, 3).map((template) => ({
  user: template.promptZh,
  spec: template.spec,
}));

export function selectFewShotExamples(userInput: string) {
  const normalized = userInput.toLowerCase();
  const scored = ANIMATION_TEMPLATES.map((template, index) => {
    const haystack = `${template.prompt} ${template.promptZh} ${template.title} ${template.titleZh} ${template.spec.concept}`.toLowerCase();
    const words = normalized.split(/[\s,，。?？]+/).filter((word) => word.length > 1);
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
    return { template, index, score };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, 3).map(({ template }) => ({
    user: template.promptZh,
    spec: template.spec,
  }));
}

/**
 * 构建发送给 LLM 的用户端消息。
 * 在重试时，会附加之前的错误，以便 LLM 自行修复。
 */
export function buildUserPrompt(
  userInput: string,
  previousError?: string,
  previousSpec?: string
): string {
  if (previousError && previousSpec) {
    return `上一次尝试失败，错误信息如下：
\`\`\`
${previousError}
\`\`\`

导致错误的原始 AnimationSpec：
\`\`\`json
${previousSpec}
\`\`\`

请修复 JSON 并返回修正后的 AnimationSpec。
用户的原始请求： "${userInput}"`;
  }
  return `为以下内容生成 AnimationSpec： "${userInput}"`;
}
