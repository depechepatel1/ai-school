import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Volume2, VolumeX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;
const CACHE_BUST = "?v=2";

const VIDEO_INTRO = `${STORAGE_BASE}/intro.mp4${CACHE_BUST}`;

export const VIDEO_LOOP_STACK = [
  `${STORAGE_BASE}/loop-stack/1.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/2.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/3.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/4.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/5.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/6.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/7.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/8.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/9.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/10.mp4${CACHE_BUST}`,
];

interface VideoLoopStageProps {
  videoList?: string[];
  playIntro?: boolean;
  objectPosition?: string;
  /** If provided, the audio toggle is rendered externally via a portal-like pattern */
  onMuteStateChange?: (isMuted: boolean) => void;
  externalMuteControl?: boolean;
  /** CSS class applied to video elements (e.g. for responsive scaling) */
  scaleClass?: string;
}

export default function VideoLoopStage({
  videoList: videoListProp,
  playIntro = false,
  objectPosition = "center center",
  scaleClass,
}: VideoLoopStageProps) {
  const videoList = videoListProp && videoListProp.length > 0 ? videoListProp : VIDEO_LOOP_STACK;
  const shouldLoop = videoList.length === 1;

  const alreadyPlayedIntro = sessionStorage.getItem("intro_video_played") === "true";
  const useIntro = playIntro && !alreadyPlayedIntro;

  const [isMuted, setIsMuted] = useState(false); // Sound ON by default
  const [introFinished, setIntroFinished] = useState(!useIntro);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");

  const introRef = useRef<HTMLVideoElement>(null);
  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const nextIndexRef = useRef(2);

  const activeVideoRef = !introFinished ? introRef : activePlayer === "A" ? refA : refB;

  // Robust play helper — respects current muted state, falls back to muted if browser blocks
  const safePlay = useCallback((v: HTMLVideoElement, forceMuted = false) => {
    if (forceMuted) v.muted = true;
    v.play().catch(() => {
      // Browser blocked unmuted autoplay — fall back to muted
      v.muted = true;
      v.play().catch(() => {});
    });
  }, []);

  // Try to autoplay intro with sound; browser may block and we fall back to muted
  useEffect(() => {
    if (!useIntro || !introRef.current) return;
    const v = introRef.current;
    v.muted = false;
    v.volume = 1.0;
    v.play().catch(() => {
      // Browser blocked unmuted autoplay — fall back to muted, update UI state
      v.muted = true;
      setIsMuted(true);
      v.play().catch(() => {});
    });
  }, [useIntro]);

  const toggleAudio = () => {
    const vid = activeVideoRef.current;
    if (vid) {
      vid.volume = 1.0;
      const next = !isMuted;
      vid.muted = next;
      setIsMuted(next);
      if (!next) vid.play().catch(() => {});
    }
  };

  const handleIntroEnd = () => {
    sessionStorage.setItem("intro_video_played", "true");
    setIntroFinished(true);
  };

  // When intro finishes, explicitly start Player A (onCanPlay may have already fired)
  useEffect(() => {
    if (!introFinished) return;
    if (refA.current) {
      refA.current.muted = isMuted;
      safePlay(refA.current);
    }
    // Preload Player B with next video
    if (!shouldLoop && refB.current && videoList.length > 1) {
      refB.current.src = videoList[1];
      refB.current.load();
    }
  }, [introFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // When active player ends, swap to preloaded one and queue next
  const handlePlayerEnded = useCallback(
    (player: "A" | "B") => {
      if (shouldLoop) return;
      const nextPlayer = player === "A" ? "B" : "A";
      const nextRef = nextPlayer === "A" ? refA : refB;

      setActivePlayer(nextPlayer);
      if (nextRef.current) {
        nextRef.current.muted = isMuted;
        safePlay(nextRef.current);
      }

      // Preload next video on the now-inactive player
      const inactiveRef = player === "A" ? refA : refB;
      if (inactiveRef.current) {
        const preloadIdx = nextIndexRef.current % videoList.length;
        inactiveRef.current.src = videoList[preloadIdx];
        inactiveRef.current.load();
        nextIndexRef.current = preloadIdx + 1;
      }
    },
    [shouldLoop, videoList, safePlay, isMuted]
  );

  // Sync muted state to the currently active video element
  useEffect(() => {
    const vid = activeVideoRef.current;
    if (vid) vid.muted = isMuted;
  }, [isMuted, activeVideoRef]);

  return (
    <>
      {/* Intro video — plays once, attempts unmuted autoplay */}
      {useIntro && (
        <video
          ref={introRef}
          src={VIDEO_INTRO}
          playsInline
          onEnded={handleIntroEnd}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-[3] ${introFinished ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          style={{ objectPosition }}
        />
      )}

      {/* Player A */}
      <video
        ref={refA}
        src={videoList[0]}
        muted
        playsInline
        controls={false}
        loop={shouldLoop}
        preload="auto"
        onEnded={() => handlePlayerEnded("A")}
        onError={(e) => {
          const v = e.currentTarget;
          console.error("[VideoPlayer] A error:", v.error?.code, v.error?.message, "src:", v.src);
        }}
        className={`absolute inset-0 w-full h-full object-cover ${activePlayer === "A" ? "z-[2]" : "z-[1]"}`}
        style={{ objectPosition }}
      />

      {/* Player B */}
      {!shouldLoop && (
        <video
          ref={refB}
          muted
          playsInline
          controls={false}
          preload="auto"
          onEnded={() => handlePlayerEnded("B")}
          onError={(e) => {
            const v = e.currentTarget;
            console.error("[VideoPlayer] B error:", v.error?.code, v.error?.message, "src:", v.src);
          }}
          className={`absolute inset-0 w-full h-full object-cover ${activePlayer === "B" ? "z-[2]" : "z-[1]"}`}
          style={{ objectPosition }}
        />
      )}

      {/* Audio Toggle — portaled to body to escape z-0 stacking context */}
      {createPortal(
        <button
          onClick={toggleAudio}
          className="fixed bottom-12 left-12 z-[100] p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/40 transition-all shadow-lg hover:scale-105 cursor-pointer"
          title={isMuted ? "Unmute Background" : "Mute Background"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>,
        document.body
      )}
    </>
  );
}
