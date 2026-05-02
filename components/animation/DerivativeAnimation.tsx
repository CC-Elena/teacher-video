/* eslint-disable */
"use client";

/**
 * AnimationPlayer — Robust Dynamic Spec-Driven Renderer
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { evaluate } from "mathjs";
import { AnimationSpec, AnimationStep } from "@/lib/agent/types";

interface Props {
  spec?: AnimationSpec;
  autoPlay?: boolean;
  controls?: {
    play: string;
    pause: string;
    replay: string;
  };
}

// ── Math helpers ────────────────────────────────────────────────────────────

function evalExpr(expr: string, x: number): number {
  const safeScope: Record<string, number | ((...args: number[]) => number)> = {
    x,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sqrt: Math.sqrt, abs: Math.abs, pi: Math.PI,
    e: Math.E, log: Math.log, pow: Math.pow,
  };
  try {
    const result = evaluate(expr, safeScope);
    return typeof result === "number" && isFinite(result) ? result : NaN;
  } catch (e) {
    console.error("Math eval error:", e, expr);
    return NaN;
  }
}

function derivative(expr: string, x: number, h = 1e-5): number {
  const y2 = evalExpr(expr, x + h);
  const y1 = evalExpr(expr, x - h);
  return (y2 - y1) / (2 * h);
}

// ── Coordinate transform ──────────────────────────────────────────────────

interface Bounds { xMin: number; xMax: number; yMin: number; yMax: number }

function toCanvasX(x: number, bounds: Bounds, w: number): number {
  return ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * w;
}
function toCanvasY(y: number, bounds: Bounds, h: number): number {
  return h - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * h;
}

// ── Step Renderers ──────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, bounds: Bounds) {
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  for (let x = Math.floor(bounds.xMin); x <= Math.ceil(bounds.xMax); x++) {
    const cx = toCanvasX(x, bounds, w);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  }
  for (let y = Math.floor(bounds.yMin); y <= Math.ceil(bounds.yMax); y++) {
    const cy = toCanvasY(y, bounds, h);
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  }
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  const x0 = toCanvasX(0, bounds, w);
  const y0 = toCanvasY(0, bounds, h);
  if (x0 >= 0 && x0 <= w) { ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke(); }
  if (y0 >= 0 && y0 <= h) { ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke(); }
}

function renderDrawFunctionGraph(ctx: CanvasRenderingContext2D, params: Record<string, any>, progress: number, w: number, h: number, bounds: Bounds) {
  const expr = String(params.expression ?? "x");
  const color = String(params.color ?? "#3B82F6");
  const animateDraw = params.animateDraw !== false;
  const drawUpTo = animateDraw ? bounds.xMin + (bounds.xMax - bounds.xMin) * progress : bounds.xMax;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  let first = true;
  for (let xi = bounds.xMin; xi <= drawUpTo; xi += (bounds.xMax - bounds.xMin) / 200) {
    const yi = evalExpr(expr, xi);
    if (!isFinite(yi)) { first = true; continue; }
    const cx = toCanvasX(xi, bounds, w);
    const cy = toCanvasY(yi, bounds, h);
    if (first) { ctx.moveTo(cx, cy); first = false; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
}

function renderDrawTangentLine(ctx: CanvasRenderingContext2D, params: Record<string, any>, progress: number, w: number, h: number, bounds: Bounds) {
  const expr = String(params.expression ?? "x^2");
  const animateSlide = params.animateSlide !== false;
  const atX = Number(params.atX ?? 0);
  const currentX = animateSlide ? bounds.xMin + (bounds.xMax - bounds.xMin) * progress : atX;
  const currentY = evalExpr(expr, currentX);
  const slope = derivative(expr, currentX);
  
  const tLen = (bounds.xMax - bounds.xMin) * 0.2;
  const cx1 = toCanvasX(currentX - tLen, bounds, w);
  const cy1 = toCanvasY(currentY - slope * tLen, bounds, h);
  const cx2 = toCanvasX(currentX + tLen, bounds, w);
  const cy2 = toCanvasY(currentY + slope * tLen, bounds, h);
  
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
  ctx.setLineDash([]);
  
  const px = toCanvasX(currentX, bounds, w);
  const py = toCanvasY(currentY, bounds, h);
  ctx.fillStyle = "#F59E0B";
  ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
  
  if (params.showSlopeLabel) {
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`slope = ${slope.toFixed(2)}`, px + 15, py - 15);
  }
}

function renderHighlightIntegralArea(ctx: CanvasRenderingContext2D, params: Record<string, any>, progress: number, w: number, h: number, bounds: Bounds) {
  const expr = String(params.expression ?? "sin(x)");
  const fromX = Number(params.fromX ?? 0);
  const toX = Number(params.toX ?? 3);
  const fillUpTo = fromX + (toX - fromX) * progress;
  const fillColor = String(params.fillColor ?? "rgba(59, 130, 246, 0.3)");
  const showBars = params.showRiemannBars === true;
  const numBars = Math.max(2, Number(params.numBars ?? 8));

  if (showBars) {
    const barWidth = (toX - fromX) / numBars;
    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 1.5);
    ctx.fillStyle = "rgba(14, 165, 233, 0.18)";
    ctx.strokeStyle = "rgba(14, 116, 144, 0.55)";
    ctx.lineWidth = 1;
    for (let i = 0; i < numBars; i++) {
      const x0 = fromX + i * barWidth;
      if (x0 > fillUpTo) break;
      const sampleX = x0 + barWidth / 2;
      const barHeight = evalExpr(expr, sampleX);
      const left = toCanvasX(x0, bounds, w);
      const right = toCanvasX(x0 + barWidth, bounds, w);
      const top = toCanvasY(barHeight, bounds, h);
      const base = toCanvasY(0, bounds, h);
      ctx.fillRect(left, Math.min(top, base), right - left, Math.abs(base - top));
      ctx.strokeRect(left, Math.min(top, base), right - left, Math.abs(base - top));
    }
    ctx.restore();
  }
  
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(toCanvasX(fromX, bounds, w), toCanvasY(0, bounds, h));
  for (let xi = fromX; xi <= fillUpTo; xi += (toX - fromX) / 100) {
    const yi = evalExpr(expr, xi);
    ctx.lineTo(toCanvasX(xi, bounds, w), toCanvasY(yi, bounds, h));
  }
  ctx.lineTo(toCanvasX(fillUpTo, bounds, w), toCanvasY(0, bounds, h));
  ctx.closePath();
  ctx.fill();
}

function renderDrawLimitApproach(ctx: CanvasRenderingContext2D, params: Record<string, any>, progress: number, w: number, h: number, bounds: Bounds) {
  const expr = String(params.expression ?? "x^2");
  const approachX = Number(params.approachX ?? 0);
  const leftStartX = Number(params.leftStartX ?? bounds.xMin);
  const rightStartX = Number(params.rightStartX ?? bounds.xMax);
  const color = String(params.color ?? "#E11D48");
  const eased = 1 - Math.pow(1 - progress, 3);
  const leftX = leftStartX + (approachX - leftStartX) * eased;
  const rightX = rightStartX + (approachX - rightStartX) * eased;
  const limitY = evalExpr(expr, approachX);
  const leftY = evalExpr(expr, leftX);
  const rightY = evalExpr(expr, rightX);
  const targetCx = toCanvasX(approachX, bounds, w);
  const targetCy = toCanvasY(limitY, bounds, h);

  ctx.save();
  ctx.strokeStyle = "rgba(225, 29, 72, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(targetCx, 0); ctx.lineTo(targetCx, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, targetCy); ctx.lineTo(w, targetCy); ctx.stroke();
  ctx.setLineDash([]);

  [
    { x: leftX, y: leftY, label: "left" },
    { x: rightX, y: rightY, label: "right" },
  ].forEach((point) => {
    const px = toCanvasX(point.x, bounds, w);
    const py = toCanvasY(point.y, bounds, h);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#881337";
    ctx.font = "bold 12px monospace";
    ctx.fillText(point.label, px + 10, py - 10);
  });

  ctx.fillStyle = "#111827";
  ctx.font = "bold 14px monospace";
  if (params.showTargetLabel !== false) {
    ctx.fillText(`x -> ${approachX}`, targetCx + 10, h - 18);
    ctx.fillText(`f(x) -> ${Number.isFinite(limitY) ? limitY.toFixed(2) : "?"}`, targetCx + 10, targetCy - 12);
  }
  ctx.restore();
}

function renderAddMathLabel(ctx: CanvasRenderingContext2D, params: Record<string, any>, progress: number, w: number, h: number, bounds: Bounds) {
  const alpha = params.fadeIn !== false ? Math.min(1, progress * 2) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = String(params.color ?? "#1E293B");
  ctx.font = `bold ${Number(params.fontSize ?? 16)}px serif`;
  const px = toCanvasX(Number(params.x ?? 0), bounds, w);
  const py = toCanvasY(Number(params.y ?? 0), bounds, h);
  ctx.fillText(String(params.text ?? ""), px, py);
  ctx.restore();
}

function renderShowStepByStep(ctx: CanvasRenderingContext2D, params: Record<string, any>, progress: number, w: number, h: number) {
  const steps = (params.steps as string[]) ?? [];
  const visible = Math.floor(progress * steps.length) + 1;
  const x = w * 0.65;
  const y = 50;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(x - 10, y - 20, w - x, steps.length * 30 + 20);
  steps.slice(0, visible).forEach((s, i) => {
    const isLatest = i === visible - 1;
    ctx.fillStyle = isLatest ? "#2563EB" : "#475569";
    ctx.font = isLatest ? "bold 13px monospace" : "13px monospace";
    ctx.fillText(s, x, y + i * 30);
  });
}

function renderStep(ctx: CanvasRenderingContext2D, step: AnimationStep, progress: number, w: number, h: number, bounds: Bounds) {
  switch (step.toolName) {
    case "drawFunctionGraph": renderDrawFunctionGraph(ctx, step.params, progress, w, h, bounds); break;
    case "drawTangentLine": renderDrawTangentLine(ctx, step.params, progress, w, h, bounds); break;
    case "highlightIntegralArea": renderHighlightIntegralArea(ctx, step.params, progress, w, h, bounds); break;
    case "drawLimitApproach": renderDrawLimitApproach(ctx, step.params, progress, w, h, bounds); break;
    case "addMathLabel": renderAddMathLabel(ctx, step.params, progress, w, h, bounds); break;
    case "showStepByStep": renderShowStepByStep(ctx, step.params, progress, w, h); break;
  }
}

export default function AnimationPlayer({
  spec,
  autoPlay = true,
  controls,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [canvasSize, setCanvasSize] = useState({ width: 680, height: 420, dpr: 1 });

  const specRef = useRef(spec);
  useEffect(() => { specRef.current = spec; }, [spec]);

  const labels = {
    play: controls?.play ?? "Play",
    pause: controls?.pause ?? "Pause",
    replay: controls?.replay ?? "Replay",
  };

  useEffect(() => {
    elapsedRef.current = 0;
    lastFrameRef.current = 0;
    setProgress(0);
    setIsPlaying(autoPlay && !!spec);
  }, [autoPlay, spec]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(320, Math.floor(rect.width));
      const nextHeight = Math.max(220, Math.floor(rect.height));
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      setCanvasSize((current) => {
        if (
          current.width === nextWidth &&
          current.height === nextHeight &&
          current.dpr === nextDpr
        ) {
          return current;
        }
        return { width: nextWidth, height: nextHeight, dpr: nextDpr };
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const renderAtElapsed = useCallback((elapsed: number) => {
    if (!canvasRef.current || !specRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { width, height, dpr } = canvasSize;
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (canvasRef.current.width !== backingWidth) {
      canvasRef.current.width = backingWidth;
    }
    if (canvasRef.current.height !== backingHeight) {
      canvasRef.current.height = backingHeight;
    }
    if (canvasRef.current.style.width !== `${width}px`) {
      canvasRef.current.style.width = `${width}px`;
    }
    if (canvasRef.current.style.height !== `${height}px`) {
      canvasRef.current.style.height = `${height}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const totalT = Math.min(1, elapsed / (specRef.current.durationMs || 5000));
    setProgress(totalT);

    // Bounds calculation
    const defaultBounds = { xMin: -5, xMax: 5, yMin: -2, yMax: 10 };
    const graphStep = specRef.current.steps.find(s => s.toolName === "drawFunctionGraph" || s.toolName === "drawTangentLine" || s.toolName === "drawLimitApproach");
    const bounds = graphStep ? {
      xMin: Number(graphStep.params.xMin ?? -5),
      xMax: Number(graphStep.params.xMax ?? 5),
      yMin: Number(graphStep.params.yMin ?? -2),
      yMax: Number(graphStep.params.yMax ?? 10),
    } : defaultBounds;

    ctx.clearRect(0, 0, width, height);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#ffffff");
    bgGrad.addColorStop(1, "#f8fafc");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height, bounds);

    specRef.current.steps.forEach((step) => {
      if (elapsed >= step.startMs) {
        const stepProgress = Math.min(1, (elapsed - step.startMs) / (step.durationMs || 1000));
        renderStep(ctx, step, stepProgress, width, height, bounds);
      }
    });
  }, [canvasSize]);

  const renderFn = useCallback((ts: number) => {
    if (!specRef.current) return;

    if (lastFrameRef.current === 0) lastFrameRef.current = ts;
    const delta = ts - lastFrameRef.current;
    lastFrameRef.current = ts;

    const duration = specRef.current.durationMs || 5000;
    elapsedRef.current = Math.min(duration, elapsedRef.current + delta);
    renderAtElapsed(elapsedRef.current);

    if (elapsedRef.current < duration) {
      rafRef.current = requestAnimationFrame(renderFn);
    } else {
      setIsPlaying(false);
      lastFrameRef.current = 0;
    }
  }, [renderAtElapsed]);

  useEffect(() => {
    if (isPlaying && spec) {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(renderFn);
    } else {
      cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, spec, renderFn]);

  useEffect(() => {
    if (spec && !isPlaying) {
      renderAtElapsed(elapsedRef.current);
    }
  }, [spec, isPlaying, renderAtElapsed]);

  const handlePlayPause = () => {
    if (!spec) return;
    const duration = spec.durationMs || 5000;
    if (elapsedRef.current >= duration) {
      elapsedRef.current = 0;
    }
    setIsPlaying((playing) => !playing);
  };

  const handleReplay = () => {
    if (!spec) return;
    elapsedRef.current = 0;
    setProgress(0);
    renderAtElapsed(0);
    setIsPlaying(true);
  };

  const handleSeek = (nextProgress: number) => {
    if (!spec) return;
    const duration = spec.durationMs || 5000;
    const nextElapsed = duration * nextProgress;
    elapsedRef.current = nextElapsed;
    setProgress(nextProgress);
    renderAtElapsed(nextElapsed);
  };

  if (!spec) return null;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div ref={containerRef} className="min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
        />
      </div>
      <div className="w-full border-t border-slate-100 bg-white/95 px-3 py-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          title={isPlaying ? labels.pause : labels.play}
          aria-label={isPlaying ? labels.pause : labels.play}
          className="h-8 w-8 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition inline-flex items-center justify-center shadow-sm"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
        </button>
        <button
          type="button"
          onClick={handleReplay}
          title={labels.replay}
          aria-label={labels.replay}
          className="h-8 w-8 shrink-0 rounded-full border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition inline-flex items-center justify-center"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(progress * 1000)}
          onChange={(event) => handleSeek(Number(event.target.value) / 1000)}
          aria-label="Animation progress"
          className="min-w-0 flex-1 accent-blue-600"
        />
        <div className="text-[10px] font-black text-slate-400 tabular-nums w-10 text-right">
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  );
}
