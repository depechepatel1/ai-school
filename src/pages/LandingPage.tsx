import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, ArrowRight, Check, Users, Mic, ShieldCheck, Volume2, VolumeX, Code, GraduationCap, BookOpen, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NeuralLogo from "@/components/NeuralLogo";
import OmniChatModal from "@/components/OmniChatModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";

const DEV_ACCOUNTS = [
  { role: "student", email: "dev-student@test.com", password: "devtest123", icon: GraduationCap, label: "Student", color: "from-blue-500 to-cyan-500" },
  { role: "teacher", email: "dev-teacher@test.com", password: "devtest123", icon: BookOpen, label: "Teacher", color: "from-emerald-500 to-green-500" },
  { role: "parent", email: "dev-parent@test.com", password: "devtest123", icon: Heart, label: "Parent", color: "from-rose-500 to-pink-500" },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
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

  const handleDevLogin = async (account: typeof DEV_ACCOUNTS[0]) => {
    setDevLoading(account.role);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) {
        toast({ title: "Dev Login Failed", description: getSafeErrorMessage(error), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Dev Login Failed", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setDevLoading(null);
    }
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
              <span>Data Resides in Mainland China (Aliyun)</span>
            </div>
          </div>
        </div>

        {/* Content Layer - Right Sidebar */}
        <div className="absolute right-0 top-0 bottom-0 w-[40%] min-w-[340px] z-20 flex flex-col justify-center p-8">
          {/* Floating Card */}
          <div className="relative group">
            {/* Static Glow Background */}
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-700" />

            {/* Main Glass Container */}
            <div className="relative w-full px-8 py-8 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] flex flex-col items-start text-left overflow-hidden">

              {/* Subtle reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

              <motion.div
                className="relative z-10 w-full"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {/* Header */}
                <motion.div variants={fadeUp} className="mb-5 w-full">
                  <div className="flex justify-center items-center gap-2 mb-2">
                    <NeuralLogo />
                    <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-blue-200/70">Next Gen Learning</span>
                  </div>

                  {/* Title */}
                  <h1 className="w-full text-center text-5xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-blue-300 mb-4 leading-[0.95] drop-shadow-2xl">
                    AI School
                  </h1>

                  {/* IELTS Badge */}
                  <div className="flex justify-center items-center mb-5">
                    <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-400/20 backdrop-blur-md">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200/80">IELTS Edition</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-300/90 font-light tracking-wide border-l-2 border-blue-400/40 pl-4 py-1 leading-relaxed relative">
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-400/40 shadow-[0_0_8px_rgba(96,165,250,0.3)]" />
                    Your Personal Tutor.
                    <br />
                    <span className="text-blue-200/90 font-medium">Real-time feedback & scoring.</span>
                  </p>
                </motion.div>

                {/* Terms Checkbox */}
                <motion.div
                  variants={fadeUp}
                  className="group/check flex items-center gap-3 mb-5 w-full p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/15 transition-all duration-300 cursor-pointer"
                  onClick={() => setAgreed(!agreed)}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-300 ${agreed ? "bg-gradient-to-r from-green-500 to-emerald-600 border-transparent shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-gray-500 group-hover/check:border-blue-400/60"}`}>
                    {agreed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  <span className="text-[11px] text-gray-400 group-hover/check:text-gray-300 font-medium tracking-wide transition-colors">
                    I agree to the <span className="underline decoration-blue-500/40 underline-offset-2 text-gray-300">User Agreement</span> & <span className="underline decoration-blue-500/40 underline-offset-2 text-gray-300">Privacy Policy</span>
                  </span>
                </motion.div>

                {/* Action Buttons */}
                <motion.div variants={fadeUp} className="w-full space-y-3">
                  {/* Primary - Student Login */}
                  <button
                    onClick={handleLogin}
                    className={`group/btn relative w-full h-[60px] rounded-2xl flex items-center justify-between px-6 transition-all duration-500 overflow-hidden ${agreed ? "cursor-pointer hover:scale-[1.02] shadow-[0_0_25px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)]" : "cursor-not-allowed grayscale opacity-60"}`}
                  >
                    <div className={`absolute inset-0 ${agreed ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700" : "bg-gray-800"}`} />

                    <div className="relative z-10 flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${agreed ? "bg-white/15" : "bg-white/5"}`}>
                        <UserCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-base font-bold text-white tracking-wide">Student Login</span>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-blue-200/70">Access Dashboard</span>
                      </div>
                    </div>
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover/btn:translate-x-1 ${agreed ? "bg-white/90 text-blue-600" : "bg-gray-700 text-gray-500"}`}>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </div>
                  </button>

                  {/* Secondary - Parent Login */}
                  <button
                    onClick={() => agreed && navigate("/login")}
                    className={`group/parent w-full h-[46px] bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 text-gray-400 hover:text-gray-200 text-xs font-semibold uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${!agreed && "opacity-40 cursor-not-allowed"}`}
                  >
                    <Users className="w-4 h-4 text-gray-500 group-hover/parent:text-gray-300 transition-colors" />
                    <span>Parent's Login / 家长登录</span>
                  </button>
                </motion.div>

                {/* Voice Demo */}
                <motion.div variants={fadeUp} className="mt-5 pt-5 border-t border-white/5 w-full">
                  <button
                    onClick={handleVoiceDemo}
                    className="w-full flex items-center justify-between text-left group/demo p-2 -ml-2 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-[0.2em] group-hover/demo:text-yellow-400 transition-colors">No Account?</span>
                      <span className="text-sm font-medium text-gray-300 group-hover/demo:text-white transition-colors">Try Voice Demo Instantly</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover/demo:bg-yellow-500 group-hover/demo:text-black transition-all duration-300 shadow-[0_0_12px_rgba(234,179,8,0.15)] group-hover/demo:shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                      <Mic className="w-5 h-5" />
                    </div>
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Chat Modal */}
        <OmniChatModal isOpen={chatOpen} onClose={() => setChatOpen(false)} />

        {/* Dev Login Panel */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => setDevOpen(!devOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 text-yellow-400/60 text-[9px] font-bold uppercase tracking-wider hover:bg-yellow-500/20 hover:text-yellow-300 transition-all"
          >
            <Code className="w-3 h-3" />
            Dev
          </button>
          <AnimatePresence>
            {devOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="mt-2 p-3 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 space-y-2 min-w-[180px] shadow-2xl"
              >
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Quick Login As</p>
                {DEV_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.role}
                      onClick={() => handleDevLogin(account)}
                      disabled={devLoading !== null}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r ${account.color} text-white text-xs font-semibold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {devLoading === account.role ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      {account.label}
                    </button>
                  );
                })}
                <p className="text-[8px] text-gray-600 mt-1">Create accounts first via /signup</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
