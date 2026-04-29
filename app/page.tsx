"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Canvas
const DerivativeAnimation = dynamic(
  () => import("@/components/animation/DerivativeAnimation"),
  { ssr: false, loading: () => <div className="w-full h-[420px] bg-gray-50 rounded-xl animate-pulse" /> }
);

interface GenerateResult {
  spec?: {
    concept: string;
    animationType: string;
    steps: unknown[];
    narration: string[];
    durationMs: number;
  };
  metrics?: {
    pass1Success: boolean;
    totalAttempts: number;
    totalDurationMs: number;
    errorsEncountered: string[];
  };
  demoMode?: boolean;
  error?: string;
}

const EXAMPLE_PROMPTS = [
  "Show how the derivative of x² equals 2x",
  "Explain the area under sin(x) from 0 to π",
  "Why is the derivative of x³ equal to 3x²?",
  "Visualize how limits work as x approaches 2",
];

export default function HomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [showSpec, setShowSpec] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const handleGenerate = async (query?: string) => {
    const q = query ?? input;
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: q }),
      });
      const data: GenerateResult = await res.json();
      setResult(data);
      setAnimKey((k) => k + 1);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">VT</div>
            <span className="font-bold text-gray-900 text-lg">AnimAgent</span>
            <span className="text-xs text-gray-400 font-normal ml-1">by VideoTutor</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Generate → Execute → Validate → Fix
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Math Animations, Instantly
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Type any SAT/AP concept. AnimAgent generates, validates, and renders
            a personalized animation — with an auto-fix loop.
          </p>
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              placeholder='e.g. "Show how the derivative of x² equals 2x"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              disabled={loading}
            />
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !input.trim()}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : "Generate ✦"}
            </button>
          </div>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2 mt-4">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => { setInput(p); handleGenerate(p); }}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Animation Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Animation Preview
            </h2>
            {result?.spec && (
              <span className="text-xs text-gray-400">{result.spec.concept}</span>
            )}
          </div>
          <DerivativeAnimation key={animKey} autoPlay={!!result} />
        </div>

        {/* Metrics + Spec */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Metrics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Generation Metrics</h3>
              {result.error ? (
                <p className="text-red-500 text-sm">{result.error}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pass@1</span>
                    <span className={result.metrics?.pass1Success ? "text-green-600 font-medium" : "text-orange-500"}>
                      {result.metrics?.pass1Success ? "✓ Success" : "✗ Required retry"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attempts</span>
                    <span className="font-medium">{result.metrics?.totalAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{result.metrics?.totalDurationMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mode</span>
                    <span className={result.demoMode ? "text-amber-600" : "text-blue-600"}>
                      {result.demoMode ? "Demo (no API key)" : "Live"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Narration */}
            {result.spec && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Narration Script</h3>
                <ol className="space-y-2">
                  {result.spec.narration.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                      <span className="text-blue-500 font-medium w-4 shrink-0">{i + 1}.</span>
                      {line}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* AnimationSpec JSON inspector */}
        {result?.spec && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">AnimationSpec JSON</h3>
              <button
                onClick={() => setShowSpec((s) => !s)}
                className="text-xs text-blue-500 hover:underline"
              >
                {showSpec ? "Hide" : "Show"}
              </button>
            </div>
            {showSpec && (
              <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-x-auto text-gray-700 max-h-80">
                {JSON.stringify(result.spec, null, 2)}
              </pre>
            )}
            {!showSpec && (
              <div className="text-xs text-gray-400 flex gap-4">
                <span>{result.spec.steps.length} steps</span>
                <span>{result.spec.durationMs / 1000}s total</span>
                <span>{result.spec.animationType}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-gray-400 space-y-1">
          <p>AnimAgent MVP · Built for VideoTutor · Generate → Execute → Validate → Fix</p>
          <p>Targeting SAT/AP Calculus · Powered by OpenAI Function Calling</p>
        </footer>
      </div>
    </main>
  );
}
