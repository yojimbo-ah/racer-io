export const createIdempotencyKey = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const idempotencyHeaders = (key: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Idempotency-Key': key,
})