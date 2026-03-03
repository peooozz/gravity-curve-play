import { useRef, useEffect, useCallback } from 'react';
import { renderGraph } from './renderer';
import { Star, GravityDirection, GravityWell, Particle, ParsedFn } from './types';

interface Props {
  curves: ParsedFn[];
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  marbles: { id: number; x: number; y: number; trail: { x: number; y: number }[] }[];
  particles: Particle[];
  xRange: [number, number];
  yRange: [number, number];
  marbleStart: { x: number, y: number } | null;
  answers?: ParsedFn[];
  onGraphClick?: (x: number, y: number) => void;
  sandboxCursor?: boolean;
}

export default function GameCanvas({
  curves, stars, gravity, gravityWells, marbles, particles,
  xRange, yRange, marbleStart, answers, onGraphClick, sandboxCursor
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const rafRef = useRef(0);
  const viewTransformRef = useRef({ x: 0, y: 0, scale: 1 });

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
      curves, marbles, stars, gravity, gravityWells, particles,
      time: timeRef.current,
      viewTransform: viewTransformRef.current,
      marbleStart,
      answers,
    } as any);

    rafRef.current = requestAnimationFrame(draw);
  }, [curves, stars, gravity, gravityWells, marbles, particles, xRange, yRange, marbleStart]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onGraphClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Use CSS pixel dimensions for accurate mapping
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    // Map from CSS pixel space to graph coordinate space
    const [x0, x1] = xRange;
    const [y0, y1] = yRange;
    const graphX = x0 + (cx / w) * (x1 - x0);
    const graphY = y1 - (cy / h) * (y1 - y0);
    // Round to 1 decimal for clean coordinates
    onGraphClick(Math.round(graphX * 10) / 10, Math.round(graphY * 10) / 10);
  }, [onGraphClick, xRange, yRange]);

  return (
    <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        width={800 * (window.devicePixelRatio || 1)}
        height={560 * (window.devicePixelRatio || 1)}
        className={`rounded-r-lg border-l border-border bg-white w-full h-full block ${sandboxCursor ? 'cursor-crosshair' : 'cursor-default'}`}
      />
    </div>
  );
}
