"use client";
/**
 * DerivativeAnimation — The Core Animation Component
 *
 * Demonstrates: f(x) = x² and its derivative f'(x) = 2x
 * Animation: tangent line slides along the parabola, slope label updates live
 *
 * This is the single most important SAT/AP Calculus concept for VideoTutor's
 * target audience. Mirrors what VideoTutor generates for derivative questions.
 */

import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  expression?: string;          // default: "x^2"
  width?: number;
  height?: number;
  autoPlay?: boolean;
}

// ── Safe math evaluator ─────────────────────────────────────────────────────

function evalExpr(expr: string, x: number): number {
  const fns: Record<string, unknown> = {
    x,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    pi: Math.PI,
    e: Math.E,
    log: Math.log,
  };
  try {
    const js = expr.replace(/\^/g, "**");
    const fn = new Function(...Object.keys(fns), `"use strict"; return (${js});`);
    const result = fn(...Object.values(fns));
    return isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function numericalDerivative(expr: string, x: number, h = 1e-5): number {
  return (evalExpr(expr, x + h) - evalExpr(expr, x - h)) / (2 * h);
}

// ── Coordinate helpers ──────────────────────────────────────────────────────

const XMIN = -4, XMAX = 4, YMIN = -1, YMAX = 12;
const PAD = { top: 40, right: 20, bottom: 40, left: 50 };

function toCanvasX(mx: number, w: number): number {
  const pw = w - PAD.left - PAD.right;
  return PAD.left + ((mx - XMIN) / (XMAX - XMIN)) * pw;
}

function toCanvasY(my: number, h: number): number {
  const ph = h - PAD.top - PAD.bottom;
  return PAD.top + ph - ((my - YMIN) / (YMAX - YMIN)) * ph;
}

// ── Drawing primitives ──────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;

  // Vertical grid lines
  for (let x = Math.ceil(XMIN); x <= Math.floor(XMAX); x++) {
    const cx = toCanvasX(x, w);
    ctx.beginPath();
    ctx.moveTo(cx, PAD.top);
    ctx.lineTo(cx, h - PAD.bottom);
    ctx.stroke();
  }
  // Horizontal grid lines
  for (let y = Math.ceil(YMIN); y <= Math.floor(YMAX); y += 2) {
    const cy = toCanvasY(y, h);
    ctx.beginPath();
    ctx.moveTo(PAD.left, cy);
    ctx.lineTo(w - PAD.right, cy);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2;
  // x-axis
  const y0 = toCanvasY(0, h);
  ctx.beginPath();
  ctx.moveTo(PAD.left, y0);
  ctx.lineTo(w - PAD.right, y0);
  ctx.stroke();
  // y-axis
  const x0 = toCanvasX(0, w);
  ctx.beginPath();
  ctx.moveTo(x0, PAD.top);
  ctx.lineTo(x0, h - PAD.bottom);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = "#6B7280";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  for (let x = Math.ceil(XMIN); x <= Math.floor(XMAX); x++) {
    if (x === 0) continue;
    ctx.fillText(String(x), toCanvasX(x, w), y0 + 18);
  }
  ctx.textAlign = "right";
  for (let y = 2; y <= Math.floor(YMAX); y += 2) {
    ctx.fillText(String(y), x0 - 6, toCanvasY(y, h) + 4);
  }
  ctx.textAlign = "left";
  ctx.font = "13px serif";
  ctx.fillStyle = "#374151";
  ctx.fillText("x", w - PAD.right + 6, y0 + 4);
  ctx.fillText("y", x0 + 6, PAD.top - 8);
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  expr: string,
  progress: number,
  w: number,
  h: number,
  color: string
) {
  const drawUpTo = XMIN + (XMAX - XMIN) * Math.min(progress, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  let first = true;
  for (let xi = XMIN; xi <= drawUpTo; xi += 0.02) {
    const yi = evalExpr(expr, xi);
    if (isNaN(yi) || yi > YMAX + 2 || yi < YMIN - 2) {
      first = true;
      continue;
    }
    const cx = toCanvasX(xi, w);
    const cy = toCanvasY(yi, h);
    if (first) {
      ctx.moveTo(cx, cy);
      first = false;
    } else {
      ctx.lineTo(cx, cy);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawTangent(
  ctx: CanvasRenderingContext2D,
  expr: string,
  currentX: number,
  progress: number,
  w: number,
  h: number
) {
  const currentY = evalExpr(expr, currentX);
  const slope = numericalDerivative(expr, currentX);
  const halfLen = 1.6;

  // Tangent line
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([7, 5]);
  ctx.globalAlpha = Math.min(1, progress * 3);
  ctx.beginPath();
  const x1 = currentX - halfLen;
  const y1 = currentY - slope * halfLen;
  const x2 = currentX + halfLen;
  const y2 = currentY + slope * halfLen;
  ctx.moveTo(toCanvasX(x1, w), toCanvasY(y1, h));
  ctx.lineTo(toCanvasX(x2, w), toCanvasY(y2, h));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Point on curve
  const px = toCanvasX(currentX, w);
  const py = toCanvasY(currentY, h);
  ctx.fillStyle = "#F59E0B";
  ctx.shadowColor = "#F59E0B";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(px, py, 5.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Slope label
  ctx.fillStyle = "#1F2937";
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "left";
  const labelX = px + 14;
  const labelY = Math.max(PAD.top + 20, Math.min(py - 12, h - PAD.bottom - 20));
  ctx.fillText(`slope = ${slope.toFixed(2)}`, labelX, labelY);
  ctx.fillStyle = "#6B7280";
  ctx.font = "13px monospace";
  ctx.fillText(`x = ${currentX.toFixed(2)}`, labelX, labelY + 18);
}

function drawStepPanel(
  ctx: CanvasRenderingContext2D,
  currentX: number,
  progress: number,
  w: number,
  h: number
) {
  const slope = numericalDerivative("x^2", currentX);
  const steps = [
    "f(x) = x²",
    "f'(x) = 2x",
    `at x=${currentX.toFixed(1)}: slope = ${slope.toFixed(1)}`,
    "f'(x) = instantaneous rate",
  ];
  const visible = Math.min(steps.length, Math.floor(progress * steps.length) + 1);

  const panelX = w - 210;
  const panelY = PAD.top + 10;
  const lineH = 28;
  const panelH = visible * lineH + 20;

  ctx.fillStyle = "rgba(249,250,251,0.95)";
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  roundRect(ctx, panelX, panelY, 200, panelH, 8);
  ctx.fill();
  ctx.stroke();

  steps.slice(0, visible).forEach((s, i) => {
    const isLatest = i === visible - 1;
    ctx.fillStyle = isLatest ? "#2563EB" : "#374151";
    ctx.font = isLatest ? "bold 13px monospace" : "13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(s, panelX + 10, panelY + 16 + i * lineH);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DerivativeAnimation({
  expression = "x^2",
  width = 680,
  height = 420,
  autoPlay = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);

  const DURATION = 9000; // ms total
  const CURVE_PHASE = 0.3;    // 0~0.3: draw curve
  const TANGENT_PHASE = 0.35; // 0.3~0.35: tangent appears
  const SLIDE_PHASE = 0.9;    // 0.35~0.9: slide tangent
  const STEPS_PHASE = 1.0;    // 0.9~1.0: show steps

  const render = useCallback(
    (ts: number) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      if (startTimeRef.current === 0) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const t = Math.min(1, elapsed / DURATION);

      setProgress(t);
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      drawGrid(ctx, width, height);

      // Phase 1: Draw curve (0 → CURVE_PHASE)
      const curveProgress = Math.min(1, t / CURVE_PHASE);
      drawCurve(ctx, expression, curveProgress, width, height, "#3B82F6");

      // Phase 2 + 3: Tangent line
      if (t >= CURVE_PHASE) {
        const tangentAppear = Math.min(1, (t - CURVE_PHASE) / (TANGENT_PHASE - CURVE_PHASE));
        const slideProgress =
          t >= TANGENT_PHASE
            ? Math.min(1, (t - TANGENT_PHASE) / (SLIDE_PHASE - TANGENT_PHASE))
            : 0;
        const currentX = XMIN + (XMAX - XMIN) * slideProgress;
        drawTangent(ctx, expression, currentX, tangentAppear, width, height);
      }

      // Phase 4: Step panel
      if (t >= SLIDE_PHASE) {
        const stepsProgress = Math.min(
          1,
          (t - SLIDE_PHASE) / (STEPS_PHASE - SLIDE_PHASE)
        );
        drawStepPanel(ctx, XMIN + (XMAX - XMIN) * 0.9, stepsProgress, width, height);
      }

      // Title
      ctx.fillStyle = "#111827";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Derivative of f(x) = x²   →   f'(x) = 2x", PAD.left, 24);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        setPlaying(false);
      }
    },
    [expression, width, height]
  );

  useEffect(() => {
    if (playing) {
      startTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, render]);

  const replay = () => {
    setProgress(0);
    startTimeRef.current = 0;
    setPlaying(true);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-gray-200 shadow-lg"
      />
      {/* Progress bar */}
      <div className="w-full max-w-[680px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={replay}
          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          ↺ Replay
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
    </div>
  );
}
