// Public display data, not an authorization or pricing input. The database independently
// owns this catalog entry and the server validates the Stripe one-time price against it.
export const DUES_PRODUCT = Object.freeze({
  id: 'lakes-dues-2027', name: '2027 Lakes League Dues', season: 2027,
  amount_cents: 18000, currency: 'usd',
});
