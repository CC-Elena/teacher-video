/**
 * Prompt templates for the AnimAgent pipeline
 *
 * Three-layer architecture:
 *   1. SYSTEM_PROMPT   – role + component docs + hard constraints
 *   2. FEW_SHOT_EXAMPLES – 3 high-quality input→spec pairs
 *   3. buildUserPrompt  – current task (+ error on retry)
 */

import { ANIMATION_TOOLS } from "../components/animationTools";

const TOOL_DOCS = ANIMATION_TOOLS.map(
  (t) =>
    `### ${t.name}\n${t.description}\nParameters: ${JSON.stringify(t.parameters.properties, null, 2)}`
).join("\n\n");

export const SYSTEM_PROMPT = `You are AnimAgent, an expert math animation code generator.
Your job is to produce a structured AnimationSpec JSON that describes a sequence of tool calls
to render an educational math animation for SAT/AP students.

## Available Animation Tools
${TOOL_DOCS}

## Output Format
You MUST respond with a valid JSON object matching this schema:
{
  "concept": "brief concept name",
  "animationType": "derivative|integral|function_graph|geometry|algebra_steps",
  "steps": [
    {
      "toolName": "<one of the available tool names>",
      "params": { ...tool parameters... },
      "startMs": 0,
      "durationMs": 2000,
      "description": "what this step shows"
    }
  ],
  "narration": ["line 1", "line 2"],
  "durationMs": 8000,
  "expectedOutcome": "student will understand..."
}

## Hard Constraints
- ONLY use tool names from the available list above
- params must strictly match the tool's parameter schema
- durationMs for each step must be positive and reasonable (500–5000ms)
- Total durationMs should be 5000–15000ms
- narration array must have at least 2 items
- Do NOT include any explanation outside the JSON
- If asked to fix an error, output ONLY the corrected JSON`;

export const FEW_SHOT_EXAMPLES = [
  {
    user: "Show me how the derivative of x² equals 2x using a moving tangent line",
    spec: {
      concept: "Derivative of x²",
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
          description: "Draw the parabola y=x²",
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
          description: "Slide tangent from x=-3 to x=3 showing slope=2x",
        },
        {
          toolName: "showStepByStep",
          params: {
            steps: ["f(x) = x²", "f'(x) = 2x", "at x=2: slope = 4", "at x=-1: slope = -2"],
            intervalMs: 1000,
            position: "right",
          },
          startMs: 6000,
          durationMs: 4000,
          description: "Show algebraic derivation steps",
        },
      ],
      narration: [
        "Let's explore the derivative of f(x) equals x squared.",
        "As the tangent point moves, notice the slope equals 2x.",
        "This is exactly the derivative — the instantaneous rate of change.",
      ],
      durationMs: 10000,
      expectedOutcome: "Student understands derivative as slope of tangent line",
    },
  },
  {
    user: "Visualize the area under sin(x) from 0 to π",
    spec: {
      concept: "Definite Integral of sin(x)",
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
          description: "Draw sin(x) curve",
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
          description: "Fill integral area with Riemann bars then smooth",
        },
        {
          toolName: "addMathLabel",
          params: { text: "∫₀^π sin(x)dx = 2", x: 1.5, y: 0.4, fontSize: 18, color: "#1F2937", fadeIn: true },
          startMs: 5000,
          durationMs: 1500,
          description: "Show the result",
        },
      ],
      narration: [
        "The definite integral measures the area between a curve and the x-axis.",
        "We can approximate it with rectangles — this is the Riemann sum.",
        "As rectangles become infinitely thin, we get the exact area: 2.",
      ],
      durationMs: 7000,
      expectedOutcome: "Student understands integral as area and Riemann approximation",
    },
  },
];

/**
 * Build the user-turn message for the LLM.
 * On retry, appends the previous error so LLM can self-fix.
 */
export function buildUserPrompt(
  userInput: string,
  previousError?: string,
  previousSpec?: string
): string {
  if (previousError && previousSpec) {
    return `Previous attempt failed with this error:
\`\`\`
${previousError}
\`\`\`

Original AnimationSpec that caused the error:
\`\`\`json
${previousSpec}
\`\`\`

Please fix the JSON and return the corrected AnimationSpec.
User's original request: "${userInput}"`;
  }
  return `Generate an AnimationSpec for: "${userInput}"`;
}
