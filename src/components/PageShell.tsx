import { ShieldCheck } from "lucide-react";
import BackgroundStage from "@/components/stage/BackgroundStage";
import { VIDEO_PRESET_MAP, type VideoPreset } from "@/lib/videoFraming";

interface PageShellProps {
  children: React.ReactNode;
  playIntroVideo?: boolean;
  loopVideos?: string[];
  fullWidth?: boolean;
  bgImage?: string;
  hideFooter?: boolean;
  /** Use a typed preset instead of raw strings to prevent drift */
  videoPreset?: VideoPreset;
  scaleClass?: string;
}

export default function PageShell({ children, playIntroVideo = false, loopVideos, fullWidth = false, bgImage, hideFooter = false, videoPreset, scaleClass }: PageShellProps) {
  const resolvedPosition = videoPreset
    ? VIDEO_PRESET_MAP[videoPreset]
    : (fullWidth ? VIDEO_PRESET_MAP.center : VIDEO_PRESET_MAP.authSetup);

  return (
    <div className="h-screen w-full font-outfit overflow-hidden">
      <div className="relative w-full h-full bg-black overflow-hidden select-none">

        {/* Background Stage */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-900" style={{ width: '120%', left: '-10%' }}>
          {bgImage ? (
            <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <BackgroundStage
              videoList={loopVideos}
              playIntro={playIntroVideo}
              objectPosition={resolvedPosition}
              scaleClass={scaleClass ?? (fullWidth ? undefined : "auth-video-scale")}
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
      </div>
    </div>
  );
}
