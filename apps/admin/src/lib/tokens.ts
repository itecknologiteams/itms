/**
 * Token storage for the admin SPA.
 *
 * Tradeoff, documented rather than hidden: tokens live in localStorage so the
 * browser-side API client can attach `Authorization: Bearer` directly to the
 * rewritten /api/v1/* calls (docs/api-design.md §1) without a server-side BFF
 * proxy layer. This is the standard pattern for an internal admin SPA, but it
 * is more XSS-exposed than an httpOnly-cookie + BFF design. A hardening pass
 * (Phase 3, docs/security.md) should move the refresh token behind Next.js
 * Route Handlers with an httpOnly cookie if this panel is ever exposed
 * beyond a trusted internal network.
 */
const ACCESS_KEY = 'itms_admin_access';
const REFRESH_KEY = 'itms_admin_refresh';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
