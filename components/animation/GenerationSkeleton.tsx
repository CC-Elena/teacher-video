/* eslint-disable */
"use client";

/**
 * GenerationSkeleton — Loading skeleton with countdown timer
 * Shows while AnimAgent is generating the animation spec
 */

import { useState, useEffect, useRef } from "react";

interface Props {
  lang: "en" | "zh";
}

const ESTIMATED_SECONDS = 8;

const PHASES_EN = ["Parsing intent", "Generating spec", "Validating", "Rendering"];
const PHASES_ZH = ["解析意图", "生成规范", "结构验证", "渲染动画"];

export default function GenerationSkeleton({ lang }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const startRef = useRef(Date.now());

  const phases = lang === "zh" ? PHASES_ZH : PHASES_EN;
  const remaining = Math.max(0, ESTIMATED_SECONDS - elapsed);

  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(sec);
      setPhaseIndex(Math.min(Math.floor(sec / 2), phases.length - 1));
    }, 200);
    return () => clearInterval(timer);
  }, [phases.length]);

  const progress = Math.min(1, elapsed / ESTIMATED_SECONDS);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-8">
      {/* Animated brain icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        {/* Rotating ring */}
        <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/30 animate-spin" style={{ animationDuration: '3s' }} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-slate-800 mb-2">
        {lang === "zh" ? "AnimAgent 正在思考中..." : "AnimAgent is thinking..."}
      </h3>

      {/* Countdown */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-slate-500">
          {lang === "zh" ? "预计剩余时间" : "Estimated time remaining"}
        </span>
        <span className="text-2xl font-black text-blue-600 tabular-nums min-w-[3ch] text-center">
          {remaining}
        </span>
        <span className="text-sm text-slate-500">
          {lang === "zh" ? "秒" : "s"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Phase steps */}
      <div className="flex gap-3">
        {phases.map((phase, i) => (
          <div
            key={phase}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
              i === phaseIndex
                ? "text-blue-600 scale-105"
                : i < phaseIndex
                ? "text-green-500"
                : "text-slate-300"
            }`}
          >
            {i < phaseIndex ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : i === phaseIndex ? (
              <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-slate-200" />
            )}
            {phase}
          </div>
        ))}
      </div>

      {/* Skeleton blocks */}
      <div className="w-full max-w-sm mt-8 space-y-3">
        <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: '80%' }} />
        <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: '60%', animationDelay: '150ms' }} />
        <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: '70%', animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
