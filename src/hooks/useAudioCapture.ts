import { useState, useRef, useCallback } from "react";

export function useAudioCapture() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const replayAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setLastRecordingUrl(URL.createObjectURL(blob));
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      // mic denied
    }
  }, []);

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleReplay = useCallback(() => {
    if (!lastRecordingUrl) return;
    if (isPlayingReplay && replayAudioRef.current) {
      replayAudioRef.current.pause();
      replayAudioRef.current = null;
      setIsPlayingReplay(false);
      return;
    }
    const audio = new Audio(lastRecordingUrl);
    audio.onended = () => setIsPlayingReplay(false);
    audio.play().catch(() => {});
    replayAudioRef.current = audio;
    setIsPlayingReplay(true);
  }, [lastRecordingUrl, isPlayingReplay]);

  const clearRecording = useCallback(() => setLastRecordingUrl(null), []);

  return {
    lastRecordingUrl,
    isPlayingReplay,
    startMediaRecorder,
    stopMediaRecorder,
    handleReplay,
    clearRecording,
  };
}
