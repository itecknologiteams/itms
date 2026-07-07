'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/Field';
import { Column, DataTable } from '@/components/ui/DataTable';
import { createZone, listZones, updateZoneStatus } from '@/features/zones/api';
import { Zone } from '@/types/api';

// Leaflet touches `window` at import time — must load client-only.
const ZoneMap = dynamic(() => import('@/components/map/ZoneMap').then((m) => m.ZoneMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-card bg-black/5 dark:bg-white/5" />,
});

export default function ZonesPage() {
  const qc = useQueryClient();
  const { data: zones, isLoading } = useQuery({ queryKey: ['zones'], queryFn: listZones });

  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ lat: number; lon: number }[]>([]);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createZone({
        name,
        boundary: {
          type: 'Polygon',
          coordinates: [[...drawPoints.map((p) => [p.lon, p.lat]), [drawPoints[0].lon, drawPoints[0].lat]]],
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      setDrawing(false);
      setDrawPoints([]);
      setNameModalOpen(false);
      setName('');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (zone: Zone) => updateZoneStatus(zone.id, zone.status === 'active' ? 'inactive' : 'active'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  });

  const columns: Column<Zone>[] = [
    { header: 'Name', accessor: (z) => <span className="font-medium">{z.name}</span> },
    {
      header: 'Status',
      accessor: (z) => <Badge tone={z.status === 'active' ? 'success' : 'neutral'}>{z.status}</Badge>,
    },
    { header: 'Version', accessor: (z) => `v${z.version}` },
    { header: 'Updated', accessor: (z) => new Date(z.updatedAt).toLocaleDateString() },
    {
      header: '',
      accessor: (z) => (
        <Button variant="ghost" onClick={() => toggleStatusMutation.mutate(z)} className="text-xs">
          {z.status === 'active' ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Topbar title="Geo-Fencing Zones" />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm opacity-60">
          {drawing
            ? `Click the map to add vertices (${drawPoints.length} added). Need at least 3.`
            : 'Draw a zone boundary directly on the map.'}
        </p>
        {!drawing ? (
          <Button onClick={() => setDrawing(true)}>
            <Plus size={16} /> Draw new zone
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDrawing(false);
                setDrawPoints([]);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={drawPoints.length < 3}
              onClick={() => setNameModalOpen(true)}
            >
              <Pencil size={16} /> Finish & name zone
            </Button>
          </div>
        )}
      </div>

      <GlassPanel className="mb-6 h-[420px] p-2">
        <ZoneMap
          zones={zones ?? []}
          drawing={drawing}
          drawPoints={drawPoints}
          onDrawPoint={(lat, lon) => setDrawPoints((pts) => [...pts, { lat, lon }])}
        />
      </GlassPanel>

      <DataTable columns={columns} rows={zones ?? []} rowKey={(z) => z.id} isLoading={isLoading} />

      <Modal
        open={nameModalOpen}
        onClose={() => setNameModalOpen(false)}
        title="Name this zone"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNameModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Creating…' : 'Create zone'}
            </Button>
          </>
        }
      >
        <TextField label="Zone name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {createMutation.isError && (
          <p className="mt-2 text-sm text-danger">
            {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create zone'}
          </p>
        )}
      </Modal>
    </div>
  );
}
