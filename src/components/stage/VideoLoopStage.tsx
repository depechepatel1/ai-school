import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Volume2, VolumeX } from "lucide-react";
import { useVideoLoopStack } from "@/hooks/useVideoLoopStack";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/videos`;
const CACHE_BUST = "?v=2";

const VIDEO_INTRO = `${STORAGE_BASE}/intro.mp4${CACHE_BUST}`;

/** Max consecutive errors before giving up */
const MAX_CONSECUTIVE_ERRORS = 3;

/** Fisher-Yates shuffle, keeping index 0 in place */
function shuffleExceptFirst(arr: string[]): string[] {
  if (arr.length <= 1) return [...arr];
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
  const { videoList: hookVideoList } = useVideoLoopStack();
  const videoList = videoListProp && videoListProp.length > 0 ? videoListProp : hookVideoList;

  const shouldLoop = videoList.length === 1;

  const alreadyPlayedIntro = sessionStorage.getItem("intro_video_played") === "true";
  const useIntro = playIntro && !alreadyPlayedIntro;

  const [isMuted, setIsMuted] = useState(false);
  const [introFinished, setIntroFinished] = useState(!useIntro);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");

  const introRef = useRef<HTMLVideoElement>(null);
  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const isMutedRef = useRef(isMuted);
  const consecutiveErrorsRef = useRef(0);

  // Keep muted ref in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Shuffled playlist & index tracker
  const playlistRef = useRef<string[]>([]);
  const playIndexRef = useRef(1);

  // Initialize / re-initialize playlist when videoList changes
  useEffect(() => {
    if (videoList.length === 0) return;
    playlistRef.current = shuffleExceptFirst(videoList);
    playIndexRef.current = 1;
  }, [videoList]);

  const activeVideoRef = !introFinished ? introRef : activePlayer === "A" ? refA : refB;

  const getNextClip = useCallback((): string => {
    const playlist = playlistRef.current;
    if (playIndexRef.current >= playlist.length) {
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

  // Instant swap when active player ends
  const handlePlayerEnded = useCallback(
    (player: "A" | "B") => {
      if (shouldLoop) return;

      consecutiveErrorsRef.current = 0; // successful play resets error counter

      const nextPlayer = player === "A" ? "B" : "A";
      const nextRef = nextPlayer === "A" ? refA : refB;
      const currentRef = player === "A" ? refA : refB;

      const nextEl = nextRef.current;
      if (!nextEl) return;

      const doSwap = () => {
        nextEl.muted = isMutedRef.current;
        setActivePlayer(nextPlayer);
        safePlay(nextEl);

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
    [shouldLoop, safePlay, getNextClip]
  );

  // Error recovery: skip broken clips instead of freezing
  const handlePlayerError = useCallback(
    (player: "A" | "B") => {
      if (shouldLoop) return;

      consecutiveErrorsRef.current++;
      const ref = player === "A" ? refA : refB;
      const el = ref.current;

      console.warn(`[VideoPlayer] ${player} error on src, skipping clip. Consecutive errors: ${consecutiveErrorsRef.current}`);

      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        console.error("[VideoPlayer] Too many consecutive errors, stopping recovery.");
        return;
      }

      // Load a new clip on the errored player
      if (el) {
        el.src = getNextClip();
        el.load();
      }

      // Swap to the other player if it's ready
      handlePlayerEnded(player);
    },
    [shouldLoop, getNextClip, handlePlayerEnded]
  );

  // When intro finishes (or no intro) AND videos are loaded, start Player A
  useEffect(() => {
    if (!introFinished || videoList.length === 0) return;
    const a = refA.current;
    if (a) {
      const firstClip = videoList[0];
      if (a.src !== firstClip) {
        a.src = firstClip;
      }
      a.muted = isMutedRef.current;
      safePlay(a);
    }
    if (!shouldLoop && refB.current && videoList.length > 1) {
      const nextClip = getNextClip();
      refB.current.src = nextClip;
      refB.current.load();
    }
  }, [introFinished, videoList.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync muted state
  useEffect(() => {
    const vid = activeVideoRef.current;
    if (vid) vid.muted = isMuted;
  }, [isMuted, activeVideoRef]);

  if (videoList.length === 0) {
    return <div className="absolute inset-0 bg-gray-900" />;
  }

  const videoBase = `absolute inset-0 w-full h-full object-cover ${scaleClass ?? ""}`;

  return (
    <>
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

      <video
        ref={refA}
        src={videoList[0]}
        muted
        playsInline
        controls={false}
        loop={shouldLoop}
        preload="auto"
        onEnded={() => handlePlayerEnded("A")}
        onError={() => handlePlayerError("A")}
        className={`${videoBase} ${activePlayer === "A" ? "z-[2]" : "z-[1]"}`}
        style={{ objectPosition }}
      />

      {!shouldLoop && (
        <video
          ref={refB}
          muted
          playsInline
          controls={false}
          preload="auto"
          onEnded={() => handlePlayerEnded("B")}
          onError={() => handlePlayerError("B")}
          className={`${videoBase} ${activePlayer === "B" ? "z-[2]" : "z-[1]"}`}
          style={{ objectPosition }}
        />
      )}

      {createPortal(
        <button
          onClick={toggleAudio}
          className="fixed top-4 right-4 z-[100] p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/40 transition-all shadow-lg hover:scale-105 cursor-pointer"
          title={isMuted ? "Unmute Background" : "Mute Background"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>,
        document.body
      )}
    </>
  );
}
