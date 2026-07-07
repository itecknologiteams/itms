'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { Column, DataTable } from '@/components/ui/DataTable';
import {
  approveDriver,
  liftSuspension,
  listDrivers,
  onboardDriver,
  suspendDriver,
} from '@/features/drivers/api';
import { Driver, DriverStatus, OnlineStatus } from '@/types/api';

const STATUS_TONE: Record<DriverStatus, 'success' | 'warn' | 'danger' | 'neutral'> = {
  approved: 'success',
  pending: 'warn',
  suspended: 'danger',
  retired: 'neutral',
};

const ONLINE_TONE: Record<OnlineStatus, 'success' | 'info' | 'neutral'> = {
  online: 'success',
  on_trip: 'info',
  offline: 'neutral',
};

export default function DriversPage() {
  const qc = useQueryClient();
  const { data: drivers, isLoading } = useQuery({ queryKey: ['drivers'], queryFn: () => listDrivers() });
  const [open, setOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Driver | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [form, setForm] = useState({ phone: '', name: '', license_no: '' });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['drivers'] });

  const onboardMutation = useMutation({
    mutationFn: () => onboardDriver(form),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ phone: '', name: '', license_no: '' });
    },
  });
  const approveMutation = useMutation({ mutationFn: approveDriver, onSuccess: invalidate });
  const liftMutation = useMutation({ mutationFn: liftSuspension, onSuccess: invalidate });
  const suspendMutation = useMutation({
    mutationFn: () => suspendDriver(suspendTarget!.id, suspendReason),
    onSuccess: () => {
      invalidate();
      setSuspendTarget(null);
      setSuspendReason('');
    },
  });

  const columns: Column<Driver>[] = [
    { header: 'Name', accessor: (d) => <span className="font-medium">{d.name}</span> },
    { header: 'Phone', accessor: (d) => d.phone },
    { header: 'Status', accessor: (d) => <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge> },
    {
      header: 'Online',
      accessor: (d) => <Badge tone={ONLINE_TONE[d.online]}>{d.online.replace('_', ' ')}</Badge>,
    },
    { header: 'Rating', accessor: (d) => Number(d.ratingAvg).toFixed(2) },
    {
      header: 'Actions',
      accessor: (d) => (
        <div className="flex gap-2">
          {d.status === 'pending' && (
            <Button variant="ghost" className="text-xs" onClick={() => approveMutation.mutate(d.id)}>
              Approve
            </Button>
          )}
          {d.status === 'suspended' ? (
            <Button variant="ghost" className="text-xs" onClick={() => liftMutation.mutate(d.id)}>
              Lift suspension
            </Button>
          ) : (
            d.status === 'approved' && (
              <Button variant="ghost" className="text-xs text-danger" onClick={() => setSuspendTarget(d)}>
                Suspend
              </Button>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Drivers" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Onboard driver
        </Button>
      </div>

      <DataTable columns={columns} rows={drivers ?? []} rowKey={(d) => d.id} isLoading={isLoading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Onboard a driver"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.phone || !form.name || onboardMutation.isPending}
              onClick={() => onboardMutation.mutate()}
            >
              {onboardMutation.isPending ? 'Saving…' : 'Onboard'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+923001234567"
          />
          <TextField
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="License number"
            value={form.license_no}
            onChange={(e) => setForm({ ...form, license_no: e.target.value })}
          />
          {onboardMutation.isError && (
            <p className="text-sm text-danger">
              {onboardMutation.error instanceof Error ? onboardMutation.error.message : 'Failed to onboard'}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={`Suspend ${suspendTarget?.name ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!suspendReason || suspendMutation.isPending}
              onClick={() => suspendMutation.mutate()}
            >
              {suspendMutation.isPending ? 'Suspending…' : 'Suspend driver'}
            </Button>
          </>
        }
      >
        <TextField
          label="Reason"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder="e.g. Repeated geofence violations"
        />
      </Modal>
    </div>
  );
}
