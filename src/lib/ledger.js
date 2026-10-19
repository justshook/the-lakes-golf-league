/**
 * Pure accounting for a single player's league ledger. This does not move money.
 * Amounts are integer cents. Posted cash events need a receipt/processor reference.
 * A refund reverses a payment, not the charge itself: cancelling a fee requires a
 * separate, reviewed charge correction. Prize awards never pay a player's fees.
 */
const TYPES = new Set(['charge', 'payment', 'award', 'payout', 'refund']);
const STATUSES = new Set(['pending', 'posted', 'failed', 'void']);
const CASH_TYPES = new Set(['payment', 'payout', 'refund']);

function identifier(value, field) {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'number' && !Number.isSafeInteger(value)) ||
      String(value).trim().length === 0) {
    throw new TypeError(`${field} must be a nonempty identifier`);
  }
  return String(value).trim();
}

export function normalizeLedgerEntry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid ledger entry');
  const id = identifier(input.id, 'id');
  const idempotencyKey = identifier(input.idempotencyKey, 'idempotencyKey');
  const playerId = identifier(input.playerId, 'playerId');
  if (!TYPES.has(input.type)) throw new TypeError(`Unsupported ledger type: ${input.type}`);
  if (!STATUSES.has(input.status)) throw new TypeError(`Unsupported ledger status: ${input.status}`);
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new TypeError('amountCents must be a positive safe integer');
  }
  if (input.currency !== 'USD') throw new TypeError('Only USD ledger entries are supported');
  const reference = input.reference == null ? null : identifier(input.reference, 'reference');
  const relatedEntryId = input.relatedEntryId == null ? null : identifier(input.relatedEntryId, 'relatedEntryId');
  if (CASH_TYPES.has(input.type) && input.status === 'posted' && !reference) {
    throw new TypeError('Posted money movements require a receipt or processor reference');
  }
  if (input.type === 'refund' && !relatedEntryId) throw new TypeError('Refund must reference its original payment');
  if (input.type !== 'refund' && relatedEntryId) throw new TypeError('Only refunds may reference an original payment');
  if (input.occurredAt != null && (typeof input.occurredAt !== 'string' || !Number.isFinite(Date.parse(input.occurredAt)))) {
    throw new TypeError('occurredAt must be a valid date string');
  }
  return {
    id, idempotencyKey, playerId, type: input.type, status: input.status,
    amountCents: input.amountCents, currency: 'USD', reference, relatedEntryId,
    occurredAt: input.occurredAt ?? null,
    description: typeof input.description === 'string' ? input.description : '',
  };
}

function sumCents(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
  if (!Number.isSafeInteger(total)) throw new RangeError('Ledger total exceeds safe precision');
  return total;
}

/** Retries with the same id/key are ignored; conflicting payloads fail closed. */
export function reconcileLedger(inputs = [], { playerId, currency = 'USD' } = {}) {
  if (!Array.isArray(inputs)) throw new TypeError('Ledger must be an array');
  const scope = identifier(playerId, 'playerId');
  if (currency !== 'USD') throw new TypeError('Only USD ledger entries are supported');
  const byId = new Map();
  const byKey = new Map();
  const byReceipt = new Map();
  const entries = [];
  for (const input of inputs) {
    const entry = normalizeLedgerEntry(input);
    if (entry.playerId !== scope) throw new TypeError('Ledger contains another player’s entry');
    const fingerprint = JSON.stringify(entry);
    const existing = byId.get(entry.id) ?? byKey.get(entry.idempotencyKey);
    if (existing) {
      if (existing !== fingerprint) throw new Error('Conflicting ledger id or idempotency key');
      continue;
    }
    // The same confirmed transfer cannot be imported again under a new key.
    if (CASH_TYPES.has(entry.type) && entry.status === 'posted') {
      const receiptKey = `${entry.type}:${entry.reference}`;
      if (byReceipt.has(receiptKey)) throw new Error('Duplicate money movement reference');
      byReceipt.set(receiptKey, entry.id);
    }
    byId.set(entry.id, fingerprint);
    byKey.set(entry.idempotencyKey, fingerprint);
    entries.push(entry);
  }

  const entryMap = new Map(entries.map(entry => [entry.id, entry]));
  const activeRefunds = new Map();
  for (const entry of entries.filter(item => item.type === 'refund')) {
    const payment = entryMap.get(entry.relatedEntryId);
    if (!payment || payment.type !== 'payment' || payment.status !== 'posted') {
      throw new Error('Refund must reference a posted payment in this player’s ledger');
    }
    if (entry.status === 'posted' || entry.status === 'pending') {
      const total = (activeRefunds.get(payment.id) ?? 0) + entry.amountCents;
      if (!Number.isSafeInteger(total) || total > payment.amountCents) throw new Error('Refund exceeds original payment');
      activeRefunds.set(payment.id, total);
    }
  }

  const posted = entries.filter(entry => entry.status === 'posted');
  const total = type => sumCents(posted.filter(entry => entry.type === type));
  const chargesCents = total('charge');
  const paymentsCents = total('payment');
  const refundsCents = total('refund');
  const earnedCents = total('award');
  const paidOutCents = total('payout');
  const pendingPayoutCents = sumCents(entries.filter(entry => entry.type === 'payout' && entry.status === 'pending'));
  if (!Number.isSafeInteger(paidOutCents + pendingPayoutCents) || paidOutCents + pendingPayoutCents > earnedCents) {
    throw new Error('Posted and pending payouts exceed posted prize awards');
  }
  const netPaidCents = paymentsCents - refundsCents;
  return {
    entries, chargesCents, paymentsCents, refundsCents, netPaidCents,
    amountDueCents: Math.max(0, chargesCents - netPaidCents),
    creditCents: Math.max(0, netPaidCents - chargesCents),
    earnedCents, paidOutCents, pendingPayoutCents,
    awardOutstandingCents: earnedCents - paidOutCents,
    availableToScheduleCents: earnedCents - paidOutCents - pendingPayoutCents,
    netCashMovementCents: netPaidCents - paidOutCents,
  };
}

export function formatMoney(cents) {
  if (!Number.isSafeInteger(cents)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
