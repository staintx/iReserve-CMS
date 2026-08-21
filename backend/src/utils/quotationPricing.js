/**
 * The one pricing formula for a quotation.
 *
 * A quotation starts from the package's starting price, loses value for every
 * inclusion the admin removes, and gains value for menu items, add-ons,
 * transportation, and any custom fees. Additions and deductions are deliberately
 * the same kind of thing here: both are named lines with an amount, applied to
 * the same running subtotal, so a removal can never be calculated differently
 * from an addition.
 *
 * This runs on the server at save time and is the authority for what is stored.
 * `frontend/src/utils/quotationPricing.js` is a line-for-line mirror used to
 * show the admin the same numbers while they type. Change one, change the other.
 */

const money = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  // Two decimals: quotations are stated in pesos and centavos, and floating
  // point sums of prices would otherwise drift into 0.30000000000000004.
  return Math.round(amount * 100) / 100;
};

const count = (value, min = 0) => {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) && amount > min ? amount : min;
};

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

/** Total taken off the starting price by the inclusions the admin removed. */
function inclusionDeductionsOf(removedInclusions) {
  return money(
    list(removedInclusions).reduce((sum, entry) => sum + money(entry?.deduction), 0)
  );
}

/**
 * A signed number, for the one figure on a quotation that can go either way.
 *
 * Every other amount here is clamped at zero by `money`, because a price, a
 * fee and a deduction are all quantities of something. An inclusion adjustment
 * is a direction as well as a quantity — three tables instead of six is worth
 * less, nine is worth more — so it needs the sign preserved and only the
 * two-decimal rounding applied.
 */
const signedMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
};

/**
 * What one inclusion's quantity change is worth, positive or negative.
 *
 * The admin states a per-unit rate for the inclusion and how many the customer
 * is now getting; the package's own quantity is the baseline it is measured
 * against. Fewer than the package included is a deduction, more is an extra
 * charge, and the same arithmetic produces both — there is deliberately no
 * separate "upgrade" path that could price differently from the "downgrade" one.
 *
 * Nothing is hardcoded to a kind of inclusion: any line whose text carries a
 * quantity can be adjusted this way, and a line without one contributes zero.
 */
function inclusionAdjustmentAmount(entry) {
  const baseQuantity = count(entry?.base_quantity, 0);
  const quantity = count(entry?.quantity, 0);
  const unitPrice = money(entry?.unit_price);
  if (!unitPrice) return 0;
  return signedMoney((quantity - baseQuantity) * unitPrice);
}

/**
 * Every quantity change on the package's inclusions, as one signed total.
 *
 * Applied to the package line beside the removal deductions, so the package
 * price stays the single figure downstream readers use.
 */
function inclusionAdjustmentsOf(adjustments) {
  return signedMoney(
    list(adjustments).reduce((sum, entry) => sum + inclusionAdjustmentAmount(entry), 0)
  );
}

/**
 * How many units one dish line is charged for.
 *
 * Per guest is the default, and what every dish did before: the price is a
 * per-head rate and the guest count multiplies it. A line switched to
 * `quantity` is charged for a stated number of its own units instead — two
 * bilao of Shanghai, priced per bilao — because a customer can ask for a
 * fixed amount of one dish without it scaling to the whole guest list.
 *
 * A quotation stored before this existed has no pricing_type, so it falls
 * through to per guest and prices exactly as it always did.
 */
function menuQuantityOf(item, guestCount) {
  if (item?.pricing_type === "quantity") return count(item?.quantity, 1) || 1;
  return count(guestCount, 1) || 1;
}

function menuLineTotal(item, guestCount) {
  return money(money(item?.price) * menuQuantityOf(item, guestCount));
}

function menuSubtotalOf(menuItems, guestCount) {
  return money(list(menuItems).reduce((sum, item) => sum + menuLineTotal(item, guestCount), 0));
}

/** Fixed add-ons are charged once; quantity add-ons are charged per unit. */
function addOnsSubtotalOf(addOns) {
  return money(
    list(addOns).reduce((sum, item) => {
      const quantity = item?.pricing_type === "fixed" ? 1 : count(item?.quantity, 1) || 1;
      return sum + money(item?.price) * quantity;
    }, 0)
  );
}

/** Transportation plus every custom fee the admin added. */
function additionalFeesTotalOf(transportationFee, additionalFees) {
  const custom = list(additionalFees).reduce((sum, fee) => sum + money(fee?.amount), 0);
  return money(money(transportationFee) + custom);
}

function computeQuotationTotals(input = {}) {
  const guestCount = count(input.guest_count, 1) || 1;

  const startingPrice = money(input.package_starting_price);
  const inclusionDeductions = inclusionDeductionsOf(input.removed_inclusions);
  // Signed: reducing an inclusion's quantity takes value off the package,
  // raising it adds value on. See inclusionAdjustmentsOf.
  const inclusionAdjustments = inclusionAdjustmentsOf(input.inclusion_adjustments);
  // A quotation can never go below zero on its package line: deducting more
  // than the package is worth is a data-entry mistake, caught in validation.
  const packagePrice = money(
    Math.max(0, startingPrice - inclusionDeductions + inclusionAdjustments)
  );

  const menuSubtotal = menuSubtotalOf(input.menu_items, guestCount);
  const addOnsSubtotal = addOnsSubtotalOf(input.add_ons);
  const additionalFeesTotal = additionalFeesTotalOf(
    input.transportation_fee,
    input.additional_fees
  );

  const subtotal = money(packagePrice + menuSubtotal + addOnsSubtotal + additionalFeesTotal);
  const taxes = money(input.taxes);
  const discounts = money(input.discounts);
  const totalCost = money(Math.max(0, subtotal + taxes - discounts));

  const depositAmount = money(Math.min(totalCost, money(input.deposit_amount)));
  const remainingBalance = money(Math.max(0, totalCost - depositAmount));

  return {
    guestCount,
    startingPrice,
    inclusionDeductions,
    inclusionAdjustments,
    packagePrice,
    menuSubtotal,
    addOnsSubtotal,
    additionalFeesTotal,
    subtotal,
    taxes,
    discounts,
    totalCost,
    depositAmount,
    remainingBalance,
  };
}

module.exports = {
  computeQuotationTotals,
  inclusionDeductionsOf,
  inclusionAdjustmentAmount,
  inclusionAdjustmentsOf,
  menuQuantityOf,
  menuLineTotal,
  menuSubtotalOf,
  addOnsSubtotalOf,
  additionalFeesTotalOf,
  money,
};
