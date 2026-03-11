import { ShieldCheck } from "lucide-react";
import BackgroundStage from "@/components/stage/BackgroundStage";
import { VIDEO_LOOP_STACK } from "@/components/stage/VideoLoopStage";

export { VIDEO_LOOP_STACK as VIDEO_1_STACK };


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
  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);

  // Transform-based shift replaces object-position for auth screens

  const handleDevLogin = async (account: typeof DEV_ACCOUNTS[0]) => {
    setDevLoading(account.email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) {
        toast({ title: "Dev Login Failed", description: getSafeErrorMessage(error), variant: "destructive" });
        return;
      }
      setDevOpen(false);
      // Wait for onAuthStateChange to propagate session to React state
      await new Promise<void>((resolve) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN") {
            subscription.unsubscribe();
            resolve();
          }
        });
        // Safety timeout
        setTimeout(() => { subscription.unsubscribe(); resolve(); }, 3000);
      });
      navigate(account.redirect);
    } catch (err: any) {
      toast({ title: "Dev Login Failed", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setDevLoading(null);
    }
  };

  return (
    <div className="h-screen w-full font-outfit overflow-hidden">
      {/* Full Viewport Container */}
      <div className="relative w-full h-full bg-black overflow-hidden select-none">

        {/* Background Stage */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900">
          {bgImage ? (
            <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <BackgroundStage
              videoList={loopVideos}
              playIntro={playIntroVideo}
              objectPosition={fullWidth ? "center center" : "30% 45%"}
              scaleClass={fullWidth ? undefined : "auth-video-scale"}
            />
          )}
        </div>

        {/* Compliance Footer */}
        {!hideFooter && (
          fullWidth ? (
            <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-12 px-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] text-gray-400 font-medium tracking-wide shadow-xl">
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                  <span>Data Resides in Mainland China (Aliyun)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 px-6 pointer-events-none">
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] text-gray-400 font-medium tracking-wide shadow-xl">
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                  <span>Data Resides in Mainland China (Aliyun)</span>
                </div>
              </div>
            </div>
          )
        )}

        {/* Content Layer */}
        {fullWidth ? (
          <div className="absolute inset-0 z-20">
            {children}
          </div>
        ) : (
          <div className="absolute inset-0 z-20 flex items-center justify-end pr-8 p-6">
            <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col overflow-y-auto max-h-[90vh] scrollbar-hide">
              {children}
            </div>
          </div>
        )}

        {/* Dev Login Panel — only in development */}
        {IS_DEV && <div className="absolute top-4 left-4 z-50">
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
        </div>}
      </div>
    </div>
  );
}
