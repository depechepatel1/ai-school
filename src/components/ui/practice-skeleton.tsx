/**
 * Full-screen loading skeleton for practice pages (pronunciation, fluency, speaking).
 * Mimics the actual layout: header badge top-left, timer + info panel stacked on left,
 * control buttons on right edge centered, bottom visualizer bar.
 */

const shimmer = "animate-pulse rounded-xl";

export function PracticeSkeleton() {
  return (
    <div className="relative w-full h-screen bg-background text-foreground overflow-hidden">
      {/* Header badge – top left */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className={`${shimmer} h-8 w-16 bg-muted/30`} />
        <div className={`${shimmer} h-5 w-32 bg-muted/20`} />
      </div>

      {/* Timer – below header */}
      <div className="absolute top-16 left-4 z-10">
        <div className={`${shimmer} h-16 w-28 bg-muted/15 border border-muted/10`} />
      </div>

      {/* Left panel stack: info panel + tips + warning */}
      <div className="absolute top-40 left-4 z-10 flex flex-col gap-3 w-[220px]">
        {/* Info panel */}
        <div className={`${shimmer} rounded-2xl bg-muted/15 border border-muted/10 px-4 py-3 space-y-2`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`${shimmer} h-4 w-4 bg-muted/20`} />
            <div className={`${shimmer} h-3 w-24 bg-muted/20`} />
          </div>
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${shimmer} h-3 w-12 bg-muted/15`} />
              <div className={`${shimmer} h-3 bg-muted/20`} style={{ width: w }} />
            </div>
          ))}
          <div className="h-px bg-muted/10 my-2" />
          <div className={`${shimmer} h-10 w-full bg-muted/10`} />
        </div>

        {/* Tips card */}
        <div className={`${shimmer} rounded-xl bg-muted/10 border border-muted/10 px-4 py-3 space-y-1.5`}>
          <div className={`${shimmer} h-2.5 w-10 bg-muted/15`} />
          {[100, 90, 80].map((w, i) => (
            <div key={i} className={`${shimmer} h-2.5 bg-muted/10`} style={{ width: w }} />
          ))}
        </div>

        {/* Warning bar */}
        <div className={`${shimmer} h-9 w-full bg-muted/10 border border-muted/10`} />
      </div>

      {/* Right-edge controls – vertically centered */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3 p-1.5">
        <div className={`${shimmer} w-14 h-14 rounded-full bg-muted/15 border border-muted/10`} />
        <div className={`${shimmer} w-10 h-10 rounded-full bg-muted/10 border border-muted/10`} />
      </div>

      {/* Bottom bar – visualizer area */}
      <div className="absolute bottom-0 left-0 right-16 pb-4 pt-8 px-8 flex flex-col items-center z-10 bg-gradient-to-t from-background via-background/50 to-transparent">
        {/* Prosody text placeholder */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[28, 20, 32, 16, 24, 20, 28].map((w, i) => (
            <div key={i} className={`${shimmer} bg-muted/20`} style={{ width: w, height: 14 }} />
          ))}
        </div>
        {/* Waveform bar */}
        <div className={`${shimmer} h-20 w-full max-w-3xl bg-muted/10 border border-muted/10`} />
      </div>
    </div>
  );
}
