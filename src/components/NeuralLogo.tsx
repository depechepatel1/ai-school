const NeuralLogo = () => (
  <div className="relative w-9 h-9 flex items-center justify-center mr-2">
    {/* Core Glow */}
    <div className="absolute w-2.5 h-2.5 bg-blue-400 rounded-full shadow-[0_0_20px_rgba(96,165,250,1)] animate-pulse" />

    {/* Inner Ring - Cyan/Blue */}
    <svg className="absolute w-full h-full animate-[spin_4s_linear_infinite] opacity-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="22" fill="none" stroke="url(#cyan-gradient)" strokeWidth="4" strokeDasharray="30 20" strokeLinecap="round" />
      <defs>
        <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>

    {/* Outer Ring - Pink/Purple */}
    <svg className="absolute w-[150%] h-[150%] animate-[spin_8s_linear_infinite_reverse]" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#vibrant-gradient)" strokeWidth="3.5" strokeDasharray="15 45" strokeLinecap="round" />
      <defs>
        <linearGradient id="vibrant-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>

    {/* Orbital Particles */}
    <div className="absolute w-full h-full animate-[spin_4s_linear_infinite]">
      <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_#fff]" />
    </div>
  </div>
);

export default NeuralLogo;
