/** Semantic status colors — aligned with LLD order state machine */

export const ORDER_STATUS_COLORS = {
  created: '#8B958F',
  payment_pending: '#B87922',
  confirmed: '#57748C',
  restaurant_accepted: '#4F7D65',
  preparing: '#C47B39',
  ready_for_pickup: '#2E7D57',
  ready: '#2E7D57',
  out_for_delivery: '#7566A8',
  'out for delivery': '#7566A8',
  delivered: '#176B45',
  cancelled: '#B94A48',
  pending: '#B87922',
};

export const DELIVERY_PARTNER_STATUS_COLORS = {
  available: '#2E7D57',
  assigned: '#57748C',
  picked_up: '#7566A8',
  delivering: '#C47B39',
  offline: '#8B958F',
};

export const PAYMENT_STATUS_COLORS = {
  success: '#2E7D57',
  successful: '#2E7D57',
  processing: '#B87922',
  pending: '#B87922',
  failed: '#B94A48',
  refunded: '#57748C',
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
