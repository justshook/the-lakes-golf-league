export const CHECKOUT_RECONCILIATION_CODE = 'checkout_reconciliation_required';
export const CHECKOUT_RECONCILIATION_MESSAGE = 'Checkout needs commissioner review before you can continue. Contact the commissioner.';

// API/provider error text can contain private payment or infrastructure details.
// Only bounded codes select user-facing messages; never display arbitrary text.
export function paymentRequestErrorMessage(result) {
  return result?.code === CHECKOUT_RECONCILIATION_CODE
    ? CHECKOUT_RECONCILIATION_MESSAGE
    : 'Payments are temporarily unavailable. Please try again.';
}
