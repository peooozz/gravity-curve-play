interface Props {
  equation: string;
  onNextLevel: () => void;
  isLastLevel: boolean;
}

export default function WinOverlay({ equation, onNextLevel, isLastLevel }: Props) {
  return (
    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex items-center justify-center z-10 rounded-r-lg">
      <div className="text-center p-8 bg-card rounded-xl shadow-lg border border-border max-w-sm">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          All Stars Collected!
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Great work solving the puzzle!</p>
        <button
          onClick={onNextLevel}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all"
        >
          {isLastLevel ? '🏆 You Win!' : 'Next Level →'}
        </button>
      </div>
    </div>
  );
}
