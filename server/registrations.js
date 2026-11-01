import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { PaymentError, verifiedUser } from './payments.js';

export class RegistrationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function registrationServices(env = process.env) {
  const origin = env.APP_ORIGIN;
  let url;
  try { url = new URL(origin); } catch { throw new RegistrationError('Registration is being configured. Please try again later.', 503); }
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password || !env.SUPABASE_SERVICE_ROLE_KEY || !(env.SUPABASE_URL || env.VITE_SUPABASE_URL)) {
    throw new RegistrationError('Registration is being configured. Please try again later.', 503);
  }
  return {
    origin,
    db: createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }),
    mail: { host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 465), user: env.SMTP_USER, password: env.SMTP_PASSWORD },
  };
}

export async function registrationRpc(db, name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) {
    if (error.code === '42501') throw new RegistrationError('This account cannot perform that registration action.', 403);
    if (error.code === '22023') throw new RegistrationError('Please check the application. It may already have a decision or need commissioner review.', 409);
    throw new RegistrationError('Registration is temporarily unavailable. Your saved application is retained; please try again.', 503);
  }
  return data;
}

export function notificationMessage(item, origin, sender) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.origin !== origin) throw new RegistrationError('Invalid email destination.', 503);
  const name = `${item.first_name} ${item.last_name}`.replace(/[\r\n]/g, ' ');
  const prefix = base.hostname === 'www.lakesleague.com' ? '' : '[Preview] ';
  let subject; let text;
  if (item.kind === 'new_application') {
    subject = 'New Lakes League application';
    text = `${name} applied to join Lakes League as a ${item.membership_type === 'full_time' ? 'full-time member' : 'substitute'}.\n\nReview their application and approve or decline it in the commissioner dashboard:\n${origin}/admin\n\nApprovals are made only after signing in. This email does not approve membership.`;
  } else if (item.kind === 'application_approved') {
    subject = 'You’re in — Lakes League application approved';
    text = item.membership_type === 'full_time'
      ? `Hi ${item.first_name},\n\nYour Lakes League application is approved. Your full-time registration fee is $180 for the 2027 season. Sign in to your account to view the registration payment page:\n${origin}/registration/payment\n\nThe page shows whether online collection is available. Approval does not itself charge your card or confirm payment.`
      : `Hi ${item.first_name},\n\nYour Lakes League substitute application is approved. Substitutes do not pay a registration fee. Sign in to see your league account:\n${origin}/\n\nWelcome to the league!`;
  } else if (item.kind === 'application_rejected') {
    subject = 'Your Lakes League application';
    text = `Hi ${item.first_name},\n\nThe commissioner has reviewed your Lakes League application and is unable to approve it at this time. No registration fee has been charged. Contact the commissioner with any questions.\n\n${origin}/register`;
  } else throw new RegistrationError('Invalid notification.', 503);
  return { from: { name: 'Lakes League', address: sender }, to: item.recipient,
    subject: prefix + subject, text, messageId: `<lakes-registration-${item.id}@${base.hostname}>`,
    disableFileAccess: true, disableUrlAccess: true };
}

export async function dispatchRegistrationNotifications(services, user, applicationId, transportFactory = nodemailer.createTransport) {
  const { db, mail, origin } = services;
  // Leave unsent messages queued if credentials have not been configured.
  if (!mail.host || !mail.user || !mail.password || ![465, 587].includes(mail.port)) return;
  const messages = await registrationRpc(db, 'league_claim_registration_notifications', { p_user: user.id, p_application: applicationId });
  if (!messages.length) return;
  const transport = transportFactory({ host: mail.host, port: mail.port, secure: mail.port === 465, requireTLS: true,
    auth: { user: mail.user, pass: mail.password }, tls: { minVersion: 'TLSv1.2' },
    logger: false, debug: false, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true });
  try {
    for (const message of messages) {
      let status;
      try {
        const result = await transport.sendMail(notificationMessage(message, origin, mail.user));
        status = result.accepted?.length ? 'sent' : 'failed';
      } catch (error) {
        // A failure after DATA may mean Gmail accepted the message. Never blindly
        // retry that uncertain delivery. The dashboard flags it for review.
        status = error.command && error.command !== 'DATA' ? 'failed' : 'unknown';
      }
      // A failed acknowledgement deliberately leaves a sending lease. On later
      // retry it becomes unknown, avoiding duplicate emails after SMTP acceptance.
      await registrationRpc(db, 'league_finish_registration_notification', { p_id: message.id, p_lease: message.lease, p_status: status });
    }
  } finally { transport.close(); }
}

export async function handleRegistrationRequest(req, services) {
  const user = await verifiedUser(req, services.db);
  if (req.method === 'GET') return registrationRpc(services.db, 'league_registration_state', { p_user: user.id });
  if (req.headers.origin !== services.origin) throw new RegistrationError('Invalid request origin.', 403);
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw new RegistrationError('Invalid registration request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 8192) throw new RegistrationError('Invalid registration request.');
  const { action, ...fields } = body;
  let result;
  if (action === 'submit') {
    const allowed = ['first_name','last_name','phone','handicap_id','handicap_index','availability','membership_type'];
    if (Object.keys(fields).some(key => !allowed.includes(key))) throw new RegistrationError('Registration cannot accept account or pricing overrides.');
    result = await registrationRpc(services.db, 'league_submit_registration', { p_user: user.id, p_data: fields });
  } else if (['decide','retry_notifications'].includes(action)) {
    const allowed = action === 'decide' ? ['application_id','decision'] : ['application_id'];
    if (Object.keys(fields).some(key => !allowed.includes(key)) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fields.application_id || '')) throw new RegistrationError('Invalid application.');
    if (action === 'decide') {
      if (!['approved','rejected'].includes(fields.decision)) throw new RegistrationError('Choose an approval decision.');
      result = await registrationRpc(services.db, 'league_decide_registration', { p_user: user.id, p_application: fields.application_id, p_decision: fields.decision });
    } else {
      const state = await registrationRpc(services.db, 'league_registration_state', { p_user: user.id });
      if (!state.is_admin) throw new RegistrationError('Commissioner access required.', 403);
      result = { application: state.applications.find(item => item.id === fields.application_id) };
      if (!result.application) throw new RegistrationError('Application not found.', 404);
    }
  } else throw new RegistrationError('Invalid registration action.');
  if (result.application?.id) {
    // Notification transport failure must not undo a valid application/decision.
    try { await dispatchRegistrationNotifications(services, user, result.application.id); } catch { /* durable outbox and dashboard retain delivery state */ }
  }
  const state = await registrationRpc(services.db, 'league_registration_state', { p_user: user.id });
  return { ...result, notifications: state.notifications };
}

export function registrationFailure(error) {
  if (error instanceof RegistrationError || error instanceof PaymentError) return { status: error.status, body: { error: error.message } };
  return { status: 503, body: { error: 'Registration is temporarily unavailable. Please try again.' } };
}
