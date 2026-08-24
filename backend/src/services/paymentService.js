const paymentRepository = require('../repositories/paymentRepository');
const { getPaymentStrategy } = require('../strategies/payment/PaymentStrategyFactory');
const Money = require('../domain/money');
const { PaymentStatus } = require('../domain/enums');
const AppError = require('../utils/AppError');

/**
 * PaymentService with Strategy + idempotency (LLD sections 18–21).
 * Duplicate requests with the same idempotencyKey return the existing result.
 */
async function pay(orderId, amountRupees, { method, idempotencyKey, ...request }) {
  if (!idempotencyKey) {
    throw new AppError('idempotencyKey is required for payment', 400);
  }

  const existing = await paymentRepository.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    return mapPaymentResult(existing);
  }

  const money = Money.fromRupees(amountRupees);
  const strategy = getPaymentStrategy(method);

  const payment = await paymentRepository.create({
    orderId,
    amountPaise: money.amountPaise,
    method,
    status: PaymentStatus.INITIATED,
    idempotencyKey,
  });

  try {
    const result = await strategy.pay(orderId, money, request);
    if (!result.success) {
      await paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED);
      throw new AppError(result.message || 'Payment failed', 402);
    }

    const updated = await paymentRepository.updateStatus(
      payment.id, PaymentStatus.SUCCESS, result.transactionId
    );

    return {
      success: true,
      paymentId: updated?.id || payment.id,
      transactionId: result.transactionId,
      message: result.message,
      amount: amountRupees,
      method,
      idempotencyKey,
    };
  } catch (err) {
    if (!(err instanceof AppError)) {
      await paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED);
    }
    throw err;
  }
}

function mapPaymentResult(row) {
  return {
    success: row.status === PaymentStatus.SUCCESS,
    paymentId: row.id,
    transactionId: row.transaction_id,
    amount: row.amount_paise / 100,
    method: row.method,
    idempotencyKey: row.idempotency_key,
    cached: true,
  };
}

async function getForOrder(orderId) {
  const row = await paymentRepository.findByOrderId(orderId);
  return row ? mapPaymentResult(row) : null;
}

module.exports = { pay, getForOrder };
