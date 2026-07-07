'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Topbar } from '@/components/layout/Topbar';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/Button';
import { csvExportUrl, getDriverPerformance, getPaymentMix, getRidesDaily, getViolationSummary } from '@/features/reports/api';
import { MOCK_MODE } from '@/lib/config';

const FROM = '2026-07-01';
const TO = '2026-07-07';
const PIE_COLORS = ['#0FA958', '#00C2A8', '#F5A524'];

export default function ReportsPage() {
  const [report, setReport] = useState<'rides_daily' | 'driver_performance' | 'violations' | 'payment_mix'>(
    'rides_daily',
  );

  const { data: rides } = useQuery({ queryKey: ['reports', 'rides_daily'], queryFn: () => getRidesDaily(FROM, TO) });
  const { data: driverPerf } = useQuery({
    queryKey: ['reports', 'driver_performance'],
    queryFn: () => getDriverPerformance(FROM, TO),
  });
  const { data: violationSum } = useQuery({
    queryKey: ['reports', 'violations'],
    queryFn: () => getViolationSummary(FROM, TO),
  });
  const { data: paymentMix } = useQuery({
    queryKey: ['reports', 'payment_mix'],
    queryFn: () => getPaymentMix(FROM, TO),
  });

  return (
    <div>
      <Topbar title="Reports" />

      <div className="mb-6 flex items-center justify-end">
        {!MOCK_MODE && (
          <a href={csvExportUrl(report, FROM, TO)} download>
            <Button variant="secondary">
              <Download size={16} /> Export CSV
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassPanel className="p-5" onClick={() => setReport('rides_daily')}>
          <h2 className="mb-4 text-sm font-medium opacity-70">Rides per day</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rides ?? []}>
                <CartesianGrid strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} stroke="currentColor" opacity={0.5} />
                <YAxis fontSize={12} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Bar dataKey="ridesCompleted" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5" onClick={() => setReport('payment_mix')}>
          <h2 className="mb-4 text-sm font-medium opacity-70">Payment method mix</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMix ?? []}
                  dataKey="count"
                  nameKey="method"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {(paymentMix ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5" onClick={() => setReport('driver_performance')}>
          <h2 className="mb-4 text-sm font-medium opacity-70">Driver rides today</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={driverPerf ?? []} layout="vertical">
                <CartesianGrid strokeOpacity={0.1} horizontal={false} />
                <XAxis type="number" fontSize={12} stroke="currentColor" opacity={0.5} />
                <YAxis
                  type="category"
                  dataKey="driverId"
                  width={70}
                  tickFormatter={(id: string) => id.slice(0, 6)}
                  fontSize={12}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Bar dataKey="rides" fill="var(--color-accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5" onClick={() => setReport('violations')}>
          <h2 className="mb-4 text-sm font-medium opacity-70">Violations opened by zone</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationSum ?? []}>
                <CartesianGrid strokeOpacity={0.1} vertical={false} />
                <XAxis
                  dataKey="zoneId"
                  tickFormatter={(id: string) => id.replace('zone-', '')}
                  fontSize={12}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis fontSize={12} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                <Bar dataKey="opened" fill="var(--color-danger)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
