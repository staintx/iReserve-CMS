/**
 * What a customer is allowed to change on their own request, settled by the
 * server.
 *
 * The booking wizard and the edit modal are both browsers, so neither is the
 * authority on what a request contains. Every selection a customer can make
 * lands here on its way into the database and is re-derived against the
 * catalogue it came from: dishes must exist, add-ons are priced from the
 * catalogue rather than from the payload, a scaffold's dimensions come off the
 * package option rather than the request, and equipment is never customer
 * input at all.
 *
 * The rule the whole file follows: **a customer chooses which things, the
 * server decides what they are.** A payload naming a dish picks that dish; a
 * payload naming a price is ignored.
 */

const MenuItem = require("../models/MenuItem");
const Addon = require("../models/Addon");
const { SERVICE_TYPES, cateringRequested } = require("./catering");

const positive = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const nameKey = (value) => String(value || "").trim().toLowerCase();

/**
 * The dishes a request actually carries: the ids that name a real menu item,
 * de-duplicated, in the order the customer chose them.
 *
 * An id for a dish that has since been taken off the menu is dropped rather
 * than stored, because a request cannot be quoted for food that no longer
 * exists — and a request is edited long after it was submitted, which is
 * exactly when a dish is most likely to have gone.
 */
async function resolveMenuSelection(submitted) {
  const ids = (Array.isArray(submitted) ? submitted : [])
    .map((entry) => String(entry?._id || entry || "").trim())
    .filter(Boolean);

  if (ids.length === 0) return [];

  const found = await MenuItem.find({ _id: { $in: ids } }, "_id").lean();
  const real = new Set(found.map((item) => String(item._id)));

  const seen = new Set();
  return ids.filter((id) => {
    if (!real.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * The add-ons a request carries, priced from the catalogue.
 *
 * Three things can legitimately be an add-on, and each is priced by where it
 * came from rather than by what the browser said it costs:
 *
 *   - a global add-on, priced from the `Addon` catalogue;
 *   - one of the package's own `add_ons`, which carry a name and a quantity
 *     but no price — they are quoted per event, so they sit at ₱0 until the
 *     quotation prices them;
 *   - something already on this request, kept at the price it was stored with.
 *     A request may carry free-text services that were never catalogue items,
 *     and an edit must not quietly delete what the customer already asked for.
 *
 * Anything matching none of the three is dropped: it is a name the customer
 * had no way to choose, which means it was not chosen.
 */
async function resolveServiceItems(submitted, pkg, existing = []) {
  const requested = (Array.isArray(submitted) ? submitted : [])
    .map((entry) => ({
      name: String(entry?.name || "").trim(),
      quantity: Math.max(1, Math.floor(positive(entry?.quantity)) || 1),
    }))
    .filter((entry) => entry.name);

  if (requested.length === 0) return [];

  const catalogue = await Addon.find(
    { name: { $in: requested.map((entry) => entry.name) } },
    "name price description pricing_type available",
  ).lean();

  const byCatalogue = new Map(catalogue.map((item) => [nameKey(item.name), item]));
  const byPackage = new Map(
    (Array.isArray(pkg?.add_ons) ? pkg.add_ons : []).map((item) => [
      nameKey(item?.name),
      item,
    ]),
  );
  const byExisting = new Map(
    (Array.isArray(existing) ? existing : []).map((item) => [nameKey(item?.name), item]),
  );

  const seen = new Set();
  const resolved = [];

  requested.forEach((entry) => {
    const key = nameKey(entry.name);
    if (seen.has(key)) return;

    const fromCatalogue = byCatalogue.get(key);
    // An add-on the admin has taken down cannot be newly chosen, but one
    // already on the request stays on it — withdrawing a service the customer
    // was promised is the admin's decision to communicate, not a side effect
    // of the customer editing their address.
    if (fromCatalogue && fromCatalogue.available === false && !byExisting.has(key)) {
      return;
    }

    const source = fromCatalogue || byPackage.get(key) || byExisting.get(key);
    if (!source) return;

    seen.add(key);
    resolved.push({
      name: source.name || entry.name,
      description: source.description || "",
      quantity: entry.quantity,
      price: positive(fromCatalogue?.price ?? byExisting.get(key)?.price),
    });
  });

  return resolved;
}

/**
 * The event-space footprint a request is for, read off the package option the
 * customer picked.
 *
 * The dimensions and the price are the option's, never the request's: the
 * request records only *which* size was chosen. An id matching no option on
 * the package clears the footprint rather than keeping the old one, because
 * the sizes a package offers can change between submitting and editing.
 */
function resolveScaffold(optionId, pkg) {
  const options = Array.isArray(pkg?.scaffold_size_options)
    ? pkg.scaffold_size_options
    : [];
  const option = options.find((entry) => String(entry?._id) === String(optionId));

  if (!option) {
    return {
      selected_scaffold_option_id: "",
      scaffold_width: null,
      scaffold_length: null,
      scaffold_base_area: null,
      scaffold_price: 0,
    };
  }

  const width = positive(option.width_ft);
  const length = positive(option.length_ft);

  return {
    selected_scaffold_option_id: String(option._id),
    scaffold_width: width || null,
    scaffold_length: length || null,
    scaffold_base_area: positive(option.area_ft2) || (width && length ? width * length : null),
    scaffold_price: positive(option.price),
  };
}

/**
 * The equipment a request reserves.
 *
 * Never customer input. Equipment is what the package's setup includes, so it
 * is copied from `setup_equipment` and re-copied whenever the setup changes —
 * the customer chooses a package and a size, and the equipment follows from
 * them. A request with no setup at all reserves nothing.
 */
function resolveInventoryItems(pkg, request) {
  if (!pkg) return [];
  if (request?.service_type === SERVICE_TYPES.FOOD_ONLY) return [];

  const equipment = Array.isArray(pkg.setup_equipment) ? pkg.setup_equipment : [];
  return equipment.map((item) => ({
    inventory_id: item.inventory_id,
    name: item.name || item.item_name || "Equipment item",
    quantity: Math.max(1, Math.floor(positive(item.quantity)) || 1),
  }));
}

/**
 * What the request is worth on screen, recomputed from the server's own
 * figures.
 *
 * `estimated_total` records what the customer was shown, and after an edit the
 * figure they were shown at submission is no longer what they are looking at.
 * It is recomputed here rather than accepted from the browser so that a
 * customer cannot state their own price, and so the admin reading the request
 * sees a number that matches the selections beside it.
 *
 * Mirrors the priced lines of
 * `frontend/src/pages/customer/booking/lib/bookingRules.js#buildEstimate` —
 * setup, add-ons, and a combo's food. Dishes are deliberately not priced on
 * either side: a per-guest catering rate is set on the quotation, which is why
 * the wizard shows the menu line at ₱0. The quotation remains the only
 * authority on what is actually owed.
 *
 * One fallback the wizard has is deliberately not mirrored: it can fall back
 * to a package price carried in router state from the card the customer
 * clicked. That figure never reaches the server and is not stored anywhere, and
 * it only applies when the package, its sizes and the configured custom-setup
 * price are all unpriced — which the configured price's own default prevents.
 */
function estimatedTotalForRequest({ request, pkg, offerBasePrice = 0, businessInfoPrice = 0 }) {
  if (offerBasePrice > 0) return offerBasePrice;

  let total = 0;

  const isCustomSetup = Boolean(request?.is_custom_setup);
  const wantsSetup = request?.service_type !== SERVICE_TYPES.FOOD_ONLY;

  // A bespoke setup is priced by the design team on the quotation, so it
  // contributes nothing here — the same ₱0, quoted-later line the wizard shows.
  if (wantsSetup && !isCustomSetup) {
    const scaffold = positive(request?.scaffold_price);
    const packagePrice = positive(pkg?.setup_price);
    total += scaffold || packagePrice || positive(businessInfoPrice);
  }

  (Array.isArray(request?.service_items) ? request.service_items : []).forEach((item) => {
    total += positive(item?.price) * (Math.floor(positive(item?.quantity)) || 1);
  });

  return Math.round(total * 100) / 100;
}

module.exports = {
  resolveMenuSelection,
  resolveServiceItems,
  resolveScaffold,
  resolveInventoryItems,
  estimatedTotalForRequest,
  cateringRequested,
};
