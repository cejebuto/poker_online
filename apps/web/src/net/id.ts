/**
 * Idempotency key for player:action.
 *
 * crypto.randomUUID() requires a secure context (HTTPS). Browsers treat
 * localhost as secure, so local dev works over HTTP, but a remote server
 * served over plain HTTP throws "crypto.randomUUID is not a function".
 * getRandomValues is available in insecure contexts.
 */
export function newClientActionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // UUID v4
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
