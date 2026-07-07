'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { Column, DataTable } from '@/components/ui/DataTable';
import { createFareConfig, listFareConfigs } from '@/features/fare-configs/api';
import { FareConfig } from '@/types/api';

const pkr = (paisa: string) => `PKR ${(Number(paisa) / 100).toLocaleString()}`;

export default function FareConfigsPage() {
  const qc = useQueryClient();
  const { data: configs, isLoading } = useQuery({ queryKey: ['fare-configs'], queryFn: listFareConfigs });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ base: '100', perKm: '50', perMin: '2', minimum: '150' });

  const mutation = useMutation({
    mutationFn: () =>
      createFareConfig({
        base_paisa: Number(form.base) * 100,
        per_km_paisa: Number(form.perKm) * 100,
        per_min_paisa: Number(form.perMin) * 100,
        minimum_paisa: Number(form.minimum) * 100,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fare-configs'] });
      setOpen(false);
    },
  });

  const current = configs?.[0];

  const columns: Column<FareConfig>[] = [
    { header: 'Version', accessor: (c) => `v${c.version}` },
    { header: 'Base', accessor: (c) => pkr(c.basePaisa) },
    { header: 'Per km', accessor: (c) => pkr(c.perKmPaisa) },
    { header: 'Per min', accessor: (c) => pkr(c.perMinPaisa) },
    { header: 'Minimum', accessor: (c) => pkr(c.minimumPaisa) },
    { header: 'Rounding', accessor: (c) => c.rounding },
    { header: 'Effective from', accessor: (c) => new Date(c.effectiveFrom).toLocaleString() },
  ];

  return (
    <div>
      <Topbar title="Fare Configuration" />

      {current && (
        <GlassPanel className="mb-6 p-5">
          <p className="text-sm opacity-60">Current active formula (v{current.version})</p>
          <p className="mt-1 text-lg font-medium">
            {pkr(current.basePaisa)} base + {pkr(current.perKmPaisa)}/km + {pkr(current.perMinPaisa)}/min,
            min {pkr(current.minimumPaisa)}
          </p>
        </GlassPanel>
      )}

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New version
        </Button>
      </div>

      <DataTable columns={columns} rows={configs ?? []} rowKey={(c) => c.id} isLoading={isLoading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a new fare config version"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Saving…' : 'Publish new version'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs opacity-60">
            Configs are never edited in place — this publishes a new version, effective immediately for
            new rides. Values in PKR.
          </p>
          <TextField label="Base fare" type="number" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
          <TextField label="Per km rate" type="number" value={form.perKm} onChange={(e) => setForm({ ...form, perKm: e.target.value })} />
          <TextField label="Per minute rate" type="number" value={form.perMin} onChange={(e) => setForm({ ...form, perMin: e.target.value })} />
          <TextField label="Minimum fare" type="number" value={form.minimum} onChange={(e) => setForm({ ...form, minimum: e.target.value })} />
          {mutation.isError && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to save'}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
