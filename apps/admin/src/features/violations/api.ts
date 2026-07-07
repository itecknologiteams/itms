import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { violations } from '@/lib/mock/store';
import { Violation, ViolationStatus } from '@/types/api';

export async function listViolations(status?: ViolationStatus): Promise<Violation[]> {
  if (MOCK_MODE) {
    await delay();
    return status ? violations.filter((v) => v.status === status) : [...violations];
  }
  return apiFetch<Violation[]>(`/violations${status ? `?status=${status}` : ''}`);
}

export async function acknowledgeViolation(id: string): Promise<Violation> {
  if (MOCK_MODE) {
    await delay();
    const v = violations.find((x) => x.id === id);
    if (!v) throw new Error('Violation not found');
    v.status = 'acknowledged';
    return v;
  }
  return apiFetch<Violation>(`/violations/${id}/ack`, { method: 'POST' });
}

export async function resolveViolation(id: string, note: string): Promise<Violation> {
  if (MOCK_MODE) {
    await delay();
    const v = violations.find((x) => x.id === id);
    if (!v) throw new Error('Violation not found');
    v.status = 'resolved';
    v.resolutionNote = note;
    v.closedAt = new Date().toISOString();
    return v;
  }
  return apiFetch<Violation>(`/violations/${id}/resolve`, { method: 'POST', body: { note } });
}

export async function escalateViolation(id: string): Promise<Violation> {
  if (MOCK_MODE) {
    await delay();
    const v = violations.find((x) => x.id === id);
    if (!v) throw new Error('Violation not found');
    v.status = 'escalated';
    return v;
  }
  return apiFetch<Violation>(`/violations/${id}/escalate`, { method: 'POST' });
}
