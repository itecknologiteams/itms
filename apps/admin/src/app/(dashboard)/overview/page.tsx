'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Car, DollarSign, Route } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Topbar } from '@/components/layout/Topbar';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { StatCard } from '@/components/ui/StatCard';
import { getRidesDaily } from '@/features/reports/api';
import { listViolations } from '@/features/violations/api';
import { listDrivers } from '@/features/drivers/api';

export default function OverviewPage() {
  const { data: rides } = useQuery({
    queryKey: ['reports', 'rides_daily', 'overview'],
    queryFn: () => getRidesDaily('2026-07-01', '2026-07-07'),
  });
  const { data: violations } = useQuery({
    queryKey: ['violations', 'open'],
    queryFn: () => listViolations('open'),
  });
  const { data: drivers } = useQuery({ queryKey: ['drivers'], queryFn: () => listDrivers() });

  const totalRides = rides?.reduce((s, r) => s + r.ridesCompleted, 0) ?? 0;
  const totalRevenuePaisa = rides?.reduce((s, r) => s + Number(r.revenuePaisa), 0) ?? 0;
  const onlineDrivers = drivers?.filter((d) => d.online !== 'offline').length ?? 0;
  const chartData = rides?.map((r) => ({ date: r.date.slice(5), rides: r.ridesCompleted })) ?? [];

  return (
    <div>
      <Topbar title="Overview" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rides (7d)" value={totalRides.toLocaleString()} icon={Route} tone="primary" />
        <StatCard
          label="Revenue (7d)"
          value={`PKR ${(totalRevenuePaisa / 100).toLocaleString()}`}
          icon={DollarSign}
          tone="accent"
        />
        <StatCard label="Drivers online" value={String(onlineDrivers)} icon={Car} tone="primary" />
        <StatCard
          label="Open violations"
          value={String(violations?.length ?? 0)}
          icon={AlertTriangle}
          tone={violations && violations.length > 0 ? 'danger' : 'primary'}
        />
      </div>

      <GlassPanel className="mt-6 p-5">
        <h2 className="mb-4 text-sm font-medium opacity-70">Rides completed — last 7 days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="currentColor" opacity={0.5} fontSize={12} />
              <YAxis stroke="currentColor" opacity={0.5} fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', backdropFilter: 'blur(12px)' }}
              />
              <Line type="monotone" dataKey="rides" stroke="var(--color-primary)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>
    </div>
  );
}
