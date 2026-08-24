/**
 * Money value object — stores amount in smallest currency unit (paise)
 * to avoid floating-point precision issues (LLD section 13).
 */
class Money {
  constructor(amountPaise, currency = 'INR') {
    this.amountPaise = Math.round(amountPaise);
    this.currency = currency;
  }

  static fromRupees(rupees) {
    return new Money(Math.round(Number(rupees) * 100));
  }

  toRupees() {
    return this.amountPaise / 100;
  }

  add(other) {
    this._assertSameCurrency(other);
    return new Money(this.amountPaise + other.amountPaise, this.currency);
  }

  subtract(other) {
    this._assertSameCurrency(other);
    return new Money(this.amountPaise - other.amountPaise, this.currency);
  }

  _assertSameCurrency(other) {
    if (other.currency !== this.currency) {
      throw new Error('Currency mismatch');
    }
  }

  toJSON() {
    return { amountPaise: this.amountPaise, currency: this.currency, rupees: this.toRupees() };
  }
}

module.exports = Money;
