interface Props {
  score: string;
  size?: number;
}

export default function BandScoreDonut({ score, size = 160 }: Props) {
  const numericScore = parseFloat(score) || 0;
  const maxScore = 9;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(numericScore / maxScore, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={12}
          opacity={0.3}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-foreground">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Band Score</span>
      </div>
    </div>
  );
}
