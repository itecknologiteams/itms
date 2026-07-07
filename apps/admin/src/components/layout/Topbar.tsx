'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { logout } from '@/features/auth/api';
import { MOCK_MODE } from '@/lib/config';

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  return (
    <GlassPanel tier="overlay" className="mb-6 flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        {MOCK_MODE && (
          <span className="rounded-pill bg-warn/15 px-2.5 py-0.5 text-xs font-medium text-warn">
            Demo data
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
        >
          <LogOut size={16} /> Sign out
        </Button>
      </div>
    </GlassPanel>
  );
}
