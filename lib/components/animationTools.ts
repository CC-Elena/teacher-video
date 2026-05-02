/**
 * Animation Tool Definitions
 * These tools are registered with the LLM via Function Calling.
 * Each tool maps to a React component that renders to canvas/SVG.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const ANIMATION_TOOLS: ToolDefinition[] = [
  {
    name: "drawFunctionGraph",
    description:
      "Draw a mathematical function on a coordinate system with optional animation. " +
      "Use this to show any y=f(x) curve, e.g. parabolas, trig functions, polynomials.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            "Math expression in mathjs syntax, e.g. 'x^2', 'sin(x)', '2*x + 1'",
        },
        xMin: { type: "number", description: "Left boundary of x-axis, default -5" },
        xMax: { type: "number", description: "Right boundary of x-axis, default 5" },
        yMin: { type: "number", description: "Bottom boundary of y-axis, default -5" },
        yMax: { type: "number", description: "Top boundary of y-axis, default 5" },
        color: {
          type: "string",
          description: "Hex color for the curve, e.g. '#3B82F6'",
        },
        animateDraw: {
          type: "boolean",
          description: "Whether to animate the curve drawing from left to right",
        },
        label: { type: "string", description: "Label text shown near the curve" },
      },
      required: ["expression"],
    },
  },
  {
    name: "drawTangentLine",
    description:
      "Draw a tangent line to a function at a given x value and optionally animate it " +
      "sliding along the curve to demonstrate how the derivative changes. " +
      "Best for teaching derivatives, instantaneous rate of change.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The base function, e.g. 'x^2'",
        },
        atX: {
          type: "number",
          description: "The x value where tangent is initially drawn",
        },
        animateSlide: {
          type: "boolean",
          description:
            "If true, the tangent point slides from xMin to xMax showing slope change",
        },
        xMin: { type: "number", description: "Left bound for slide animation" },
        xMax: { type: "number", description: "Right bound for slide animation" },
        showSlopeLabel: {
          type: "boolean",
          description: "Show dynamic slope value label, e.g. 'slope = 2x'",
        },
        curveColor: { type: "string", description: "Color of the function curve" },
        tangentColor: { type: "string", description: "Color of the tangent line" },
      },
      required: ["expression", "atX"],
    },
  },
  {
    name: "highlightIntegralArea",
    description:
      "Shade the area under a curve between two x values, with optional animated fill. " +
      "Use for teaching definite integrals and area under the curve.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "The function expression" },
        fromX: { type: "number", description: "Left boundary of integration" },
        toX: { type: "number", description: "Right boundary of integration" },
        fillColor: {
          type: "string",
          description: "Fill color with opacity, e.g. 'rgba(59,130,246,0.3)'",
        },
        animateFill: {
          type: "boolean",
          description: "Animate the area filling from left to right",
        },
        showRiemannBars: {
          type: "boolean",
          description: "Show Riemann sum bars before showing smooth area",
        },
        numBars: {
          type: "number",
          description: "Number of Riemann bars if showRiemannBars is true",
        },
      },
      required: ["expression", "fromX", "toX"],
    },
  },
  {
    name: "drawLimitApproach",
    description:
      "Animate two points approaching a target x value from the left and right. " +
      "Use this to teach one-sided and two-sided limits.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "The function expression" },
        approachX: { type: "number", description: "The x value being approached" },
        leftStartX: { type: "number", description: "Starting x value for the left-side point" },
        rightStartX: { type: "number", description: "Starting x value for the right-side point" },
        yMin: { type: "number", description: "Bottom boundary of y-axis" },
        yMax: { type: "number", description: "Top boundary of y-axis" },
        color: { type: "string", description: "Color for the approaching points and guide lines" },
        showTargetLabel: { type: "boolean", description: "Show the target x and limit value labels" },
      },
      required: ["expression", "approachX"],
    },
  },
  {
    name: "addMathLabel",
    description:
      "Add a LaTeX-style math annotation at a specific position on the canvas. " +
      "Use for formulas, variable labels, axis titles.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Label text, supports simple LaTeX-like notation",
        },
        x: { type: "number", description: "Canvas x position (math coordinates)" },
        y: { type: "number", description: "Canvas y position (math coordinates)" },
        fontSize: { type: "number", description: "Font size in pixels, default 16" },
        color: { type: "string", description: "Text color" },
        fadeIn: { type: "boolean", description: "Fade in animation" },
      },
      required: ["text", "x", "y"],
    },
  },
  {
    name: "showStepByStep",
    description:
      "Display a sequence of equation transformation steps with timed appearance. " +
      "Use for algebraic manipulation, derivative calculation steps.",
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: { type: "string" },
          description: "Array of equation steps, each appears in sequence",
        },
        intervalMs: {
          type: "number",
          description: "Milliseconds between each step appearing, default 1200",
        },
        position: {
          type: "string",
          enum: ["top", "bottom", "right"],
          description: "Where to show steps relative to the graph",
        },
      },
      required: ["steps"],
    },
  },
];

// Canonical tool names for validation
export const TOOL_NAMES = ANIMATION_TOOLS.map((t) => t.name);

export type ToolName = typeof TOOL_NAMES[number];
