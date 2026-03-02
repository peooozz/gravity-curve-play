import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { parseEquation, resetColorIndex, nextColor } from './equationParser';
import { levels } from './levels';
import { Star, Particle, EquationRow, ParsedFn, GravityDirection } from './types';
import GameCanvas from './GameCanvas';
import EquationPanel from './EquationPanel';
import WinOverlay from './WinOverlay';
import { ChevronLeft, ChevronRight } from 'lucide-react';

let eqId = 100;
const uid = () => `eq-${eqId++}`;

export default function MarbleslideGame() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const level = levels[currentLevel];

  const [equations, setEquations] = useState<EquationRow[]>(() =>
    level.equations.map(e => ({ ...e }))
  );
  const [stars, setStars] = useState<Star[]>(() => level.stars.map(s => ({ ...s })));
  const [gravity, setGravity] = useState<GravityDirection>(level.gravity);
  const [marblePos, setMarblePos] = useState<{ x: number; y: number } | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animating, setAnimating] = useState(false);
  const [won, setWon] = useState(false);
  const [flipUnlocked, setFlipUnlocked] = useState(false);

  const tRef = useRef(0);
  const dirRef = useRef(1);
  const rafRef = useRef(0);
  const starsRef = useRef(stars);
  const gravityRef = useRef(gravity);

  useEffect(() => { starsRef.current = stars; }, [stars]);
  useEffect(() => { gravityRef.current = gravity; }, [gravity]);

  // Parse all equations
  const { curves, validMap } = useMemo(() => {
    resetColorIndex();
    const parsed: ParsedFn[] = [];
    const valid: Record<string, boolean> = {};
    for (const eq of equations) {
      if (eq.isInstruction || eq.text.trim() === '') {
        valid[eq.id] = true;
        continue;
      }
      const color = nextColor();
      const result = parseEquation(eq.text, color);
      if (result) {
        parsed.push(result);
        valid[eq.id] = true;
      } else {
        valid[eq.id] = false;
      }
    }
    return { curves: parsed, validMap: valid };
  }, [equations]);

  const hasAnyValid = curves.length > 0;

  const resetLevel = useCallback((lvlIdx?: number) => {
    cancelAnimationFrame(rafRef.current);
    const lvl = levels[lvlIdx ?? currentLevel];
    setEquations(lvl.equations.map(e => ({ ...e })));
    setStars(lvl.stars.map(s => ({ ...s })));
    setGravity(lvl.gravity);
    setMarblePos(null);
    setTrail([]);
    setParticles([]);
    setAnimating(false);
    setWon(false);
    setFlipUnlocked(false);
    tRef.current = 0;
    dirRef.current = 1;
  }, [currentLevel]);

  const spawnParticles = useCallback((x: number, y: number) => {
    const newP: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      newP.push({ x, y, vx: Math.cos(angle) * 0.06, vy: Math.sin(angle) * 0.06, life: 1, maxLife: 1 });
    }
    setParticles(prev => [...prev, ...newP]);
  }, []);

  const launch = useCallback(() => {
    if (!hasAnyValid) return;
    setAnimating(true);
    tRef.current = level.xRange[0] + 0.5;
    dirRef.current = 1;

    const speed = 0.05;

    // Build composite function: for each x, find the curve with the highest y value (marble rolls on top)
    const compositeFn = (x: number): number | null => {
      let best: number | null = null;
      for (const curve of curves) {
        if (curve.condition && !curve.condition(x)) continue;
        const y = curve.fn(x);
        if (!isFinite(y)) continue;
        if (best === null || y > best) best = y;
      }
      return best;
    };

    const step = () => {
      const dir = dirRef.current;
      tRef.current += speed * dir;
      const t = tRef.current;

      if (t > level.xRange[1] + 1 || t < level.xRange[0] - 1) {
        setAnimating(false);
        return;
      }

      const baseY = compositeFn(t);
      if (baseY === null) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      let mx = t;
      let my = baseY;

      // Gravity well influence
      for (const well of level.gravityWells) {
        const dx = well.x - mx;
        const dy = well.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < well.radius && dist > 0.01) {
          const force = (well.strength * (1 - dist / well.radius)) * 0.025;
          mx += (dx / dist) * force;
          my += (dy / dist) * force;
        }
      }

      if (gravityRef.current === 'zero') {
        my += 0.015 * Math.sin(t * 2);
      }

      setMarblePos({ x: mx, y: my });
      setTrail(prev => {
        const next = [...prev, { x: mx, y: my }];
        return next.length > 60 ? next.slice(-60) : next;
      });

      // Star collection
      let anyCollected = false;
      const updatedStars = starsRef.current.map(star => {
        if (star.collected) return star;
        const dx = star.x - mx;
        const dy = star.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 0.5) {
          anyCollected = true;
          spawnParticles(star.x, star.y);
          return { ...star, collected: true };
        }
        return star;
      });

      if (anyCollected) {
        setStars(updatedStars);
        starsRef.current = updatedStars;

        const collected = updatedStars.filter(s => s.collected).length;
        if (collected >= 1 && level.canFlipGravity) setFlipUnlocked(true);
        if (collected === updatedStars.length) {
          setWon(true);
          setAnimating(false);
          return;
        }
      }

      setParticles(prev =>
        prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.02 })).filter(p => p.life > 0)
      );

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [hasAnyValid, curves, level, spawnParticles]);

  const flipGravity = useCallback(() => {
    dirRef.current *= -1;
    setGravity(prev => {
      if (prev === 'down') return 'up';
      if (prev === 'up') return 'down';
      if (prev === 'left') return 'right';
      if (prev === 'right') return 'left';
      return prev;
    });
  }, []);

  const goToLevel = useCallback((idx: number) => {
    if (idx < 0 || idx >= levels.length) return;
    setCurrentLevel(idx);
    cancelAnimationFrame(rafRef.current);
    const lvl = levels[idx];
    setEquations(lvl.equations.map(e => ({ ...e })));
    setStars(lvl.stars.map(s => ({ ...s })));
    setGravity(lvl.gravity);
    setMarblePos(null);
    setTrail([]);
    setParticles([]);
    setAnimating(false);
    setWon(false);
    setFlipUnlocked(false);
    tRef.current = 0;
    dirRef.current = 1;
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onEquationChange = useCallback((id: string, text: string) => {
    setEquations(prev => prev.map(eq => eq.id === id ? { ...eq, text } : eq));
  }, []);

  const onAddRow = useCallback(() => {
    setEquations(prev => [...prev, { id: uid(), text: '', isInstruction: false, locked: false }]);
  }, []);

  const onRemoveRow = useCallback((id: string) => {
    setEquations(prev => prev.filter(eq => eq.id !== id));
  }, []);

  const starsCollected = stars.filter(s => s.collected).length;

  return (
    <div className="flex flex-col h-screen bg-secondary/30">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-foreground text-base">Antigravity Marbleslide</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{level.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToLevel(currentLevel - 1)}
            disabled={currentLevel === 0}
            className="p-1.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-muted-foreground font-medium min-w-[60px] text-center">
            {currentLevel + 1} of {levels.length}
          </span>
          <button
            onClick={() => goToLevel(currentLevel + 1)}
            disabled={currentLevel === levels.length - 1}
            className="p-1.5 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left equation panel */}
        <EquationPanel
          equations={equations}
          instructions={level.instructions}
          onEquationChange={onEquationChange}
          onAddRow={onAddRow}
          onRemoveRow={onRemoveRow}
          validMap={validMap}
        />

        {/* Right graph area */}
        <div className="flex-1 relative flex flex-col">
          {/* Action bar above canvas */}
          <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
            <div className="flex items-center gap-3">
              {/* Stars tracker */}
              <div className="flex items-center gap-1">
                {Array.from({ length: stars.length }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-base ${i < starsCollected ? 'text-accent' : 'text-border'}`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {starsCollected}/{stars.length}
                </span>
              </div>

              {level.canFlipGravity && (
                <button
                  onClick={flipGravity}
                  disabled={!flipUnlocked || !animating}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    flipUnlocked && animating
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  ⇅ Flip Gravity
                </button>
              )}

              {level.gravity !== 'down' && (
                <span className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground font-medium">
                  {level.gravity === 'zero' ? '○ Zero-G' : `G: ${level.gravity.toUpperCase()}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => resetLevel()}
                className="px-3 py-1.5 rounded text-xs font-medium bg-secondary text-secondary-foreground hover:bg-border transition-colors"
              >
                Reset
              </button>
              <button
                onClick={launch}
                disabled={!hasAnyValid || animating}
                className={`px-5 py-1.5 rounded text-sm font-semibold transition-all ${
                  hasAnyValid && !animating
                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                }`}
              >
                Launch
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            <GameCanvas
              curves={curves}
              stars={stars}
              gravity={gravity}
              gravityWells={level.gravityWells}
              marblePos={marblePos}
              trail={trail}
              particles={particles}
              xRange={level.xRange}
              yRange={level.yRange}
            />
            {won && (
              <WinOverlay
                equation={equations.map(e => e.text).filter(Boolean).join(', ')}
                onNextLevel={() => goToLevel(currentLevel + 1)}
                isLastLevel={currentLevel === levels.length - 1}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
