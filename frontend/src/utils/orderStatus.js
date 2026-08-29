/** Customer-facing order progress — aligned with backend OrderStatus enum. */

export const CUSTOMER_ORDER_STEPS = [
  { key: 'payment_pending', label: 'Payment', icon: '⏳' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'restaurant_accepted', label: 'Accepted', icon: '🏪' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

export const CUSTOMER_STATUS_ICONS = {
  created: '📝',
  payment_pending: '⏳',
  confirmed: '✅',
  restaurant_accepted: '🏪',
  preparing: '👨‍🍳',
  ready_for_pickup: '📦',
  out_for_delivery: '🚚',
  delivered: '✅',
  cancelled: '❌',
};

export function normalizeOrderStatus(status) {
  return String(status || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

export function getCustomerStatusIcon(status) {
  return CUSTOMER_STATUS_ICONS[normalizeOrderStatus(status)] || '📦';
}

export function getCustomerStepIndex(status) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'cancelled') return -1;
  if (normalized === 'ready_for_pickup') {
    return CUSTOMER_ORDER_STEPS.findIndex((s) => s.key === 'preparing');
  }
  return CUSTOMER_ORDER_STEPS.findIndex((s) => s.key === normalized);
}

export function formatStatusLabel(status) {
  const normalized = normalizeOrderStatus(status);
  const step = CUSTOMER_ORDER_STEPS.find((s) => s.key === normalized);
  if (step) return step.label;
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
