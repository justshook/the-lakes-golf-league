import { fail, getServices, PaymentError, processEvent, readRawBody, respond } from '../server/payments.js';
// Stripe signatures require unchanged bytes. Vercel must not parse this route's body.
export const config = { api: { bodyParser: false } };
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return respond(res, 405, { error: 'Method not allowed.' }); }
  try {
    const services = getServices();
    if (!services.config.configured) throw new PaymentError('Webhook processing is not configured.', 503);
    const raw = await readRawBody(req);
    let event;
    try { event = services.stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], services.config.webhookSecret, 300); }
    catch { throw new PaymentError('Invalid webhook signature.', 400); }
    respond(res, 200, await processEvent(event, services));
  } catch (error) { fail(res, error); }
}
