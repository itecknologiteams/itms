import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { broadcasts, nextId } from '@/lib/mock/store';
import { Broadcast, BroadcastAudience } from '@/types/api';

export async function listBroadcasts(): Promise<Broadcast[]> {
  if (MOCK_MODE) {
    await delay();
    return [...broadcasts];
  }
  return apiFetch<Broadcast[]>('/notifications/broadcasts');
}

export async function sendBroadcast(audience: BroadcastAudience, templateKey: string): Promise<Broadcast> {
  if (MOCK_MODE) {
    await delay();
    const b: Broadcast = {
      id: nextId('bc'),
      audience,
      templateKey,
      sentBy: 'admin-1',
      count: audience === 'all_drivers' ? 128 : 954,
      at: new Date().toISOString(),
    };
    broadcasts.unshift(b);
    return b;
  }
  return apiFetch<Broadcast>('/notifications/broadcasts', {
    method: 'POST',
    body: { audience, template_key: templateKey },
  });
}
