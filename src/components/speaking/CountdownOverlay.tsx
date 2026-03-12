interface Props {
  count: number;
}

export default function CountdownOverlay({ count }: Props) {
  return (
    <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div key={count} className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-teal-600 tracking-tight animate-countdown-pop">
        {count === 0 ? "GO!" : count}
      </div>
    </div>
  );
}
