'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { login, verifyTotp } from '@/features/auth/api';
import { MOCK_MODE } from '@/lib/config';

/**
 * Two-step admin login: credentials -> TOTP challenge (docs/specs.md A-01;
 * docs/security.md §1). Mirrors the backend's admin/login + admin/totp flow.
 */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { challenge } = await login(email, password);
      setChallenge(challenge);
      setStep('totp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyTotp(challenge, code);
      router.replace('/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <GlassPanel tier="modal" className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-primary/15 p-3 text-primary">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-xl font-semibold">ITMS Admin</h1>
          <p className="text-sm opacity-60">
            {step === 'credentials' ? 'Sign in to continue' : 'Enter your 2FA code'}
          </p>
          {MOCK_MODE && (
            <p className="rounded-btn bg-warn/15 px-3 py-1.5 text-xs text-warn">
              Demo mode — any email + 6-char password works; TOTP code 000000
            </p>
          )}
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Checking…' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTotp} className="space-y-4">
            <TextField
              label="6-digit code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Verifying…' : 'Sign in'}
            </Button>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}
