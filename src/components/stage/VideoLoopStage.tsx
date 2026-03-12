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
  `${STORAGE_BASE}/loop-stack/11.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/12.mp4${CACHE_BUST}`,
  `${STORAGE_BASE}/loop-stack/13.mp4${CACHE_BUST}`,
];

/** Fisher-Yates shuffle, keeping index 0 in place */
function shuffleExceptFirst(arr: string[]): string[] {
  const first = arr[0];
  const rest = arr.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}

interface VideoLoopStageProps {
  videoList?: string[];
  playIntro?: boolean;
  objectPosition?: string;
  onMuteStateChange?: (isMuted: boolean) => void;
  externalMuteControl?: boolean;
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

  const [isMuted, setIsMuted] = useState(false);
  const [introFinished, setIntroFinished] = useState(!useIntro);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");

  const introRef = useRef<HTMLVideoElement>(null);
  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);

  // Shuffled playlist & index tracker
  const playlistRef = useRef<string[]>(shuffleExceptFirst(videoList));
  const playIndexRef = useRef(1); // 0 is already on Player A

  const activeVideoRef = !introFinished ? introRef : activePlayer === "A" ? refA : refB;

  const getNextClip = useCallback((): string => {
    const playlist = playlistRef.current;
    if (playIndexRef.current >= playlist.length) {
      // Reshuffle entire list for next round
      const reshuffled = [...videoList];
      for (let i = reshuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
      }
      playlistRef.current = reshuffled;
      playIndexRef.current = 0;
    }
    return playlistRef.current[playIndexRef.current++];
  }, [videoList]);

  const safePlay = useCallback((v: HTMLVideoElement) => {
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
  }, []);

  // Intro autoplay with sound
  useEffect(() => {
    if (!useIntro || !introRef.current) return;
    const v = introRef.current;
    v.muted = false;
    v.volume = 1.0;
    v.play().catch(() => {
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

  // When intro finishes, start Player A and defer-preload Player B
  useEffect(() => {
    if (!introFinished) return;
    const a = refA.current;
    if (a) {
      a.muted = isMuted;
      safePlay(a);
    }
    // Defer Player B preload so it doesn't compete with Player A
    if (!shouldLoop && refB.current && videoList.length > 1) {
      const nextClip = getNextClip();
      refB.current.src = nextClip;
      refB.current.load();
    }
  }, [introFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Instant swap when active player ends
  const handlePlayerEnded = useCallback(
    (player: "A" | "B") => {
      if (shouldLoop) return;

      const nextPlayer = player === "A" ? "B" : "A";
      const nextRef = nextPlayer === "A" ? refA : refB;
      const currentRef = player === "A" ? refA : refB;

      const nextEl = nextRef.current;
      if (!nextEl) return;

      // If ready, swap instantly; otherwise wait for canplay
      const doSwap = () => {
        nextEl.muted = isMuted;
        setActivePlayer(nextPlayer);
        safePlay(nextEl);

        // Preload next clip on the now-inactive player
        const inactiveEl = currentRef.current;
        if (inactiveEl) {
          inactiveEl.src = getNextClip();
          inactiveEl.load();
        }
      };

      if (nextEl.readyState >= 2) {
        doSwap();
      } else {
        nextEl.addEventListener("canplay", doSwap, { once: true });
      }
    },
    [shouldLoop, safePlay, isMuted, getNextClip]
  );

  // Sync muted state
  useEffect(() => {
    const vid = activeVideoRef.current;
    if (vid) vid.muted = isMuted;
  }, [isMuted, activeVideoRef]);

  const videoBase = `absolute inset-0 w-full h-full object-cover ${scaleClass ?? ""}`;

  return (
    <>
      {/* Intro video */}
      {useIntro && (
        <video
          ref={introRef}
          src={VIDEO_INTRO}
          playsInline
          onEnded={handleIntroEnd}
          className={`${videoBase} z-[3] ${introFinished ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          style={{ objectPosition }}
        />
      )}

      {/* Player A — always visible, z-index swap only */}
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
        className={`${videoBase} ${activePlayer === "A" ? "z-[2]" : "z-[1]"}`}
        style={{ objectPosition }}
      />

      {/* Player B — always visible, z-index swap only */}
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
          className={`${videoBase} ${activePlayer === "B" ? "z-[2]" : "z-[1]"}`}
          style={{ objectPosition }}
        />
      )}

      {/* Audio Toggle */}
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
