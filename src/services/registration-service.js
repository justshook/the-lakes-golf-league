import { teeTimes } from '../constants.js';

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected'];
export const membershipLabel = value => value === 'substitute' ? 'Substitute · Free' : 'Full-time · $180';

function requiredText(value, label, maximum) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maximum || /[\u0000-\u001f\u007f]/.test(text)) throw new Error(`Enter ${label.toLowerCase()} (${maximum} characters or fewer).`);
  return text;
}

// This is form feedback only. The server verifies every field, account and fee.
// Explicit fields prevent browser claims about email, player IDs or pricing.
export function validateRegistration(fields = {}) {
  const first_name = requiredText(fields.first_name, 'Your first name', 80);
  const last_name = requiredText(fields.last_name, 'Your last name', 80);
  const phone = requiredText(fields.phone, 'Your phone number', 40);
  if (!/^\+?[\d\s().-]+$/.test(phone) || !/^\d{7,15}$/.test(phone.replace(/\D/g, ''))) throw new Error('Enter a phone number with 7 to 15 digits.');
  const handicap_id = requiredText(fields.handicap_id, 'Your handicap ID', 40);
  if (!['string', 'number'].includes(typeof fields.handicap_index) || String(fields.handicap_index).trim() === '') throw new Error('Enter your handicap index between -10 and 54.');
  const handicap_index = Number(fields.handicap_index);
  if (!Number.isFinite(handicap_index) || handicap_index < -10 || handicap_index > 54) throw new Error('Enter your handicap index between -10 and 54.');
  if (!['full_time', 'substitute'].includes(fields.membership_type)) throw new Error('Choose full-time or substitute membership.');
  if (!Array.isArray(fields.availability) || !fields.availability.length || fields.availability.some(time => !teeTimes.includes(time))) throw new Error('Choose at least one available league tee time.');
  const availability = teeTimes.filter(time => fields.availability.includes(time));
  return { first_name, last_name, phone, handicap_id, handicap_index, availability, membership_type: fields.membership_type };
}

function requestError(status) {
  if (status === 401) return 'Sign in again with your verified email to continue.';
  if (status === 403) return 'This account cannot access that registration action.';
  if (status === 409) return 'Your registration has changed. Refresh its status before continuing.';
  if (status === 400 || status === 422) return 'Check your registration details and try again.';
  return 'Registration is temporarily unavailable. Please try again.';
}

export async function registrationRequest(client, { method = 'GET', body, signal, fetchImpl = globalThis.fetch } = {}) {
  if (!client?.auth?.getSession || !fetchImpl) throw new Error('Registration is temporarily unavailable. Please try again.');
  if (!['GET', 'POST'].includes(method)) throw new Error('Unsupported registration request.');
  const { data, error } = await client.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Sign in again with your verified email to continue.');
  let response;
  try {
    response = await fetchImpl('/api/registrations', {
      method, credentials: 'same-origin', signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new Error('Registration is temporarily unavailable. Please try again.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(requestError(response.status));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Registration is temporarily unavailable. Please refresh.');
  return result;
}

export const loadRegistration = (client, options) => registrationRequest(client, options);
export const submitRegistration = (client, fields, options = {}) => registrationRequest(client, { ...options, method: 'POST', body: { action: 'submit', ...validateRegistration(fields) } });
export function decideRegistration(client, applicationId, decision, options = {}) {
  if (typeof applicationId !== 'string' || !applicationId || !['approved', 'rejected'].includes(decision)) throw new Error('Choose a registration and an approval decision.');
  return registrationRequest(client, { ...options, method: 'POST', body: { action: 'decide', application_id: applicationId, decision } });
}

export function retryRegistrationNotifications(client, applicationId, options = {}) {
  if (typeof applicationId !== 'string' || !applicationId) throw new Error('Choose a registration to retry its email updates.');
  return registrationRequest(client, { ...options, method: 'POST', body: { action: 'retry_notifications', application_id: applicationId } });
}

export function registrationNotificationSummary(notifications) {
  if (!notifications || typeof notifications !== 'object') return '';
  const parts = ['sent', 'queued', 'failed', 'unknown'].flatMap(status => {
    const count = notifications[status];
    return Number.isSafeInteger(count) && count > 0 ? [`${count} ${status === 'unknown' ? 'delivery unconfirmed' : status}`] : [];
  });
  return parts.length ? `Email updates: ${parts.join(' · ')}.${notifications.failed > 0 ? ' Follow up on failed emails.' : ''}${notifications.unknown > 0 ? ' Review unconfirmed delivery before resending.' : ''}` : '';
}
