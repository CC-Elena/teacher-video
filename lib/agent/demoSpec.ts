import { AnimationSpec } from "./types";

const derivativeSpec: AnimationSpec = {
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
      description: "Slide the tangent and show the changing slope",
    },
    {
      toolName: "showStepByStep",
      params: {
        steps: ["f(x) = x²", "f'(x) = 2x", "at x = 2, slope = 4", "at x = -1, slope = -2"],
        intervalMs: 1000,
        position: "right",
      },
      startMs: 6000,
      durationMs: 3500,
      description: "Show the derivative rule and sample slopes",
    },
  ],
  narration: [
    "Start with the parabola f(x) equals x squared.",
    "The tangent line shows the instantaneous slope at each point.",
    "As x changes, the slope follows 2x, which is the derivative.",
  ],
  durationMs: 9500,
  expectedOutcome: "Student understands f'(x)=2x as the changing tangent slope",
};

const integralSpec: AnimationSpec = {
  concept: "Area under sin(x)",
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
        color: "#2563EB",
        animateDraw: true,
        label: "y = sin(x)",
      },
      startMs: 0,
      durationMs: 1800,
      description: "Draw the sine curve",
    },
    {
      toolName: "highlightIntegralArea",
      params: {
        expression: "sin(x)",
        fromX: 0,
        toX: 3.14159,
        fillColor: "rgba(37,99,235,0.3)",
        animateFill: true,
        showRiemannBars: true,
        numBars: 8,
      },
      startMs: 1800,
      durationMs: 3600,
      description: "Shade the area from 0 to pi",
    },
    {
      toolName: "addMathLabel",
      params: {
        text: "∫₀^π sin(x) dx = 2",
        x: 1.2,
        y: 1,
        fontSize: 18,
        color: "#1E293B",
        fadeIn: true,
      },
      startMs: 5400,
      durationMs: 1800,
      description: "Show the exact area",
    },
  ],
  narration: [
    "A definite integral measures signed area under a curve.",
    "From 0 to pi, sin(x) stays above the x-axis.",
    "The exact area under this arch is 2.",
  ],
  durationMs: 7600,
  expectedOutcome: "Student understands the definite integral as area under the curve",
};

export function getDemoSpec(userInput: string): AnimationSpec {
  const normalized = userInput.toLowerCase();

  if (normalized.includes("sin") || normalized.includes("area") || normalized.includes("integral")) {
    return integralSpec;
  }

  return derivativeSpec;
}
