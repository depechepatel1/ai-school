/**
 * Full-screen loading skeleton for practice pages (pronunciation, fluency, speaking).
 * Mimics the practice layout: top bar, center visualizer, bottom controls.
 */

const shimmer = "animate-pulse rounded-xl";

export function PracticeSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar: back button + badge + counter */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className={`${shimmer} h-9 w-20 bg-muted/30`} />
          <div className={`${shimmer} h-6 w-44 bg-muted/20`} />
        </div>
        <div className={`${shimmer} h-16 w-24 bg-muted/20`} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center visualizer area */}
      <div className="flex flex-col items-center gap-4 px-8 pb-4">
        {/* Prosody text placeholder */}
        <div className="flex items-center justify-center gap-2">
          {[28, 20, 32, 16, 24, 20, 28].map((w, i) => (
            <div key={i} className={`${shimmer} bg-muted/20`} style={{ width: w, height: 14 }} />
          ))}
        </div>

        {/* Waveform bar */}
        <div className={`${shimmer} h-20 w-full max-w-3xl bg-muted/10 border border-muted/20`} />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-3 pb-8">
        {[48, 56, 64, 56, 48, 48].map((s, i) => (
          <div
            key={i}
            className={`${shimmer} bg-muted/15 border border-muted/10`}
            style={{ width: s, height: s }}
          />
        ))}
      </div>
    </div>
  );
}
