/** Semantic status colors — aligned with LLD order & delivery state machines */

export const ORDER_STATUS_COLORS = {
  created: '#66736B',
  payment_pending: '#C98200',
  confirmed: '#2878C8',
  restaurant_accepted: '#2878C8',
  preparing: '#E47B25',
  ready_for_pickup: '#0F9F4F',
  ready: '#0F9F4F',
  out_for_delivery: '#7357C8',
  'out for delivery': '#7357C8',
  delivered: '#087A3A',
  cancelled: '#D64545',
  pending: '#C98200',
};

export const DELIVERY_PARTNER_STATUS_COLORS = {
  available: '#0F9F4F',
  assigned: '#2878C8',
  picked_up: '#7357C8',
  delivering: '#E47B25',
  offline: '#66736B',
};

export const PAYMENT_STATUS_COLORS = {
  success: '#0F9F4F',
  successful: '#0F9F4F',
  processing: '#C98200',
  pending: '#C98200',
  failed: '#D64545',
  refunded: '#7357C8',
};

const normalizeStatus = (status) =>
  String(status || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');

export function getOrderStatusColor(status) {
  if (!status) return ORDER_STATUS_COLORS.created;
  const normalized = normalizeStatus(status);
  return ORDER_STATUS_COLORS[normalized] || ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.created;
}

export function getDeliveryPartnerStatusColor(status) {
  const normalized = normalizeStatus(status);
  return DELIVERY_PARTNER_STATUS_COLORS[normalized] || DELIVERY_PARTNER_STATUS_COLORS.offline;
}

export function getPaymentStatusColor(status) {
  const normalized = normalizeStatus(status);
  return PAYMENT_STATUS_COLORS[normalized] || PAYMENT_STATUS_COLORS.processing;
}
