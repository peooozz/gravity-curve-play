interface WinOverlayProps {
  equation: string;
  onNextLevel: () => void;
  isLastLevel: boolean;
}

export default function WinOverlay({ equation, onNextLevel, isLastLevel }: WinOverlayProps) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
      <div className="text-center p-8">
        <h2 className="text-3xl font-display font-bold text-accent glow-text-gold mb-2">
          ★ All Stars Collected! ★
        </h2>
        <p className="text-muted-foreground font-mono text-sm mb-1">Winning equation:</p>
        <p className="text-primary font-mono text-lg glow-text-cyan mb-6">{equation}</p>
        <button
          onClick={onNextLevel}
          className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-mono font-bold text-sm hover:opacity-90 transition-all glow-cyan"
        >
          {isLastLevel ? '🏆 You Win!' : '→ Next Level'}
        </button>
      </div>
    </div>
  );
}
