/**
 * Pitch Detector — Autocorrelation-based F0 extraction
 *
 * Browser-interim solution for real-time pitch detection from mic audio.
 * Will be replaced by Aliyun Speech Analysis API when ready.
 */

const MIN_FREQ = 80;   // Hz – lowest voice pitch
const MAX_FREQ = 600;  // Hz – highest voice pitch

/**
 * Detect fundamental frequency (F0) from a single audio frame.
 * Uses autocorrelation (YIN-lite) for robustness.
 * @returns frequency in Hz, or null if unvoiced / silence
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.floor(sampleRate / MIN_FREQ);
  if (maxLag >= buffer.length) return null;

  // Check RMS — skip silence
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return null;

  // Autocorrelation
  let bestCorr = -1;
  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < buffer.length - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  // Confidence check — correlation should be positive and strong
  if (bestCorr < 0.01) return null;

  // Parabolic interpolation for sub-sample accuracy
  const prev = autocorr(buffer, bestLag - 1);
  const curr = bestCorr;
  const next = autocorr(buffer, bestLag + 1);
  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedLag = bestLag + (isFinite(shift) ? shift : 0);

  return sampleRate / refinedLag;
}

function autocorr(buffer: Float32Array, lag: number): number {
  if (lag < 0 || lag >= buffer.length) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length - lag; i++) sum += buffer[i] * buffer[i + lag];
  return sum;
}

/**
 * Convert a Hz frequency to a 0-1 normalized value within typical voice range.
 * 80 Hz → 0, 600 Hz → 1
 */
export function normalizeFrequency(hz: number): number {
  return Math.max(0, Math.min(1, (hz - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)));
}

/**
 * Build a pitch contour array by repeatedly sampling an AnalyserNode.
 * Used in LiveInputCanvas to gather pitch data for post-recording analysis.
 */
export class RealtimePitchTracker {
  private contour: number[] = [];
  private analyser: AnalyserNode;
  private buffer: Float32Array<ArrayBuffer>;
  private sampleRate: number;
  private rafId: number | null = null;
  private active = false;
  private _currentValue = 0;

  constructor(analyser: AnalyserNode, sampleRate: number) {
    this.analyser = analyser;
    this.buffer = new Float32Array(analyser.fftSize);
    this.sampleRate = sampleRate;
  }

  start() {
    this.contour = [];
    this._currentValue = 0;
    this.active = true;
    this.tick();
  }

  stop(): number[] {
    this.active = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    return [...this.contour];
  }

  getContour(): number[] {
    return [...this.contour];
  }

  /** Get the latest normalized pitch value (0-1). Returns 0 during silence/unvoiced. */
  get currentValue(): number {
    return this._currentValue;
  }

  private tick = () => {
    if (!this.active) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const hz = detectPitch(this.buffer, this.sampleRate);
    if (hz !== null) {
      this._currentValue = normalizeFrequency(hz);
      this.contour.push(this._currentValue);
    } else {
      this._currentValue = 0;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}
