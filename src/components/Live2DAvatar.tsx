/**
 * Live2DAvatar Component — DORMANT (activated when USE_LIVE2D = true)
 * 
 * This component uses pixi.js v7 and pixi-live2d-display to render
 * a Live2D Cubism model with audio-driven lip-sync.
 * 
 * Prerequisites:
 * - live2dcubismcore.min.js must be loaded in index.html <head>
 * - pixi.js v7 and pixi-live2d-display packages installed
 * 
 * Usage:
 * <Live2DAvatar modelUrl="path/to/model.json" audioUrl={optionalAudioUrl} />
 */

import { useEffect, useRef, useCallback } from "react";

interface Live2DAvatarProps {
  modelUrl?: string;
  audioUrl?: string | null;
  className?: string;
}

const DEFAULT_MODEL_URL =
  "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json";

export default function Live2DAvatar({
  modelUrl = DEFAULT_MODEL_URL,
  audioUrl = null,
  className = "",
}: Live2DAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const initLipSync = useCallback(async (url: string) => {
    if (!modelRef.current) return;

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      source.start(0);

      // Lip sync loop via PIXI ticker
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const ticker = appRef.current?.ticker;
      const lipSyncFn = () => {
        if (!analyserRef.current || !modelRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalized = Math.min(rms / 128, 1); // Normalize 0-1

        // Map to mouth parameter
        try {
          modelRef.current.internalModel.coreModel.setParameterValueById(
            "ParamMouthOpenY",
            normalized
          );
        } catch {
          // Parameter might not exist on all models
        }
      };

      ticker?.add(lipSyncFn);

      source.onended = () => {
        ticker?.remove(lipSyncFn);
        // Reset mouth
        try {
          modelRef.current?.internalModel.coreModel.setParameterValueById(
            "ParamMouthOpenY",
            0
          );
        } catch {}
      };
    } catch (err) {
      console.error("Lip sync init failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;

    const init = async () => {
      // Wait for Cubism Core to be available
      const maxRetries = 20;
      let retries = 0;
      while (!(window as any).Live2DCubismCore && retries < maxRetries) {
        await new Promise((r) => setTimeout(r, 200));
        retries++;
      }

      if (!(window as any).Live2DCubismCore) {
        console.error("Live2D Cubism Core not loaded");
        return;
      }

      // Dynamic imports for pixi.js and pixi-live2d-display
      const PIXI = await import("pixi.js");
      const { Live2DModel } = await import("pixi-live2d-display");

      // Register PIXI for Live2D
      (window as any).PIXI = PIXI;

      if (destroyed) return;

      const app = new PIXI.Application({
        view: canvasRef.current!,
        resizeTo: canvasRef.current!.parentElement!,
        backgroundAlpha: 0,
        antialias: true,
      });

      appRef.current = app;

      try {
        const model = await Live2DModel.from(modelUrl);
        if (destroyed) return;

        modelRef.current = model;

        // Scale and position: head & shoulders centered
        const scale = Math.min(
          app.screen.width / model.width,
          app.screen.height / model.height
        ) * 0.8;
        
        model.scale.set(scale);
        model.anchor.set(0.5, 0.5);
        model.x = app.screen.width / 2;
        model.y = app.screen.height / 2;

        app.stage.addChild(model as any);
      } catch (err) {
        console.error("Failed to load Live2D model:", err);
      }
    };

    init();

    return () => {
      destroyed = true;
      appRef.current?.destroy(true);
      audioContextRef.current?.close();
    };
  }, [modelUrl]);

  // Handle audio changes for lip sync
  useEffect(() => {
    if (audioUrl) {
      initLipSync(audioUrl);
    }
  }, [audioUrl, initLipSync]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full z-0 ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
}
