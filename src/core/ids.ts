/** Random identifiers for records. Uses crypto.getRandomValues, which works on file:// pages too. */
export function newId(): string {
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  return 'r' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

/** IDs from imported files must be short and plain so they are always safe to use anywhere. */
export const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
