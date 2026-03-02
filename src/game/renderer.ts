import { Star, GravityDirection, GravityWell, Particle } from './types';

interface RenderState {
  canvasWidth: number;
  canvasHeight: number;
  xRange: [number, number];
  yRange: [number, number];
  fn: ((x: number) => number) | null;
  marblePos: { x: number; y: number } | null;
  trail: { x: number; y: number }[];
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  particles: Particle[];
  starField: { x: number; y: number; brightness: number }[];
  time: number;
}

function mathToCanvas(
  mx: number, my: number,
  xRange: [number, number], yRange: [number, number],
  w: number, h: number
): [number, number] {
  const cx = ((mx - xRange[0]) / (xRange[1] - xRange[0])) * w;
  const cy = h - ((my - yRange[0]) / (yRange[1] - yRange[0])) * h;
  return [cx, cy];
}

export function render(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { canvasWidth: W, canvasHeight: H, xRange, yRange } = state;

  // Clear
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);

  // Star field
  for (const s of state.starField) {
    const flicker = 0.5 + 0.5 * Math.sin(state.time * 2 + s.x * 10 + s.y * 7);
    ctx.fillStyle = `rgba(255, 255, 255, ${s.brightness * 0.3 * flicker})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grid
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
  ctx.lineWidth = 0.5;
  for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]); x++) {
    const [cx] = mathToCanvas(x, 0, xRange, yRange, W, H);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
  }
  for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]); y++) {
    const [, cy] = mathToCanvas(0, y, xRange, yRange, W, H);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
  ctx.lineWidth = 1;
  const [ax0] = mathToCanvas(0, 0, xRange, yRange, W, H);
  const [, ay0] = mathToCanvas(0, 0, xRange, yRange, W, H);
  ctx.beginPath(); ctx.moveTo(ax0, 0); ctx.lineTo(ax0, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, ay0); ctx.lineTo(W, ay0); ctx.stroke();

  // Axis labels
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.font = '10px JetBrains Mono, monospace';
  for (let x = Math.ceil(xRange[0]); x <= Math.floor(xRange[1]); x++) {
    const [cx, cy] = mathToCanvas(x, 0, xRange, yRange, W, H);
    ctx.fillText(String(x), cx + 2, cy - 4);
  }
  for (let y = Math.ceil(yRange[0]); y <= Math.floor(yRange[1]); y++) {
    if (y === 0) continue;
    const [cx, cy] = mathToCanvas(0, y, xRange, yRange, W, H);
    ctx.fillText(String(y), cx + 4, cy + 3);
  }

  // Gravity wells
  for (const well of state.gravityWells) {
    const [wx, wy] = mathToCanvas(well.x, well.y, xRange, yRange, W, H);
    const pixelRadius = (well.radius / (xRange[1] - xRange[0])) * W;
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);

    for (let i = 3; i >= 0; i--) {
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 * (4 - i) * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, pixelRadius * (0.4 + i * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Arrow indicator
    ctx.fillStyle = `rgba(168, 85, 247, ${0.7 * pulse})`;
    ctx.font = '16px sans-serif';
    ctx.fillText(well.strength > 0 ? '⊕' : '⊖', wx - 8, wy + 6);
  }

  // Curve
  if (state.fn) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let started = false;
    const step = (xRange[1] - xRange[0]) / 400;
    for (let x = xRange[0]; x <= xRange[1]; x += step) {
      const y = state.fn(x);
      if (!isFinite(y) || Math.abs(y) > 100) { started = false; continue; }
      const [cx, cy] = mathToCanvas(x, y, xRange, yRange, W, H);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Trail
  for (let i = 0; i < state.trail.length; i++) {
    const alpha = (i / state.trail.length) * 0.6;
    const size = (i / state.trail.length) * 4;
    const [tx, ty] = mathToCanvas(state.trail[i].x, state.trail[i].y, xRange, yRange, W, H);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
    ctx.beginPath();
    ctx.arc(tx, ty, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stars
  for (const star of state.stars) {
    if (star.collected) continue;
    const [sx, sy] = mathToCanvas(star.x, star.y, xRange, yRange, W, H);
    const glow = 0.7 + 0.3 * Math.sin(state.time * 4 + star.x);
    drawStar(ctx, sx, sy, 12, glow);
  }

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    const [px, py] = mathToCanvas(p.x, p.y, xRange, yRange, W, H);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 2 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  // Marble
  if (state.marblePos) {
    const [mx, my] = mathToCanvas(state.marblePos.x, state.marblePos.y, xRange, yRange, W, H);
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 20;
    const grad = ctx.createRadialGradient(mx - 2, my - 2, 1, mx, my, 10);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.9)');
    grad.addColorStop(1, 'rgba(30, 64, 175, 0.6)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Gravity arrow
  drawGravityArrow(ctx, state.gravity, W, H, state.time);
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, glow: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
  ctx.shadowBlur = 15 * glow;
  ctx.fillStyle = `rgba(251, 191, 36, ${glow})`;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const r = i === 0 ? size : size;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    const outerAngle = ((i * 2) * Math.PI) / 5 - Math.PI / 2;
    const innerAngle = ((i * 2 + 1) * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + size * Math.cos(outerAngle), y + size * Math.sin(outerAngle));
    else ctx.lineTo(x + size * Math.cos(outerAngle), y + size * Math.sin(outerAngle));
    ctx.lineTo(x + size * 0.4 * Math.cos(innerAngle), y + size * 0.4 * Math.sin(innerAngle));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGravityArrow(ctx: CanvasRenderingContext2D, dir: GravityDirection, W: number, H: number, time: number) {
  const x = W - 40;
  const y = 40;
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = dir === 'zero' ? 'rgba(168, 85, 247, 0.8)' : 'rgba(56, 189, 248, 0.8)';
  ctx.font = 'bold 24px sans-serif';
  
  const arrows: Record<GravityDirection, string> = {
    down: '↓', up: '↑', left: '←', right: '→', zero: '○'
  };
  ctx.fillText(arrows[dir], x - 8, y + 8);
  
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.fillText(dir === 'zero' ? 'ZERO-G' : `G: ${dir.toUpperCase()}`, x - 20, y + 28);
  ctx.restore();
}
