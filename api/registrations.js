import { respond } from '../server/payments.js';
import { handleRegistrationRequest, registrationFailure, registrationServices } from '../server/registrations.js';

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return respond(res, 405, { error: 'Method not allowed.' }); }
  try { respond(res, 200, await handleRegistrationRequest(req, registrationServices())); }
  catch (error) { const failure = registrationFailure(error); respond(res, failure.status, failure.body); }
}
