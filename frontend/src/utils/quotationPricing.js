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

/**
 * A signed number, for the one figure on a quotation that can go either way.
 * See the server copy for the reasoning.
 */
export const signedMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
};

/**
 * What one inclusion's quantity change is worth, positive or negative.
 *
 * Fewer than the package included is a deduction, more is an extra charge, and
 * the same arithmetic produces both. See the server copy for the reasoning.
 */
export const inclusionAdjustmentAmount = (entry) => {
  const baseQuantity = count(entry?.base_quantity, 0);
  const quantity = count(entry?.quantity, 0);
  const unitPrice = money(entry?.unit_price);
  if (!unitPrice) return 0;
  return signedMoney((quantity - baseQuantity) * unitPrice);
};

/** Every quantity change on the package's inclusions, as one signed total. */
export const inclusionAdjustmentsOf = (adjustments) =>
  signedMoney(
    list(adjustments).reduce((sum, entry) => sum + inclusionAdjustmentAmount(entry), 0)
  );

/** How a dish line is charged. See the server copy for the reasoning. */
export const MENU_PRICING = { PER_GUEST: "per_guest", QUANTITY: "quantity" };

/**
 * How many units one dish line is charged for.
 *
 * Per guest is the default, and what every dish did before: the price is a
 * per-head rate and the guest count multiplies it. A line switched to
 * `quantity` is charged for a stated number of its own units instead — two
 * bilao of Shanghai, priced per bilao.
 */
export const menuQuantityOf = (item, guestCount) => {
  if (item?.pricing_type === MENU_PRICING.QUANTITY) return count(item?.quantity, 1) || 1;
  return count(guestCount, 1) || 1;
};

export const menuLineTotal = (item, guestCount) =>
  money(money(item?.price) * menuQuantityOf(item, guestCount));

/**
 * "2 bilao", or "" for a dish quoted per guest.
 *
 * A per-guest dish has no amount of its own to state — its quantity is the
 * guest count, which is already on the page — so it returns nothing rather
 * than a redundant "×1" on every line.
 */
export const menuAmountLabel = (item) => {
  if (item?.pricing_type !== MENU_PRICING.QUANTITY) return "";
  const quantity = count(item?.quantity, 1) || 1;
  const unit = String(item?.unit || "").trim();
  return unit ? `${quantity} ${unit}` : `×${quantity}`;
};

export const menuSubtotalOf = (menuItems, guestCount) =>
  money(list(menuItems).reduce((sum, item) => sum + menuLineTotal(item, guestCount), 0));

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
  // Signed: reducing an inclusion's quantity takes value off the package,
  // raising it adds value on.
  const inclusionAdjustments = inclusionAdjustmentsOf(input.inclusion_adjustments);
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

  // A combo's starting price is its base FOOD price — its own guest count
  // times its own rate per pax. The figure stored on the request wins, because
  // it is what the customer was quoted at the time; the combo is recomputed
  // from only when a request predates that field. The setup for their chosen
  // size is a separate line the builder seeds beside it, so the two never
  // collapse into one figure the admin cannot unpick.
  if (isSpecialOffer(pkg)) {
    const stored = positive(inquiry?.offer_base_price);
    if (stored) return money(stored);
    return money(offerBaseFoodPrice(pkg));
  }

  const scaffold = positive(inquiry?.scaffold_price);
  if (scaffold) return money(scaffold);

  const setup = positive(pkg?.setup_price);
  if (setup) return money(setup);

  const perGuest = positive(pkg?.price_per_guest);
  if (perGuest) return money(perGuest * (count(guestCount, 1) || 1));

  return 0;
}
