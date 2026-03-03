import { Star, GravityWell, Particle, ParsedFn, GravityDirection } from './types';

interface RenderState {
  width: number;
  height: number;
  xRange: [number, number];
  yRange: [number, number];
  curves: ParsedFn[];
  marbles: { id: number; x: number; y: number; trail: { x: number; y: number }[] }[];
  stars: Star[];
  gravity: GravityDirection;
  gravityWells: GravityWell[];
  particles: Particle[];
  time: number;
  viewTransform: { x: number, y: number, scale: number };
  answers?: ParsedFn[];
}

export function m2c(
  mx: number, my: number,
  xr: [number, number], yr: [number, number],
  w: number, h: number,
  state: { viewTransform: { x: number, y: number, scale: number } }
): [number, number] {
  const viewX = xr[0] - state.viewTransform.x / state.viewTransform.scale;
  const viewY = yr[0] + state.viewTransform.y / state.viewTransform.scale;
  const viewW = (xr[1] - xr[0]) / state.viewTransform.scale;
  const viewH = (yr[1] - yr[0]) / state.viewTransform.scale;

  return [
    ((mx - viewX) / viewW) * w,
    h - ((my - viewY) / viewH) * h,
  ];
}

export function c2m(
  cx: number, cy: number,
  xr: [number, number], yr: [number, number],
  w: number, h: number,
  state: { viewTransform: { x: number, y: number, scale: number } }
): [number, number] {
  const viewX = xr[0] - state.viewTransform.x / state.viewTransform.scale;
  const viewY = yr[0] + state.viewTransform.y / state.viewTransform.scale;
  const viewW = (xr[1] - xr[0]) / state.viewTransform.scale;
  const viewH = (yr[1] - yr[0]) / state.viewTransform.scale;

  return [
    viewX + (cx / w) * viewW,
    viewY + ((h - cy) / h) * viewH
  ];
}

export function renderGraph(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { width: W, height: H, xRange: xr, yRange: yr } = state;

  // ── Graph Paper Background ──────────────────────────────────────────────
  const isDark = document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDark ? '#0f1729' : '#f5f5ef';
  ctx.fillRect(0, 0, W, H);

  // Minor grid lines — every 1 unit
  const minorGrid = isDark ? 'rgba(255,255,255,0.04)' : '#d4e8f5';
  const majorGrid = isDark ? 'rgba(255,255,255,0.09)' : '#9ec8e8';
  const axisColor = isDark ? '#6b8ab0' : '#4C78D3';

  // Vertical minor lines
  for (let x = Math.floor(xr[0]); x <= Math.ceil(xr[1]); x++) {
    const [cx] = m2c(x, 0, xr, yr, W, H, state);
    if (cx >= 0 && cx <= W) {
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = minorGrid;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }
  }

  // Horizontal minor lines
  for (let y = Math.floor(yr[0]); y <= Math.ceil(yr[1]); y++) {
    const [, cy] = m2c(0, y, xr, yr, W, H, state);
    if (cy >= 0 && cy <= H) {
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    }
  }

  // Major gridlines — every 4 math units, stronger blue
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#7aaed8';

  for (let x = Math.floor(xr[0] / 4) * 4; x <= Math.ceil(xr[1]); x += 4) {
    const [cx] = m2c(x, 0, xr, yr, W, H, state);
    if (cx >= 0 && cx <= W) {
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }
  }
  for (let y = Math.floor(yr[0] / 4) * 4; y <= Math.ceil(yr[1]); y += 4) {
    const [, cy] = m2c(0, y, xr, yr, W, H, state);
    if (cy >= 0 && cy <= H) {
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    }
  }

  // ── Axes ──────────────────────────────────────────────────────────────
  const [ax] = m2c(0, 0, xr, yr, W, H, state);
  const [, ay] = m2c(0, 0, xr, yr, W, H, state);

  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;

  // Y axis
  if (ax >= 0 && ax <= W) {
    ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke();
    drawAxisArrow(ctx, ax, 0, -Math.PI / 2);
    drawAxisArrow(ctx, ax, H, Math.PI / 2);
  }

  // X axis
  if (ay >= 0 && ay <= H) {
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke();
    drawAxisArrow(ctx, 0, ay, Math.PI);
    drawAxisArrow(ctx, W, ay, 0);
  }

  // ── Tick marks + Number labels ─────────────────────────────────────────
  // Clamp label baseline positions so numbers stay on-screen
  let labelBaseY = Math.min(Math.max(ay, 16), H - 16); // for x-numbers
  let labelBaseX = Math.min(Math.max(ax, 20), W - 20); // for y-numbers

  ctx.fillStyle = isDark ? '#a0c4e8' : '#1a1a2e';
  ctx.font = 'bold 10px "Courier New", monospace';

  const TICK = 4; // tick half-length px

  // X labels: every integer
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = Math.floor(xr[0]); x <= Math.ceil(xr[1]); x++) {
    if (x === 0) continue;
    const [cx] = m2c(x, 0, xr, yr, W, H, state);
    if (cx < 4 || cx > W - 4) continue;

    // Tick
    if (ay >= 0 && ay <= H) {
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, ay - TICK); ctx.lineTo(cx, ay + TICK); ctx.stroke();
    }
    ctx.fillText(String(x), cx, labelBaseY + 5);
  }

  // Y labels: every integer
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = Math.floor(yr[0]); y <= Math.ceil(yr[1]); y++) {
    const [, cy] = m2c(0, y, xr, yr, W, H, state);
    if (cy < 4 || cy > H - 4) continue;

    // Tick
    if (ax >= 0 && ax <= W) {
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax - TICK, cy); ctx.lineTo(ax + TICK, cy); ctx.stroke();
    }

    if (y === 0) {
      // Origin label
      ctx.textAlign = 'right';
      ctx.fillText('0', labelBaseX - 6, labelBaseY - 4);
      ctx.textAlign = 'right';
    } else {
      ctx.fillText(String(y), labelBaseX - 6, cy);
    }
  }

  ctx.textBaseline = 'alphabetic'; // reset


  // Gravity wells
  for (const well of state.gravityWells) {
    const [wx, wy] = m2c(well.x, well.y, xr, yr, W, H, state);
    const pr = (well.radius / (xr[1] - xr[0])) * W;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3);
    for (let i = 3; i >= 0; i--) {
      ctx.strokeStyle = `rgba(147, 51, 234, ${0.12 * (4 - i) * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, pr * (0.4 + i * 0.2) * state.viewTransform.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(147, 51, 234, ${0.6 * pulse})`;
    ctx.font = `bold ${18 * state.viewTransform.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(well.strength > 0 ? '⊕' : '⊖', wx, wy + 6 * state.viewTransform.scale);
  }

  // Curves
  for (const curve of state.curves) {
    ctx.save();
    ctx.strokeStyle = curve.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    const step = ((xr[1] - xr[0]) / state.viewTransform.scale) / 600;
    const startX = xr[0] - state.viewTransform.x / state.viewTransform.scale;
    const endX = startX + (xr[1] - xr[0]) / state.viewTransform.scale;

    for (let x = startX - 2; x <= endX + 2; x += step) {
      if (curve.condition && !curve.condition(x)) { started = false; continue; }
      const y = curve.fn(x);
      if (!isFinite(y) || Math.abs(y) > 1000) { started = false; continue; }
      const [cx, cy] = m2c(x, y, xr, yr, W, H, state);
      if (!started) { ctx.moveTo(cx, cy); started = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Answer Curves intentionally removed as per user request

  // removed old trail code

  // Stars (5-pointed, glowing)
  const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i];
    if (star.collected) continue;
    const [sx, sy] = m2c(star.x, star.y, xr, yr, W, H, state);
    // Outer glow
    const glowR = 28 * state.viewTransform.scale;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    glow.addColorStop(0, `rgba(251, 191, 36, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fill();
    drawStar5(ctx, sx, sy, 14 * state.viewTransform.scale, pulse);
  }

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    const [px, py] = m2c(p.x, p.y, xr, yr, W, H, state);
    ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 4 * alpha * state.viewTransform.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Marbles - glowing violet balls
  for (const m of state.marbles) {
    const [mx, my] = m2c(m.x, m.y, xr, yr, W, H, state);
    const r = 12 * state.viewTransform.scale;
    // Glow ring
    const mGlow = ctx.createRadialGradient(mx, my, 0, mx, my, r * 2.5);
    mGlow.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
    mGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = mGlow;
    ctx.beginPath();
    ctx.arc(mx, my, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Ball body
    const mGrad = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r);
    mGrad.addColorStop(0, '#c4b5fd');
    mGrad.addColorStop(0.5, '#8b5cf6');
    mGrad.addColorStop(1, '#5b21b6');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fixed Marble Start location - glowing indicator
  if ((state as any).marbleStart) {
    const dp = (state as any).marbleStart;
    const [dx, dy] = m2c(dp.x, dp.y, xr, yr, W, H, state);
    const r = 12 * state.viewTransform.scale;
    // Glow
    const sGlow = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 2.5);
    sGlow.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
    sGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = sGlow;
    ctx.beginPath();
    ctx.arc(dx, dy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
    const dGrad = ctx.createRadialGradient(dx - r * 0.3, dy - r * 0.3, r * 0.1, dx, dy, r);
    dGrad.addColorStop(0, '#c4b5fd');
    dGrad.addColorStop(0.5, '#8b5cf6');
    dGrad.addColorStop(1, '#5b21b6');
    ctx.fillStyle = dGrad;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gravity arrow (top-right)
  if (state.gravity !== 'down') {
    drawGravityIndicator(ctx, state.gravity, W, state.time);
  }
}

function drawStar5(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, pulse: number) {
  ctx.save();
  // Inner gradient fill
  const grad = ctx.createRadialGradient(x - size * 0.15, y - size * 0.15, size * 0.05, x, y, size);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.5, '#fbbf24');
  grad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = grad;
  ctx.strokeStyle = `rgba(217, 119, 6, ${0.6 + 0.4 * pulse})`;
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

function drawAxisArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  const headLen = 14;
  const headWidth = 4;
  ctx.fillStyle = '#4C78D3';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - headLen * Math.cos(angle) + headWidth * Math.sin(angle), y - headLen * Math.sin(angle) - headWidth * Math.cos(angle));
  ctx.lineTo(x - headLen * Math.cos(angle) - headWidth * Math.sin(angle), y - headLen * Math.sin(angle) + headWidth * Math.cos(angle));
  ctx.closePath();
  ctx.fill();
}
