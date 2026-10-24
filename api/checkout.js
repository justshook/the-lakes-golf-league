import { createCheckout, fail, getServices, PaymentError, requireOrigin, respond, verifiedUser } from '../server/payments.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return respond(res, 405, { error: 'Method not allowed.' }); }
  try {
    const services = getServices();
    requireOrigin(req, services.config);
    // No browser supplied price, identity, currency, return URL or arbitrary metadata.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    if (body != null && (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)) throw new PaymentError('Checkout does not accept payment parameters.');
    const user = await verifiedUser(req, services.db);
    respond(res, 200, await createCheckout(services, user));
  } catch (error) { fail(res, error); }
}
