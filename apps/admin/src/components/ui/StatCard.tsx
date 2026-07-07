import { LucideIcon } from 'lucide-react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { direction: 'up' | 'down'; label: string };
  tone?: 'primary' | 'warn' | 'danger' | 'accent';
}

const TONE_TEXT: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'text-primary',
  warn: 'text-warn',
  danger: 'text-danger',
  accent: 'text-accent',
};

export function StatCard({ label, value, icon: Icon, trend, tone = 'primary' }: StatCardProps) {
  return (
    <GlassPanel className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-70">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className={cn('rounded-full bg-black/5 p-2 dark:bg-white/10', TONE_TEXT[tone])}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            'mt-3 text-xs font-medium',
            trend.direction === 'up' ? 'text-primary' : 'text-danger',
          )}
        >
          {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
        </p>
      )}
    </GlassPanel>
  );
}
