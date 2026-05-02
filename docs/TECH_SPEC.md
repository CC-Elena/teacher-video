# AnimAgent — 技术规范

> **项目**: teacher-video  
> **岗位目标**: AI 动画工程师  
> **版本**: MVP 1.0  
> **日期**: 2026-04-29

---

## 1. 系统概述

AnimAgent 是驱动动画生成流水线的核心 AI 引擎。它通过一个四阶段的闭环，将学生用自然语言描述的数学问题转化为可执行的动画讲解。

```
用户输入 (自然语言)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  第 1 阶段：意图解析器                                  │
│  自然语言 → AnimationSpec (结构化 JSON)                 │
│  LLM: GPT-4o, response_format: json_object              │
│  提示词：系统 + 少样本 (3 个示例) + 用户                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  第 2 阶段：验证器                                      │
│  三个级别：模式 → 工具 → 语义                           │
│  在任何代码执行前进行快速失败检查                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  第 3 阶段：代码生成器                                  │
│  AnimationSpec → TypeScript Canvas 渲染器               │
│  基于模板，确定性，不使用 LLM                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  第 4 阶段：执行器 (沙箱)                               │
│  结构 + 安全性检查 (目前为结构完整性检查，              │
│  生产环境中使用 vm2/Worker 隔离)                        │
│  失败时 → 注入错误 → 回到第 1 阶段                      │
└─────────────────────────────────────────────────────────┘
                      │
              ┌───────┴──────┐
            成功           失败 (最多重试 3 次)
              │                    │
          返回结果             抛出错误
```

---

## 2. 核心数据模型

### AnimationSpec

LLM 输出与渲染器之间的中心数据契约：

```typescript
interface AnimationSpec {
  concept: string;          // 例如 "x² 的导数"
  animationType: AnimationType;
  steps: AnimationStep[];   // 有序的工具调用
  narration: string[];      // 配音脚本
  durationMs: number;       // 动画总长度
  expectedOutcome: string;  // 教学目标 (用于语义验证)
}

interface AnimationStep {
  toolName: string;          // 必须在 ANIMATION_TOOLS 注册表中
  params: Record<string, unknown>;
  startMs: number;           // 开始时间 (相对)
  durationMs: number;        // 该步骤持续时间
  description: string;       // 人类可读的步骤摘要
}
```

### 为什么采用两步走的方法 (规范 → 代码)？

而不是让 LLM 直接编写 TypeScript：

| 直接生成代码 | 规范 → 代码 (我们的方法) |
|---|---|
| API 使用中存在幻觉 | LLM 仅选择工具 + 参数 |
| 难以验证 | JSON 模式验证非常简单 |
| 重新生成的 Token 成本高 | 失败时仅重新生成规范 |
| 输出长度不可预测 | 结构化 JSON，大小受限 |
| 可能存在不安全的 `eval`/`require` | 代码由模板生成，关键路径无 LLM |

---

## 3. 提示词工程策略

### 三层架构

```
┌─────────────────────────────────────┐
│  第 1 层：系统提示词 (SYSTEM_PROMPT) │  约 800 tokens (已缓存)
│  - 角色定义                         │
│  - 工具文档                         │
│  - 输出模式                         │
│  - 硬性约束                         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  第 2 层：少样本示例 (FEW_SHOT)      │  每个示例约 600 tokens
│  - 2 个高质量的 NL→Spec 配对        │
│  - 涵盖导数 + 积分                  │
│  - 展示正确的时间轴管理             │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  第 3 层：用户提示词 (USER_PROMPT)   │  约 50 tokens (每次调用更新)
│  - 用户的自然语言                   │
│  - 之前的错误 (重试时)              │
│  - 之前的规范 (重试时)              │
└─────────────────────────────────────┘
```

### 系统提示词中的关键约束

这些约束被明确说明，以防止 LLM 最常见的失败模式：

1. **工具约束**：`仅使用可用列表中的工具名称`
2. **禁止自由代码**：LLM 仅输出 JSON，绝不输出 TypeScript
3. **时间限制**：`每步 durationMs 必须在 500–5000ms 之间`
4. **安全性**：生成的任何内容中不得包含 `eval`, `require`, `process.exit`
5. **格式**：`不要在 JSON 之外包含任何解释`

### 失败后的自我修复

当发生验证或执行错误时，错误信息 + 原始规范会被重新注入：

```
上一次尝试失败，错误如下：
  步骤 1：未知的 toolName "plotGraph"。有效工具：drawFunctionGraph, ...

导致错误的原始规范：
  { "steps": [{ "toolName": "plotGraph", ... }] }

请修复 JSON 并返回纠正后的 AnimationSpec。
```

这为 LLM 提供了具体、可操作的反馈，而不是通用的重试。

---

## 4. 函数调用 / 工具使用设计

### 工具注册表

五个动画工具覆盖了 90% 以上的 SAT/AP 数学可视化需求：

| 工具 | 使用场景 | 关键参数 |
|---|---|---|
| `drawFunctionGraph` | 任何 y=f(x) 图表 | `expression`, `range`, `animateDraw` |
| `drawTangentLine` | 导数、斜率 | `expression`, `atX`, `animateSlide` |
| `highlightIntegralArea` | 定积分 | `fromX`, `toX`, `showRiemannBars` |
| `addMathLabel` | 注释、公式 | `text`, `x`, `y`, `fadeIn` |
| `showStepByStep` | 代数推导 | `steps[]`, `intervalMs` |

### 为什么不直接使用原始的函数调用 API？

OpenAI 的函数调用 API 返回结构化的工具调用，但需要多次 LLM 往返 (每个工具调用一次)。对于动画生成：

- 我们需要一次性获得所有工具调用 (以计算时间关系)
- 我们需要将完整的规范作为一个整体进行验证
- 更少的 API 调用 = 更低的延迟 + 成本

因此，我们改用 **结构化 JSON 输出** (`response_format: json_object`)，并将工具定义作为文档嵌入在系统提示词中。这实际上是“模式约束生成” —— LLM 将工具定义视为 API 契约。

---

## 5. 验证流水线

### 第 1 级：模式验证

```typescript
// 检查必填字段和类型
if (!Array.isArray(spec.steps) || spec.steps.length === 0)
  errors.push("'steps' 必须是一个非空数组");
if (typeof spec.durationMs !== "number" || spec.durationMs <= 0)
  errors.push("'durationMs' 必须是一个正数");
```

### 第 2 级：工具验证

```typescript
// 检查每一步的 toolName 是否已注册
if (!TOOL_NAMES.includes(step.toolName))
  errors.push(`第 ${i} 步：未知的 toolName "${step.toolName}"`);

// 检查工具特定的必填参数
if (step.toolName === "drawTangentLine" && step.params.atX === undefined)
  errors.push(`第 ${i} 步：缺少必填参数 'atX'`);
```

### 第 3 级：语义验证 (警告)

```typescript
if (typedSpec.durationMs < 3000)
  warnings.push("总时长 < 3s 可能会显得太仓促");
if (lastStep.startMs + lastStep.durationMs > spec.durationMs * 1.1)
  warnings.push("最后一步超出了总时长 durationMs");
```

**快速失败**：流水线会在第一个错误级别停止并触发重试，而不是让错误的代码到达执行器。

---

## 6. 核心动画组件：DerivativeAnimation

### 设计目标

- 单文件，零外部动画库依赖
- 纯 Canvas 2D API —— 无 WebGL，无 DOM 操作
- 带有缓动效果的 requestAnimationFrame 循环
- 可复现：给定相同的 `AnimationSpec`，始终产生相同的输出

### 动画阶段

```
时间线：0ms ─────────────────────────────── 9000ms

阶段 1 (0–30%):    曲线从左向右绘制
                   蓝色抛物线动画淡入

阶段 2 (30–35%):   切线在 x=XMIN 处淡入

阶段 3 (35–90%):   切点沿 x: -4 → +4 滑动
                   斜率标签实时更新
                   显示："斜率 = 2x"

阶段 4 (90–100%):  逐步推导面板出现
                   f(x) = x², f'(x) = 2x, ...
```

### 数学安全性

```typescript
// 表达式求值器：不对用户输入使用 eval()
// 使用带有明确安全作用域的 Function() 构造函数
function evalExpr(expr: string, x: number): number {
  const safeScope = { x, sin: Math.sin, cos: Math.cos, ... };
  const js = expr.replace(/\^/g, "**");
  const fn = new Function(...Object.keys(safeScope), `"use strict"; return (${js});`);
  return fn(...Object.values(safeScope));
}

// 通过中心差分法进行数值求导 (无需符号计算)
function numericalDerivative(expr: string, x: number, h = 1e-5): number {
  return (evalExpr(expr, x + h) - evalExpr(expr, x - h)) / (2 * h);
}
```

---

## 7. 技术栈

| 层级 | 技术 | 理由 |
|---|---|---|
| 框架 | Next.js 15 (App Router) | 全栈 TypeScript，边缘就绪型 API |
| UI | React 19 + Tailwind CSS | 组件模型契合动画步骤 |
| 动画 | HTML5 Canvas 2D | 零依赖，精准的帧控制 |
| LLM | OpenAI GPT-4o | 最好的结构化 JSON 输出质量 |
| 数学 | 原生 JS Math | 渲染器中无需 mathjs 依赖 (安全性) |
| 语言 | TypeScript strict | 在编译时捕获工具参数错误 |

### 为什么选择 Canvas 而不是 Remotion/GSAP？

对于 MVP 演示：
- **Remotion**：需要构建步骤，设置较重，对于单组件演示大材小用
- **GSAP**：外部依赖，涉及许可考虑
- **Canvas 2D**：即时，无需构建，完全控制每个像素，易于沙箱化

生产路线图：用 Remotion 替换 Canvas 渲染器以支持视频导出。

---

## 8. 质量指标

| 指标 | 目标 | 测量方式 |
|---|---|---|
| Pass@1 (首次尝试成功率) | > 70% | `metrics.pass1Success` |
| Pass@3 (3 次内尝试成功率) | > 90% | `metrics.totalAttempts <= 3` |
| 平均生成延迟 | < 5s | `metrics.totalDurationMs` |
| 验证错误捕获率 | 100% | 所有模式/工具错误在执行前被捕获 |
| 不安全代码拦截率 | 100% | 对生成的代码进行正则扫描 |

---

## 9. 文件结构

```
teacher-video/
├── app/
│   ├── api/generate/route.ts    # AnimAgent API 接口
│   ├── page.tsx                 # 主 UI (输入 + 预览 + 指标)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── agent/
│   │   ├── animAgent.ts         # 核心 生成→验证→执行→修复 循环
│   │   ├── prompts.ts           # 系统提示词、少样本、用户提示词构建器
│   │   ├── validator.ts         # 3 级规范验证
│   │   ├── codeGenerator.ts     # AnimationSpec → TypeScript 代码
│   │   └── types.ts             # AnimationSpec, AgentState 等
│   └── components/
│       └── animationTools.ts    # 工具注册表 (函数调用模式)
├── components/
│   └── animation/
│       └── DerivativeAnimation.tsx  # 核心动画组件
└── docs/
    ├── TECH_SPEC.md             # 本文档
    └── PRODUCT_SPEC.md          # 产品规范
```

---

## 10. 生产路线图

### 第 2 阶段：精细化与质量提升 (下一冲刺)
- [ ] **语义一致性校验**：集成 `mathjs` 验证动画标签与数学逻辑的统一性。
- [ ] **音画同步优化**：将 `narration` 升级为带时间戳的对象，实现讲解与视觉动画的精准对齐。
- [ ] **审美约束注入**：在提示词中明确品牌色、构图准则和字体规范，提升生成内容的“高级感”。
- [ ] **教学法脚手架**：优化提示词，强制要求 Agent 遵循“引入-演示-总结”的教学节奏。
- [ ] **沙箱安全性升级**：添加 vm2 沙箱用于实际的 TypeScript 代码执行。

### 第 3 阶段：智能化与闭环评估 (闭环增强)
- [ ] **视觉模型评审 (LLM-as-a-Judge)**：引入 GPT-4o-vision 截取关键帧并评审视觉遮挡、构图和对比度。
- [ ] **思维链 (CoT) 规划**：要求 Agent 在生成 Spec 前先输出教学逻辑规划（internal_monologue）。
- [ ] **动态少样本 (Dynamic Few-shot)**：根据用户输入语义，从高质量库中动态检索最匹配的示例注入提示词。
- [ ] **多模型协同**：使用模型 A 生成，模型 B 进行语义对撞与逻辑审核，确保 Pass@1 质量。

### 第 4 阶段：规模化与导出 (工程化)
- [ ] **视频导出流流水线**：实现 Remotion 集成，支持将 Canvas 动画导出为 MP4 视频。
- [ ] **模型微调**：在累积的 1000+ 高质量成功案例上微调专用小模型，降低推理成本并提升 Pass@1。
- [ ] **工具库扩张**：将工具注册表扩展至 3D 几何、矩阵运算、概率分布和物理模拟。
- [ ] **异步队列系统**：添加 Redis 队列和 Webhook，支持高并发的视频合成任务。
