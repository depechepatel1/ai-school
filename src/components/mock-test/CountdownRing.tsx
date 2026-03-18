interface Props {
  timeLeft: number;
  totalTime: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function CountdownRing({ timeLeft, totalTime, size = 120, strokeWidth = 6, className = "" }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circumference * (1 - progress);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isLow = timeLeft <= 30;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={isLow ? "hsl(0, 72%, 51%)" : "hsl(var(--primary))"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black tabular-nums ${size >= 100 ? "text-2xl" : "text-lg"} ${isLow ? "text-destructive animate-pulse" : "text-foreground"}`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
