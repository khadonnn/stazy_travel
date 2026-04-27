/**
 * Idempotency Key Strategy
 *
 * Layers:
 * - Kafka message: eventId (unique event identifier)
 * - Saga: sagaId (bookingId + requestId)
 * - Payment: transactionId (idempotency key from payment provider)
 * - Email: messageId (bookingId + emailType + attemptCount)
 *
 * Rule: Every consumer must check idempotency before processing
 */

// ============================================
// IDEMPOTENCY KEY GENERATORS
// ============================================

export const generateIdempotencyKey = (
  type: "saga" | "payment" | "email" | "webhook",
  ...parts: string[]
): string => {
  switch (type) {
    case "saga":
      // Format: saga:{bookingId}:{requestId}
      return `saga:${parts.join(":")}`;
    case "payment":
      // Format: payment:{bookingId}:{transactionId}
      return `payment:${parts.join(":")}`;
    case "email":
      // Format: email:{bookingId}:{emailType}:{attemptCount}
      return `email:${parts.join(":")}`;
    case "webhook":
      // Format: webhook:{provider}:{externalId}
      return `webhook:${parts.join(":")}`;
    default:
      return `unknown:${parts.join(":")}`;
  }
};

// ============================================
// IDEMPOTENCY CHECK & RECORD
// ============================================

interface IdempotencyRecord {
  key: string;
  processed: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

const idempotencyCache = new Map<string, IdempotencyRecord>();

/**
 * Check if already processed (in-memory cache)
 * In production, use Redis for distributed cache
 */
export const checkIdempotency = (key: string): IdempotencyRecord | null => {
  const record = idempotencyCache.get(key);
  if (record && Date.now() - record.timestamp < 3600000) {
    // Cache valid for 1 hour
    return record;
  }
  return null;
};

/**
 * Record idempotency result
 */
export const recordIdempotency = (
  key: string,
  processed: boolean,
  result?: any,
  error?: string,
): void => {
  idempotencyCache.set(key, {
    key,
    processed,
    result,
    error,
    timestamp: Date.now(),
  });
};

/**
 * Cleanup old records (run periodically)
 */
export const cleanupIdempotencyCache = (maxAgeMs: number = 3600000) => {
  const now = Date.now();
  for (const [key, record] of idempotencyCache) {
    if (now - record.timestamp > maxAgeMs) {
      idempotencyCache.delete(key);
    }
  }
};
