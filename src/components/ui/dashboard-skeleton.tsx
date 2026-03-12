/**
 * Reusable skeleton loading screens for dashboard panels.
 * Uses semantic design tokens for consistent theming.
 */

const shimmer = "animate-pulse bg-white/[0.04] rounded-xl";

/** Generic dashboard skeleton with stat cards + content rows */
export function DashboardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 py-2">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${shimmer} h-20 border border-white/[0.06]`} />
        ))}
      </div>
      {/* Content rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${shimmer} h-14 border border-white/[0.06]`} />
      ))}
    </div>
  );
}

/** Table-style skeleton for user/class lists */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {/* Header row */}
      <div className={`${shimmer} h-10 border border-white/[0.06]`} />
      {/* Data rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${shimmer} h-12 border border-white/[0.06]`} />
      ))}
    </div>
  );
}

/** Card grid skeleton for teacher class cards */
export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 py-2">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className={`${shimmer} h-24 border border-white/[0.06]`} />
      ))}
    </div>
  );
}

/** Chart-style skeleton for analytics panels */
export function ChartSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${shimmer} h-20 border border-white/[0.06]`} />
        ))}
      </div>
      <div className={`${shimmer} h-36 border border-white/[0.06]`} />
      <div className={`${shimmer} h-28 border border-white/[0.06]`} />
      <div className="grid grid-cols-2 gap-2">
        <div className={`${shimmer} h-32 border border-white/[0.06]`} />
        <div className={`${shimmer} h-32 border border-white/[0.06]`} />
      </div>
    </div>
  );
}
