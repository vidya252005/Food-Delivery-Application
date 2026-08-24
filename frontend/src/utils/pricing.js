/** Mirrors backend pricingService — keep in sync for cart display. */
const DELIVERY_FEE = 40;
const TAX_RATE = 0.05;
const SELECT_DISCOUNT_RATE = 0.05;

export function calculateCartPricing(items, { isSelectMember = false } = {}) {
  const subtotal = (items || []).reduce(
    (sum, item) => sum + Number(item.price) * (item.quantity || 1),
    0
  );
  const discount = isSelectMember ? subtotal * SELECT_DISCOUNT_RATE : 0;
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * TAX_RATE;
  const deliveryFee = isSelectMember ? 0 : DELIVERY_FEE;
  const total = afterDiscount + tax + deliveryFee;

  return {
    subtotal,
    discount,
    tax,
    deliveryFee,
    total,
    isSelectMember,
  };
}

export { DELIVERY_FEE, TAX_RATE, SELECT_DISCOUNT_RATE };
