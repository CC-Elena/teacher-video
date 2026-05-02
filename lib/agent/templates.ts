import { AnimationSpec } from "./types";

export interface AnimationTemplate {
  id: string;
  title: string;
  titleZh: string;
  prompt: string;
  promptZh: string;
  spec: AnimationSpec;
}

export const ANIMATION_TEMPLATES: AnimationTemplate[] = [
  {
    id: "derivative-x2",
    title: "Derivative of x^2",
    titleZh: "x² 的导数",
    prompt: "Show how the derivative of x² equals 2x",
    promptZh: "展示 x² 的导数等于 2x 的过程",
    spec: {
      concept: "x² 的导数",
      animationType: "derivative",
      steps: [
        {
          toolName: "drawFunctionGraph",
          params: { expression: "x^2", xMin: -4, xMax: 4, yMin: -1, yMax: 10, color: "#3B82F6", animateDraw: true, label: "y = x²" },
          startMs: 0,
          durationMs: 2000,
          description: "绘制抛物线 y=x²",
        },
        {
          toolName: "drawTangentLine",
          params: { expression: "x^2", atX: 0, animateSlide: true, xMin: -3, xMax: 3, showSlopeLabel: true, curveColor: "#3B82F6", tangentColor: "#F59E0B" },
          startMs: 2000,
          durationMs: 4000,
          description: "滑动切线并显示变化的斜率",
        },
        {
          toolName: "showStepByStep",
          params: { steps: ["f(x) = x²", "f'(x) = 2x", "当 x = 2 时, 斜率 = 4", "当 x = -1 时, 斜率 = -2"], intervalMs: 1000, position: "right" },
          startMs: 6000,
          durationMs: 3500,
          description: "显示求导法则和示例斜率",
        },
      ],
      narration: [
        "让我们从抛物线 f(x) 等于 x 的平方开始。",
        "切线显示了每个点的瞬时斜率。",
        "随着 x 的变化，斜率遵循 2x，这就是它的导数。",
      ],
      durationMs: 9500,
      expectedOutcome: "学生理解 f'(x)=2x 是变化的切线斜率",
    },
  },
  {
    id: "integral-sinx",
    title: "Area Under sin(x)",
    titleZh: "sin(x) 下的面积",
    prompt: "Explain the area under sin(x) from 0 to π",
    promptZh: "解释 sin(x) 从 0 到 π 的面积",
    spec: {
      concept: "sin(x) 下的面积",
      animationType: "integral",
      steps: [
        {
          toolName: "drawFunctionGraph",
          params: { expression: "sin(x)", xMin: -1, xMax: 4, yMin: -1.5, yMax: 1.5, color: "#2563EB", animateDraw: true, label: "y = sin(x)" },
          startMs: 0,
          durationMs: 1800,
          description: "绘制正弦曲线",
        },
        {
          toolName: "highlightIntegralArea",
          params: { expression: "sin(x)", fromX: 0, toX: 3.14159, fillColor: "rgba(37,99,235,0.3)", animateFill: true, showRiemannBars: true, numBars: 8 },
          startMs: 1800,
          durationMs: 3600,
          description: "为从 0 到 pi 的区域着色",
        },
        {
          toolName: "addMathLabel",
          params: { text: "∫₀^π sin(x) dx = 2", x: 1.2, y: 1, fontSize: 18, color: "#1E293B", fadeIn: true },
          startMs: 5400,
          durationMs: 1800,
          description: "显示准确面积",
        },
      ],
      narration: [
        "定积分测量曲线下方的有符号面积。",
        "从 0 到 pi，sin(x) 保持在 x 轴上方。",
        "这个拱形下方的准确面积是 2。",
      ],
      durationMs: 7600,
      expectedOutcome: "学生理解定积分即为曲线下方的面积",
    },
  },
  {
    id: "limit-x2",
    title: "Limit as x approaches 2",
    titleZh: "x 趋近于 2 的极限",
    prompt: "Visualize how limits work as x approaches 2",
    promptZh: "可视化 x 趋近于 2 时极限如何工作",
    spec: {
      concept: "x 趋近于 2 的极限",
      animationType: "limit",
      steps: [
        {
          toolName: "drawFunctionGraph",
          params: { expression: "x^2", xMin: -1, xMax: 4, yMin: -1, yMax: 8, color: "#0F766E", animateDraw: true, label: "f(x)=x²" },
          startMs: 0,
          durationMs: 1800,
          description: "绘制函数曲线",
        },
        {
          toolName: "drawLimitApproach",
          params: { expression: "x^2", approachX: 2, leftStartX: -0.5, rightStartX: 4, yMin: -1, yMax: 8, color: "#E11D48", showTargetLabel: true },
          startMs: 1800,
          durationMs: 4200,
          description: "从左右两侧趋近 x=2",
        },
        {
          toolName: "addMathLabel",
          params: { text: "lim x→2 x² = 4", x: 1.2, y: 6.8, fontSize: 18, color: "#111827", fadeIn: true },
          startMs: 6000,
          durationMs: 1800,
          description: "显示极限结果",
        },
      ],
      narration: [
        "极限关心的是靠近某个 x 值时函数会靠近哪里。",
        "从左边和右边靠近 x=2，函数值都接近 4。",
        "所以 x² 在 x 趋近 2 时的极限是 4。",
      ],
      durationMs: 8000,
      expectedOutcome: "学生理解左右趋近同一个 y 值时极限存在",
    },
  },
  {
    id: "derivative-x3",
    title: "Derivative of x^3",
    titleZh: "x³ 的导数",
    prompt: "Why is the derivative of x³ equal to 3x²?",
    promptZh: "为什么 x³ 的导数等于 3x²？",
    spec: {
      concept: "x³ 的导数",
      animationType: "derivative",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "x^3", xMin: -2.2, xMax: 2.2, yMin: -8, yMax: 8, color: "#7C3AED", animateDraw: true, label: "y=x³" }, startMs: 0, durationMs: 2000, description: "绘制三次函数" },
        { toolName: "drawTangentLine", params: { expression: "x^3", atX: 0, animateSlide: true, xMin: -2, xMax: 2, showSlopeLabel: true, tangentColor: "#F97316" }, startMs: 2000, durationMs: 4200, description: "移动切线观察斜率" },
        { toolName: "showStepByStep", params: { steps: ["f(x)=x³", "f'(x)=3x²", "斜率始终非负", "x 越远离 0 越陡"], intervalMs: 900, position: "right" }, startMs: 6200, durationMs: 2600, description: "显示求导规则" },
      ],
      narration: ["三次函数在原点附近很平。", "切线斜率随着 |x| 增大而快速变大。", "这对应导数 3x²。"],
      durationMs: 9000,
      expectedOutcome: "学生理解 x³ 的导数形状和斜率变化",
    },
  },
  {
    id: "linear-slope",
    title: "Slope of a line",
    titleZh: "直线斜率",
    prompt: "Show the slope of y = 2x + 1",
    promptZh: "展示 y = 2x + 1 的斜率",
    spec: {
      concept: "直线斜率",
      animationType: "function_graph",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "2*x+1", xMin: -4, xMax: 4, yMin: -8, yMax: 10, color: "#0284C7", animateDraw: true, label: "y=2x+1" }, startMs: 0, durationMs: 2200, description: "绘制直线" },
        { toolName: "addMathLabel", params: { text: "slope = rise/run = 2", x: -2.5, y: 7, fontSize: 17, color: "#0F172A", fadeIn: true }, startMs: 2200, durationMs: 2200, description: "标出斜率" },
        { toolName: "showStepByStep", params: { steps: ["每向右 1", "向上 2", "斜率 m=2"], intervalMs: 900, position: "right" }, startMs: 4400, durationMs: 2600, description: "展示 rise over run" },
      ],
      narration: ["直线的斜率在每一点都相同。", "向右移动 1，函数值上升 2。", "所以这条线的斜率是 2。"],
      durationMs: 7200,
      expectedOutcome: "学生理解线性函数斜率",
    },
  },
  {
    id: "quadratic-vertex",
    title: "Quadratic vertex",
    titleZh: "二次函数顶点",
    prompt: "Visualize the vertex of y = (x - 1)^2 - 2",
    promptZh: "可视化 y = (x - 1)^2 - 2 的顶点",
    spec: {
      concept: "二次函数顶点",
      animationType: "function_graph",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "(x-1)^2-2", xMin: -3, xMax: 5, yMin: -3, yMax: 8, color: "#059669", animateDraw: true, label: "y=(x-1)²-2" }, startMs: 0, durationMs: 2500, description: "绘制平移后的抛物线" },
        { toolName: "addMathLabel", params: { text: "vertex = (1, -2)", x: 1.2, y: -1.4, fontSize: 17, color: "#065F46", fadeIn: true }, startMs: 2500, durationMs: 2200, description: "标出顶点" },
        { toolName: "showStepByStep", params: { steps: ["y=(x-h)²+k", "h=1", "k=-2", "顶点: (1,-2)"], intervalMs: 850, position: "right" }, startMs: 4700, durationMs: 3200, description: "解释顶点式" },
      ],
      narration: ["顶点式直接告诉我们抛物线的最低点。", "这里 h 等于 1，k 等于 -2。", "所以顶点是 (1,-2)。"],
      durationMs: 8200,
      expectedOutcome: "学生理解二次函数顶点式",
    },
  },
  {
    id: "integral-linear",
    title: "Triangle area integral",
    titleZh: "三角形面积积分",
    prompt: "Show the area under y = x from 0 to 3",
    promptZh: "展示 y = x 从 0 到 3 的曲线下面积",
    spec: {
      concept: "y=x 下的面积",
      animationType: "integral",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "x", xMin: -1, xMax: 4, yMin: -1, yMax: 4, color: "#DC2626", animateDraw: true, label: "y=x" }, startMs: 0, durationMs: 1800, description: "绘制 y=x" },
        { toolName: "highlightIntegralArea", params: { expression: "x", fromX: 0, toX: 3, fillColor: "rgba(220,38,38,0.25)", showRiemannBars: true, numBars: 6 }, startMs: 1800, durationMs: 3400, description: "填充三角形面积" },
        { toolName: "addMathLabel", params: { text: "area = 1/2 · 3 · 3 = 4.5", x: 0.6, y: 3.4, fontSize: 16, color: "#7F1D1D", fadeIn: true }, startMs: 5200, durationMs: 1800, description: "显示面积公式" },
      ],
      narration: ["这块积分区域是一个三角形。", "底和高都是 3。", "面积等于 4.5。"],
      durationMs: 7200,
      expectedOutcome: "学生把简单积分和几何面积联系起来",
    },
  },
  {
    id: "limit-sinx-over-x",
    title: "sin(x)/x near zero",
    titleZh: "sin(x)/x 的零点极限",
    prompt: "Show why sin(x)/x approaches 1 near zero",
    promptZh: "展示为什么 sin(x)/x 在 0 附近趋近于 1",
    spec: {
      concept: "sin(x)/x 的极限",
      animationType: "limit",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "sin(x)/x", xMin: -4, xMax: 4, yMin: -0.5, yMax: 1.5, color: "#4F46E5", animateDraw: true, label: "sin(x)/x" }, startMs: 0, durationMs: 2200, description: "绘制 sinc 曲线" },
        { toolName: "drawLimitApproach", params: { expression: "sin(x)/x", approachX: 0.001, leftStartX: -3, rightStartX: 3, yMin: -0.5, yMax: 1.5, color: "#E11D48", showTargetLabel: true }, startMs: 2200, durationMs: 4200, description: "从两侧靠近 0" },
        { toolName: "addMathLabel", params: { text: "lim x→0 sin(x)/x = 1", x: -2.4, y: 1.35, fontSize: 16, color: "#111827", fadeIn: true }, startMs: 6400, durationMs: 1600, description: "显示经典极限" },
      ],
      narration: ["虽然 x=0 处表达式没有定义，但极限仍然可以存在。", "左右两侧的函数值都靠近 1。", "这就是经典极限 sin(x)/x 等于 1。"],
      durationMs: 8200,
      expectedOutcome: "学生理解极限不要求函数在目标点有定义",
    },
  },
  {
    id: "absolute-value",
    title: "Absolute value graph",
    titleZh: "绝对值函数",
    prompt: "Visualize y = abs(x) and its sharp corner",
    promptZh: "可视化 y = abs(x) 的尖角",
    spec: {
      concept: "绝对值函数",
      animationType: "function_graph",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "abs(x)", xMin: -5, xMax: 5, yMin: -1, yMax: 6, color: "#9333EA", animateDraw: true, label: "y=|x|" }, startMs: 0, durationMs: 2500, description: "绘制 V 形图像" },
        { toolName: "addMathLabel", params: { text: "corner at x=0", x: 0.2, y: 0.8, fontSize: 16, color: "#581C87", fadeIn: true }, startMs: 2500, durationMs: 2000, description: "标出尖角" },
        { toolName: "showStepByStep", params: { steps: ["x<0: y=-x", "x≥0: y=x", "x=0 处斜率突变"], intervalMs: 900, position: "right" }, startMs: 4500, durationMs: 3000, description: "展示分段定义" },
      ],
      narration: ["绝对值函数由两条直线拼成。", "左边斜率是 -1，右边斜率是 1。", "在 x=0 处出现尖角。"],
      durationMs: 7800,
      expectedOutcome: "学生理解绝对值函数的分段结构",
    },
  },
  {
    id: "cosine-derivative",
    title: "Derivative of cos(x)",
    titleZh: "cos(x) 的导数",
    prompt: "Show how the slope of cos(x) changes",
    promptZh: "展示 cos(x) 的斜率如何变化",
    spec: {
      concept: "cos(x) 的导数",
      animationType: "derivative",
      steps: [
        { toolName: "drawFunctionGraph", params: { expression: "cos(x)", xMin: -3.14, xMax: 6.28, yMin: -1.5, yMax: 1.5, color: "#0891B2", animateDraw: true, label: "cos(x)" }, startMs: 0, durationMs: 2200, description: "绘制余弦曲线" },
        { toolName: "drawTangentLine", params: { expression: "cos(x)", atX: 0, animateSlide: true, xMin: -3.14, xMax: 6.28, showSlopeLabel: true, tangentColor: "#F59E0B" }, startMs: 2200, durationMs: 4400, description: "滑动切线" },
        { toolName: "showStepByStep", params: { steps: ["f(x)=cos(x)", "f'(x)=-sin(x)", "峰顶处斜率为 0", "过零点处最陡"], intervalMs: 850, position: "right" }, startMs: 6600, durationMs: 3000, description: "解释导数" },
      ],
      narration: ["余弦曲线的斜率不断改变。", "在峰顶和谷底，切线变平。", "它的导数是负的正弦函数。"],
      durationMs: 9800,
      expectedOutcome: "学生理解三角函数导数的斜率含义",
    },
  },
];

export function findTemplateForInput(userInput: string): AnimationTemplate {
  const normalized = userInput.toLowerCase();
  if (
    normalized.includes("limit") ||
    normalized.includes("approach") ||
    normalized.includes("sin(x)/x") ||
    normalized.includes("sinc") ||
    normalized.includes("趋近") ||
    normalized.includes("极限")
  ) {
    if (normalized.includes("sin(x)/x") || normalized.includes("zero") || normalized.includes("0")) {
      return ANIMATION_TEMPLATES[7];
    }
    return ANIMATION_TEMPLATES[2];
  }
  if (normalized.includes("x³") || normalized.includes("x^3") || normalized.includes("3x")) {
    return ANIMATION_TEMPLATES[3];
  }
  if (normalized.includes("2x + 1") || normalized.includes("2*x+1") || normalized.includes("直线") || normalized.includes("linear")) {
    return ANIMATION_TEMPLATES[4];
  }
  if (normalized.includes("vertex") || normalized.includes("顶点")) {
    return ANIMATION_TEMPLATES[5];
  }
  if (
    normalized.includes("sin") ||
    normalized.includes("area") ||
    normalized.includes("integral") ||
    normalized.includes("正弦") ||
    normalized.includes("面积") ||
    normalized.includes("积分")
  ) {
    if (normalized.includes("y = x") || normalized.includes("y=x")) {
      return ANIMATION_TEMPLATES[6];
    }
    return ANIMATION_TEMPLATES[1];
  }
  if (normalized.includes("abs") || normalized.includes("absolute") || normalized.includes("绝对值")) {
    return ANIMATION_TEMPLATES[8];
  }
  if (normalized.includes("cos")) {
    return ANIMATION_TEMPLATES[9];
  }
  return ANIMATION_TEMPLATES[0];
}
