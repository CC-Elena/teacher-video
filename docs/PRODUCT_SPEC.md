# AnimAgent — Product Specification

> **Product**: AnimAgent MVP  
> **Parent Product**: VideoTutor  
> **Target User**: SAT/AP High School Students (US, 15–18 years old)  
> **Version**: 1.0  
> **Date**: 2026-04-29

---

## 1. Problem Statement

### The Core Pain Point

80% of SAT Math and AP Calculus content involves **visual concepts** — graphs, slopes, areas, transformations. Traditional AI tutors answer these questions with text or static images.

**Text can explain a derivative. An animation _shows_ it.**

When a student asks "why does f'(x) = 2x for f(x) = x²?", they need to _see_ the tangent line slide along the parabola and watch the slope readout change in real time. No amount of LaTeX solves that.

### Market Opportunity

- ~2.6 million students take SAT annually; 37% pay for prep (~$69/month)
- AP Calculus AB/BC: ~450K test-takers per year
- Existing tools (Khan Academy, ChatGPT, Wolfram Alpha) are either static or text-first
- VideoTutor's animated approach is fundamentally differentiated

---

## 2. Product Vision

> **One sentence**: Ask any math question; get a personalized, animated explanation in under 10 seconds.

AnimAgent is the generation engine behind that promise. It is not a user-facing product itself — it is the AI infrastructure that makes VideoTutor's 1-sentence-to-video experience possible.

---

## 3. User Stories

### Primary User: Student studying for SAT Math

| # | Story | Acceptance Criteria |
|---|---|---|
| US-1 | "As a student, I want to type a math question and immediately see an animation" | Animation plays within 8s of submit |
| US-2 | "I want the animation to pause and replay so I can re-watch confusing parts" | Play/pause/replay controls work |
| US-3 | "I want to understand what the animation is showing me" | Narration script displayed alongside |
| US-4 | "I want to ask follow-up questions about the same concept" | Input resets but animation history remains |

### Secondary User: Content Engineer at VideoTutor

| # | Story | Acceptance Criteria |
|---|---|---|
| US-5 | "I want to see how many attempts the AI needed to generate correctly" | Metrics panel shows pass@1, attempts |
| US-6 | "I want to inspect the underlying AnimationSpec" | JSON inspector toggle works |
| US-7 | "I want the system to auto-fix generation errors without my intervention" | Auto-retry loop handles ≥90% of errors |

---

## 4. Feature Scope (MVP)

### In Scope ✅

| Feature | Description |
|---|---|
| **Text Input** | Free-form natural language question |
| **Example Prompts** | 4 clickable SAT/AP examples for onboarding |
| **Core Animation: Derivative** | Tangent line sliding animation for f(x)=x² |
| **Animation Controls** | Play / Pause / Replay |
| **Progress Bar** | Visual timeline indicator |
| **Generation Metrics** | Pass@1, attempts, duration, mode |
| **Narration Script** | Numbered voice-over lines |
| **AnimationSpec Inspector** | JSON viewer for generated spec |
| **Demo Mode** | Works without OpenAI API key (mock spec) |
| **Auto-fix Loop** | Up to 3 attempts with error injection |

### Out of Scope ❌ (Future)

| Feature | Reason Deferred |
|---|---|
| Voice narration (TTS) | Requires additional API integration |
| Video export (MP4) | Needs Remotion pipeline |
| Multiple animations (not just derivative) | Component library expansion needed |
| User accounts / history | Auth infrastructure out of MVP scope |
| Mobile-responsive layout | Desktop-first for MVP |

---

## 5. Core User Flow

```
1. Student opens VideoTutor
        │
        ▼
2. Sees input box + 4 example prompts
   "Show how the derivative of x² equals 2x"
        │
        ▼
3. Types or clicks a prompt → Hits "Generate"
        │
        ▼
4. Loading state (≤8s)
   AnimAgent pipeline: Parse → Generate → Validate → Execute
        │
        ▼
5. Animation auto-plays
   - Parabola draws in (0–2.7s)
   - Tangent appears and slides (2.7–8.1s)
   - Step-by-step panel (8.1–9s)
        │
        ▼
6. Student reads narration script alongside
   Can pause, replay, or ask a new question
```

---

## 6. The Four-Phase Animation (Derivative of x²)

This is the single animation implemented in MVP. It is deliberately chosen because:

1. **Most common SAT/AP question type**: Derivatives appear in ~35% of AP Calc questions
2. **Hardest to explain with text**: The concept of "instantaneous rate of change" requires motion
3. **Demonstrates all animation primitives**: Curve drawing, moving point, dynamic labels, step text

### Phase Breakdown

| Phase | Duration | What Happens | Educational Goal |
|---|---|---|---|
| **Draw Curve** | 0–2.7s | Blue parabola animates in L→R | Establish f(x) = x² |
| **Tangent Appears** | 2.7–3.2s | Yellow tangent line fades in at x=−4 | Introduce tangent concept |
| **Slope Slides** | 3.2–8.1s | Tangent point moves x: −4→+4, slope label updates live | Show f'(x) = 2x pattern |
| **Step Panel** | 8.1–9s | f(x)=x², f'(x)=2x, slope=2x appear sequentially | Algebraic reinforcement |

### Visual Design Decisions

| Element | Color | Rationale |
|---|---|---|
| Function curve | `#3B82F6` (Blue-500) | Trust, math association |
| Tangent line | `#F59E0B` (Amber-400) | Contrast on blue, attention-drawing |
| Slope label | `#1F2937` (Gray-900) | Readable, neutral |
| Step panel highlight | `#2563EB` (Blue-600) | Current step emphasis |
| Background | White | Clean, no visual noise |

---

## 7. AnimationSpec Contract

The AnimationSpec is the "source of truth" that connects LLM output to the renderer. It is:

- **LLM-generated**: AnimAgent produces it via structured JSON output
- **Validated**: 3-level validation before rendering
- **Renderer-consumed**: The Canvas renderer reads it frame-by-frame
- **Human-readable**: Engineers can inspect it in the JSON panel

This contract is what makes the system extensible: add a new tool to the registry, add it to the system prompt, and the LLM can immediately use it.

---

## 8. Demo Mode

When `OPENAI_API_KEY` is not set, the system operates in Demo Mode:

- Returns a hardcoded `AnimationSpec` for the derivative example
- All UI features work identically
- Metrics panel shows `Mode: Demo (no API key)`
- Allows product demos and screenshots without API cost

This was designed deliberately for:
1. Portfolio demonstrations
2. CI/CD testing without API costs
3. Onboarding new developers

---

## 9. Success Metrics

### Quantitative

| Metric | MVP Target | How Measured |
|---|---|---|
| First-attempt success rate | ≥70% | `pass1Success` flag in API response |
| End-to-end latency | ≤8s | `totalDurationMs` |
| Error auto-recovery rate | ≥90% | `totalAttempts ≤ 3` for successful runs |
| Animation frame rate | 60fps | `requestAnimationFrame` timing |

### Qualitative (User Research)

- "Did the animation help you understand the concept?" (1–5 scale, target: ≥4)
- "Would you use this instead of watching a YouTube tutorial?" (Y/N, target: ≥60% Y)

---

## 10. Comparison: Before vs. After AnimAgent

| Scenario | Without AnimAgent | With AnimAgent |
|---|---|---|
| "Why is f'(x²) = 2x?" | Text explanation with LaTeX | 9-second animation with sliding tangent |
| Wrong first generation | Manual fix by engineer | Auto-retry with error injection |
| New concept support | New codebase per concept | Add one tool to registry + 1 few-shot |
| Animation quality control | Manual review | 3-level automated validation |
| Latency | N/A | ≤8s end-to-end |

---

## 11. Appendix: SAT/AP Content Coverage Map

Planned tool expansion to cover VideoTutor's full content scope:

| SAT/AP Topic | Tool Needed | Priority |
|---|---|---|
| Derivatives (slopes) | `drawTangentLine` ✅ | P0 — In MVP |
| Function graphs | `drawFunctionGraph` ✅ | P0 — In MVP |
| Definite integrals | `highlightIntegralArea` ✅ | P0 — In MVP |
| Algebra steps | `showStepByStep` ✅ | P0 — In MVP |
| Limits | `drawLimitApproach` | P1 |
| Geometric transformations | `applyTransformation` | P1 |
| Trigonometry unit circle | `drawUnitCircle` | P1 |
| 3D surfaces | `drawSurface3D` | P2 |
| Probability distributions | `drawNormalCurve` | P2 |
| Matrix operations | `animateMatrix` | P2 |
