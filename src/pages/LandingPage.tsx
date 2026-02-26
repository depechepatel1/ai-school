import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, ArrowRight, Check, Users, Mic, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import OmniChatModal from "@/components/OmniChatModal";

const LandingPage = () => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc =
    "https://res.cloudinary.com/daujjfaqg/video/upload/Subtle_Looping_Teacher_Avatar_Animation_ws36er.mp4";

  const toggleAudio = () => {
    if (videoRef.current) {
      videoRef.current.volume = 1.0;
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleLogin = () => {
    if (agreed) navigate("/login");
  };

  const handleVoiceDemo = () => {
    setChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8 font-outfit overflow-auto">
      {/* iPad Frame */}
      <div className="relative w-[1024px] h-[768px] bg-black overflow-hidden rounded-[3rem] border-8 border-gray-800 ring-8 ring-gray-900 select-none shadow-2xl">

        {/* Living Background */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900 rounded-[2.5rem]">
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover"
            style={{ objectPosition: "96% center", transformOrigin: "center center" }}
          />
          {/* Cinematic vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/50" />

          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className="absolute bottom-8 left-8 z-30 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/40 transition-all shadow-lg hover:scale-105 cursor-pointer"
            title={isMuted ? "Unmute Background" : "Mute Background"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Compliance Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-12 px-6 bg-gradient-to-t from-black/90 to-transparent text-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] text-gray-400 font-medium tracking-wide shadow-xl">
              <ShieldCheck className="w-3 h-3 text-green-500" />
              <span className="text-outline">Data Resides in Mainland China (Aliyun)</span>
            </div>
          </div>
        </div>

        {/* Content Layer - Right Sidebar */}
        <div className="absolute right-0 top-0 bottom-0 w-[40%] min-w-[340px] z-20 flex flex-col justify-center p-8">
          {/* Floating Card */}
          <div className="relative group">
            {/* Glow Background */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-[2.5rem] blur-xl opacity-60 group-hover:opacity-100 transition duration-1000 animate-pulse" />

            {/* Main Glass Container */}
            <div className="relative w-full px-8 py-8 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] flex flex-col items-start text-left overflow-hidden">

              {/* Subtle shader/reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              <div className="absolute -top-full -left-full w-[300%] h-[300%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 animate-shimmer-diagonal pointer-events-none" />

              <div className="relative z-10 w-full">
                {/* Header */}
                <div className="mb-6 w-full">
                  <div className="flex justify-center items-center gap-2 mb-2">
                    <NeuralLogo />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-200 opacity-80 text-outline">Next Gen Learning</span>
                  </div>

                  {/* Title */}
                  <h1 className="w-full text-center text-6xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 animate-text-flash mb-4 leading-[0.9] drop-shadow-2xl filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                    AI School
                  </h1>

                  {/* IELTS Badge */}
                  <div className="flex justify-center items-center mb-5">
                    <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-md">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100 text-outline">IELTS Edition</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300 font-light tracking-wide border-l-2 border-blue-400/50 pl-4 py-1 leading-relaxed text-outline relative">
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-400/50 shadow-[0_0_10px_#60a5fa]" />
                    Your Personal Tutor.
                    <br />
                    <span className="text-blue-200 font-medium">Real-time feedback & scoring.</span>
                  </p>
                </div>

                {/* Terms Checkbox */}
                <div
                  className="group/check flex items-center gap-3 mb-6 w-full p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => setAgreed(!agreed)}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-300 ${agreed ? "bg-gradient-to-r from-green-500 to-emerald-600 border-transparent shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "border-gray-500 group-hover/check:border-blue-400"}`}>
                    {agreed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  <span className="text-[11px] text-gray-400 group-hover/check:text-gray-200 font-medium tracking-wide transition-colors">
                    I agree to the <span className="underline decoration-blue-500/50 underline-offset-2 text-gray-300">User Agreement</span> & <span className="underline decoration-blue-500/50 underline-offset-2 text-gray-300">Privacy Policy</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="w-full space-y-4">
                  {/* Primary - Student Login */}
                  <button
                    onClick={handleLogin}
                    className={`group/btn relative w-full h-[68px] rounded-2xl flex items-center justify-between px-6 transition-all duration-500 overflow-hidden ${agreed ? "cursor-pointer hover:scale-[1.02] shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)]" : "cursor-not-allowed grayscale opacity-70"}`}
                  >
                    <div className={`absolute inset-0 ${agreed ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 animate-gradient-x" : "bg-gray-800"}`} />

                    {/* Shine effect */}
                    {agreed && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-[-150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out" />}

                    <div className="relative z-10 flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${agreed ? "bg-white/20" : "bg-white/5"}`}>
                        <UserCircle className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold text-white tracking-wide">Student Login</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-200">Access Dashboard</span>
                      </div>
                    </div>
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover/btn:translate-x-1 ${agreed ? "bg-white text-blue-600" : "bg-gray-700 text-gray-500"}`}>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </div>
                  </button>

                  {/* Secondary - Parent Login */}
                  <button
                    onClick={() => agreed && navigate("/login")}
                    className={`group/parent w-full h-[50px] bg-gradient-to-r from-gray-800/80 to-gray-900/80 border border-white/10 hover:border-rose-500/50 hover:bg-rose-900/20 text-gray-300 hover:text-rose-200 text-xs font-semibold uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] ${!agreed && "opacity-40 cursor-not-allowed"}`}
                  >
                    <Users className="w-4 h-4 text-gray-400 group-hover/parent:text-rose-400 transition-colors" />
                    <span>Parent's Login / 家长登录</span>
                  </button>
                </div>

                {/* Voice Demo */}
                <div className="mt-6 pt-5 border-t border-white/5 w-full">
                  <button
                    onClick={handleVoiceDemo}
                    className="w-full flex items-center justify-between text-left group/demo p-2 -ml-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.2em] group-hover/demo:text-yellow-400 transition-colors text-outline">No Account?</span>
                      <span className="text-sm font-medium text-gray-300 group-hover/demo:text-white transition-colors">Try Voice Demo Instantly</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 group-hover/demo:bg-yellow-500 group-hover/demo:text-black transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] group-hover/demo:shadow-[0_0_25px_rgba(234,179,8,0.6)]">
                      <Mic className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Chat Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="absolute bottom-16 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_25px_rgba(37,99,235,0.6)] border border-white/20 flex items-center justify-center hover:scale-110 transition-all duration-300 group/mic"
        >
          <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping opacity-0 group-hover/mic:opacity-100 duration-1000" />
          <Mic className="w-6 h-6 text-white drop-shadow-md relative z-10" />
        </button>

        {/* Chat Modal */}
        <OmniChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
};

export default LandingPage;
