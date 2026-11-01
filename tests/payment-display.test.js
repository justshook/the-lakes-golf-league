import test from 'node:test';
import assert from 'node:assert/strict';
import { stripeUrl, checkoutResult, refundLabel } from '../src/lib/payment-display.js';
test('Stripe redirects and receipts reject arbitrary origins, credentials and script URLs', () => {
  for (const url of ['javascript:alert(1)', 'https://checkout.stripe.com.evil.test/x', 'http://checkout.stripe.com/x', 'https://user@checkout.stripe.com/x']) assert.equal(stripeUrl(url, 'checkout'), null);
  assert.equal(stripeUrl('https://checkout.stripe.com/c/test', 'checkout'), 'https://checkout.stripe.com/c/test');
  assert.equal(stripeUrl('https://pay.stripe.com/receipts/x'), 'https://pay.stripe.com/receipts/x');
});
test('existing pending or settled checkout never requires a new redirect', () => {
  for (const status of ['pending','complete','paid','partially_refunded','refunded','disputed','expired','failed']) assert.deepEqual(checkoutResult({status}), {status});
  assert.throws(() => checkoutResult({status:'unknown'}));
});
test('pending and failed refunds are not labeled completed', () => {
  assert.equal(refundLabel('succeeded'), 'Refund completed');
  assert.equal(refundLabel('pending'), 'Refund pending');
  assert.equal(refundLabel('failed'), 'Refund failed');
});
