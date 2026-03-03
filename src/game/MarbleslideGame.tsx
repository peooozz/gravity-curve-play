import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { parseEquation, resetColorIndex, nextColor } from './equationParser';
import { levels } from './levels';
import { Star, Particle, EquationRow, ParsedFn, GravityDirection } from './types';
import GameCanvas from './GameCanvas';
import EquationPanel from './EquationPanel';
import VirtualKeyboard from './VirtualKeyboard';
import WinOverlay from './WinOverlay';
import { ChevronLeft, ChevronRight, Keyboard, Moon, Sun } from 'lucide-react';

let eqId = 100;
const uid = () => `eq-${eqId++}`;

export default function MarbleslideGame() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const level = levels[currentLevel];

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const [equations, setEquations] = useState<EquationRow[]>(() =>
    level.equations.map(e => ({ ...e }))
  );
  const [stars, setStars] = useState<Star[]>(() => level.stars.map(s => ({ ...s })));
  const [gravity, setGravity] = useState<GravityDirection>(level.gravity);
  const [marbles, setMarbles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; active: boolean; trail: { x: number; y: number }[] }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animating, setAnimating] = useState(false);
  const [won, setWon] = useState(false);
  const [flipUnlocked, setFlipUnlocked] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // === Freestyle Sandbox state (Level 10 only) ===
  const [sandboxTool, setSandboxTool] = useState<'star' | 'marble' | null>(null);
  const [sandboxStars, setSandboxStars] = useState<Star[]>([]);
  const [sandboxMarbleStart, setSandboxMarbleStart] = useState<{ x: number; y: number } | null>(null);
  // Ref so the launch closure always reads latest marble position
  const sandboxMarbleStartRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { sandboxMarbleStartRef.current = sandboxMarbleStart; }, [sandboxMarbleStart]);
  const [sandboxStarsRef] = [useRef<Star[]>([])];  // track current sandbox stars
  useEffect(() => { sandboxStarsRef.current = sandboxStars; }, [sandboxStars]);

  // Reset sandbox when leaving Level 10
  useEffect(() => {
    if (!level.isFreestyle) {
      setSandboxTool(null);
    }
  }, [level.isFreestyle]);

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
    setMarbles([]);
    setParticles([]);
    setAnimating(false);
    setWon(false);
    setFlipUnlocked(false);
    tRef.current = 0;
    dirRef.current = 1;
    // Reset sandbox star collected state when resetting Level 10
    if (lvl.isFreestyle) {
      setSandboxStars(prev => prev.map(s => ({ ...s, collected: false })));
    }
  }, [currentLevel]);

  // Graph click handler — only active on Level 10
  const handleGraphClick = useCallback((x: number, y: number) => {
    if (!level.isFreestyle) return;
    if (sandboxTool === 'star') {
      setSandboxStars(prev => [...prev, { x, y, collected: false }]);
    } else if (sandboxTool === 'marble') {
      setSandboxMarbleStart({ x, y });
    }
  }, [level.isFreestyle, sandboxTool]);

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


    let frameCount = 0;
    let tempMarbles: { id: number; x: number; y: number; vx: number; vy: number; active: boolean; onGround: boolean; trail: { x: number; y: number }[] }[] = [];

    const GRAVITY = 0.009;        // Lowered gravity for a slower, more graceful fall
    const FRICTION = 0.998;       // nearly frictionless to prevent losing momentum on curves
    const AIR_DRAG = 0.999;       // slight drag in air
    const COLLISION_ABOVE = 0.6;  // how far above curve before landing
    const COLLISION_BELOW = 0.8;  // optimized catch window to prevent jumping between disjoint curves
    const MAX_SPEED = 0.45;       // slower max speed limit
    const MARBLE_RADIUS = 0.5;

    const step = () => {
      frameCount++;
      const gDir = gravityRef.current;
      const gravX = gDir === 'right' ? GRAVITY : gDir === 'left' ? -GRAVITY : 0;
      const gravY = gDir === 'up' ? GRAVITY : gDir === 'down' ? -GRAVITY : 0;

      // Spawn marbles — use sandbox start on Level 10, fixed level start on others
      const effectiveStart = level.isFreestyle ? sandboxMarbleStartRef.current : level.marbleStart;
      if (frameCount % 18 === 0 && tempMarbles.length < 6 && effectiveStart) {
        tempMarbles.push({
          id: tempMarbles.length,
          x: effectiveStart.x + (Math.random() * 0.4 - 0.2),
          y: effectiveStart.y,
          vx: 0, // perfect drop
          vy: 0,
          active: true,
          onGround: false,
          trail: []
        });
      }

      let activeCount = 0;

      for (const m of tempMarbles) {
        if (!m.active) continue;
        activeCount++;

        // Apply gravity
        m.vy += gravY;
        m.vx += gravX;

        // Apply drag based on speed (more realistic air resistance)
        const speed2 = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        const dynamicDrag = Math.max(0.95, AIR_DRAG - (speed2 * 0.05));

        m.vx *= dynamicDrag;
        m.vy *= dynamicDrag;

        // Soft Speed cap
        if (speed2 > MAX_SPEED) {
          m.vx = (m.vx / speed2) * MAX_SPEED;
          m.vy = (m.vy / speed2) * MAX_SPEED;
        }

        m.x += m.vx;
        m.y += m.vy;

        // Collision detection checking ALL active curves
        let hitY: number | null = null;
        let hitCurve: ParsedFn | null = null;
        const marbleBottom = m.y - MARBLE_RADIUS;

        for (const curve of curves) {
          if (curve.condition && !curve.condition(m.x)) continue;
          const cy = curve.fn(m.x);
          if (!isFinite(cy) || isNaN(cy)) continue;

          if (marbleBottom <= cy + COLLISION_ABOVE && m.y >= cy - COLLISION_BELOW) {
            if (hitY === null || cy > hitY) {
              hitY = cy;
              hitCurve = curve;
            }
          }
        }

        if (hitY !== null && hitCurve !== null) {
          // Snap marble to surface
          m.y = hitY + MARBLE_RADIUS;
          m.onGround = true;

          // Compute exact slope for the specific curve being ridden
          const dx = 0.02;
          const slope = (hitCurve.fn(m.x + dx) - hitCurve.fn(m.x - dx)) / (2 * dx);
          const slopeAngle = Math.atan(slope);
          const cosA = Math.cos(slopeAngle);
          const sinA = Math.sin(slopeAngle);

          // If the marble was already on the ground, preserve its speed to prevent 
          // artificial energy loss from the discrete tangent projection on curved slopes.
          let currentSpeed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
          let prevSpeed = currentSpeed;

          // Project velocity onto slope tangent
          let vTangent = m.vx * cosA + m.vy * sinA;

          if (m.onGround && Math.abs(vTangent) > 0.01) {
            // Restore speed but keep the new direction
            vTangent = Math.sign(vTangent) * prevSpeed;
          }

          // Apply gravity component along slope
          const gAlongSlope = gravY * sinA + gravX * cosA;

          m.vx = (vTangent + gAlongSlope) * cosA * FRICTION;
          m.vy = (vTangent + gAlongSlope) * sinA * FRICTION;

          // Record trail
          const last = m.trail[m.trail.length - 1];
          if (!last || Math.hypot(last.x - m.x, last.y - m.y) > 0.15) {
            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > 60) m.trail.shift();
          }
        } else {
          m.onGround = false;
        }

        // Out of bounds — wider tolerance to allow falling between curves
        if (
          m.y < level.yRange[0] - 5 ||
          m.x < level.xRange[0] - 3 ||
          m.x > level.xRange[1] + 3 ||
          m.y > level.yRange[1] + 5
        ) {
          m.active = false;
        }
      }

      setMarbles([...tempMarbles]);

      // Star collection — use sandboxStars on Level 10
      let anyCollected = false;
      const currentStars = level.isFreestyle ? sandboxStarsRef.current : starsRef.current;
      const updatedStars = currentStars.map(star => {
        if (star.collected) return star;
        let collected = false;
        for (const m of tempMarbles) {
          if (!m.active) continue;
          const dx = star.x - m.x;
          const dy = star.y - m.y;
          if (Math.sqrt(dx * dx + dy * dy) < 1.8) {
            collected = true;
            break;
          }
        }
        if (collected) {
          anyCollected = true;
          spawnParticles(star.x, star.y);
          return { ...star, collected: true };
        }
        return star;
      });

      if (anyCollected) {
        if (level.isFreestyle) {
          setSandboxStars(updatedStars);
        } else {
          setStars(updatedStars);
          starsRef.current = updatedStars;
        }

        const collected = updatedStars.filter(s => s.collected).length;
        if (collected >= 1 && level.canFlipGravity) setFlipUnlocked(true);
        if (collected === updatedStars.length && updatedStars.length > 0) {
          setTimeout(() => {
            setWon(true);
            setAnimating(false);
          }, 1000);
        }
      }

      setParticles(prev =>
        prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.018 })).filter(p => p.life > 0)
      );

      // Only end simulation when all marbles are gone AND no more will spawn
      if (activeCount === 0 && tempMarbles.length >= 6) {
        setAnimating(false);
        return;
      }

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
    setMarbles([]);
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

  const handleVirtualKeyPress = useCallback((key: string) => {
    if (!activeInputId) return;
    const input = inputRefs.current[activeInputId];
    if (!input) {
      setEquations(prev => prev.map(eq => eq.id === activeInputId ? { ...eq, text: eq.text + key } : eq));
      return;
    }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    setEquations(prev => {
      const eq = prev.find(e => e.id === activeInputId);
      if (!eq) return prev;
      const text = eq.text;
      const newText = text.slice(0, start) + key + text.slice(end);
      return prev.map(e => e.id === activeInputId ? { ...e, text: newText } : e);
    });
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + key.length, start + key.length);
    }, 0);
  }, [activeInputId]);

  const handleVirtualBackspace = useCallback(() => {
    if (!activeInputId) return;
    const input = inputRefs.current[activeInputId];
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    if (start === 0 && end === 0) return;

    setEquations(prev => {
      const eq = prev.find(e => e.id === activeInputId);
      if (!eq) return prev;
      const text = eq.text;
      let newText = text;
      let newCursor = start;
      if (start === end) {
        newText = text.slice(0, start - 1) + text.slice(end);
        newCursor = start - 1;
      } else {
        newText = text.slice(0, start) + text.slice(end);
        newCursor = start;
      }
      return prev.map(e => e.id === activeInputId ? { ...e, text: newText } : e);
    });

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.selectionStart! - 1, input.selectionStart! - 1);
    }, 0);
  }, [activeInputId]);

  const handleVirtualArrow = useCallback((dir: 'left' | 'right') => {
    if (!activeInputId) return;
    const input = inputRefs.current[activeInputId];
    if (!input) return;
    const pos = input.selectionStart || 0;
    const newPos = dir === 'left' ? Math.max(0, pos - 1) : Math.min(input.value.length, pos + 1);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newPos, newPos);
    }, 0);
  }, [activeInputId]);

  const starsCollected = stars.filter(s => s.collected).length;

  return (
    <div className="flex flex-col h-screen bg-secondary/30">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 bg-clip-text text-transparent tracking-tight select-none">
            Medhavatika Marbleslides
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{level.name}</span>
          <button
            onClick={() => setDarkMode(prev => !prev)}
            className={`p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${darkMode
              ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200'
              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
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
          answers={level.answers}
          activeInputId={activeInputId}
          onInputFocus={setActiveInputId}
          registerInputRef={(id, el) => { inputRefs.current[id] = el; }}
        />

        {/* Right graph area */}
        <div className="flex-1 relative flex flex-col">
          {/* Action bar above canvas */}
          <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
            <div className="flex items-center gap-3">
              {/* Stars tracker — show sandbox stars on Level 10 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: level.isFreestyle ? sandboxStars.length : stars.length }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-base ${i < starsCollected ? 'text-accent' : 'text-border'}`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {starsCollected}/{level.isFreestyle ? sandboxStars.length : stars.length}
                </span>
              </div>

              {level.canFlipGravity && (
                <button
                  onClick={flipGravity}
                  disabled={!flipUnlocked || !animating}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${flipUnlocked && animating
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
                onClick={() => setShowKeyboard(prev => !prev)}
                className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${showKeyboard ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-border'}`}
                title={showKeyboard ? 'Hide Keyboard' : 'Show Keyboard'}
              >
                <Keyboard size={18} />
              </button>
              <button
                onClick={() => resetLevel()}
                className="group relative px-4 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">↺ Reset</span>
                <span className="absolute inset-0 bg-red-100 dark:bg-red-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
              </button>
              <button
                onClick={launch}
                disabled={!hasAnyValid || animating}
                className={`group relative px-6 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 overflow-hidden ${hasAnyValid && !animating
                  ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-md hover:shadow-primary/40 hover:shadow-lg'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-60'
                  }`}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  {animating ? (
                    <><span className="animate-pulse">●</span> Running…</>
                  ) : (
                    <>🚀 Launch</>
                  )}
                </span>
                {hasAnyValid && !animating && (
                  <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                )}
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">

            {/* Sandbox tool overlay — Level 10 only */}
            {level.isFreestyle && (
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[140px]">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center mb-1">Sandbox Tools</p>
                <button
                  onClick={() => setSandboxTool(sandboxTool === 'star' ? null : 'star')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sandboxTool === 'star'
                    ? 'bg-amber-400 text-amber-900 shadow-sm scale-105'
                    : 'bg-secondary hover:bg-amber-100 text-secondary-foreground'
                    }`}
                >
                  ⭐ <span>Place Star</span>
                </button>
                <button
                  onClick={() => setSandboxTool(sandboxTool === 'marble' ? null : 'marble')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${sandboxTool === 'marble'
                    ? 'bg-violet-500 text-white shadow-sm scale-105'
                    : 'bg-secondary hover:bg-violet-100 text-secondary-foreground'
                    }`}
                >
                  🔵 <span>Set Marble</span>
                </button>
                <div className="border-t border-border mt-1 pt-2">
                  <button
                    onClick={() => setSandboxStars([])}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    🗑 Clear Stars
                  </button>
                  <button
                    onClick={() => setSandboxMarbleStart(null)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    🗑 Clear Marble
                  </button>
                </div>
                {sandboxTool && (
                  <p className="text-[9px] text-center text-muted-foreground mt-1">
                    {sandboxTool === 'star' ? 'Click graph to place star' : 'Click graph to set marble'}
                  </p>
                )}
              </div>
            )}

            <GameCanvas
              curves={curves}
              stars={level.isFreestyle ? sandboxStars : stars}
              gravity={gravity}
              gravityWells={level.gravityWells}
              marbles={marbles}
              particles={particles}
              xRange={level.xRange}
              yRange={level.yRange}
              marbleStart={level.isFreestyle ? sandboxMarbleStart : level.marbleStart}
              answers={level.answers?.map(a => parseEquation(a, 'blue')).filter(Boolean) as ParsedFn[]}
              onGraphClick={level.isFreestyle ? handleGraphClick : undefined}
              sandboxCursor={level.isFreestyle && sandboxTool !== null}
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

      {/* Full width virtual keyboard matching Desmos layout */}
      {showKeyboard && (
        <VirtualKeyboard
          onKeyPress={handleVirtualKeyPress}
          onBackspace={handleVirtualBackspace}
          onEnter={onAddRow}
          onLeftArrow={() => handleVirtualArrow('left')}
          onRightArrow={() => handleVirtualArrow('right')}
        />
      )}
    </div>
  );
}
