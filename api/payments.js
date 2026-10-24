import { fail, getServices, PaymentError, respond, rpc, verifiedUser } from '../server/payments.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return respond(res, 405, { error: 'Method not allowed.' }); }
  try {
    const { db, config } = getServices();
    const user = await verifiedUser(req, db);
    const player = req.query?.player_id;
    if (player != null && (typeof player !== 'string' || !/^[1-9]\d*$/.test(player) || !Number.isSafeInteger(Number(player)))) throw new PaymentError('Invalid player.');
    const history = await rpc(db, 'league_payment_history', { p_user: user.id, p_player: player ? Number(player) : null });
    respond(res, 200, { ...history, enabled: config.enabled, mode: config.mode });
  } catch (error) { fail(res, error); }
}
