'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Car,
  DollarSign,
  LayoutDashboard,
  Map,
  Megaphone,
  ScrollText,
  Users,
} from 'lucide-react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/zones', label: 'Zones', icon: Map },
  { href: '/vehicles', label: 'Vehicles', icon: Car },
  { href: '/drivers', label: 'Drivers', icon: Users },
  { href: '/violations', label: 'Violations', icon: AlertTriangle },
  { href: '/fare-configs', label: 'Fare Config', icon: DollarSign },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { href: '/audit-log', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <GlassPanel
      tier="raised"
      className="flex h-[calc(100vh-2rem)] w-60 flex-shrink-0 flex-col gap-1 p-4"
    >
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="h-7 w-7 rounded-full bg-primary" />
        <span className="text-sm font-semibold tracking-wide">ITMS Admin</span>
      </div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-btn px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary/15 font-medium text-primary'
                : 'opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10',
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </GlassPanel>
  );
}
