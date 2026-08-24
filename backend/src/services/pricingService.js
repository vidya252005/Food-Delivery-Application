const Money = require('../domain/money');

/** Pricing pipeline with INR amounts and Select member benefits. */
const DELIVERY_FEE_RUPEES = 40;
const SELECT_MEMBER_DISCOUNT_RATE = 0.05;
const TAX_RATE = 0.05;

function calculateOrderTotal(items, options = {}) {
  const { isSelectMember = false } = options;
  const subtotalPaise = items.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * (item.quantity || 1),
    0
  );
  const subtotal = new Money(subtotalPaise);
  let discountPaise = 0;
  if (isSelectMember) {
    discountPaise = Math.round(subtotalPaise * SELECT_MEMBER_DISCOUNT_RATE);
  }
  const discount = new Money(discountPaise);
  const afterDiscount = subtotalPaise - discountPaise;
  const tax = new Money(Math.round(afterDiscount * TAX_RATE));
  const deliveryPaise = isSelectMember ? 0 : Math.round(DELIVERY_FEE_RUPEES * 100);
  const delivery = new Money(deliveryPaise);
  const total = new Money(afterDiscount).add(tax).add(delivery);

  return {
    subtotal: subtotal.toRupees(),
    discount: discount.toRupees(),
    tax: tax.toRupees(),
    deliveryFee: delivery.toRupees(),
    totalAmount: total.toRupees(),
    totalMoney: total,
    isSelectMember,
  };
}

module.exports = {
  calculateOrderTotal,
  DELIVERY_FEE_RUPEES,
  SELECT_MEMBER_DISCOUNT_RATE,
  TAX_RATE,
};
