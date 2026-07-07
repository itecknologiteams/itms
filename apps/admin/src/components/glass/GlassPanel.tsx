import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type GlassTier = 'raised' | 'overlay' | 'modal';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  tier?: GlassTier;
}

/**
 * The one sanctioned glass primitive (docs/ui-ux.md §6: "the only sanctioned
 * glass primitive"). Compose everything glassy from this instead of hand-rolling
 * blur/opacity per component.
 */
export function GlassPanel({ tier = 'raised', className, children, ...rest }: GlassPanelProps) {
  return (
    <div
      className={cn(
        `glass-${tier}`,
        'rounded-card',
        tier === 'modal' && 'rounded-sheet',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
