import { NextRequest, NextResponse } from "next/server";
import { AnimAgent } from "@/lib/agent/animAgent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userInput, maxAttempts = 3 } = await req.json();

  if (!userInput || typeof userInput !== "string") {
    return NextResponse.json({ error: "userInput is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Demo mode: return mock spec when no API key
    const mockSpec = {
      concept: "Derivative of x²",
      animationType: "derivative",
      steps: [
        {
          toolName: "drawFunctionGraph",
          params: { expression: "x^2", xMin: -4, xMax: 4, yMin: -1, yMax: 12, color: "#3B82F6", animateDraw: true, label: "y = x²" },
          startMs: 0, durationMs: 2000, description: "Draw the parabola y=x²",
        },
        {
          toolName: "drawTangentLine",
          params: { expression: "x^2", atX: 0, animateSlide: true, xMin: -3, xMax: 3, showSlopeLabel: true, curveColor: "#3B82F6", tangentColor: "#F59E0B" },
          startMs: 2000, durationMs: 5000, description: "Slide tangent showing slope=2x",
        },
        {
          toolName: "showStepByStep",
          params: { steps: ["f(x) = x²", "f'(x) = 2x", "slope at x=2 is 4"], intervalMs: 1000, position: "right" },
          startMs: 7000, durationMs: 3000, description: "Show derivation steps",
        },
      ],
      narration: ["Let's explore the derivative of x squared.", "The tangent slope at any point equals 2x."],
      durationMs: 10000,
      expectedOutcome: "Student understands derivative as tangent slope",
    };
    return NextResponse.json({
      spec: mockSpec,
      metrics: { pass1Success: true, totalAttempts: 1, totalDurationMs: 0, errorsEncountered: [] },
      demoMode: true,
    });
  }

  try {
    const agent = new AnimAgent(apiKey);
    const result = await agent.run(userInput, maxAttempts);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[AnimAgent]", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
