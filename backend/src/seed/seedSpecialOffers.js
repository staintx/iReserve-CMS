/**
 * Creates the combo packs the client launches with.
 *
 * Everything here is configuration written into the database, not behaviour:
 * the guest count, the price per pax, the food items and the inclusions are all
 * ordinary Package fields an admin can edit afterwards in Service Management →
 * Packages → Special Offers. Nothing in the application reads this file.
 *
 * A combo is food. There are no scaffold sizes, setup equipment or add-ons here
 * because a combo has none — that is a regular package.
 *
 *     node src/seed/seedSpecialOffers.js
 *
 * Re-running updates the combos in place rather than duplicating them.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Package = require("../models/Package");

dotenv.config();

/** Food rows in the order they are served, numbered as stored. */
const food = (rows) =>
  rows.map(([menu_category, item_name], index) => ({
    menu_category,
    item_name,
    sort_order: index,
  }));

const OFFERS = [
  {
    name: "Classic Celebration Combo",
    description:
      "A balanced combo designed for small celebrations — good food for ten, at one fixed price per pax.",
    fullDescription:
      "Chicken BBQ, pancit, steamed rice and iced tea for ten guests, served with buffet setup and everything needed to eat. Priced per pax; event set-up beyond the buffet, equipment and any extras are quoted separately.",
    offer_type: "special",
    package_type: "Food Only",
    event_type: "Birthday",
    guest_count: 10,
    price_per_guest: 350,
    available: true,
    badge_text: "Serves 10",
    offer_food_items: food([
      ["Main Course", "Chicken BBQ"],
      ["Noodles", "Pancit"],
      ["Rice", "Steamed Rice"],
      ["Beverage", "Iced Tea"],
    ]),
    inclusions: ["Buffet setup", "Serving utensils", "Disposable plates"],
  },
  {
    name: "Fiesta Combo",
    description:
      "A full fiesta spread for fifty guests at a fixed price per pax.",
    fullDescription:
      "Two mains, a vegetable dish, pancit, rice, dessert and drinks for fifty guests, served with everything needed to eat. Event set-up and styling are a regular package and are quoted separately.",
    offer_type: "special",
    package_type: "Food Only",
    event_type: "Birthday",
    guest_count: 50,
    price_per_guest: 500,
    available: true,
    badge_text: "Serves 50",
    offer_food_items: food([
      ["Main Course", "Lechon Belly"],
      ["Main Course", "Beef Caldereta"],
      ["Vegetables", "Chopsuey"],
      ["Noodles", "Pancit Bihon"],
      ["Rice", "Steamed Rice"],
      ["Dessert", "Buko Pandan"],
      ["Beverage", "Iced Tea"],
    ]),
    inclusions: [
      "Buffet setup",
      "Food warmers",
      "Serving spoons",
      "Plates and cutlery",
      "Glasses",
      "Iced tea dispenser",
    ],
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const offer of OFFERS) {
      const existing = await Package.findOne({
        name: offer.name,
        offer_type: "special",
      });

      if (existing) {
        Object.assign(existing, offer);
        await existing.save();
        console.log(`↻ Updated combo "${offer.name}"`);
      } else {
        await Package.create(offer);
        console.log(`✅ Created combo "${offer.name}"`);
      }
    }

    process.exit();
  } catch (err) {
    console.error("❌ Special Offer seeder error:", err.message);
    process.exit(1);
  }
};

run();
