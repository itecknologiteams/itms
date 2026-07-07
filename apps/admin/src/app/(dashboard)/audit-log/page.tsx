'use client';

import { useQuery } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Column, DataTable } from '@/components/ui/DataTable';
import { listAuditLog } from '@/features/audit-log/api';
import { AuditLogEntry } from '@/types/api';

export default function AuditLogPage() {
  const { data: entries, isLoading } = useQuery({ queryKey: ['audit-log'], queryFn: () => listAuditLog() });

  const columns: Column<AuditLogEntry>[] = [
    { header: 'When', accessor: (e) => new Date(e.at).toLocaleString() },
    { header: 'Admin', accessor: (e) => <code className="text-xs">{e.adminId}</code> },
    { header: 'Action', accessor: (e) => <span className="font-medium">{e.action}</span> },
    { header: 'Entity', accessor: (e) => `${e.entity} · ${e.entityId.slice(0, 12)}…` },
    {
      header: 'Change',
      accessor: (e) => (
        <span className="text-xs opacity-70">
          {e.before ? `${JSON.stringify(e.before)} → ` : ''}
          {e.after ? JSON.stringify(e.after) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Audit Log" />
      <DataTable columns={columns} rows={entries ?? []} rowKey={(e) => e.id} isLoading={isLoading} />
    </div>
  );
}
