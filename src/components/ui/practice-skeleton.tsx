/**
 * Full-screen loading skeleton for practice pages (pronunciation, fluency, speaking).
 * Matches new layout: top bar, left info panel, right vertical buttons, bottom visualizer.
 */

const shimmer = "animate-pulse rounded-xl";

export function PracticeSkeleton() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Top bar: back button + badge */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5 pb-2 z-10">
        <div className="flex items-center gap-2">
          <div className={`${shimmer} h-9 w-20 bg-muted/30`} />
          <div className={`${shimmer} h-6 w-44 bg-muted/20`} />
        </div>
        {/* Progress badge top-right */}
        <div className={`${shimmer} h-10 w-28 bg-muted/20`} />
      </div>

      {/* Timer placeholder – top-left below header */}
      <div className="absolute top-16 left-4 z-10">
        <div className={`${shimmer} h-16 w-24 bg-muted/20`} />
      </div>

      {/* Info panel placeholder – left side */}
      <div className="absolute top-40 left-4 z-10">
        <div className={`${shimmer} h-36 w-[200px] bg-muted/10 border border-muted/15`} />
      </div>

      {/* Vertical button stack – far right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
        {[40, 48, 56, 48, 40, 40].map((s, i) => (
          <div
            key={i}
            className={`${shimmer} bg-muted/15 border border-muted/10`}
            style={{ width: s, height: s }}
          />
        ))}
      </div>

      {/* Bottom bar: karaoke text + visualizer */}
      <div className="absolute bottom-0 left-0 right-16 pb-4 pt-8 px-8 flex flex-col items-center z-10">
        {/* Prosody text placeholder */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[28, 20, 32, 16, 24, 20, 28].map((w, i) => (
            <div key={i} className={`${shimmer} bg-muted/20`} style={{ width: w, height: 14 }} />
          ))}
        </div>

        {/* Progress line + waveform bar */}
        <div className="w-full max-w-3xl">
          <div className={`${shimmer} h-[2px] w-full bg-muted/10 mb-1`} />
          <div className={`${shimmer} h-20 w-full bg-muted/10 border border-muted/20`} />
        </div>
      </div>
    </div>
  );
}
