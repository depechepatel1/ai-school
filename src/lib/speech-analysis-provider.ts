/**
 * Speech Analysis Provider — Pluggable abstraction
 *
 * Switch between "browser" (local pitch detection + DTW) and "aliyun"
 * (cloud API) by changing PROVIDERS.speechAnalysis in provider-config.ts.
 */

import { PROVIDERS } from "@/lib/provider-config";
import { detectPitch, normalizeFrequency } from "@/lib/pitch-detector";
import { generateTargetContour, matchContours } from "@/lib/contour-match";
import { parseProsody } from "@/lib/prosody";
import type { Accent } from "@/lib/tts-provider";

export interface WordScore {
  word: string;
  score: number;
  feedback?: string;
}

export interface SpeechAnalysisResult {
  overallScore: number;          // 0-100
  pitchContour: number[];        // normalized 0-1 pitch values
  fluencyScore?: number;
  pronunciationScore?: number;
  wordScores?: WordScore[];
}

export interface SpeechAnalysisProvider {
  analyze(
    audioData: Float32Array,
    sampleRate: number,
    referenceText: string,
    accent: Accent,
  ): Promise<SpeechAnalysisResult>;
}

// ── Browser implementation ─────────────────────────────────────

class BrowserSpeechAnalysis implements SpeechAnalysisProvider {
  async analyze(
    audioData: Float32Array,
    sampleRate: number,
    referenceText: string,
    _accent: Accent,
  ): Promise<SpeechAnalysisResult> {
    // Extract pitch contour from recorded audio
    const frameSize = 2048;
    const hop = 512;
    const userContour: number[] = [];

    for (let offset = 0; offset + frameSize < audioData.length; offset += hop) {
      const frame = audioData.subarray(offset, offset + frameSize);
      const hz = detectPitch(frame, sampleRate);
      if (hz !== null) {
        userContour.push(normalizeFrequency(hz));
      }
    }

    // Generate target contour from text prosody
    const prosody = parseProsody(referenceText);
    const targetContour = generateTargetContour(prosody);

    // Score via DTW
    const overallScore = userContour.length > 0
      ? matchContours(targetContour, userContour)
      : 0;

    return {
      overallScore,
      pitchContour: userContour,
    };
  }
}

// ── Aliyun placeholder ─────────────────────────────────────────

class AliyunSpeechAnalysis implements SpeechAnalysisProvider {
  async analyze(
    _audioData: Float32Array,
    _sampleRate: number,
    _referenceText: string,
    _accent: Accent,
  ): Promise<SpeechAnalysisResult> {
    // TODO: When Aliyun Speech Analysis API is ready:
    // 1. Encode audioData to WAV/PCM blob
    // 2. POST to supabase edge function `aliyun-speech-analysis`
    // 3. Edge function forwards to Aliyun API, returns structured scores
    // 4. Map response to SpeechAnalysisResult
    throw new Error(
      "Aliyun speech analysis not yet implemented. Set PROVIDERS.speechAnalysis = 'browser' in provider-config.ts"
    );
  }
}

// ── Factory ────────────────────────────────────────────────────

let _provider: SpeechAnalysisProvider | null = null;

export function getSpeechAnalysisProvider(): SpeechAnalysisProvider {
  if (!_provider) {
    _provider = PROVIDERS.speechAnalysis === "aliyun"
      ? new AliyunSpeechAnalysis()
      : new BrowserSpeechAnalysis();
  }
  return _provider;
}

/**
 * Convenience: analyze recorded pitch contour directly (for LiveInputCanvas).
 * Takes the already-extracted contour from RealtimePitchTracker instead of raw audio.
 */
export function analyzeContour(
  userContour: number[],
  referenceText: string,
): SpeechAnalysisResult {
  const prosody = parseProsody(referenceText);
  const targetContour = generateTargetContour(prosody);
  const overallScore = userContour.length > 0
    ? matchContours(targetContour, userContour)
    : 0;

  return {
    overallScore,
    pitchContour: userContour,
  };
}
