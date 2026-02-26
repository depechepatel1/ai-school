export default function FlickeringFire() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
      <div className="absolute inset-0 bg-orange-500 blur-md opacity-60 animate-pulse" />
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.9)]">
        <defs>
          <linearGradient id="fireGradientComplex" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <path className="animate-pulse" d="M8.5 14.5A2.5 2.5 0 0 0 11 17C11.3 17 11.5 16.9 11.8 16.8C11.3 16.2 11 15.3 11 14.5C11 13 12.5 11.5 13 11C13.5 11.5 15 13 15 14.5C15 15.3 14.7 16.2 14.2 16.8C14.5 16.9 14.7 17 15 17A2.5 2.5 0 0 0 17.5 14.5C17.5 13.5 16.5 12 15.5 11C16.5 9 17 7 17 7C17 7 7 10 7 14.5A4.5 4.5 0 0 0 11.5 19H12.5A4.5 4.5 0 0 0 17 14.5C17 11.5 16 10 16 10" fill="url(#fireGradientComplex)" stroke="#c2410c" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
        <path className="animate-pulse" d="M12 14C12 14 11 15 11 16C11 16.55 11.45 17 12 17C12.55 17 13 16.55 13 16C13 15 12 14 12 14Z" fill="#ffffff" fillOpacity="0.8" />
      </svg>
    </div>
  );
}
