import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent empty-state placeholder for list views.
 * Renders an icon, title, optional description, and optional action button.
 */
export default function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 text-center ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mb-3 text-muted-foreground/60">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-muted-foreground mb-0.5">{title}</h4>
      {description && (
        <p className="text-[11px] text-muted-foreground/60 max-w-[240px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
