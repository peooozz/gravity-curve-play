import { useState, useRef, useCallback, useEffect } from 'react';
import { parseEquation } from './equationParser';
import { levels } from './levels';
import { Star, GravityDirection, Particle } from './types';
import GameCanvas from './GameCanvas';
import ControlPanel from './ControlPanel';
import WinOverlay from './WinOverlay';

export default function MarbleslideGame() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const level = levels[currentLevel];

  const [equation, setEquation] = useState(level.defaultEquation);
  const [stars, setStars] = useState<Star[]>(() => level.stars.map(s => ({ ...s })));
  const [gravity, setGravity] = useState<GravityDirection>(level.gravity);
  const [marblePos, setMarblePos] = useState<{ x: number; y: number } | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animating, setAnimating] = useState(false);
  const [won, setWon] = useState(false);
  const [flipUnlocked, setFlipUnlocked] = useState(false);

  const tRef = useRef(0);
  const dirRef = useRef(1); // 1 = forward, -1 = backward
  const rafRef = useRef<number>(0);
  const starsRef = useRef(stars);
  const gravityRef = useRef(gravity);
  const particlesRef = useRef(particles);
  const trailRef = useRef(trail);

  useEffect(() => { starsRef.current = stars; }, [stars]);
  useEffect(() => { gravityRef.current = gravity; }, [gravity]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);
  useEffect(() => { trailRef.current = trail; }, [trail]);

  const parsed = parseEquation(equation);
  const isValid = parsed !== null;

  const resetLevel = useCallback((lvlIndex?: number) => {
    cancelAnimationFrame(rafRef.current);
    const lvl = levels[lvlIndex ?? currentLevel];
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
      newP.push({
        x, y,
        vx: Math.cos(angle) * 0.05,
        vy: Math.sin(angle) * 0.05,
        life: 1,
        maxLife: 1,
      });
    }
    setParticles(prev => [...prev, ...newP]);
  }, []);

  const launch = useCallback(() => {
    if (!parsed) return;
    setAnimating(true);
    tRef.current = level.xRange[0] + 0.5;
    dirRef.current = 1;

    const fn = parsed.fn;
    const speed = 0.04;

    const step = () => {
      const dir = dirRef.current;
      tRef.current += speed * dir;
      const t = tRef.current;

      // Check bounds
      if (t > level.xRange[1] + 1 || t < level.xRange[0] - 1) {
        setAnimating(false);
        return;
      }

      let mx = t;
      let my = fn(t);

      // Apply gravity well influence
      for (const well of level.gravityWells) {
        const dx = well.x - mx;
        const dy = well.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < well.radius && dist > 0.01) {
          const force = (well.strength * (1 - dist / well.radius)) * 0.02;
          mx += (dx / dist) * force;
          my += (dy / dist) * force;
        }
      }

      // Zero-G: add slight drift based on slope
      if (gravityRef.current === 'zero') {
        const drift = 0.01 * Math.sin(t * 2);
        my += drift;
      }

      setMarblePos({ x: mx, y: my });

      // Update trail
      setTrail(prev => {
        const next = [...prev, { x: mx, y: my }];
        return next.length > 50 ? next.slice(-50) : next;
      });

      // Check star collection
      let anyCollected = false;
      const updatedStars = starsRef.current.map(star => {
        if (star.collected) return star;
        const dx = star.x - mx;
        const dy = star.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 0.4) {
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
        if (collected >= 1 && level.canFlipGravity) {
          setFlipUnlocked(true);
        }
        if (collected === updatedStars.length) {
          setWon(true);
          setAnimating(false);
          return;
        }
      }

      // Update particles
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [parsed, level, spawnParticles]);

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

  const nextLevel = useCallback(() => {
    const next = Math.min(currentLevel + 1, levels.length - 1);
    setCurrentLevel(next);
    setEquation(levels[next].defaultEquation);
    resetLevel(next);
  }, [currentLevel, resetLevel]);

  const selectLevel = useCallback((idx: number) => {
    setCurrentLevel(idx);
    setEquation(levels[idx].defaultEquation);
    resetLevel(idx);
  }, [resetLevel]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const starsCollected = stars.filter(s => s.collected).length;

  return (
    <div className="flex flex-col items-center gap-4 p-6 min-h-screen bg-background">
      <h1 className="font-display text-2xl font-bold text-primary glow-text-cyan tracking-wider">
        Antigravity Marbleslide
      </h1>

      <div className="flex gap-4">
        <ControlPanel
          equation={equation}
          onEquationChange={setEquation}
          isValid={isValid}
          onLaunch={launch}
          onReset={() => resetLevel()}
          onFlipGravity={flipGravity}
          canFlip={level.canFlipGravity}
          flipUnlocked={flipUnlocked}
          gravity={gravity}
          starsCollected={starsCollected}
          totalStars={stars.length}
          animating={animating}
          levelName={level.name}
          levelDescription={level.description}
        />

        <div className="relative">
          <GameCanvas
            fn={parsed?.fn ?? null}
            stars={stars}
            gravity={gravity}
            gravityWells={level.gravityWells}
            marblePos={marblePos}
            trail={trail}
            particles={particles}
            xRange={level.xRange}
            yRange={level.yRange}
            animating={animating}
          />
          {won && (
            <WinOverlay
              equation={equation}
              onNextLevel={nextLevel}
              isLastLevel={currentLevel === levels.length - 1}
            />
          )}
        </div>
      </div>

      {/* Level select dots */}
      <div className="flex gap-3 mt-2">
        {levels.map((lvl, i) => (
          <button
            key={i}
            onClick={() => selectLevel(i)}
            className={`w-8 h-8 rounded-full font-mono text-xs font-bold transition-all ${
              i === currentLevel
                ? 'bg-primary text-primary-foreground glow-cyan scale-110'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
