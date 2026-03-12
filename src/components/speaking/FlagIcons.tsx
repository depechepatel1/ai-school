export function UKFlag({ size = 40 }: { size?: number }) {
  const h = size * 0.6;
  return (
    <svg viewBox="0 0 60 30" width={size} height={h} className="rounded-[4px] shadow-md">
      {/* Blue field */}
      <rect width="60" height="30" fill="#012169" />
      {/* White diagonals */}
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      {/* Red diagonals – offset halves for proper overlap */}
      <clipPath id="tl"><path d="M30,15 L0,0 H30 V15 Z M30,15 L60,30 H30 V15 Z" /></clipPath>
      <clipPath id="tr"><path d="M30,15 L60,0 H30 V15 Z M30,15 L0,30 H30 V15 Z" /></clipPath>
      <path d="M0,0 L60,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#tl)" />
      <path d="M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#tr)" />
      {/* White cross */}
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      {/* Red cross */}
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function USFlag({ size = 40 }: { size?: number }) {
  const h = size * 0.6;
  return (
    <svg viewBox="0 0 60 31.5" width={size} height={h} className="rounded-[4px] shadow-md">
      {/* Red background */}
      <rect width="60" height="31.5" fill="#B22234" />
      {/* White stripes */}
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={i * 2.423} width="60" height="2.423" fill="#fff" />
      ))}
      {/* Blue canton */}
      <rect width="24" height="16.94" fill="#3C3B6E" />
      {/* Stars – simplified 5x4 + 4x3 pattern as dots */}
      {[...Array(5)].map((_, row) =>
        [...Array(6)].map((_, col) => (
          <circle key={`a${row}${col}`} cx={2 + col * 4} cy={1.7 + row * 3.2} r="0.9" fill="#fff" />
        ))
      )}
      {[...Array(4)].map((_, row) =>
        [...Array(5)].map((_, col) => (
          <circle key={`b${row}${col}`} cx={4 + col * 4} cy={3.3 + row * 3.2} r="0.9" fill="#fff" />
        ))
      )}
    </svg>
  );
}
