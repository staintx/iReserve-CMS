require("dotenv").config();
const mongoose = require("mongoose");
const Quote = require("../models/Quote");
const Inquiry = require("../models/Inquiry");
const Quotation = require("../models/Quotation");
const connectDB = require("../config/db");

async function migrate() {
  await connectDB();
  console.log("Connected to DB, starting migration...");

  const quotes = await Quote.find({});
  console.log(`Found ${quotes.length} quotes to migrate.`);

  for (const quote of quotes) {
    try {
      // 1. Create Inquiry
      const inquiry = new Inquiry({
        customer_id: quote.customer_id,
        event_type: quote.event_type || "N/A",
        event_date: quote.event_date || new Date(),
        start_time: quote.start_time || "N/A",
        guest_count: quote.guest_count || 0,
        venue_type: quote.venue_type,
        province: quote.province,
        municipality: quote.municipality,
        barangay: quote.barangay,
        street: quote.street,
        landmark: quote.landmark,
        zip_code: quote.zip_code,
        budget_range: quote.budget_range,
        special_requests: quote.notes,
        dietary_requirements: quote.dietary_restrictions,
        contact_first_name: quote.full_name ? quote.full_name.split(" ")[0] : "N/A",
        contact_last_name: quote.full_name ? quote.full_name.split(" ").slice(1).join(" ") : "N/A",
        contact_email: quote.email || "N/A",
        contact_phone: quote.phone || "N/A",
        contact_method: quote.contact_method,
        status: quote.status === "converted" ? "Converted to Booking" : "Pending Review",
        is_migrated: true,
        converted_booking_id: quote.converted_booking_id
      });
      await inquiry.save();

      // 2. Create Quotation if necessary (maybe just create a basic one for all)
      const quotation = new Quotation({
        inquiry_id: inquiry._id,
        version_number: 1,
        menu_items: quote.selected_menu ? quote.selected_menu.map(m => ({ name: m })) : [],
        customer_response: quote.customer_response,
        status: "Draft",
        admin_notes: "Migrated from legacy Quote"
      });
      await quotation.save();

      console.log(`Migrated Quote ID ${quote._id} to Inquiry ${inquiry.reference} and Quotation ${quotation.quotation_number}`);
    } catch (error) {
      console.error(`Error migrating Quote ID ${quote._id}:`, error.message);
    }
  }

  console.log("Migration completed.");
  process.exit(0);
}

migrate();
