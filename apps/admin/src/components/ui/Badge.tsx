import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-black/5 text-current dark:bg-white/10',
  success: 'bg-primary/15 text-primary',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-accent/15 text-accent',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium capitalize',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
