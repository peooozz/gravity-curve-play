import { Star, GravityWell, Particle, ParsedFn, GravityDirection } from './types';

interface RenderState {
  width: number;
  height: number;
  xRange: [number, number];
  yRange: [number, number];
  curves: ParsedFn[];
  marblePos: { x: number; y: number } | null;
  trail: { x: number; y: number }[];
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  particles: Particle[];
  time: number;
}

function m2c(
  mx: number, my: number,
  xr: [number, number], yr: [number, number],
  w: number, h: number
): [number, number] {
  return [
    ((mx - xr[0]) / (xr[1] - xr[0])) * w,
    h - ((my - yr[0]) / (yr[1] - yr[0])) * h,
  ];
}

export function renderGraph(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { width: W, height: H, xRange: xr, yRange: yr } = state;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.lineWidth = 0.5;
  const xStep = getGridStep(xr[1] - xr[0]);
  const yStep = getGridStep(yr[1] - yr[0]);

  ctx.strokeStyle = '#e5e7eb';
  for (let x = Math.ceil(xr[0] / xStep) * xStep; x <= xr[1]; x += xStep) {
    const [cx] = m2c(x, 0, xr, yr, W, H);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
  }
  for (let y = Math.ceil(yr[0] / yStep) * yStep; y <= yr[1]; y += yStep) {
    const [, cy] = m2c(0, y, xr, yr, W, H);
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  }

  // Axes (thicker)
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  const [ax] = m2c(0, 0, xr, yr, W, H);
  const [, ay] = m2c(0, 0, xr, yr, W, H);
  if (ax >= 0 && ax <= W) { ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke(); }
  if (ay >= 0 && ay <= H) { ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke(); }

  // Axis labels
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let x = Math.ceil(xr[0] / xStep) * xStep; x <= xr[1]; x += xStep) {
    if (Math.abs(x) < 0.001) continue;
    const [cx, cy] = m2c(x, 0, xr, yr, W, H);
    const label = Number.isInteger(x) ? String(x) : x.toFixed(1);
    ctx.fillText(label, cx, Math.min(cy + 16, H - 4));
  }
  ctx.textAlign = 'right';
  for (let y = Math.ceil(yr[0] / yStep) * yStep; y <= yr[1]; y += yStep) {
    if (Math.abs(y) < 0.001) continue;
    const [cx, cy] = m2c(0, y, xr, yr, W, H);
    const label = Number.isInteger(y) ? String(y) : y.toFixed(1);
    ctx.fillText(label, Math.max(cx - 6, 24), cy + 4);
  }

  // Gravity wells
  for (const well of state.gravityWells) {
    const [wx, wy] = m2c(well.x, well.y, xr, yr, W, H);
    const pr = (well.radius / (xr[1] - xr[0])) * W;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3);
    for (let i = 3; i >= 0; i--) {
      ctx.strokeStyle = `rgba(147, 51, 234, ${0.12 * (4 - i) * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, pr * (0.4 + i * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(147, 51, 234, ${0.6 * pulse})`;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(well.strength > 0 ? '⊕' : '⊖', wx, wy + 6);
  }

  // Curves
  for (const curve of state.curves) {
    ctx.strokeStyle = curve.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    const step = (xr[1] - xr[0]) / 600;
    for (let x = xr[0]; x <= xr[1]; x += step) {
      if (curve.condition && !curve.condition(x)) { started = false; continue; }
      const y = curve.fn(x);
      if (!isFinite(y) || Math.abs(y) > 1000) { started = false; continue; }
      const [cx, cy] = m2c(x, y, xr, yr, W, H);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Trail
  for (let i = 0; i < state.trail.length; i++) {
    const alpha = (i / state.trail.length) * 0.5;
    const size = (i / state.trail.length) * 3 + 1;
    const [tx, ty] = m2c(state.trail[i].x, state.trail[i].y, xr, yr, W, H);
    ctx.fillStyle = `rgba(147, 51, 234, ${alpha})`;
    ctx.beginPath();
    ctx.arc(tx, ty, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stars (5-pointed)
  for (const star of state.stars) {
    if (star.collected) continue;
    const [sx, sy] = m2c(star.x, star.y, xr, yr, W, H);
    const glow = 0.8 + 0.2 * Math.sin(state.time * 3 + star.x);
    drawStar5(ctx, sx, sy, 14, glow);
  }

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    const [px, py] = m2c(p.x, p.y, xr, yr, W, H);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 3 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  // Marble
  if (state.marblePos) {
    const [mx, my] = m2c(state.marblePos.x, state.marblePos.y, xr, yr, W, H);
    ctx.save();
    ctx.shadowColor = 'rgba(124, 58, 237, 0.6)';
    ctx.shadowBlur = 12;
    const grad = ctx.createRadialGradient(mx - 2, my - 2, 1, mx, my, 10);
    grad.addColorStop(0, '#e9d5ff');
    grad.addColorStop(0.5, '#8b5cf6');
    grad.addColorStop(1, '#4c1d95');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Gravity arrow (top-right)
  if (state.gravity !== 'down') {
    drawGravityIndicator(ctx, state.gravity, W, state.time);
  }
}

function drawStar5(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, glow: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
  ctx.shadowBlur = 10 * glow;
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerA = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const innerA = ((i * 2 + 1) * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + size * Math.cos(outerA), y + size * Math.sin(outerA));
    else ctx.lineTo(x + size * Math.cos(outerA), y + size * Math.sin(outerA));
    ctx.lineTo(x + size * 0.4 * Math.cos(innerA), y + size * 0.4 * Math.sin(innerA));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGravityIndicator(ctx: CanvasRenderingContext2D, dir: GravityDirection, W: number, time: number) {
  const x = W - 50;
  const y = 30;
  const pulse = 0.6 + 0.4 * Math.sin(time * 2.5);

  ctx.save();
  ctx.globalAlpha = pulse;

  const arrows: Record<GravityDirection, string> = {
    down: '↓', up: '↑', left: '←', right: '→', zero: '○'
  };

  ctx.fillStyle = dir === 'zero' ? '#9333ea' : '#2563eb';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(arrows[dir], x, y + 7);

  ctx.font = '9px Inter, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(dir === 'zero' ? 'ZERO-G' : `G: ${dir.toUpperCase()}`, x, y + 22);
  ctx.restore();
}

function getGridStep(range: number): number {
  if (range <= 8) return 1;
  if (range <= 16) return 2;
  if (range <= 40) return 4;
  return 8;
}
