# teacher-video

> **AI 数学动画生成器**

输入 SAT/AP 数学概念 → AnimAgent 通过一个闭环的 **生成 → 执行 → 验证 → 修复** 循环生成、验证并渲染个性化的动画讲解。

---

## 演示

**核心动画：f(x) = x² 的导数**

切线沿抛物线从 x = −4 滑动到 x = +4。  
斜率标签实时更新，向学生展示 f′(x) = 2x。

```
阶段 1 (0–2.7s)   抛物线从左到右绘制
阶段 2 (2.7–3.2s) 切线淡入
阶段 3 (3.2–8.1s) 切线滑动，斜率 = 2x 实时更新
阶段 4 (8.1–9s)   逐步推导面板出现
```

---

## 快速开始

```bash
git clone https://github.com/YOUR_USERNAME/teacher-video.git
cd teacher-video
npm install

# 可选：添加你的 OpenAI 密钥（在演示模式下无需此项即可运行）
cp .env.local.example .env.local
# 编辑 .env.local 并设置 OPENAI_API_KEY=...

npm run dev
# 打开 http://localhost:3000
```


---

## 架构

```
用户输入 (自然语言)
    │
    ▼  GPT-4o (json_object 模式)
AnimationSpec JSON   ←── 系统提示词 + 2 个少样本示例
    │
    ▼  3 级验证器
模式验证 ✓ → 工具验证 ✓ → 语义验证 ✓
    │
    ▼  代码生成器 (确定性，不使用 LLM)
TypeScript Canvas 渲染器
    │
    ▼  沙箱执行器
安全性 + 结构检查
    │
  ✅ 完成     ❌ 错误 → 注入错误 → 重试 (最多 3 次)
```

**关键设计决策**：LLM 输出结构化 JSON (`AnimationSpec`)，而不是原始 TypeScript。代码是通过模板确定性生成的。这消除了渲染路径中 LLM 的幻觉。

---

## 项目结构

```
app/
  api/generate/route.ts          API 接口 (AnimAgent 入口)
  page.tsx                       主界面
lib/
  agent/
    animAgent.ts                 核心 生成→验证→执行→修复 循环
    prompts.ts                   系统提示词 + 少样本 + 用户提示词构建器
    validator.ts                 3 级 AnimationSpec 验证器
    codeGenerator.ts             AnimationSpec → TypeScript 渲染器
    types.ts                     核心类型
  components/
    animationTools.ts            工具注册表 (函数调用模式)
components/
  animation/
    DerivativeAnimation.tsx      核心动画组件 (Canvas 2D)
docs/
  TECH_SPEC.md                   完整技术规范
  PRODUCT_SPEC.md                产品需求与用户故事
```

---

## 动画工具注册表

五个工具覆盖了 90% 以上的 SAT/AP 数学可视化需求：

| 工具 | 使用场景 |
|---|---|
| `drawFunctionGraph` | 绘制任何带有动画效果的 y = f(x) 曲线 |
| `drawTangentLine` | 用于导数/斜率的滑动切线 |
| `highlightIntegralArea` | 用于积分的黎曼矩形 + 平滑区域 |
| `addMathLabel` | 带有淡入效果的 LaTeX 风格注释 |
| `showStepByStep` | 顺序方程步骤面板 |

---

## 指标

| 指标 | 目标 |
|---|---|
| Pass@1 (首次尝试成功率) | ≥ 70% |
| Pass@3 (3 次内尝试成功率) | ≥ 90% |
| 端到端延迟 | ≤ 8s |
| 动画帧率 | 60fps |

---

## 技术栈

- **框架**: Next.js 15 (App Router) + TypeScript
- **UI**: React 19 + Tailwind CSS
- **动画**: HTML5 Canvas 2D (零动画库依赖)
- **LLM**: OpenAI GPT-4o (`response_format: json_object`)
- **数学**: 原生 JS Math (安全的表达式求值，不使用 `eval`)

---

## 文档

- [技术规范](docs/TECH_SPEC.md) — 架构、提示策略、验证流程、代码生成
- [产品规范](docs/PRODUCT_SPEC.md) — 用户故事、功能范围、成功指标

---

## 路线图

- [ ] 更多动画组件 (极限、积分、几何变换)
- [ ] 用于 MP4 视频导出的 Remotion 流水线
- [ ] 通过 TTS API 实现语音旁白
- [ ] 在成功生成的案例上微调更小的模型
- [ ] 视觉模型语义验证 (截图 → “这看起来正确吗？”)

---

## 背景
展示一句话描述动画生成agent核心流程：
提示词工程 · 函数调用设计 · 生成→执行→验证→修复 代理循环 · 可复用动画组件库。
