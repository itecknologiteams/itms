'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SelectField, TextField } from '@/components/ui/Field';
import { Column, DataTable } from '@/components/ui/DataTable';
import { listBroadcasts, sendBroadcast } from '@/features/broadcasts/api';
import { Broadcast, BroadcastAudience } from '@/types/api';

export default function BroadcastsPage() {
  const qc = useQueryClient();
  const { data: broadcasts, isLoading } = useQuery({ queryKey: ['broadcasts'], queryFn: listBroadcasts });
  const [audience, setAudience] = useState<BroadcastAudience>('all_drivers');
  const [templateKey, setTemplateKey] = useState('driver_document_expiring');

  const mutation = useMutation({
    mutationFn: () => sendBroadcast(audience, templateKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  });

  const columns: Column<Broadcast>[] = [
    {
      header: 'Audience',
      accessor: (b) => <Badge tone="info">{b.audience === 'all_drivers' ? 'All drivers' : 'All passengers'}</Badge>,
    },
    { header: 'Template', accessor: (b) => <code className="text-xs">{b.templateKey}</code> },
    { header: 'Recipients', accessor: (b) => b.count.toLocaleString() },
    { header: 'Sent', accessor: (b) => new Date(b.at).toLocaleString() },
  ];

  return (
    <div>
      <Topbar title="Broadcasts" />

      <GlassPanel className="mb-6 p-5">
        <h2 className="mb-4 text-sm font-medium opacity-70">Send an announcement</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as BroadcastAudience)}
          >
            <option value="all_drivers">All drivers</option>
            <option value="all_passengers">All passengers</option>
          </SelectField>
          <TextField
            label="Template key"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          />
          <div className="flex items-end">
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()} className="w-full">
              {mutation.isPending ? 'Sending…' : 'Send broadcast'}
            </Button>
          </div>
        </div>
        {mutation.isError && (
          <p className="mt-3 text-sm text-danger">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to send'}
          </p>
        )}
      </GlassPanel>

      <DataTable columns={columns} rows={broadcasts ?? []} rowKey={(b) => b.id} isLoading={isLoading} />
    </div>
  );
}
