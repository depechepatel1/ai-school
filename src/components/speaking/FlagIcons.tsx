export function UKFlag() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-[3px] shadow-sm border border-white/20">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function USFlag() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-[3px] shadow-sm border border-white/20">
      <path fill="#bd3d44" d="M0 0h60v30H0z" />
      <path stroke="#fff" strokeWidth="2.3" d="M0 2.5h60M0 7.5h60M0 12.5h60M0 17.5h60M0 22.5h60M0 27.5h60" />
      <path fill="#192f5d" d="M0 0h28v16H0z" />
    </svg>
  );
}
