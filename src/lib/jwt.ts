/** Reads a JWT's payload without verifying it. Accepts tokens with or without a `Bearer ` prefix. */
export function decodeJwt<T>(token: string): T {
  const payload = token.replace(/^Bearer\s+/i, '').split('.')[1];
  if (!payload) throw new Error('Malformed token');
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  // atob yields one char per byte; percent-encode the bytes so multi-byte UTF-8 decodes correctly.
  const json = decodeURIComponent(
    Array.from(atob(base64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
  return JSON.parse(json) as T;
}
