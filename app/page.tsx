/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AgentInspector, { AgentLog } from "@/components/agent/AgentInspector";
import { translations, Language } from "@/lib/i18n";

// Dynamic import to avoid SSR issues with Canvas
const DerivativeAnimation = dynamic(
  () => import("@/components/animation/DerivativeAnimation"),
  { ssr: false, loading: () => <div className="w-full h-[420px] bg-gray-50 rounded-xl animate-pulse" /> }
);

import { AnimationSpec } from "@/lib/agent/types";

interface GenerateResult {
  spec?: AnimationSpec;
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
  const [animKey, setAnimKey] = useState(0);
  const [lang, setLang] = useState<Language>("zh");

  const t = translations[lang];

  // Agent Inspector State
  const [agentStatus, setAgentStatus] = useState("pending");
  const [agentAttempts, setAgentAttempts] = useState(1);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);

  const addLog = (message: string) => {
    setAgentLogs(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), message, timestamp: new Date() }
    ]);
  };

  const handleGenerate = async (query?: string) => {
    const q = query ?? input;
    if (!q.trim()) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);
    
    setLoading(true);
    setResult(null);
    setAgentLogs([]);
    setAgentStatus("generating");
    setAgentAttempts(1);
    addLog(`User intent: "${q}"`);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: q, lang }),
        signal: controller.signal,
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.type === "log") {
              addLog(chunk.message);
            } else if (chunk.type === "status") {
              setAgentStatus(chunk.status);
              if (chunk.attempts) setAgentAttempts(chunk.attempts);
            } else if (chunk.type === "result") {
              setResult(chunk);
              setAnimKey((k) => k + 1);
              setAgentStatus("done");
            } else if (chunk.type === "error") {
              setResult({ error: chunk.error });
              setAgentStatus("error");
              addLog(`❌ Error: ${chunk.error}`);
            }
          } catch (e) {
            console.error("Error parsing chunk", e);
          }
        }
      }
    } catch (e) {
      const message = e instanceof DOMException && e.name === "AbortError"
        ? "Generation request timed out. Please try again."
        : String(e);
      setResult({ error: message });
      setAgentStatus("error");
      addLog(`❌ Critical failure: ${message}`);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pro-gradient overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/60 backdrop-blur-md h-16 flex items-center shrink-0 z-50">
        <div className="max-w-[1600px] w-full mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <span className="font-black text-lg italic">A</span>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight block leading-none">{t.title}</span>
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em]">{t.subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-600 border border-green-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Agent
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <span>{t.concept}</span>
            </div>
            <button 
              onClick={() => setLang(l => l === "en" ? "zh" : "en")}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-[10px] font-bold transition shadow-sm text-slate-600 flex items-center gap-2"
            >
              🌐 {lang === "en" ? "中文" : "English"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Fixed height to fit screen */}
      <div className="max-w-[1600px] mx-auto px-8 py-6 h-[calc(100vh-64px)]">
        <div className="flex flex-col lg:flex-row gap-8 h-full items-stretch">
          
          {/* Left Column: Input + Video (Same height as right) */}
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            
            {/* Input Area (Compact) */}
            <div className="glass-card p-5 relative overflow-hidden shrink-0">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1 shrink-0">
                  <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                    {t.heroTitle}
                  </h1>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-1">
                    {t.heroSubtitle}
                  </p>
                </div>

                <div className="flex-[1.5] max-w-xl flex flex-col gap-3">
                  <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <input
                      className="flex-1 px-4 py-2 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      placeholder={t.inputPlaceholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                      disabled={loading}
                    />
                    <button
                      onClick={() => handleGenerate()}
                      disabled={loading || !input.trim()}
                      className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 min-w-[100px]"
                    >
                      {loading ? t.thinkingBtn : t.generateBtn}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setInput(p); handleGenerate(p); }}
                        className="text-[9px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-200/50 truncate max-w-[140px]"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Area (Flexible) */}
            <div className="glass-card p-2 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="bg-slate-900 rounded-[20px] overflow-hidden flex-1 flex flex-col relative">
                <div className="px-5 py-3 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 mr-3">
                      <div className="w-2 h-2 rounded-full bg-red-500/40" />
                      <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                      <div className="w-2 h-2 rounded-full bg-green-500/40" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      {t.animationPreview}
                    </span>
                  </div>
                  {result?.spec && (
                    <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold uppercase tracking-wider">
                      {result.spec.concept}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-[#1a1a1a] relative min-h-0 flex items-center justify-center p-6">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] z-10" />
                  <div className="w-full h-full max-w-full max-h-full aspect-video shadow-2xl rounded-lg overflow-hidden border border-white/5">
                    <DerivativeAnimation 
                      key={animKey} 
                      spec={result?.spec} 
                      autoPlay={!!result} 
                    />
                  </div>
                </div>

                {/* Subtitles Overlay (Optional UI touch) */}
                {result?.spec && (
                  <div className="absolute bottom-6 left-0 right-0 z-20 px-10 text-center pointer-events-none">
                    <p className="inline-block px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-sm font-medium border border-white/10 shadow-xl">
                      {result.spec.concept} — {t.animationPreview}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Script Section (Compact scrollable at bottom) */}
            {result?.spec && (
              <div className="glass-card p-4 shrink-0 overflow-hidden">
                <div className="flex items-center gap-3 mb-3 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{t.narrationScript}</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-1 custom-scrollbar scrollbar-thin">
                  {result.spec.narration.map((line, i) => (
                    <div key={i} className="flex-none w-[260px] p-3 rounded-xl bg-slate-50 border border-slate-100 relative group hover:border-blue-200 transition-colors">
                      <span className="text-[9px] font-black text-blue-500/20 absolute top-2 right-3 italic">STEP {i+1}</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 italic">
                        "{line}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Agent Inspector (Same height as Left) */}
          <div className="w-full lg:w-[400px] shrink-0 h-full flex flex-col gap-4">
            <div className="glass-card overflow-hidden flex-1 border border-slate-200/60 shadow-2xl">
              <AgentInspector 
                status={agentStatus}
                attempts={agentAttempts}
                logs={agentLogs}
                spec={result?.spec}
                lang={lang}
              />
            </div>
            
            <div className="px-4 text-center shrink-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
                {t.footerLine1}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
