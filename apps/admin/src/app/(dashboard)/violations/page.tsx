'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/Field';
import { Column, DataTable } from '@/components/ui/DataTable';
import { acknowledgeViolation, escalateViolation, listViolations, resolveViolation } from '@/features/violations/api';
import { Violation, ViolationStatus } from '@/types/api';

const STATUS_TONE: Record<ViolationStatus, 'danger' | 'warn' | 'success' | 'neutral'> = {
  open: 'danger',
  acknowledged: 'warn',
  escalated: 'danger',
  auto_closed: 'neutral',
  resolved: 'success',
};

export default function ViolationsPage() {
  const qc = useQueryClient();
  const { data: violations, isLoading } = useQuery({
    queryKey: ['violations'],
    queryFn: () => listViolations(),
  });
  const [resolveTarget, setResolveTarget] = useState<Violation | null>(null);
  const [note, setNote] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['violations'] });
  const ackMutation = useMutation({ mutationFn: acknowledgeViolation, onSuccess: invalidate });
  const escalateMutation = useMutation({ mutationFn: escalateViolation, onSuccess: invalidate });
  const resolveMutation = useMutation({
    mutationFn: () => resolveViolation(resolveTarget!.id, note),
    onSuccess: () => {
      invalidate();
      setResolveTarget(null);
      setNote('');
    },
  });

  const columns: Column<Violation>[] = [
    { header: 'Vehicle', accessor: (v) => <code className="text-xs">{v.vehicleId}</code> },
    { header: 'Zone', accessor: (v) => <code className="text-xs">{v.zoneId}</code> },
    { header: 'Status', accessor: (v) => <Badge tone={STATUS_TONE[v.status]}>{v.status.replace('_', ' ')}</Badge> },
    { header: 'Max distance', accessor: (v) => `${v.maxDistanceM} m` },
    { header: 'Opened', accessor: (v) => new Date(v.openedAt).toLocaleString() },
    {
      header: 'Actions',
      accessor: (v) =>
        v.status === 'open' || v.status === 'acknowledged' ? (
          <div className="flex gap-2">
            {v.status === 'open' && (
              <Button variant="ghost" className="text-xs" onClick={() => ackMutation.mutate(v.id)}>
                Acknowledge
              </Button>
            )}
            <Button variant="ghost" className="text-xs" onClick={() => setResolveTarget(v)}>
              Resolve
            </Button>
            <Button
              variant="ghost"
              className="text-xs text-danger"
              onClick={() => escalateMutation.mutate(v.id)}
            >
              Escalate
            </Button>
          </div>
        ) : (
          <span className="text-xs opacity-40">—</span>
        ),
    },
  ];

  return (
    <div>
      <Topbar title="Geofence Violations" />
      <DataTable columns={columns} rows={violations ?? []} rowKey={(v) => v.id} isLoading={isLoading} />

      <Modal
        open={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title="Resolve violation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolveTarget(null)}>
              Cancel
            </Button>
            <Button disabled={!note || resolveMutation.isPending} onClick={() => resolveMutation.mutate()}>
              {resolveMutation.isPending ? 'Saving…' : 'Resolve'}
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Resolution note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Confirmed maintenance detour, cleared with driver"
        />
      </Modal>
    </div>
  );
}
