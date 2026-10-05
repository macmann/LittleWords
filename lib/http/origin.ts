/** Use a configured public origin when a reverse proxy rewrites the Host header.
 * Never trust arbitrary forwarded headers as a CSRF allowlist. */
export function sameOrigin(
  origin: string | null,
  host: string | null,
  appOrigin = process.env.APP_ORIGIN,
): boolean {
  if (!origin) return true;
  try {
    const requestOrigin = new URL(origin);
    if (!["http:", "https:"].includes(requestOrigin.protocol)) return false;
    if (appOrigin) return requestOrigin.origin === new URL(appOrigin).origin;
    return requestOrigin.host === host;
  } catch {
    return false;
  }
}
