import { NextResponse } from "next/server";
import { readGenerationEvents, summarizeGenerationEvents } from "@/lib/server/telemetry";

export const runtime = "nodejs";

export async function GET() {
  const events = await readGenerationEvents();
  return NextResponse.json(summarizeGenerationEvents(events), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
