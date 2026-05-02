/**
 * AnimAgent 流水线的提示词模板
 *
 * 三层架构：
 *   1. SYSTEM_PROMPT   – 角色 + 组件文档 + 硬约束
 *   2. FEW_SHOT_EXAMPLES – 3 个高质量的 输入→spec 对
 *   3. buildUserPrompt  – 当前任务 (+ 重试时的错误信息)
 */

import { ANIMATION_TOOLS } from "../components/animationTools";

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
- narration 数组必须至少包含 2 个条目
- 不要在 JSON 之外包含任何解释
- 如果被要求修复错误，仅输出修正后的 JSON`;

export const FEW_SHOT_EXAMPLES = [
  {
    user: "向我展示如何通过移动切线使 x² 的导数等于 2x",
    spec: {
      concept: "x² 的导数",
      animationType: "derivative",
      steps: [
        {
          toolName: "drawFunctionGraph",
          params: {
            expression: "x^2",
            xMin: -4,
            xMax: 4,
            yMin: -1,
            yMax: 10,
            color: "#3B82F6",
            animateDraw: true,
            label: "y = x²",
          },
          startMs: 0,
          durationMs: 2000,
          description: "绘制抛物线 y=x²",
        },
        {
          toolName: "drawTangentLine",
          params: {
            expression: "x^2",
            atX: 0,
            animateSlide: true,
            xMin: -3,
            xMax: 3,
            showSlopeLabel: true,
            curveColor: "#3B82F6",
            tangentColor: "#F59E0B",
          },
          startMs: 2000,
          durationMs: 4000,
          description: "切线从 x=-3 滑动到 x=3，显示斜率=2x",
        },
        {
          toolName: "showStepByStep",
          params: {
            steps: ["f(x) = x²", "f'(x) = 2x", "当 x=2 时: 斜率 = 4", "当 x=-1 时: 斜率 = -2"],
            intervalMs: 1000,
            position: "right",
          },
          startMs: 6000,
          durationMs: 4000,
          description: "显示代数推导步骤",
        },
      ],
      narration: [
        "让我们探索 f(x) 等于 x 平方的导数。",
        "随着切点的移动，请注意斜率等于 2x。",
        "这正是导数 —— 瞬时变化率。",
      ],
      durationMs: 10000,
      expectedOutcome: "学生理解导数即为切线的斜率",
    },
  },
  {
    user: "可视化从 0 到 π 的 sin(x) 下方的面积",
    spec: {
      concept: "sin(x) 的定积分",
      animationType: "integral",
      steps: [
        {
          toolName: "drawFunctionGraph",
          params: {
            expression: "sin(x)",
            xMin: -1,
            xMax: 4,
            yMin: -1.5,
            yMax: 1.5,
            color: "#8B5CF6",
            animateDraw: true,
            label: "y = sin(x)",
          },
          startMs: 0,
          durationMs: 1500,
          description: "绘制 sin(x) 曲线",
        },
        {
          toolName: "highlightIntegralArea",
          params: {
            expression: "sin(x)",
            fromX: 0,
            toX: 3.14159,
            fillColor: "rgba(139,92,246,0.35)",
            animateFill: true,
            showRiemannBars: true,
            numBars: 8,
          },
          startMs: 1500,
          durationMs: 3500,
          description: "先用黎曼矩形填充积分区域，然后平滑",
        },
        {
          toolName: "addMathLabel",
          params: { text: "∫₀^π sin(x)dx = 2", x: 1.5, y: 0.4, fontSize: 18, color: "#1F2937", fadeIn: true },
          startMs: 5000,
          durationMs: 1500,
          description: "显示结果",
        },
      ],
      narration: [
        "定积分测量曲线与 x 轴之间的面积。",
        "我们可以用矩形来近似它 —— 这就是黎曼和。",
        "当矩形变得无限薄时，我们得到准确的面积：2。",
      ],
      durationMs: 7000,
      expectedOutcome: "学生理解积分为面积和黎曼近似",
    },
  },
];

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
