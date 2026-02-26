import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, ShieldCheck, Code, GraduationCap, BookOpen, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import OmniChatModal from "@/components/OmniChatModal";

const VIDEO_1 = "https://res.cloudinary.com/daujjfaqg/video/upload/Video_Generation_With_Specific_Script_vlav4y.mp4";
const VIDEO_2 = "https://res.cloudinary.com/daujjfaqg/video/upload/Video_Generation_of_Teacher_s_Welcome_jeioja.mp4";

const DEV_ACCOUNTS = [
  { role: "student", email: "dev-student@test.com", password: "devtest123", icon: GraduationCap, label: "Student", color: "from-blue-500 to-cyan-500" },
  { role: "teacher", email: "dev-teacher@test.com", password: "devtest123", icon: BookOpen, label: "Teacher", color: "from-emerald-500 to-green-500" },
  { role: "parent", email: "dev-parent@test.com", password: "devtest123", icon: Heart, label: "Parent", color: "from-rose-500 to-pink-500" },
];

interface PageShellProps {
  children: React.ReactNode;
  playIntroVideo?: boolean;
  customVideoUrl?: string;
  fullWidth?: boolean;
}

export default function PageShell({ children, playIntroVideo = false, customVideoUrl, fullWidth = false }: PageShellProps) {
  const loopVideo = customVideoUrl || VIDEO_1;
  const useIntro = playIntroVideo && !customVideoUrl;
  const [isMuted, setIsMuted] = useState(true);
  const [showVideo2, setShowVideo2] = useState(!useIntro);
  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  const activeVideoRef = showVideo2 ? video2Ref : video1Ref;

  const toggleAudio = () => {
    const vid = activeVideoRef.current;
    if (vid) {
      vid.volume = 1.0;
      const next = !isMuted;
      vid.muted = next;
      setIsMuted(next);
    }
  };

  const handleVideo1End = () => {
    setShowVideo2(true);
    if (video2Ref.current) {
      video2Ref.current.muted = isMuted;
      video2Ref.current.play();
    }
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

        {/* Video Background */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900 rounded-[2.5rem]">
          {/* Video 1 — intro (student page only) */}
          {useIntro && (
            <video
              ref={video1Ref}
              src={VIDEO_2}
              autoPlay
              playsInline
              muted={isMuted}
              onEnded={handleVideo1End}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${showVideo2 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              style={{ objectPosition: fullWidth ? "center center" : "96% center" }}
            />
          )}

          {/* Video 2 — looped (all pages) */}
          <video
            ref={video2Ref}
            src={loopVideo}
            autoPlay={!useIntro}
            loop
            playsInline
            muted={isMuted}
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${useIntro && !showVideo2 ? "opacity-0" : "opacity-100"}`}
            style={{ objectPosition: fullWidth ? "center center" : "96% center" }}
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

        {/* Content Layer */}
        {fullWidth ? (
          <div className="absolute inset-0 z-20">
            {children}
          </div>
        ) : (
          <div className="absolute right-0 top-0 bottom-0 w-[40%] min-w-[340px] z-20 flex flex-col py-[30px] pr-5 pl-0">
            <div className="relative group flex-1 flex flex-col">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-700" />
              <div className="relative w-full flex-1 px-6 py-5 rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                <div className="relative z-10 w-full flex-1 flex flex-col overflow-y-auto scrollbar-hide">
                  {children}
                </div>
              </div>
            </div>
          </div>
        )}

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
}
