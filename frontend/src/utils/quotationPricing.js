/**
 * The one pricing formula for a quotation, mirrored from the server.
 *
 * `backend/src/utils/quotationPricing.js` is the authority: it recomputes every
 * total at save time, so what is stored never depends on the browser. This copy
 * exists so the Quotation Builder can show the admin those same numbers live
 * while they type, and so the summary they approve is the one that gets saved.
 * Change one, change the other.
 *
 * Additions and deductions are the same kind of line here: a name and an
 * amount, applied to one running subtotal. A removed inclusion is never
 * calculated differently from an added service.
 */

import { isSpecialOffer, offerBaseFoodPrice } from "@/lib/specialOffers";

export const money = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
};

const count = (value, min = 0) => {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) && amount > min ? amount : min;
};

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

/** Total taken off the starting price by the inclusions the admin removed. */
export const inclusionDeductionsOf = (removedInclusions) =>
  money(list(removedInclusions).reduce((sum, entry) => sum + money(entry?.deduction), 0));

/** Menu is quoted per guest, so the guest count multiplies every dish. */
export const menuSubtotalOf = (menuItems, guestCount) => {
  const guests = count(guestCount, 1) || 1;
  return money(list(menuItems).reduce((sum, item) => sum + money(item?.price) * guests, 0));
};

/** A single add-on line: fixed services charge once, quantity items per unit. */
export const addOnQuantityOf = (item) =>
  item?.pricing_type === "fixed" ? 1 : count(item?.quantity, 1) || 1;

export const addOnLineTotal = (item) => money(money(item?.price) * addOnQuantityOf(item));

/** Fixed add-ons are charged once; quantity add-ons are charged per unit. */
export const addOnsSubtotalOf = (addOns) =>
  money(list(addOns).reduce((sum, item) => sum + addOnLineTotal(item), 0));

/** Transportation plus every custom fee the admin added. */
export const additionalFeesTotalOf = (transportationFee, additionalFees) => {
  const custom = list(additionalFees).reduce((sum, fee) => sum + money(fee?.amount), 0);
  return money(money(transportationFee) + custom);
};

export function computeQuotationTotals(input = {}) {
  const guestCount = count(input.guest_count, 1) || 1;

  const startingPrice = money(input.package_starting_price);
  const inclusionDeductions = inclusionDeductionsOf(input.removed_inclusions);
  const packagePrice = money(Math.max(0, startingPrice - inclusionDeductions));

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

/**
 * The package's starting price as the customer's booking established it.
 *
 * Read in the order the booking flow itself prices a package (see
 * bookingRules.buildEstimate): the setup size the customer actually picked
 * first, then the package's own fixed setup price, then a per-guest package
 * rate. Nothing is invented: a package with no price on record returns 0 and
 * the builder asks the admin to set one.
 */
export function derivePackageStartingPrice(inquiry, guestCount) {
  const positive = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };

  const pkg = inquiry?.package_id && typeof inquiry.package_id === "object" ? inquiry.package_id : null;

  // A Special Offer's starting price is its base FOOD price — the fixed
  // per-person rate times the guest count the customer actually booked. The
  // setup for their chosen size is a separate line the builder seeds beside
  // it, so the two never collapse into one figure the admin cannot unpick.
  if (isSpecialOffer(pkg)) {
    const stored = positive(inquiry?.offer_base_price);
    if (stored) return money(stored);
    return money(offerBaseFoodPrice(pkg, count(guestCount, 1) || 1));
  }

  const scaffold = positive(inquiry?.scaffold_price);
  if (scaffold) return money(scaffold);

  const setup = positive(pkg?.setup_price);
  if (setup) return money(setup);

  const perGuest = positive(pkg?.price_per_guest);
  if (perGuest) return money(perGuest * (count(guestCount, 1) || 1));

  return 0;
}
