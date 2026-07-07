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
import { listVehicles, onboardVehicle } from '@/features/vehicles/api';
import { Vehicle, VehicleStatus } from '@/types/api';

const STATUS_TONE: Record<VehicleStatus, 'success' | 'warn' | 'neutral'> = {
  active: 'success',
  maintenance: 'warn',
  retired: 'neutral',
};

export default function VehiclesPage() {
  const qc = useQueryClient();
  const { data: vehicles, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: listVehicles });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ plate_no: '', model: '', tracker_device_id: '' });

  const mutation = useMutation({
    mutationFn: () => onboardVehicle(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setOpen(false);
      setForm({ plate_no: '', model: '', tracker_device_id: '' });
    },
  });

  const columns: Column<Vehicle>[] = [
    { header: 'Plate', accessor: (v) => <span className="font-medium">{v.plateNo}</span> },
    { header: 'Model', accessor: (v) => v.model },
    { header: 'Tracker device', accessor: (v) => <code className="text-xs">{v.trackerDeviceId}</code> },
    { header: 'Status', accessor: (v) => <Badge tone={STATUS_TONE[v.status]}>{v.status}</Badge> },
    { header: 'Onboarded', accessor: (v) => new Date(v.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <Topbar title="Vehicles" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Onboard vehicle
        </Button>
      </div>

      <DataTable columns={columns} rows={vehicles ?? []} rowKey={(v) => v.id} isLoading={isLoading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Onboard a vehicle"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.plate_no || !form.model || !form.tracker_device_id || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Saving…' : 'Onboard'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField
            label="Plate number"
            value={form.plate_no}
            onChange={(e) => setForm({ ...form, plate_no: e.target.value })}
            placeholder="KHI-1042"
          />
          <TextField
            label="Model"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="BYD e2"
          />
          <TextField
            label="Tracker device ID"
            value={form.tracker_device_id}
            onChange={(e) => setForm({ ...form, tracker_device_id: e.target.value })}
            placeholder="TRK-1042"
          />
          {mutation.isError && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to onboard vehicle'}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
