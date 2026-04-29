# teacher-video · AnimAgent

> **AI Math Animation Generator** 

Type a SAT/AP math concept → AnimAgent generates, validates, and renders a personalized animated explanation through a closed **Generate → Execute → Validate → Fix** loop.

---

## Demo

**Core Animation: Derivative of f(x) = x²**

The tangent line slides along the parabola from x = −4 to x = +4.  
The slope label updates live, showing students that f′(x) = 2x.

```
Phase 1 (0–2.7s)   Parabola draws in, left to right
Phase 2 (2.7–3.2s) Tangent line fades in
Phase 3 (3.2–8.1s) Tangent slides, slope = 2x updates in real time
Phase 4 (8.1–9s)   Step-by-step derivation panel appears
```

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/teacher-video.git
cd teacher-video
npm install

# Optional: add your OpenAI key (works in Demo Mode without it)
cp .env.local.example .env.local
# edit .env.local and set OPENAI_API_KEY=...

npm run dev
# open http://localhost:3000
```

> **Demo Mode**: The app works fully without an OpenAI API key — it returns a hardcoded `AnimationSpec` for the derivative example. Perfect for local development and demos.

---

## Architecture

```
User Input (NL)
    │
    ▼  GPT-4o (json_object mode)
AnimationSpec JSON   ←── System Prompt + 2 Few-shot Examples
    │
    ▼  3-level Validator
Schema ✓ → Tool ✓ → Semantic ✓
    │
    ▼  Code Generator (deterministic, no LLM)
TypeScript Canvas Renderer
    │
    ▼  Sandbox Executor
Safety + Structure Checks
    │
  ✅ done     ❌ error → inject error → retry (max 3×)
```

**Key design decision**: LLM outputs structured JSON (`AnimationSpec`), not raw TypeScript. Code is template-generated deterministically. This eliminates LLM hallucinations in the render hot path.

---

## Project Structure

```
app/
  api/generate/route.ts          API endpoint (AnimAgent entry)
  page.tsx                       Main UI
lib/
  agent/
    animAgent.ts                 Core Generate→Validate→Execute→Fix loop
    prompts.ts                   System prompt + few-shot + user prompt builder
    validator.ts                 3-level AnimationSpec validator
    codeGenerator.ts             AnimationSpec → TypeScript renderer
    types.ts                     Core types
  components/
    animationTools.ts            Tool registry (Function Calling schema)
components/
  animation/
    DerivativeAnimation.tsx      Core animation component (Canvas 2D)
docs/
  TECH_SPEC.md                   Full technical specification
  PRODUCT_SPEC.md                Product requirements & user stories
```

---

## Animation Tool Registry

Five tools cover 90%+ of SAT/AP math visualization needs:

| Tool | Use Case |
|---|---|
| `drawFunctionGraph` | Plot any y = f(x) curve with animated drawing |
| `drawTangentLine` | Sliding tangent for derivatives / slopes |
| `highlightIntegralArea` | Riemann bars + smooth area for integrals |
| `addMathLabel` | LaTeX-style annotations with fade-in |
| `showStepByStep` | Sequential equation steps panel |

---

## Metrics

| Metric | Target |
|---|---|
| Pass@1 (first-attempt success) | ≥ 70% |
| Pass@3 (success within 3 attempts) | ≥ 90% |
| End-to-end latency | ≤ 8s |
| Animation frame rate | 60fps |

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: React 19 + Tailwind CSS
- **Animation**: HTML5 Canvas 2D (zero animation lib deps)
- **LLM**: OpenAI GPT-4o (`response_format: json_object`)
- **Math**: Native JS Math (safe expression evaluator, no `eval`)

---

## Docs

- [Technical Specification](docs/TECH_SPEC.md) — Architecture, prompt strategy, validation pipeline, code gen
- [Product Specification](docs/PRODUCT_SPEC.md) — User stories, feature scope, success metrics

---

## Roadmap

- [ ] More animation components (limits, integrals, geometry transforms)
- [ ] Remotion pipeline for MP4 video export
- [ ] Voice narration via TTS API
- [ ] Fine-tune smaller model on successful generations
- [ ] Vision model semantic validation (screenshot → "does this look correct?")

---

## Context

Built as an MVP for the **AI Animation Engineer** role at [VideoTutor](https://videotutor.io) — demonstrating the core pipeline: Prompt engineering · Function Calling design · Generate→Execute→Validate→Fix Agent loop · Reusable animation component library.
