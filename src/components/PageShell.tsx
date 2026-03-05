import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, ShieldCheck, Code, GraduationCap, BookOpen, Heart, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import OmniChatModal from "@/components/OmniChatModal";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;

const VIDEO_2 = `${STORAGE_BASE}/intro.mp4`;

export const VIDEO_1_STACK = [
  `${STORAGE_BASE}/loop-stack/1.mp4`,
  `${STORAGE_BASE}/loop-stack/2.mp4`,
  `${STORAGE_BASE}/loop-stack/3.mp4`,
  `${STORAGE_BASE}/loop-stack/4.mp4`,
  `${STORAGE_BASE}/loop-stack/5.mp4`,
  `${STORAGE_BASE}/loop-stack/6.mp4`,
  `${STORAGE_BASE}/loop-stack/7.mp4`,
  `${STORAGE_BASE}/loop-stack/8.mp4`,
  `${STORAGE_BASE}/loop-stack/9.mp4`,
  `${STORAGE_BASE}/loop-stack/10.mp4`,
];

const DEV_ACCOUNTS = [
  { role: "student", email: "dev-igcse@test.com", password: "devtest123", icon: GraduationCap, label: "IGCSE Student", color: "from-blue-500 to-cyan-500", redirect: "/student" },
  { role: "student", email: "dev-ielts@test.com", password: "devtest123", icon: GraduationCap, label: "IELTS Student", color: "from-indigo-500 to-blue-500", redirect: "/student" },
  { role: "teacher", email: "dev-teacher@test.com", password: "devtest123", icon: BookOpen, label: "Teacher", color: "from-emerald-500 to-green-500", redirect: "/teacher" },
  { role: "parent", email: "dev-parent@test.com", password: "devtest123", icon: Heart, label: "Parent", color: "from-rose-500 to-pink-500", redirect: "/parent" },
  { role: "admin", email: "dev-admin@test.com", password: "devtest123", icon: Shield, label: "Administrator", color: "from-amber-500 to-orange-500", redirect: "/admin" },
];

interface PageShellProps {
  children: React.ReactNode;
  playIntroVideo?: boolean;
  loopVideos?: string[];
  fullWidth?: boolean;
  bgImage?: string;
  hideFooter?: boolean;
}

export default function PageShell({ children, playIntroVideo = false, loopVideos, fullWidth = false, bgImage, hideFooter = false }: PageShellProps) {
  const navigate = useNavigate();

  // Video list defaults to VIDEO_1_STACK if no loopVideos provided and no bgImage
  const videoList = loopVideos && loopVideos.length > 0 ? loopVideos : VIDEO_1_STACK;
  const shouldLoop = videoList.length === 1;

  // Intro video logic
  const alreadyPlayedIntro = sessionStorage.getItem("intro_video_played") === "true";
  const useIntro = playIntroVideo && !alreadyPlayedIntro;

  const [isMuted, setIsMuted] = useState(true);
  const [introFinished, setIntroFinished] = useState(!useIntro);
  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Dual A/B player state for seamless transitions
  const videoIndexRef = useRef(0);
  const introRef = useRef<HTMLVideoElement>(null);
  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');

  const activeVideoRef = !introFinished ? introRef : (activePlayer === 'A' ? refA : refB);

  // Object position: auth pages offset left, fullWidth centered
  const objectPosition = fullWidth ? "center center" : "101% center";

  // Robust play helper with retry for Edge
  const safePlay = useCallback((v: HTMLVideoElement) => {
    v.muted = true;
    console.log('[VideoPlayer] safePlay called, src:', v.src, 'readyState:', v.readyState);
    v.play().catch((err) => {
      console.warn('[VideoPlayer] play() rejected:', err.message, 'retrying in 150ms');
      setTimeout(() => {
        if (v) {
          v.muted = true;
          v.play().catch((err2) => {
            console.error('[VideoPlayer] retry play() also failed:', err2.message);
          });
        }
      }, 150);
    });
  }, []);

  // Edge-safe: force muted on all video refs via DOM (React muted prop bug)
  useEffect(() => {
    if (bgImage) return;
    [introRef, refA, refB].forEach(ref => {
      if (ref.current) ref.current.muted = true;
    });
  }, [bgImage, introFinished]);

  const toggleAudio = () => {
    const vid = activeVideoRef.current;
    if (vid) {
      vid.volume = 1.0;
      const next = !isMuted;
      vid.muted = next;
      setIsMuted(next);
      if (!next) safePlay(vid);
    }
  };

  const handleIntroEnd = () => {
    sessionStorage.setItem("intro_video_played", "true");
    setIntroFinished(true);
  };

  // Dual A/B: when active player ends, swap to the other (already preloaded)
  const handlePlayerEnded = useCallback((player: 'A' | 'B') => {
    if (shouldLoop) return;
    const len = videoList.length;
    const nextPlayer = player === 'A' ? 'B' : 'A';
    const nextRef = nextPlayer === 'A' ? refA : refB;

    // Swap visibility — the next player is already loaded
    setActivePlayer(nextPlayer);
    if (nextRef.current) safePlay(nextRef.current);

    // Advance index and preload on the now-inactive player
    const currentIndex = videoIndexRef.current;
    const preloadIndex = (currentIndex + 2) % len;
    videoIndexRef.current = currentIndex + 1;
    const inactiveRef = player === 'A' ? refA : refB;
    if (inactiveRef.current) {
      inactiveRef.current.src = videoList[preloadIndex];
      inactiveRef.current.load();
      console.log('[VideoPlayer] preloading next on', player, ':', videoList[preloadIndex]);
    }
  }, [shouldLoop, videoList, safePlay]);

  // Initial preload: when intro finishes, ensure Player B has the next video ready
  useEffect(() => {
    if (!introFinished || bgImage || shouldLoop) return;
    if (refB.current && videoList.length > 1) {
      refB.current.src = videoList[1];
      refB.current.load();
    }
  }, [introFinished, bgImage, shouldLoop, videoList]);

  const handleCanPlayA = useCallback(() => {
    if (!introFinished) return;
    if (activePlayer === 'A' && refA.current) safePlay(refA.current);
  }, [introFinished, activePlayer, safePlay]);

  const handleCanPlayB = useCallback(() => {
    if (!introFinished) return;
    if (activePlayer === 'B' && refB.current) safePlay(refB.current);
  }, [introFinished, activePlayer, safePlay]);

  const handleDevLogin = async (account: typeof DEV_ACCOUNTS[0]) => {
    setDevLoading(account.email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) {
        toast({ title: "Dev Login Failed", description: getSafeErrorMessage(error), variant: "destructive" });
      } else {
        setDevOpen(false);
        navigate(account.redirect);
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
          {/* Static background image mode */}
          {bgImage && (
            <img
              src={bgImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Intro video — plays once on student page */}
          {!bgImage && useIntro && (
            <video
              ref={introRef}
              src={VIDEO_2}
              autoPlay
              playsInline
              muted
              onEnded={handleIntroEnd}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${introFinished ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              style={{ objectPosition }}
            />
          )}

          {/* Dual A/B seamless loop player */}
          {!bgImage && (
            <video
              ref={refA}
              src={videoList[0]}
              muted
              playsInline
              controls={false}
              loop={shouldLoop}
              preload="auto"
              onEnded={() => handlePlayerEnded('A')}
              onCanPlay={handleCanPlayA}
              onError={(e) => {
                const v = e.currentTarget;
                console.error('[VideoPlayer] A error:', v.error?.code, v.error?.message, 'src:', v.src);
              }}
              className={`absolute inset-0 w-full h-full object-cover ${
                (useIntro && !introFinished) ? "opacity-0" : ""
              } ${activePlayer === 'A' ? 'z-[2]' : 'z-[1]'}`}
              style={{ objectPosition }}
            />
          )}
          {!bgImage && !shouldLoop && (
            <video
              ref={refB}
              muted
              playsInline
              controls={false}
              preload="auto"
              onEnded={() => handlePlayerEnded('B')}
              onCanPlay={handleCanPlayB}
              onError={(e) => {
                const v = e.currentTarget;
                console.error('[VideoPlayer] B error:', v.error?.code, v.error?.message, 'src:', v.src);
              }}
              className={`absolute inset-0 w-full h-full object-cover ${
                (useIntro && !introFinished) ? "opacity-0" : ""
              } ${activePlayer === 'B' ? 'z-[2]' : 'z-[1]'}`}
              style={{ objectPosition }}
            />
          )}

          {!fullWidth && <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/50" />}

          {/* Audio Toggle — only for video backgrounds */}
          {!bgImage && (
            <button
              onClick={toggleAudio}
              className="absolute bottom-8 left-8 z-30 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/40 transition-all shadow-lg hover:scale-105 cursor-pointer"
              title={isMuted ? "Unmute Background" : "Mute Background"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Compliance Footer */}
        {!hideFooter && (
          <div className={`absolute bottom-0 left-0 z-20 pb-6 pt-12 px-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none ${fullWidth ? "right-0" : "right-[40%]"}`}>
            <div className="flex flex-col items-center gap-2 pointer-events-auto">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] text-gray-400 font-medium tracking-wide shadow-xl">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                <span>Data Resides in Mainland China (Aliyun)</span>
              </div>
            </div>
          </div>
        )}

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
                      key={account.email}
                      onClick={() => handleDevLogin(account)}
                      disabled={devLoading !== null}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r ${account.color} text-white text-xs font-semibold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {devLoading === account.email ? (
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
