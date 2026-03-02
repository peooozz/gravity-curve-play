import { useRef, useEffect, useCallback } from 'react';
import { renderGraph } from './renderer';
import { Star, GravityDirection, GravityWell, Particle, ParsedFn } from './types';

interface Props {
  curves: ParsedFn[];
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  marblePos: { x: number; y: number } | null;
  trail: { x: number; y: number }[];
  particles: Particle[];
  xRange: [number, number];
  yRange: [number, number];
}

export default function GameCanvas({
  curves, stars, gravity, gravityWells, marblePos, trail, particles,
  xRange, yRange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current += 0.016;

    renderGraph(ctx, {
      width: canvas.width,
      height: canvas.height,
      xRange, yRange,
      curves, marblePos, trail, stars, gravity, gravityWells, particles,
      time: timeRef.current,
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [curves, stars, gravity, gravityWells, marblePos, trail, particles, xRange, yRange]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={560}
      className="rounded-r-lg border-l border-border bg-background"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
