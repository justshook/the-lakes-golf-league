import { normalizeLedgerEntry } from '../lib/ledger.js';

export function ledgerEntryFromRow(row) {
  return { provenance: row.provenance ?? 'manual_external', ...normalizeLedgerEntry({
    id: row.id, idempotencyKey: row.idempotency_key, playerId: row.player_id,
    type: row.type, status: row.status, amountCents: Number(row.amount_cents), currency: row.currency,
    reference: row.reference, relatedEntryId: row.related_entry_id,
    occurredAt: row.occurred_at, description: row.description,
  }) };
}

export async function loadLedger(client) {
  if (!client) throw new Error('League connection is unavailable.');
  const { data, error } = await client.from('league_ledger_entries').select('*').order('occurred_at', { ascending: false });
  if (error) throw new Error('Payment tracking is not ready. Ask the commissioner to complete league setup.');
  return (data ?? []).map(ledgerEntryFromRow);
}

export async function recordLedgerEntry(client, entry) {
  if (!client) throw new Error('League connection is unavailable.');
  const normalized = normalizeLedgerEntry(entry);
  const { data, error } = await client.rpc('record_league_ledger_entry', { p_entry: normalized });
  if (error) throw new Error(error.message || 'The entry could not be saved.');
  return ledgerEntryFromRow(data);
}
