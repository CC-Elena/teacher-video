"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  autoPlay: boolean;
  durationMs: number;
  onFrame: (elapsedMs: number) => void;
}

export function useAnimationController({ autoPlay, durationMs, onFrame }: Options) {
  const rafRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  const tickRef = useRef<(timestamp: number) => void>(() => undefined);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const renderAt = useCallback((elapsedMs: number) => {
    const clampedElapsed = Math.min(Math.max(0, elapsedMs), durationMs);
    elapsedRef.current = clampedElapsed;
    setProgress(durationMs > 0 ? clampedElapsed / durationMs : 0);
    onFrameRef.current(clampedElapsed);
  }, [durationMs]);

  const tick = useCallback((timestamp: number) => {
    if (lastFrameRef.current === 0) lastFrameRef.current = timestamp;
    const delta = (timestamp - lastFrameRef.current) * playbackRate;
    lastFrameRef.current = timestamp;

    const nextElapsed = Math.min(durationMs, elapsedRef.current + delta);
    renderAt(nextElapsed);

    if (nextElapsed < durationMs) {
      rafRef.current = requestAnimationFrame(tickRef.current);
    } else {
      setIsPlaying(false);
      lastFrameRef.current = 0;
    }
  }, [durationMs, playbackRate, renderAt]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    elapsedRef.current = 0;
    lastFrameRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(0);
    setIsPlaying(autoPlay);
    onFrameRef.current(0);
  }, [autoPlay, durationMs]);

  useEffect(() => {
    if (isPlaying) {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(tickRef.current);
    } else {
      cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = 0;
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, tick]);

  const togglePlay = useCallback(() => {
    if (elapsedRef.current >= durationMs) renderAt(0);
    setIsPlaying((playing) => !playing);
  }, [durationMs, renderAt]);

  const replay = useCallback(() => {
    renderAt(0);
    setIsPlaying(true);
  }, [renderAt]);

  const seek = useCallback((nextProgress: number) => {
    renderAt(durationMs * nextProgress);
  }, [durationMs, renderAt]);

  return {
    progress,
    isPlaying,
    playbackRate,
    setPlaybackRate,
    togglePlay,
    replay,
    seek,
  };
}
