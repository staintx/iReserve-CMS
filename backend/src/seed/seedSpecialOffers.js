/**
 * Creates the two Special Offers the client launches with.
 *
 * Everything here is configuration written into the database, not behaviour:
 * the prices, the guest cap, the food rules and the free-setup size are all
 * ordinary Package fields an admin can edit afterwards in Service Management →
 * Packages → Special Offers. Nothing in the application reads this file.
 *
 * Menu items are matched against the existing catalogue by category, so the
 * offers allow whatever the kitchen actually offers rather than a dish list
 * invented here. Run it after the menu is seeded:
 *
 *     node src/seed/seedSpecialOffers.js
 *
 * Re-running updates the two offers in place rather than duplicating them.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Package = require("../models/Package");
const MenuItem = require("../models/MenuItem");
const { resolveGroupId } = require("../utils/menuCategories");

dotenv.config();

/** Every available dish whose category resolves to one of these groups. */
const itemsInGroups = (menu, groupIds) =>
  menu
    .filter(
      (item) =>
        item.available !== false && groupIds.includes(resolveGroupId(item.category)),
    )
    .map((item) => item._id);

const buildOffers = (menu) => [
  {
    name: "Full Package",
    description:
      "Complete catering for up to 100 guests at a fixed price per person, with free set-up on our 20x40 scaffold.",
    fullDescription:
      "Three main courses, a vegetable dish, rice, dessert, drinks and water — priced per person. Choose the 20x40 size and the set-up is free; other sizes are quoted.",
    offer_type: "special",
    package_type: "Food + Event Setup",
    event_type: "Birthday",
    price_per_guest: 500,
    max_guests: 100,
    available: true,
    badge_text: "Free set-up at 20x40",
    inclusions: [
      "[Food] 3 Main Courses",
      "[Food] 1 Vegetable Dish",
      "[Food] Rice",
      "[Food] Dessert",
      "[Food] Drinks",
      "[Food] Water",
    ],
    offer_menu_rules: [
      {
        label: "Main Courses",
        required_count: 3,
        selectable: true,
        menu_items: itemsInGroups(menu, ["mains"]),
      },
      {
        label: "Vegetable Dish",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["vegetables"]),
      },
      {
        label: "Dessert",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["desserts"]),
      },
      {
        label: "Drinks",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["drinks"]),
      },
      {
        label: "Rice",
        required_count: 0,
        selectable: false,
        note: "Included for every guest.",
        menu_items: itemsInGroups(menu, ["rice"]),
      },
      {
        label: "Water",
        required_count: 0,
        selectable: false,
        note: "Included for every guest.",
        menu_items: itemsInGroups(menu, ["water"]),
      },
    ],
    // Supported sizes only. The 20x40 is the one the client said carries free
    // set-up; the others are simply selectable, and what they cost is settled
    // on the quotation. No prices appear here because the client gave none.
    scaffold_size_options: [
      { label: "20x40 Setup", width_ft: 20, length_ft: 40, area_ft2: 800, free_setup: true },
      { label: "20x20 Setup", width_ft: 20, length_ft: 20, area_ft2: 400, free_setup: false },
      { label: "40x40 Setup", width_ft: 40, length_ft: 40, area_ft2: 1600, free_setup: false },
    ],
  },
  {
    name: "Student Budget Menu",
    description:
      "A budget-friendly set menu at a fixed price per person — pick one item from each course.",
    fullDescription:
      "One viand, one fried dish, one pasta, one drink and one dessert, priced per person. Set-up, equipment and any extras are quoted separately.",
    offer_type: "special",
    package_type: "Food + Event Setup",
    event_type: "Other",
    price_per_guest: 330,
    available: true,
    badge_text: "Budget friendly",
    // Written through the same Inclusions structure the regular packages use,
    // so nothing about this offer needs a concept of its own.
    inclusions: [
      "[Dining & Service Inventory] Food Warmer",
      "[Dining & Service Inventory] Serving Spoons",
      "[Dining & Service Inventory] Plates",
      "[Dining & Service Inventory] Cutlery Sets",
      "[Dining & Service Inventory] Glasses",
    ],
    offer_menu_rules: [
      {
        label: "Viand",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["mains"]),
      },
      {
        label: "Fried",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["mains", "appetizers"]),
      },
      {
        label: "Pasta",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["noodles"]),
      },
      {
        label: "Drink",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["drinks"]),
      },
      {
        label: "Dessert",
        required_count: 1,
        selectable: true,
        menu_items: itemsInGroups(menu, ["desserts"]),
      },
    ],
    // No sizes configured: this offer is a set menu, and any set-up it is
    // booked alongside is priced on the quotation.
    scaffold_size_options: [],
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const menu = await MenuItem.find({}, "_id category available").lean();
    if (menu.length === 0) {
      console.warn(
        "⚠  No menu items found. The offers will be created with empty food rules — set their allowed items in the admin once the menu exists.",
      );
    }

    for (const offer of buildOffers(menu)) {
      const existing = await Package.findOne({
        name: offer.name,
        offer_type: "special",
      });

      if (existing) {
        Object.assign(existing, offer);
        await existing.save();
        console.log(`↻ Updated Special Offer "${offer.name}"`);
      } else {
        await Package.create(offer);
        console.log(`✅ Created Special Offer "${offer.name}"`);
      }
    }

    process.exit();
  } catch (err) {
    console.error("❌ Special Offer seeder error:", err.message);
    process.exit(1);
  }
};

run();
