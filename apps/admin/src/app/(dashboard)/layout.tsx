import { RequireAuth } from '@/features/auth/RequireAuth';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex gap-4 p-4">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RequireAuth>
  );
}
