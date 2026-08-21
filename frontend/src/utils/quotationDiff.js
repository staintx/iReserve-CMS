import { formatCurrency } from "./format";

/**
 * Compares two saved quotation versions and reports what actually changed.
 *
 * The backend stores every revision as a complete Quotation document
 * (createQuotation clones the details and bumps version_number), but it does
 * NOT store a field-level diff or a pointer to the previous version. So the
 * only honest source for "what changed" is a comparison of two real saved
 * snapshots — which is also what the customer needs: the caterer's actual
 * resulting changes, not a replay of what the customer requested.
 *
 * Every entry here comes from values present on both documents. Nothing is
 * inferred: if a field is missing on either side it is skipped.
 */

const money = (v) => formatCurrency(Number(v) || 0);

/**
 * What the quote is for — the changes a customer reacts to first.
 */
const HEADLINE_FIELDS = [
  { key: "package_name", label: "Package" },
  { key: "guest_count", label: "Guest count", format: (v) => `${v} pax` },
];

/**
 * The money. Listed after the line items so the sequence reads
 * "what changed → what it costs", ending on the total the customer will pay.
 * Derived intermediates (subtotal, taxes) stay last so they never outrank the
 * substantive changes above them.
 */
const FINANCIAL_FIELDS = [
  { key: "package_starting_price", label: "Package starting price", format: money },
  { key: "package_price", label: "Package price", format: money },
  { key: "transportation_fee", label: "Transportation", format: money },
  // Kept so two quotations issued before custom fees existed still compare
  // honestly. Nothing writes these fields any more.
  { key: "equipment_fee", label: "Equipment rental", format: money },
  { key: "decoration_fee", label: "Venue styling", format: money },
  { key: "discounts", label: "Discount", format: money },
  { key: "subtotal", label: "Subtotal", format: money },
  { key: "taxes", label: "Taxes and VAT", format: money },
  { key: "total_cost", label: "Total", format: money },
  { key: "deposit_amount", label: "Deposit required", format: money },
];

const nameOf = (item) =>
  String(
    typeof item === "object" && item !== null
      ? (item.name || "")
      : (item || "")
  ).trim().toLowerCase();

/**
 * Diffs a list of named lines by name.
 *
 * Menu items, add-ons, removed inclusions and custom fees are all the same
 * shape to this function: a name plus an amount, optionally multiplied by a
 * quantity. `amountKey` says which field carries the money, and `addedDetail` /
 * `removedDetail` say how appearing and disappearing should read, because
 * gaining a fee and gaining a deduction mean opposite things to a customer.
 *
 * `withNote` opts a list into reporting changes to how a line was *described*
 * rather than priced — its unit and its note. They matter here because
 * renegotiating "2 bilao instead of 60 pax" can leave the total untouched
 * while changing what was actually agreed. A revision that only reworded the
 * arrangement would otherwise show up as no change at all.
 */
function diffLineItems(
  previous = [],
  current = [],
  {
    label,
    withQuantity,
    withNote = false,
    amountKey = "price",
    addedDetail = (amount) => (amount > 0 ? `Added · +${money(amount)}` : "Added"),
    removedDetail = () => "Removed",
  }
) {
  const changes = [];
  const prevList = Array.isArray(previous) ? previous.filter(Boolean) : [];
  const currList = Array.isArray(current) ? current.filter(Boolean) : [];

  const prevByName = new Map(prevList.map((i) => [nameOf(i), i]));
  const currByName = new Map(currList.map((i) => [nameOf(i), i]));

  const amountOf = (item) => Number(item?.[amountKey]) || 0;

  currByName.forEach((item, key) => {
    if (!key) return;
    const before = prevByName.get(key);
    const itemName = typeof item === "object" && item !== null ? (item.name || "") : String(item || "");
    if (!before) {
      const qty = Number(item?.quantity) || 1;
      const amount = withQuantity ? amountOf(item) * qty : amountOf(item);
      changes.push({
        kind: "added",
        label,
        name: itemName,
        detail: addedDetail(amount),
      });
      return;
    }

    const beforeQty = Number(before?.quantity) || 1;
    const afterQty = Number(item?.quantity) || 1;
    if (withQuantity && beforeQty !== afterQty) {
      changes.push({
        kind: "updated",
        label,
        name: itemName,
        from: `${beforeQty}`,
        to: `${afterQty}`,
      });
    }

    const beforeAmount = amountOf(before);
    const afterAmount = amountOf(item);
    if (beforeAmount !== afterAmount) {
      changes.push({
        kind: "updated",
        label,
        name: itemName,
        from: money(beforeAmount),
        to: money(afterAmount),
      });
    }

    if (withNote) {
      const unitOf = (entry) => String(entry?.unit || "").trim();
      if (unitOf(before) !== unitOf(item)) {
        changes.push({
          kind: "updated",
          label,
          name: itemName,
          from: unitOf(before) || "no unit",
          to: unitOf(item) || "no unit",
        });
      }

      const noteOf = (entry) => String(entry?.note || "").trim();
      if (noteOf(before) !== noteOf(item)) {
        changes.push({
          kind: "updated",
          label,
          name: itemName,
          from: noteOf(before) || "no note",
          to: noteOf(item) || "no note",
        });
      }
    }
  });

  prevByName.forEach((item, key) => {
    if (!key) return;
    if (!currByName.has(key)) {
      const itemName = typeof item === "object" && item !== null ? (item.name || "") : String(item || "");
      changes.push({ kind: "removed", label, name: itemName, detail: removedDetail(amountOf(item)) });
    }
  });

  return changes;
}

/**
 * @returns {Array} change entries, or [] when the two versions are identical
 *   or either side is missing.
 */
export function diffQuotationVersions(previous, current) {
  if (!previous || !current) return [];

  const diffScalars = (fields) =>
    fields.flatMap(({ key, label, format }) => {
      const before = previous[key];
      const after = current[key];
      if (before === undefined || after === undefined) return [];

      const same = typeof before === "number" || typeof after === "number"
        ? Number(before || 0) === Number(after || 0)
        : String(before ?? "") === String(after ?? "");
      if (same) return [];

      return [{
        kind: "updated",
        label,
        from: format ? format(before) : String(before),
        to: format ? format(after) : String(after),
      }];
    });

  // Ordered by what a customer cares about, not by schema order.
  return [
    ...diffScalars(HEADLINE_FIELDS),
    // An inclusion appearing in removed_inclusions means it left the package,
    // so "added to this list" has to read as a removal from the quote.
    ...diffLineItems(previous?.removed_inclusions || [], current?.removed_inclusions || [], {
      label: "Package inclusion",
      withQuantity: false,
      amountKey: "deduction",
      addedDetail: (amount) =>
        amount > 0 ? `Removed from package · -${money(amount)}` : "Removed from package",
      removedDetail: () => "Restored to package",
    }),
    // A quantity change keeps the inclusion in the package but changes how
    // much of it the customer gets, and moves the package price with it. It is
    // neither an addition nor a removal, so it is diffed on its own terms.
    ...diffLineItems(
      previous?.inclusion_adjustments || [],
      current?.inclusion_adjustments || [],
      {
        label: "Inclusion quantity",
        withQuantity: true,
        amountKey: "amount",
        addedDetail: (amount) =>
          amount < 0
            ? `Quantity reduced · ${money(Math.abs(amount))} off`
            : `Quantity increased · +${money(amount)}`,
        removedDetail: () => "Back to the package quantity",
      }
    ),
    // Quantity counts here now that a dish can be quoted by the bilao rather
    // than per head: "2 → 3 bilao of Shanghai" is a change the customer is
    // entitled to see spelled out, not folded into a total. `withNote` adds
    // the pricing mode, the unit and the item note for the same reason.
    ...diffLineItems(previous?.menu_items || [], current?.menu_items || [], {
      label: "Menu item",
      withQuantity: true,
      withNote: true,
    }),
    ...diffLineItems(previous?.add_ons || [], current?.add_ons || [], {
      label: "Add-on",
      withQuantity: true,
      withNote: true,
    }),
    ...diffLineItems(previous?.additional_fees || [], current?.additional_fees || [], {
      label: "Fee",
      withQuantity: false,
      amountKey: "amount",
    }),
    ...diffScalars(FINANCIAL_FIELDS),
  ];
}

/**
 * The quotation a booking was actually created from.
 *
 * Mirrors the backend's own selection rule at conversion time
 * (booking.controller.js: prefer status "Accepted", otherwise the highest
 * version_number) so the reference shown to the customer cannot drift from the
 * version the booking was really built on.
 */
export function selectSourceQuotation(versions = []) {
  if (!Array.isArray(versions) || versions.length === 0) return null;
  return (
    versions.find((v) => v.status === "Accepted") ||
    [...versions].sort(
      (a, b) => (Number(b.version_number) || 1) - (Number(a.version_number) || 1)
    )[0] ||
    null
  );
}

/**
 * The most recent version whose status shows the customer asked for changes.
 * `customer_response` holds their message; the backend stores no dedicated
 * request timestamp, so callers fall back to updatedAt.
 */
export function pendingChangeRequestOf(versions = [], current = null) {
  const pool = Array.isArray(versions) && versions.length > 0 ? versions : [current].filter(Boolean);
  return (
    pool
      .filter((v) => v?.status === "Revision Requested" && v?.customer_response)
      .sort((a, b) => (Number(b.version_number) || 1) - (Number(a.version_number) || 1))[0] || null
  );
}

/**
 * Picks the version immediately below `current` from a list of saved versions.
 * The API returns them sorted by version_number descending.
 */
export function previousVersionOf(versions = [], current) {
  if (!current) return null;
  const currentNumber = Number(current.version_number) || 1;
  return (
    versions
      .filter((v) => (Number(v.version_number) || 1) < currentNumber)
      .sort((a, b) => (Number(b.version_number) || 1) - (Number(a.version_number) || 1))[0] || null
  );
}
