/**
 * Migrates existing Special Offers to the combo pack model.
 *
 *     node src/seed/migrateComboPacks.js          # report only, changes nothing
 *     node src/seed/migrateComboPacks.js --apply  # write the changes
 *
 * What changed, and how each part is carried over:
 *
 *   max_guests → guest_count
 *     An offer used to price `whatever the customer entered × price per pax`,
 *     capped at `max_guests`. A combo is sold at one size, so the cap becomes
 *     the count. An offer with no cap falls back to `guest_max`; one with
 *     neither cannot be sold as a combo and is reported for an admin to set.
 *
 *   offer_menu_rules → offer_food_items
 *     There is no faithful automatic answer here: the old rules said what the
 *     customer *may* pick, and a combo says what it *is*. Every allowed dish is
 *     carried across under its rule's label so nothing is lost, and any offer
 *     whose rules allowed more dishes than the customer would have chosen is
 *     listed at the end as needing a human to trim it to the real combo.
 *
 *   the event-space build → cleared
 *     A combo is food. Scaffold sizes, setup equipment, a base setup price,
 *     add-ons, linked catalogue dishes and a guest range all belong to a
 *     regular package, so they are cleared from offers here — the same boundary
 *     the controllers apply on every save, applied once to what is already
 *     stored. Each offer's report line names what it is giving up.
 *
 * The two retired fields (`max_guests`, `offer_menu_rules`) are left on the
 * documents: they are no longer in the schema, so the application ignores them,
 * and a bad migration can be re-run from the original data.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Package = require("../models/Package");
const MenuItem = require("../models/MenuItem");
const { PACKAGE_ONLY_FIELDS } = require("../utils/specialOffers");

dotenv.config();

const APPLY = process.argv.includes("--apply");

const positive = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // The stored documents, not hydrated ones: `offer_menu_rules` is no longer in
  // the schema, so mongoose would strip it before this could read it.
  const offers = await Package.collection
    .find({ offer_type: "special" })
    .toArray();

  if (offers.length === 0) {
    console.log("No Special Offers found. Nothing to migrate.");
    return;
  }

  const dishNames = new Map(
    (await MenuItem.find({}, "_id name").lean()).map((item) => [
      String(item._id),
      item.name,
    ]),
  );

  const needsReview = [];

  for (const offer of offers) {
    const guestCount =
      positive(offer.guest_count) ||
      positive(offer.max_guests) ||
      positive(offer.guest_max);

    const rules = Array.isArray(offer.offer_menu_rules)
      ? offer.offer_menu_rules
      : [];

    const foodItems = [];
    rules.forEach((rule) => {
      const category = String(rule?.label || "").trim();
      const allowed = Array.isArray(rule?.menu_items) ? rule.menu_items : [];
      const required = Math.max(0, Math.floor(Number(rule?.required_count) || 0));

      allowed.forEach((id) => {
        const name = dishNames.get(String(id));
        if (!name) return;
        foodItems.push({
          menu_category: category,
          item_name: name,
          sort_order: foodItems.length,
        });
      });

      // The customer used to choose `required` of these. A combo names them
      // outright, so anything wider than that is a decision only an admin can
      // make.
      if (required > 0 && allowed.length > required) {
        needsReview.push(
          `${offer.name}: "${category}" allowed ${allowed.length} dishes for a choice of ${required} — trim it to the ${required} the combo actually serves.`,
        );
      }
    });

    if (!guestCount) {
      needsReview.push(
        `${offer.name}: no guest count could be derived. Set how many guests this combo serves before it can be booked.`,
      );
    }
    if (foodItems.length === 0) {
      needsReview.push(`${offer.name}: no food items. Add the combo's dishes.`);
    }

    // What this offer is giving up, named rather than dropped silently. An
    // empty array or a zero is nothing to report — only real configuration is.
    const dropped = PACKAGE_ONLY_FIELDS.filter((field) => {
      const value = offer[field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });

    console.log(
      `• ${offer.name} → ${guestCount || "?"} guests, ₱${
        positive(offer.price_per_guest) || "?"
      }/pax, ${foodItems.length} food item(s)${
        dropped.length > 0 ? `, clearing ${dropped.join(", ")}` : ""
      }`,
    );

    if (APPLY) {
      await Package.collection.updateOne(
        { _id: offer._id },
        {
          $set: {
            ...(guestCount ? { guest_count: guestCount } : {}),
            offer_food_items: foodItems,
            // A combo is food, and is filed as such rather than as an
            // event-space build it no longer sells.
            package_type: "Food Only",
          },
          // Cleared, not emptied: an offer has no use for these keys at all,
          // and removing them is what stops a stale scaffold size reappearing
          // if the record is ever read outside the schema.
          ...(dropped.length > 0
            ? {
                $unset: Object.fromEntries(
                  dropped.map((field) => [field, ""]),
                ),
              }
            : {}),
        },
      );
    }
  }

  console.log(
    APPLY
      ? `\nMigrated ${offers.length} Special Offer(s).`
      : `\n${offers.length} Special Offer(s) would be migrated. Re-run with --apply to write.`,
  );

  if (needsReview.length > 0) {
    console.log("\nNeeds an admin's attention:");
    needsReview.forEach((line) => console.log(`  - ${line}`));
  }
};

run()
  .then(() => process.exit())
  .catch((err) => {
    console.error("❌ Combo pack migration error:", err.message);
    process.exit(1);
  });
