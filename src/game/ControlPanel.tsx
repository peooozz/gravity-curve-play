import { GravityDirection } from './types';

interface ControlPanelProps {
  equation: string;
  onEquationChange: (eq: string) => void;
  isValid: boolean;
  onLaunch: () => void;
  onReset: () => void;
  onFlipGravity: () => void;
  canFlip: boolean;
  flipUnlocked: boolean;
  gravity: GravityDirection;
  starsCollected: number;
  totalStars: number;
  animating: boolean;
  levelName: string;
  levelDescription: string;
}

export default function ControlPanel({
  equation, onEquationChange, isValid, onLaunch, onReset,
  onFlipGravity, canFlip, flipUnlocked, gravity,
  starsCollected, totalStars, animating, levelName, levelDescription
}: ControlPanelProps) {
  const gravitySymbols: Record<GravityDirection, string> = {
    down: '↓', up: '↑', left: '←', right: '→', zero: '○'
  };

  return (
    <div className="w-[220px] flex flex-col gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Level info */}
      <div>
        <h2 className="font-display font-bold text-primary text-lg glow-text-cyan">{levelName}</h2>
        <p className="text-xs text-muted-foreground mt-1">{levelDescription}</p>
      </div>

      {/* Equation input */}
      <div>
        <label className="text-xs text-muted-foreground font-mono mb-1 block">EQUATION</label>
        <input
          type="text"
          value={equation}
          onChange={(e) => onEquationChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-md bg-muted text-foreground font-mono text-sm border ${
            isValid ? 'border-border focus:border-primary' : 'border-destructive'
          } outline-none transition-colors`}
          placeholder="y = mx + b"
          disabled={animating}
        />
        {!isValid && equation.length > 0 && (
          <p className="text-xs text-destructive mt-1 font-mono">Invalid equation</p>
        )}
      </div>

      {/* Gravity indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">GRAVITY</span>
        <span className="text-2xl text-primary glow-text-cyan">{gravitySymbols[gravity]}</span>
        <span className="text-xs text-muted-foreground font-mono uppercase">{gravity}</span>
      </div>

      {/* Stars tracker */}
      <div>
        <span className="text-xs text-muted-foreground font-mono">STARS</span>
        <div className="flex gap-1 mt-1">
          {Array.from({ length: totalStars }).map((_, i) => (
            <span
              key={i}
              className={`text-lg ${i < starsCollected ? 'text-accent glow-text-gold' : 'text-muted-foreground opacity-30'}`}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {canFlip && (
          <button
            onClick={onFlipGravity}
            disabled={!flipUnlocked || !animating}
            className={`px-3 py-2 rounded-md text-sm font-mono font-semibold transition-all ${
              flipUnlocked && animating
                ? 'bg-gravity-well text-foreground hover:opacity-80 glow-cyan'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            ⇅ Flip Gravity
          </button>
        )}
        <button
          onClick={onLaunch}
          disabled={!isValid || animating}
          className={`px-3 py-2 rounded-md text-sm font-mono font-bold transition-all ${
            isValid && !animating
              ? 'bg-primary text-primary-foreground hover:opacity-90 glow-cyan'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          ▶ Launch
        </button>
        <button
          onClick={onReset}
          className="px-3 py-2 rounded-md text-sm font-mono bg-secondary text-secondary-foreground hover:opacity-80 transition-all"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
