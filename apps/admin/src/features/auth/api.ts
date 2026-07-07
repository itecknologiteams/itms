import { apiFetch } from '@/lib/api-client';
import { MOCK_MODE } from '@/lib/config';
import { delay } from '@/lib/mock/delay';
import { setTokens, clearTokens } from '@/lib/tokens';

export async function login(email: string, password: string): Promise<{ challenge: string }> {
  if (MOCK_MODE) {
    await delay();
    if (!email || password.length < 6) throw new Error('Invalid credentials');
    return { challenge: 'mock-challenge-token' };
  }
  const res = await apiFetch<{ totp_required: true; challenge: string }>('/auth/admin/login', {
    method: 'POST',
    body: { email, password },
    unauthenticated: true,
  });
  return { challenge: res.challenge };
}

export async function verifyTotp(challengeId: string, code: string): Promise<void> {
  if (MOCK_MODE) {
    await delay();
    if (code !== '000000' && code.length !== 6) throw new Error('Invalid code');
    setTokens('mock-access-token', 'mock-refresh-token');
    return;
  }
  const res = await apiFetch<{ access: string; refresh: string }>('/auth/admin/totp', {
    method: 'POST',
    body: { challenge_id: challengeId, code },
    unauthenticated: true,
  });
  setTokens(res.access, res.refresh);
}

export function logout(): void {
  clearTokens();
}
