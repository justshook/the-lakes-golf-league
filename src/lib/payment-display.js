export function stripeUrl(value, kind = 'receipt') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.hostname === (kind === 'checkout' ? 'checkout.stripe.com' : 'pay.stripe.com') ? url.href : null;
  } catch { return null; }
}
export function checkoutResult(result) {
  if (['pending', 'complete', 'paid', 'partially_refunded', 'refunded', 'disputed', 'expired', 'failed'].includes(result.status) && !result.url) return { status: result.status };
  const url = stripeUrl(result.url, 'checkout');
  if (!url) throw new Error('Checkout is unavailable.');
  return { url };
}
export function refundLabel(status) {
  return ({ succeeded: 'Refund completed', pending: 'Refund pending', requires_action: 'Refund needs action', failed: 'Refund failed', canceled: 'Refund canceled' })[status] || 'Refund status unavailable';
}

export function checkoutNotice(status) {
  return ({
    pending: 'Payment is processing. Do not pay again while confirmation is pending.',
    complete: 'Checkout is complete; payment confirmation is still pending. Refresh to check its status.',
    paid: 'This payment is already confirmed.',
    partially_refunded: 'This payment was partially refunded. Contact the commissioner before paying again.',
    refunded: 'This payment was refunded. Contact the commissioner before paying again.',
    disputed: 'This payment is disputed and needs commissioner review.',
    expired: 'Checkout expired. Refresh payment status before trying again.',
    failed: 'Payment failed. Refresh payment status before trying again.',
  })[status] || 'Refresh to check payment status.';
}
