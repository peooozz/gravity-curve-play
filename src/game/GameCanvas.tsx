import { useRef, useEffect, useCallback } from 'react';
import { render } from './renderer';
import { Star, GravityDirection, GravityWell, Particle } from './types';

interface GameCanvasProps {
  fn: ((x: number) => number) | null;
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  marblePos: { x: number; y: number } | null;
  trail: { x: number; y: number }[];
  particles: Particle[];
  xRange: [number, number];
  yRange: [number, number];
  animating: boolean;
}

export default function GameCanvas({
  fn, stars, gravity, gravityWells, marblePos, trail, particles,
  xRange, yRange, animating
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starFieldRef = useRef<{ x: number; y: number; brightness: number }[]>([]);
  const timeRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Generate star field once
    const field = [];
    for (let i = 0; i < 150; i++) {
      field.push({
        x: Math.random() * 700,
        y: Math.random() * 500,
        brightness: Math.random(),
      });
    }
    starFieldRef.current = field;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current += 0.016;

    render(ctx, {
      canvasWidth: 700,
      canvasHeight: 500,
      xRange, yRange,
      fn, marblePos, trail, stars, gravity, gravityWells, particles,
      starField: starFieldRef.current,
      time: timeRef.current,
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [fn, stars, gravity, gravityWells, marblePos, trail, particles, xRange, yRange]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={500}
      className="rounded-lg border border-border glow-cyan"
    />
  );
}
