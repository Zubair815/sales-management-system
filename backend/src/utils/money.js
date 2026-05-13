/**
 * Safe monetary conversion utilities.
 * 
 * Prisma returns Decimal fields as Prisma.Decimal objects.
 * JavaScript floats (IEEE 754) are inherently imprecise for money.
 * These utilities ensure consistent 2-decimal-place precision
 * across all financial calculations.
 * 
 * Usage:
 *   const { toMoney, sumMoney } = require('../utils/money');
 *   toMoney(order.grandTotal)        // Prisma Decimal -> safe number
 *   toMoney('123.456')               // string -> 123.46
 *   sumMoney(payments, p => p.amount) // sum array of Decimals
 */

/**
 * Safely converts a Prisma Decimal, string, or number to a
 * fixed 2-decimal-place number. Returns 0 for null/undefined.
 */
const toMoney = (val) => {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'object' && typeof val.toNumber === 'function'
    ? val.toNumber()  // Prisma Decimal object
    : Number(val);
  if (isNaN(num)) return 0;
  return Number(num.toFixed(2));
};

/**
 * Sums monetary values from an array using a getter function.
 * Avoids floating-point drift by rounding the final result.
 * 
 * @param {Array} items - Array of objects
 * @param {Function} getter - Function that extracts the monetary value from each item
 * @returns {number} Sum rounded to 2 decimal places
 */
const sumMoney = (items, getter) => {
  if (!items || !items.length) return 0;
  const sum = items.reduce((acc, item) => acc + toMoney(getter(item)), 0);
  return toMoney(sum);
};

module.exports = { toMoney, sumMoney };
