/* eslint-disable */
"use client";

/**
 * AnimationPlayer — Robust Dynamic Spec-Driven Renderer
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimationSpec, AnimationStep } from "@/lib/agent/types";

interface Props {
  spec?: AnimationSpec;
  width?: number;
  height?: number;
  autoPlay?: boolean;
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
    const jsExpr = expr.replace(/\^/g, "**")
                     .replace(/(\d)([a-zA-Z(])/g, "$1*$2")
                     .replace(/(\))(\d)/g, "$1*$2");
    
    const fn = new Function(...Object.keys(safeScope), `"use strict"; return (${jsExpr});`);
    const result = fn(...Object.values(safeScope));
    return isFinite(result) ? result : NaN;
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
  
  ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
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
    case "addMathLabel": renderAddMathLabel(ctx, step.params, progress, w, h, bounds); break;
    case "showStepByStep": renderShowStepByStep(ctx, step.params, progress, w, h); break;
  }
}

export default function AnimationPlayer({
  spec,
  width = 680,
  height = 420,
  autoPlay = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const specRef = useRef(spec);
  useEffect(() => { specRef.current = spec; }, [spec]);

  useEffect(() => {
    startTimeRef.current = 0;
    setProgress(0);
    setIsPlaying(autoPlay && !!spec);
  }, [autoPlay, spec]);

  const renderFn = useCallback((ts: number) => {
    if (!canvasRef.current || !specRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (startTimeRef.current === 0) startTimeRef.current = ts;
    const elapsed = ts - startTimeRef.current;
    const totalT = Math.min(1, elapsed / (specRef.current.durationMs || 5000));
    setProgress(totalT);

    // Bounds calculation
    const defaultBounds = { xMin: -5, xMax: 5, yMin: -2, yMax: 10 };
    const graphStep = specRef.current.steps.find(s => s.toolName === "drawFunctionGraph" || s.toolName === "drawTangentLine");
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

    if (totalT < 1) {
      rafRef.current = requestAnimationFrame(renderFn);
    } else {
      setIsPlaying(false);
    }
  }, [width, height]);

  useEffect(() => {
    if (isPlaying && spec) {
      rafRef.current = requestAnimationFrame(renderFn);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, spec, renderFn]);

  if (!spec) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="max-w-full max-h-full object-contain shadow-sm rounded-lg"
      />
      <div className="w-full max-w-[500px] mt-4 flex items-center gap-4">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-75" 
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-black text-slate-400 tabular-nums w-8">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}
