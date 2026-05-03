/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { AnimAgent } from "@/lib/agent/animAgent";
import { getDemoSpec } from "@/lib/agent/demoSpec";
import { generateAnimationCode } from "@/lib/agent/codeGenerator";
import { checkRateLimit } from "@/lib/server/rateLimit";
import {
  createGenerationEvent,
  recordFineTuneExample,
  recordGenerationEvent,
} from "@/lib/server/telemetry";

export const runtime = "nodejs";
export const maxDuration = 60;

const GENERATION_TIMEOUT_MS = 18000;

class GenerationTimeoutError extends Error {
  constructor(ms: number) {
    super(`Generation timed out after ${ms}ms`);
    this.name = "GenerationTimeoutError";
  }
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new GenerationTimeoutError(ms)), ms);
  });
}

function classifyGenerationError(err: unknown) {
  if (err instanceof GenerationTimeoutError) {
    return {
      status: "timeout",
      zh: "实时生成超过 18 秒，已切换到本地演示动画。",
      en: "Live generation exceeded 18 seconds; using a local demo animation.",
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  if (/fetch|network|ECONN|ENOTFOUND|ETIMEDOUT|timeout/i.test(message)) {
    return {
      status: "network_error",
      zh: "模型服务网络连接失败，已切换到本地演示动画。",
      en: "The model service network request failed; using a local demo animation.",
    };
  }

  if (/401|403|api key|unauthorized|forbidden/i.test(message)) {
    return {
      status: "auth_error",
      zh: "模型 API 鉴权失败，已切换到本地演示动画。",
      en: "Model API authentication failed; using a local demo animation.",
    };
  }

  return {
    status: "generation_error",
    zh: "实时生成暂时不可用，已切换到本地演示动画。",
    en: "Live generation is unavailable; using a local demo animation.",
  };
}

function createDemoResult(userInput: string, startedAt: number) {
  const spec = getDemoSpec(userInput);
  return {
    spec,
    code: generateAnimationCode(spec),
    metrics: {
      pass1Success: false,
      totalAttempts: 0,
      totalDurationMs: Date.now() - startedAt,
      errorsEncountered: ["Used local demo animation because live generation was unavailable."],
    },
    demoMode: true,
  };
}

function getClientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

function selectProvider() {
  let apiKey = process.env.OPENAI_API_KEY;
  let baseURL = process.env.OPENAI_BASE_URL;
  let model = process.env.OPENAI_MODEL || "gpt-4o";
  let provider = "openai";

  if (process.env.NVIDIA_API_KEY) {
    apiKey = process.env.NVIDIA_API_KEY;
    baseURL = "https://integrate.api.nvidia.com/v1";
    model = process.env.NVIDIA_MODEL || "meta/llama-3.1-405b-instruct";
    provider = "nvidia";
  } else if (process.env.DEEPSEEK_API_KEY) {
    apiKey = process.env.DEEPSEEK_API_KEY;
    baseURL = "https://api.deepseek.com";
    model = "deepseek-chat";
    provider = "deepseek";
  }

  return { apiKey, baseURL, model, provider };
}

function rememberGeneration(userInput: string, result: any, provider: string) {
  if (!result?.spec || !result?.metrics) return;
  const event = createGenerationEvent({
    userInput,
    spec: result.spec,
    demoMode: !!result.demoMode,
    provider,
    status: result.demoMode ? "fallback" : "success",
    metrics: result.metrics,
  });

  void Promise.all([
    recordGenerationEvent(event),
    recordFineTuneExample({
      userInput,
      spec: result.spec,
      demoMode: !!result.demoMode,
      metrics: result.metrics,
    }),
  ]).catch((error) => {
    console.warn("[Telemetry]", error);
  });
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientKey(req));
  if (rateLimit.limited) {
    return NextResponse.json(
      {
        error: "Too many generation requests. Please wait before trying again.",
        resetAt: rateLimit.resetAt,
      },
      {
        status: 429,
        headers: {
          "Retry-After": `${rateLimit.retryAfterSeconds}`,
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": `${rateLimit.resetAt}`,
        },
      }
    );
  }

  const { userInput, maxAttempts = 3, lang = "zh" } = await req.json();

  if (!userInput || typeof userInput !== "string") {
    return NextResponse.json({ error: "userInput is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let streamOpen = true;
      const send = (data: any) => {
        if (!streamOpen) return;
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };
      const close = () => {
        if (!streamOpen) return;
        streamOpen = false;
        controller.close();
      };
      const startedAt = Date.now();
      const { apiKey, baseURL, model, provider } = selectProvider();

      if (!apiKey || apiKey === "your_openai_api_key_here") {
        send({
          type: "log",
          message: lang === "zh"
            ? "未找到可用 API Key，切换到本地演示动画。"
            : "No valid API key found; using a local demo animation.",
        });
        const demoResult = createDemoResult(userInput, startedAt);
        send({ type: "result", ...demoResult });
        rememberGeneration(userInput, demoResult, provider);
        close();
        return;
      }

      try {
        const agent = new AnimAgent(apiKey, model, baseURL);
        const result = await Promise.race([
          agent.run(
            userInput,
            maxAttempts,
            (state) => send({ type: "status", ...state }),
            (message) => send({ type: "log", message }),
            lang
          ),
          timeoutAfter(GENERATION_TIMEOUT_MS),
        ]);
        send({ type: "result", ...result });
        rememberGeneration(userInput, result, provider);
      } catch (err) {
        console.error("[AnimAgent]", err);
        const classified = classifyGenerationError(err);
        send({ type: "status", status: classified.status });
        send({
          type: "log",
          message: lang === "zh" ? classified.zh : classified.en,
        });
        const demoResult = createDemoResult(userInput, startedAt);
        send({ type: "result", ...demoResult });
        rememberGeneration(userInput, demoResult, provider);
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-RateLimit-Remaining": `${rateLimit.remaining}`,
      "X-RateLimit-Reset": `${rateLimit.resetAt}`,
    },
  });
}
