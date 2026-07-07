import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { auditLog } from '@/lib/mock/store';
import { AuditLogEntry } from '@/types/api';

export async function listAuditLog(entity?: string): Promise<AuditLogEntry[]> {
  if (MOCK_MODE) {
    await delay();
    return entity ? auditLog.filter((a) => a.entity === entity) : [...auditLog];
  }
  return apiFetch<AuditLogEntry[]>(`/admin/audit-log${entity ? `?entity=${entity}` : ''}`);
}
