const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const unwrapJsonOrArray = (raw) => {
  if (!raw) return [];
  let current = raw;
  for (let depth = 0; depth < 5; depth++) {
    if (typeof current === "string") {
      const trimmed = current.trim();
      if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          current = JSON.parse(trimmed);
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (Array.isArray(current)) {
    return current.flat(Infinity);
  }
  if (typeof current === "string") {
    if (current.includes(",")) {
      return current.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [current.trim()].filter(Boolean);
  }
  return [];
};

const sanitizeItemString = (val) => {
  if (val == null) return "";
  let s = String(val).trim();

  for (let i = 0; i < 4; i++) {
    s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  s = s.replace(/^\[+[\s"'\\]*\[/, "[");
  s = s.replace(/\]+[\s"'\\]*\]+$/, "]");

  s = s.replace(/^\[+[\s"'\\]+/, "[");
  s = s.replace(/[\s"'\\]+\]+$/, "]");

  for (let i = 0; i < 4; i++) {
    s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  const openCount = (s.match(/\[/g) || []).length;
  const closeCount = (s.match(/\]/g) || []).length;
  if (closeCount > openCount) {
    s = s.replace(/\]+$/, "");
  } else if (openCount > closeCount && !s.includes("]")) {
    s = s.replace(/^\[+/, "");
  }

  return s.trim();
};

const cleanInclusionsList = (inclusions) => {
  if (!inclusions) return [];
  const rawList = unwrapJsonOrArray(inclusions);
  const seen = new Set();
  const result = [];

  rawList.forEach((item) => {
    if (!item) return;
    const unwrapped = unwrapJsonOrArray(item);
    unwrapped.forEach((subItem) => {
      const cleaned = sanitizeItemString(subItem);
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      result.push(cleaned);
    });
  });

  return result;
};

const cleanFoodItemsList = (foodItems) => {
  if (!foodItems || !Array.isArray(foodItems)) return [];
  const seen = new Set();
  const result = [];

  foodItems.forEach((item) => {
    if (!item) return;
    let category = sanitizeItemString(item.menu_category || item.category || "");
    let rawName = item.item_name !== undefined ? item.item_name : item.name;

    const unwrappedNames = unwrapJsonOrArray(rawName);
    unwrappedNames.forEach((nameCandidate) => {
      let cleanName = sanitizeItemString(nameCandidate);
      cleanName = cleanName.replace(/^\[+|\]+$/g, "").trim();
      if (!cleanName) return;

      const key = `${category.toLowerCase()}:::${cleanName.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);

      result.push({
        menu_category: category,
        item_name: cleanName,
        sort_order: result.length,
      });
    });
  });

  return result;
};

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in environment.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB for data cleanup.");

  const Package = mongoose.model("Package", new mongoose.Schema({}, { strict: false }));
  const packages = await Package.find({}).lean();

  console.log(`Found ${packages.length} packages to inspect and clean.`);

  for (const pkg of packages) {
    console.log(`\nInspecting package: "${pkg.name}" (${pkg._id})`);

    const originalInclusions = pkg.inclusions || [];
    const cleanedInclusions = cleanInclusionsList(originalInclusions);

    const originalFoodItems = pkg.offer_food_items || [];
    const cleanedFoodItems = cleanFoodItemsList(originalFoodItems);

    const inclusionsChanged = JSON.stringify(originalInclusions) !== JSON.stringify(cleanedInclusions);
    const foodItemsChanged = JSON.stringify(originalFoodItems) !== JSON.stringify(cleanedFoodItems);

    if (inclusionsChanged || foodItemsChanged) {
      console.log(`  Updating "${pkg.name}":`);
      if (inclusionsChanged) {
        console.log("  - Inclusions BEFORE:", originalInclusions);
        console.log("  - Inclusions AFTER: ", cleanedInclusions);
      }
      if (foodItemsChanged) {
        console.log("  - Food Items BEFORE count:", originalFoodItems.length);
        console.log("  - Food Items AFTER count: ", cleanedFoodItems.length);
      }

      await Package.updateOne(
        { _id: pkg._id },
        {
          $set: {
            inclusions: cleanedInclusions,
            offer_food_items: cleanedFoodItems,
          },
        }
      );
      console.log(`  Package "${pkg.name}" updated successfully.`);
    } else {
      console.log(`  Package "${pkg.name}" is already clean. No changes needed.`);
    }
  }

  console.log("\nData cleanup completed successfully.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
