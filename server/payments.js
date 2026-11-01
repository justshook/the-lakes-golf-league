import Stripe from 'stripe';
import { DUES_PRODUCT } from '../src/lib/dues-product.js';
import { createClient } from '@supabase/supabase-js';

export class PaymentError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function paymentConfig(env = process.env) {
  const mode = env.STRIPE_MODE || 'test';
  const enabled = env.LEAGUE_PAYMENTS_ENABLED === 'true';
  if (!['test', 'live'].includes(mode)) throw new PaymentError('Invalid payment configuration.', 503);
  if (mode === 'live' && env.STRIPE_LIVE_APPROVED !== 'true') throw new PaymentError('Live payments are not approved.', 503);
  const result = { enabled, mode, livemode: mode === 'live', account: env.STRIPE_ACCOUNT_ID, origin: env.APP_ORIGIN,
    key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET };
  result.configured = Boolean(result.key && result.account && result.webhookSecret && result.origin);
  if (enabled || result.configured) {
    if (!new RegExp(`^[sr]k_${mode}_`).test(result.key || '') || !/^acct_/.test(result.account || '') || !result.webhookSecret?.startsWith('whsec_')) {
      throw new PaymentError('Payments are not configured.', 503);
    }
    let url;
    try { url = new URL(result.origin); } catch { throw new PaymentError('Payment return URL is not configured.', 503); }
    if (url.protocol !== 'https:' || url.origin !== result.origin || url.username || url.password) throw new PaymentError('Invalid payment return URL.', 503);
  }
  return result;
}

export function getServices(env = process.env) {
  const config = paymentConfig(env);
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new PaymentError('Payment service is not configured.', 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const stripe = config.configured ? new Stripe(config.key, { apiVersion: '2026-08-26.dahlia', maxNetworkRetries: 2, timeout: 20000 }) : null;
  return { config, db, stripe };
}

export async function verifiedUser(req, db) {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !/^Bearer [^\s]+$/.test(auth)) throw new PaymentError('Sign in to continue.', 401);
  const { data, error } = await db.auth.getUser(auth.slice(7));
  if (error || !data?.user || !data.user.email_confirmed_at) throw new PaymentError('A verified account is required.', 401);
  return data.user;
}

export async function rpc(db, name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) {
    // Do not expose SQL, JWTs, provider payloads or internal identifiers in API errors.
    if (error.code === '42501') throw new PaymentError('This account cannot access these payments.', 403);
    const known = ['No payable balance', 'minimum 50 cents', 'Please wait', 'rate limit', 'requires reconciliation', 'require season reconciliation'];
    if (known.some(value => error.message?.includes(value))) throw new PaymentError(error.message, 409);
    throw new PaymentError('Payment reconciliation is temporarily unavailable. Please retry.', 503);
  }
  return data;
}

export async function assertAccount(stripe, config) {
  const account = await stripe.accounts.retrieve();
  if (account.id !== config.account) throw new PaymentError('Payment account configuration mismatch.', 503);
}

export function requireOrigin(req, config) {
  if (req.headers.origin !== config.origin) throw new PaymentError('Invalid request origin.', 403);
}

export function safeReceipt(value) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'pay.stripe.com' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function sessionSnapshot(session, order, config) {
  const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
  if (session.mode !== 'payment' || session.metadata?.application !== 'lakes-league' || session.metadata?.order_id !== order.id ||
      session.client_reference_id !== order.id || session.amount_total !== Number(order.amount_cents) || session.currency !== order.currency ||
      session.livemode !== config.livemode || order.livemode !== config.livemode || order.account_id !== config.account ||
      (order.session_id && session.id !== order.session_id)) throw new PaymentError('Payment context mismatch.', 400);
  if (order.product_id && (session.metadata.product_id !== order.product_id || session.metadata.season !== String(order.season))) throw new PaymentError('Annual product context mismatch.', 400);
  let state = session.status === 'expired' ? 'expired' : session.status === 'complete' ? 'pending' : 'open';
  const charge = intent && typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  if (session.payment_status === 'paid') {
    if (!intent || intent.status !== 'succeeded' || intent.amount_received !== Number(order.amount_cents) || intent.currency !== order.currency ||
        intent.livemode !== config.livemode || intent.metadata?.order_id !== order.id || intent.metadata?.application !== 'lakes-league' ||
        !charge || !charge.paid || charge.amount !== Number(order.amount_cents) || charge.currency !== order.currency || charge.livemode !== config.livemode) {
      throw new PaymentError('Settlement does not match the order.', 400);
    }
    if (order.product_id && (intent.metadata.product_id !== order.product_id || intent.metadata.season !== String(order.season))) throw new PaymentError('Annual intent context mismatch.', 400);
    state = charge.disputed ? 'disputed' : 'paid';
  } else if (intent?.status === 'canceled') state = 'failed';
  return { order_id: order.id, account_id: config.account, livemode: config.livemode, session_id: session.id,
    amount_cents: session.amount_total, currency: session.currency,
    payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : intent?.id || null,
    status: state, receipt_url: safeReceipt(charge?.receipt_url) };
}

// Create the explicit catalog lazily in the configured account/mode. This performs
// no charge and never creates a subscription. Stable IDs/lookup keys + idempotency
// make retries and concurrent first purchases converge on one product and price.
export async function ensureDuesPrice(stripe, config, order) {
  const key = `${order.product_id}-${order.currency}-${order.amount_cents}`;
  let product;
  try { product = await stripe.products.retrieve(order.product_id); }
  catch (error) {
    if (error.statusCode !== 404 || error.code !== 'resource_missing') throw error;
    product = await stripe.products.create({ id: order.product_id, name: order.product_name,
      metadata: { application: 'lakes-league', season: String(order.season), kind: 'annual_dues' } },
      { idempotencyKey: `catalog-product-${order.product_id}` });
  }
  if (product.deleted || !product.active || product.livemode !== config.livemode || product.id !== order.product_id ||
      product.metadata?.application !== 'lakes-league' || product.metadata?.season !== String(order.season) || product.metadata?.kind !== 'annual_dues') {
    throw new PaymentError('Annual Stripe product does not match the league catalog.', 503);
  }
  const prices = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 2 });
  if (prices.data.length > 1) throw new PaymentError('Ambiguous annual Stripe price.', 503);
  const price = prices.data[0] || await stripe.prices.create({ product: product.id, unit_amount: Number(order.amount_cents), currency: order.currency,
    lookup_key: key, metadata: { application: 'lakes-league', season: String(order.season) } }, { idempotencyKey: `catalog-price-${key}` });
  if (!price.active || price.livemode !== config.livemode || price.type !== 'one_time' || price.recurring || price.unit_amount !== Number(order.amount_cents) ||
      price.currency !== order.currency || price.product !== product.id || price.metadata?.season !== String(order.season) || price.metadata?.application !== 'lakes-league') {
    throw new PaymentError('Annual Stripe price does not match the league catalog.', 503);
  }
  return price;
}

export async function createCheckout({ db, stripe, config }, user) {
  if (!config.enabled) throw new PaymentError('Online payments are not enabled yet.', 503);
  await assertAccount(stripe, config);
  const order = await rpc(db, 'league_prepare_annual_checkout', { p_user: user.id, p_account: config.account, p_live: config.livemode, p_product: DUES_PRODUCT.id });
  if (order.product_id !== DUES_PRODUCT.id || order.season !== DUES_PRODUCT.season || Number(order.amount_cents) !== DUES_PRODUCT.amount_cents || order.currency !== DUES_PRODUCT.currency) throw new PaymentError('Annual dues catalog mismatch.', 503);
  if (!['creating', 'open', 'pending'].includes(order.status)) return { order_id: order.id, status: order.status, mode: config.mode };
  if (order.status === 'pending') return { order_id: order.id, status: 'pending', mode: config.mode };
  let session;
  if (order.session_id) {
    session = await stripe.checkout.sessions.retrieve(order.session_id, { expand: ['payment_intent.latest_charge'] });
    sessionSnapshot(session, order, config);
    if (session.status !== 'open') return { order_id: order.id, status: session.payment_status === 'paid' ? 'pending' : session.status, mode: config.mode };
  } else {
    const price = await ensureDuesPrice(stripe, config, order);
    const purchaseMetadata = { application: 'lakes-league', order_id: order.id, product_id: order.product_id, season: String(order.season) };
    session = await stripe.checkout.sessions.create({
      mode: 'payment', client_reference_id: order.id,
      integration_identifier: 'lakes_league_qmsvkyha',
      metadata: purchaseMetadata,
      payment_intent_data: { metadata: purchaseMetadata },
      line_items: [{ quantity: 1, price: price.id }],
      success_url: `${config.origin}/money?checkout=returned`,
      cancel_url: `${config.origin}/money?checkout=cancelled`,
      // Let Stripe start its default 24h lifetime when creation actually succeeds.
      // A database deadline can fall below Stripe's 30m minimum after an outage;
      // recomputing it on retry would also change this idempotent request's params.
    }, { idempotencyKey: `lakes-checkout-${order.id}` });
    sessionSnapshot(session, order, config);
    await rpc(db, 'league_attach_checkout', { p_order: order.id, p_session: session.id });
  }
  if (!session.url || new URL(session.url).hostname !== 'checkout.stripe.com' || new URL(session.url).protocol !== 'https:') throw new PaymentError('Checkout is unavailable.', 503);
  return { url: session.url, order_id: order.id, status: 'open', mode: config.mode };
}

const SESSION_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired']);
const CHARGE_EVENTS = new Set(['charge.refunded', 'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']);
const REFUND_EVENTS = new Set(['refund.created', 'refund.updated', 'refund.failed']);
export const HANDLED_EVENTS = [...SESSION_EVENTS, ...CHARGE_EVENTS, ...REFUND_EVENTS];

export async function processEvent(event, { db, stripe, config }) {
  if (event.livemode !== config.livemode || (event.account && event.account !== config.account) || event.context) throw new PaymentError('Unexpected Stripe account or mode.', 400);
  if (!HANDLED_EVENTS.includes(event.type)) return { ignored: true };
  await assertAccount(stripe, config);
  const object = event.data.object;
  let order;
  let sessionId;
  if (SESSION_EVENTS.has(event.type)) {
    if (object.metadata?.application !== 'lakes-league') return { ignored: true };
    order = await rpc(db, 'league_find_payment_order', { p_order: object.metadata.order_id });
    sessionId = object.id;
  } else {
    let intentId = typeof object.payment_intent === 'object' ? object.payment_intent.id : object.payment_intent;
    if (!intentId && object.charge) {
      const charge = await stripe.charges.retrieve(typeof object.charge === 'string' ? object.charge : object.charge.id);
      intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    }
    if (!intentId) return { ignored: true };
    const intent = await stripe.paymentIntents.retrieve(intentId);
    if (intent.metadata?.application !== 'lakes-league') return { ignored: true };
    order = await rpc(db, 'league_find_payment_order', { p_order: intent.metadata.order_id, p_intent: intentId });
    sessionId = order?.session_id;
  }
  if (!order || !sessionId) throw new PaymentError('Order is not ready; retry delivery.', 503);
  // Refetch authoritative state: old/reordered events cannot roll a paid order back.
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent.latest_charge'] });
  const snapshot = sessionSnapshot(session, order, config);
  if (event.type === 'checkout.session.async_payment_failed' && snapshot.status === 'pending') snapshot.status = 'failed';
  const refunds = [];
  if (snapshot.status === 'disputed') {
    const charge = session.payment_intent.latest_charge;
    const disputes = await stripe.disputes.list({ charge: charge.id, limit: 100 });
    const dispute = disputes.data.sort((a, b) => b.created - a.created)[0];
    if (!dispute) throw new PaymentError('Dispute reconciliation is unavailable.', 503);
    snapshot.dispute_status = dispute.status;
    // A historical dispute flag remains true even after a win. Use current status.
    if (['won', 'warning_closed'].includes(dispute.status)) snapshot.status = 'paid';
  }
  if (['paid', 'disputed'].includes(snapshot.status)) {
    for await (const refund of stripe.refunds.list({ payment_intent: snapshot.payment_intent_id, limit: 100 })) {
      if (refund.currency !== order.currency || refund.payment_intent !== snapshot.payment_intent_id) throw new PaymentError('Refund context mismatch.', 400);
      refunds.push({ id: refund.id, amount_cents: refund.amount, status: refund.status });
      if (refunds.length > 1000) throw new PaymentError('Refund reconciliation requires review.', 503);
    }
  }
  return rpc(db, 'league_apply_stripe_event', { p_data: { ...snapshot, refunds, event_id: event.id, event_type: event.type, object_id: object.id } });
}

export async function readRawBody(req, limit = 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += buffer.length;
    if (size > limit) throw new PaymentError('Request too large.', 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function respond(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).json(data);
}
export function fail(res, error) {
  respond(res, error instanceof PaymentError ? error.status : 503, { error: error instanceof PaymentError ? error.message : 'Payment service temporarily unavailable. Please retry.' });
}
