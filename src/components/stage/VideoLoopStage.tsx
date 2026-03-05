import { useState, useRef, useEffect, useCallback } from "react";
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
}

export default function VideoLoopStage({
  videoList: videoListProp,
  playIntro = false,
  objectPosition = "center center",
}: VideoLoopStageProps) {
  const videoList = videoListProp && videoListProp.length > 0 ? videoListProp : VIDEO_LOOP_STACK;
  const shouldLoop = videoList.length === 1;

  const alreadyPlayedIntro = sessionStorage.getItem("intro_video_played") === "true";
  const useIntro = playIntro && !alreadyPlayedIntro;

  const [isMuted, setIsMuted] = useState(true);
  const [introFinished, setIntroFinished] = useState(!useIntro);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");

  const introRef = useRef<HTMLVideoElement>(null);
  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const nextIndexRef = useRef(2);
  const initialPlayDone = useRef(false);

  // Diagnostic: test if the first video URL is fetchable
  useEffect(() => {
    const testUrl = videoList[0];
    console.log("[VideoDebug] Testing fetch for:", testUrl);
    fetch(testUrl, { method: "HEAD" })
      .then((res) => {
        console.log("[VideoDebug] HEAD response:", {
          status: res.status,
          contentType: res.headers.get("content-type"),
          contentLength: res.headers.get("content-length"),
          allHeaders: Object.fromEntries(res.headers.entries()),
        });
      })
      .catch((err) => console.error("[VideoDebug] HEAD fetch failed:", err));
  }, [videoList]);

  const activeVideoRef = !introFinished ? introRef : activePlayer === "A" ? refA : refB;

  // Robust play helper with retry for Edge
  const safePlay = useCallback((v: HTMLVideoElement) => {
    v.muted = true;
    v.play().catch(() => {
      setTimeout(() => {
        if (v) {
          v.muted = true;
          v.play().catch(() => {});
        }
      }, 150);
    });
  }, []);

  // Edge-safe: force muted on all video refs via DOM
  useEffect(() => {
    [introRef, refA, refB].forEach((ref) => {
      if (ref.current) ref.current.muted = true;
    });
  }, [introFinished]);

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

  // When active player ends, swap to preloaded one and queue next
  const handlePlayerEnded = useCallback(
    (player: "A" | "B") => {
      if (shouldLoop) return;
      const nextPlayer = player === "A" ? "B" : "A";
      const nextRef = nextPlayer === "A" ? refA : refB;

      setActivePlayer(nextPlayer);
      if (nextRef.current) safePlay(nextRef.current);

      // Preload next video on the now-inactive player
      const inactiveRef = player === "A" ? refA : refB;
      if (inactiveRef.current) {
        const preloadIdx = nextIndexRef.current % videoList.length;
        inactiveRef.current.src = videoList[preloadIdx];
        inactiveRef.current.load();
        nextIndexRef.current = preloadIdx + 1;
      }
    },
    [shouldLoop, videoList, safePlay]
  );

  // Initial preload: when intro finishes, ensure Player B has next video
  useEffect(() => {
    if (!introFinished || shouldLoop) return;
    if (refB.current && videoList.length > 1) {
      refB.current.src = videoList[1];
      refB.current.load();
    }
  }, [introFinished, shouldLoop, videoList]);

  // Auto-play Player A only once on initial load
  const handleCanPlayA = useCallback(() => {
    if (!introFinished || initialPlayDone.current) return;
    initialPlayDone.current = true;
    if (refA.current) safePlay(refA.current);
  }, [introFinished, safePlay]);

  return (
    <>
      {/* Intro video — plays once */}
      {useIntro && (
        <video
          ref={introRef}
          src={VIDEO_INTRO}
          autoPlay
          playsInline
          muted
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
        onCanPlay={handleCanPlayA}
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

      {/* Audio Toggle */}
      <button
        onClick={toggleAudio}
        className="absolute bottom-8 left-8 z-30 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/40 transition-all shadow-lg hover:scale-105 cursor-pointer"
        title={isMuted ? "Unmute Background" : "Mute Background"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </>
  );
}
