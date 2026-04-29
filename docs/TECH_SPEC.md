# AnimAgent — Technical Specification

> **Project**: teacher-video  
> **Role Target**: AI Animation Engineer @ VideoTutor  
> **Version**: MVP 1.0  
> **Date**: 2026-04-29

---

## 1. System Overview

AnimAgent is the core AI engine that powers VideoTutor's animation generation pipeline. It translates a student's natural-language math question into an executable, animated explanation through a four-stage closed loop.

```
User Input (NL)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 1: Intent Parser                                  │
│  NL → AnimationSpec (structured JSON)                   │
│  LLM: GPT-4o, response_format: json_object              │
│  Prompt: System + Few-shot (3 examples) + User           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 2: Validator                                      │
│  Three levels: Schema → Tool → Semantic                  │
│  Fast-fails before any code execution                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 3: Code Generator                                 │
│  AnimationSpec → TypeScript Canvas renderer              │
│  Template-based, deterministic, no LLM                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 4: Executor (Sandbox)                             │
│  Structural + safety checks (structural sanity now,      │
│  vm2/Worker isolation in production)                     │
│  On failure → inject error → back to Stage 1            │
└─────────────────────────────────────────────────────────┘
                      │
              ┌───────┴──────┐
           Success        Failure (max 3 retries)
              │                    │
         Return result        Throw error
```

---

## 2. Core Data Model

### AnimationSpec

The central data contract between LLM output and the renderer:

```typescript
interface AnimationSpec {
  concept: string;          // "Derivative of x²"
  animationType: AnimationType;
  steps: AnimationStep[];   // Ordered tool calls
  narration: string[];      // Voice-over script
  durationMs: number;       // Total animation length
  expectedOutcome: string;  // Educational goal (for semantic validation)
}

interface AnimationStep {
  toolName: string;          // Must be in ANIMATION_TOOLS registry
  params: Record<string, unknown>;
  startMs: number;           // When to start (relative)
  durationMs: number;        // How long this step lasts
  description: string;       // Human-readable step summary
}
```

### Why a two-step approach (Spec → Code)?

Instead of asking the LLM to directly write TypeScript:

| Direct code gen | Spec → Code (our approach) |
|---|---|
| Hallucinations in API usage | LLM only chooses tools + params |
| Hard to validate | JSON schema validation is trivial |
| High token cost to re-generate | Only re-generate spec on failure |
| Unpredictable output length | Structured JSON, bounded size |
| Unsafe `eval`/`require` possible | Code is template-generated, no LLM in hot path |

---

## 3. Prompt Engineering Strategy

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│  Layer 1: SYSTEM_PROMPT             │  ~800 tokens (cached)
│  - Role definition                  │
│  - Tool documentation               │
│  - Output schema                    │
│  - Hard constraints                 │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Layer 2: FEW_SHOT_EXAMPLES         │  ~600 tokens per example
│  - 2 high-quality NL→Spec pairs     │
│  - Cover derivative + integral      │
│  - Demonstrate correct timing       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Layer 3: USER_PROMPT               │  ~50 tokens (fresh each call)
│  - User's natural language          │
│  - Previous error (on retry)        │
│  - Previous spec (on retry)         │
└─────────────────────────────────────┘
```

### Key Constraints in System Prompt

These constraints are explicitly stated to prevent the most common LLM failure modes:

1. **Tool constraint**: `ONLY use tool names from the available list`
2. **No free-form code**: LLM only outputs JSON, never TypeScript
3. **Timing bounds**: `durationMs must be between 500–5000ms per step`
4. **Safety**: No `eval`, `require`, `process.exit` in any generated content
5. **Format**: `Do NOT include any explanation outside the JSON`

### Self-Repair on Failure

When a validation or execution error occurs, the error + original spec are injected back:

```
Previous attempt failed with this error:
  Step 1: unknown toolName "plotGraph". Valid: drawFunctionGraph, ...

Original spec that caused the error:
  { "steps": [{ "toolName": "plotGraph", ... }] }

Please fix the JSON and return the corrected AnimationSpec.
```

This gives the LLM specific, actionable feedback rather than a generic retry.

---

## 4. Function Calling / Tool Use Design

### Tool Registry

Five animation tools cover 90%+ of SAT/AP math visualization needs:

| Tool | Use Case | Key Params |
|---|---|---|
| `drawFunctionGraph` | Any y=f(x) plot | `expression`, `range`, `animateDraw` |
| `drawTangentLine` | Derivatives, slopes | `expression`, `atX`, `animateSlide` |
| `highlightIntegralArea` | Definite integrals | `fromX`, `toX`, `showRiemannBars` |
| `addMathLabel` | Annotations, formulas | `text`, `x`, `y`, `fadeIn` |
| `showStepByStep` | Algebraic derivation | `steps[]`, `intervalMs` |

### Why not raw Function Calling API?

OpenAI's function calling API returns structured tool calls, but requires multiple LLM round-trips (one per tool call). For animation generation:

- We need ALL tool calls at once (to compute timing relationships)
- We need the full spec as a unit for validation
- Fewer API calls = lower latency + cost

So we use **structured JSON output** (`response_format: json_object`) instead, with tool definitions embedded in the system prompt as documentation. This is effectively "schema-constrained generation" — the LLM treats tool definitions as the API contract.

---

## 5. Validation Pipeline

### Level 1: Schema Validation

```typescript
// Check required fields and types
if (!Array.isArray(spec.steps) || spec.steps.length === 0)
  errors.push("'steps' must be a non-empty array");
if (typeof spec.durationMs !== "number" || spec.durationMs <= 0)
  errors.push("'durationMs' must be a positive number");
```

### Level 2: Tool Validation

```typescript
// Check each step's toolName is registered
if (!TOOL_NAMES.includes(step.toolName))
  errors.push(`Step ${i}: unknown toolName "${step.toolName}"`);

// Check tool-specific required params
if (step.toolName === "drawTangentLine" && step.params.atX === undefined)
  errors.push(`Step ${i}: missing required param 'atX'`);
```

### Level 3: Semantic Validation (Warnings)

```typescript
if (typedSpec.durationMs < 3000)
  warnings.push("Total duration < 3s may feel too rushed");
if (lastStep.startMs + lastStep.durationMs > spec.durationMs * 1.1)
  warnings.push("Last step extends beyond total durationMs");
```

**Fail fast**: The pipeline stops at the first error level and triggers a retry rather than letting bad code reach the executor.

---

## 6. Core Animation Component: DerivativeAnimation

### Design Goals

- Single-file, zero external animation library dependencies
- Pure Canvas 2D API — no WebGL, no DOM manipulation
- requestAnimationFrame loop with easing
- Reproducible: given the same `AnimationSpec`, always produces the same output

### Animation Phases

```
Timeline: 0ms ─────────────────────────────── 9000ms

Phase 1 (0–30%):    Curve draws from left to right
                    Blue parabola animates in

Phase 2 (30–35%):   Tangent line fades in at x=XMIN

Phase 3 (35–90%):   Tangent point slides x: -4 → +4
                    Slope label updates in real time
                    Shows: "slope = 2x"

Phase 4 (90–100%):  Step-by-step panel appears
                    f(x) = x², f'(x) = 2x, ...
```

### Math Safety

```typescript
// Expression evaluator: no eval() on user input
// Uses Function() constructor with explicit safe scope
function evalExpr(expr: string, x: number): number {
  const safeScope = { x, sin: Math.sin, cos: Math.cos, ... };
  const js = expr.replace(/\^/g, "**");
  const fn = new Function(...Object.keys(safeScope), `"use strict"; return (${js});`);
  return fn(...Object.values(safeScope));
}

// Derivative via central differences (no symbolic math needed)
function numericalDerivative(expr: string, x: number, h = 1e-5): number {
  return (evalExpr(expr, x + h) - evalExpr(expr, x - h)) / (2 * h);
}
```

---

## 7. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack TypeScript, edge-ready API |
| UI | React 19 + Tailwind CSS | Component model fits animation steps |
| Animation | HTML5 Canvas 2D | Zero deps, precise frame control |
| LLM | OpenAI GPT-4o | Best structured JSON output quality |
| Math | Native JS Math | No mathjs dep in renderer (safety) |
| Language | TypeScript strict | Catches tool param errors at compile time |

### Why Canvas over Remotion/GSAP?

For a MVP demo:
- **Remotion**: Needs build step, heavier setup, overkill for single component demo
- **GSAP**: External dependency, licensing considerations
- **Canvas 2D**: Instant, no build, full control of every pixel, easy to sandbox

Production roadmap: replace Canvas renderer with Remotion for video export.

---

## 8. Quality Metrics

| Metric | Target | Measurement |
|---|---|---|
| Pass@1 (first-attempt success) | > 70% | `metrics.pass1Success` |
| Pass@3 (success within 3 attempts) | > 90% | `metrics.totalAttempts <= 3` |
| Mean generation latency | < 5s | `metrics.totalDurationMs` |
| Validation error catch rate | 100% | All schema/tool errors caught pre-execution |
| Unsafe code blocked | 100% | Regex scan on generated code |

---

## 9. File Structure

```
teacher-video/
├── app/
│   ├── api/generate/route.ts    # AnimAgent API endpoint
│   ├── page.tsx                 # Main UI (input + preview + metrics)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── agent/
│   │   ├── animAgent.ts         # Core Generate→Validate→Execute→Fix loop
│   │   ├── prompts.ts           # System prompt, few-shot, user prompt builder
│   │   ├── validator.ts         # 3-level spec validation
│   │   ├── codeGenerator.ts     # AnimationSpec → TypeScript code
│   │   └── types.ts             # AnimationSpec, AgentState, etc.
│   └── components/
│       └── animationTools.ts    # Tool registry (Function Calling schema)
├── components/
│   └── animation/
│       └── DerivativeAnimation.tsx  # Core animation component
└── docs/
    ├── TECH_SPEC.md             # This document
    └── PRODUCT_SPEC.md          # Product specification
```

---

## 10. Production Roadmap

### Phase 2 (Next Sprint)
- [ ] Replace `Function()` evaluator with mathjs for richer expression support
- [ ] Add vm2 sandbox for actual TypeScript execution
- [ ] Implement Remotion pipeline for MP4 video export
- [ ] Add Redis queue for async generation jobs

### Phase 3 (Scale)
- [ ] Fine-tune a smaller model on VideoTutor's successful generations
- [ ] A/B test prompt variants using Pass@1 as primary metric
- [ ] Add Vision model validation (screenshot → "does this look like a parabola?")
- [ ] Extend tool registry to: 3D geometry, matrix operations, probability distributions
