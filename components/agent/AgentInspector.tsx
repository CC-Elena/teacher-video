/* eslint-disable */
"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Loader2, AlertCircle, Terminal as TerminalIcon } from "lucide-react";
import { translations, Language } from "@/lib/i18n";

export interface AgentLog {
  id: string;
  message: string;
  timestamp: Date;
}

interface AgentInspectorProps {
  status: string;
  attempts: number;
  logs: AgentLog[];
  spec?: any;
  lang: Language;
}

export default function AgentInspector({ status, attempts, logs, spec, lang }: AgentInspectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const steps = [
    { id: "parsing", label: t.steps.parsing, stages: ["generating", "fixing"] },
    { id: "validating", label: t.steps.validating, stages: ["validating"] },
    { id: "generating", label: t.steps.generating, stages: ["generating_code"] },
    { id: "executing", label: t.steps.executing, stages: ["executing"] },
  ];

  // Helper to map agent status to steps
  const getStepStatus = (stepId: string) => {
    const activeIndex = steps.findIndex(s => s.stages.includes(status));
    const stepIndex = steps.findIndex(s => s.id === stepId);

    if (status === "done") return "success";
    if (status === "error") return "error";
    if (activeIndex === stepIndex) return "loading";
    if (activeIndex > stepIndex) return "success";
    return "pending";
  };

  return (
    <div className="w-full h-full bg-[#0B0F19] flex flex-col relative overflow-hidden terminal-glow">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            <h2 className="font-bold text-white text-sm tracking-tight uppercase tracking-widest">
              {t.agentInspector}
            </h2>
          </div>
          {attempts > 1 && (
            <div className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-tighter">
              {t.attempt} #{attempts}
            </div>
          )}
        </div>

        {/* Stepper: Tech Style */}
        <div className="grid grid-cols-4 gap-1">
          {steps.map((step, idx) => {
            const stepStatus = getStepStatus(step.id);
            return (
              <div key={step.id} className="relative">
                <div className={`h-1 rounded-full transition-all duration-500 ${
                  stepStatus === "success" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                  stepStatus === "loading" ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" :
                  stepStatus === "error" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                  "bg-white/10"
                }`} />
                <div className="mt-2 text-[8px] font-bold text-white/30 uppercase tracking-tighter text-center truncate">
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Logs Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="px-6 py-2 bg-black/40 text-blue-400/60 text-[9px] font-black font-mono flex items-center gap-2 border-b border-white/5 uppercase tracking-[0.2em]">
          <TerminalIcon className="w-3 h-3" />
          {t.thoughtProcess}
        </div>
        
        {/* The Log Stream with Scanlines */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-2 custom-scrollbar relative z-10"
          >
            {logs.length === 0 && (
              <div className="text-white/20 italic animate-pulse">{t.waiting}</div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 group">
                <span className="text-white/20 shrink-0 select-none tabular-nums font-bold">
                  {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`leading-relaxed ${
                  log.message.includes("❌") ? "text-red-400" : 
                  log.message.includes("✅") ? "text-green-400" : 
                  log.message.includes("Attempt") || log.message.includes("第") ? "text-amber-400 font-bold" :
                  "text-slate-300"
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spec Preview Area */}
      {spec && (
        <div className="border-t border-white/5 p-6 bg-black/40 backdrop-blur-xl">
          <details className="group">
            <summary className="text-[10px] font-black text-white/40 cursor-pointer list-none flex items-center justify-between uppercase tracking-[0.2em] hover:text-white/60 transition-colors">
              {t.specJson}
              <span className="group-open:rotate-180 transition-transform opacity-40">▼</span>
            </summary>
            <div className="mt-4 bg-black/60 rounded-xl p-4 border border-white/5 overflow-x-auto shadow-inner">
              <pre className="text-[10px] text-blue-300/80 leading-relaxed font-mono">
                {JSON.stringify(spec, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
