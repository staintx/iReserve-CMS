const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Customer = require("../models/Customer");
const Package = require("../models/Package");
const MenuItem = require("../models/MenuItem");
const Inventory = require("../models/Inventory");
const BusinessInfo = require("../models/BusinessInfo");
const Gallery = require("../models/Gallery");

const Quote = require("../models/Quote");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Rating = require("../models/Rating");
const Notification = require("../models/Notification");
const SystemLog = require("../models/SystemLog");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const StaffAvailability = require("../models/StaffAvailability");

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Promise.all([
      User.deleteMany(),
      Customer.deleteMany(),
      Package.deleteMany(),
      MenuItem.deleteMany(),
      Inventory.deleteMany(),
      BusinessInfo.deleteMany(),
      Gallery.deleteMany(),

      Quote.deleteMany(),
      Booking.deleteMany(),
      Payment.deleteMany(),
      Rating.deleteMany(),
      Notification.deleteMany(),
      SystemLog.deleteMany(),
      Conversation.deleteMany(),
      Message.deleteMany(),
      StaffAvailability.deleteMany()
    ]);

    const passwordHash = await bcrypt.hash("password123", 10);

    const [admin, manager, staffOne, staffTwo, customerUser] = await User.create([
      {
        full_name: "System Admin",
        email: "admin@ireserve.com",
        username: "admin",
        password: passwordHash,
        role: "admin",
        is_verified: true
      },
      {
        full_name: "Maria Manager",
        email: "manager@ireserve.com",
        username: "manager",
        password: passwordHash,
        role: "staff",
        is_verified: true
      },
      {
        full_name: "Stefan Staff",
        email: "staff1@ireserve.com",
        username: "staff1",
        password: passwordHash,
        role: "staff",
        is_verified: true
      },
      {
        full_name: "Carla Crew",
        email: "staff2@ireserve.com",
        username: "staff2",
        password: passwordHash,
        role: "staff",
        is_verified: true
      },
      {
        full_name: "Celine Customer",
        email: "customer@ireserve.com",
        username: "customer",
        password: passwordHash,
        role: "customer",
        is_verified: true
      }
    ]);

    await Customer.create({
      full_name: "Joan Guest",
      email: "guest@ireserve.com",
      phone: "09171234567",
      address: "Sto. Tomas, Batangas",
      password: passwordHash,
      is_verified: true
    });

    const [basicPackage, premiumPackage] = await Package.create([
      {
        name: "Intimate Gathering",
        description: "Small event package for up to 50 guests.",
        fullDescription: "Includes buffet, service staff, and basic decor.",
        size: "small",
        price_min: 25000,
        price_max: 40000,
        booking_requirements: "50% downpayment to reserve date.",
        cancellation_policy: "Full refund 14 days before event.",
        inclusions: ["Buffet", "Basic decor", "Service staff"],
        add_ons: ["Cocktail bar", "Photo booth"],
        image_url: "https://example.com/packages/intimate.jpg"
      },
      {
        name: "Grand Celebration",
        description: "Premium package for 150 guests.",
        fullDescription: "Includes premium buffet, full styling, and event crew.",
        size: "large",
        price_min: 95000,
        price_max: 140000,
        booking_requirements: "40% downpayment to reserve date.",
        cancellation_policy: "Partial refund 21 days before event.",
        inclusions: ["Premium buffet", "Full styling", "Event coordinator"],
        add_ons: ["Live band", "LED wall"],
        image_url: "https://example.com/packages/grand.jpg"
      }
    ]);

    const [menuAdobo, menuPasta, menuSalad] = await MenuItem.create([
      {
        name: "Chicken Adobo",
        description: "Classic soy-garlic adobo.",
        category: "Main",
        image_url: "https://example.com/menu/adobo.jpg"
      },
      {
        name: "Creamy Carbonara",
        description: "Pasta with bacon and cream sauce.",
        category: "Main",
        image_url: "https://example.com/menu/carbonara.jpg"
      },
      {
        name: "Fresh Garden Salad",
        description: "Lettuce, tomato, and house vinaigrette.",
        category: "Side",
        image_url: "https://example.com/menu/salad.jpg"
      }
    ]);

    await Inventory.create([
      { item_name: "Round table", quantity: 60, category: "Furniture" },
      { item_name: "Chairs", quantity: 300, category: "Furniture" },
      { item_name: "Chafing dish", quantity: 25, category: "Equipment" }
    ]);

    await BusinessInfo.create({
      business_name: "Caezelle's Food, Catering & Services",
      contact_number: "09170001111",
      email: "hello@caezelles.com",
      address: "Batangas City, Batangas",
      hours: "Mon-Sat 8:00 AM - 6:00 PM",
      facebook: "https://facebook.com/caezelles",
      instagram: "https://instagram.com/caezelles",
      terms_url: "https://example.com/terms",
      privacy_url: "https://example.com/privacy"
    });

    await Gallery.create([
      {
        title: "Garden Wedding",
        category: "Wedding",
        image_url: "https://example.com/gallery/wedding1.jpg",
        description: "Outdoor wedding setup."
      },
      {
        title: "Corporate Lunch",
        category: "Corporate",
        image_url: "https://example.com/gallery/corporate1.jpg",
        description: "Business lunch buffet."
      }
    ]);



    const booking = await Booking.create({
      customer_id: customerUser._id,
      package_id: basicPackage._id,
      event_manager_id: manager._id,
      staff_ids: [staffOne._id, staffTwo._id],

      event_type: "Birthday",
      event_theme: "Rustic",
      event_date: new Date("2026-08-15"),
      start_time: "18:00",
      guest_count: 50,
      duration_hours: 4,
      include_food: true,
      venue_type: "Private",
      indoor_outdoor: "Indoor",
      province: "Batangas",
      municipality: "Lipa City",
      barangay: "Tambo",
      street: "Sunset Road",
      landmark: "Near City Hall",
      zip_code: "4217",
      venue_contact_name: "Ana Cruz",
      venue_contact_phone: "09181234567",
      selected_menu: [menuAdobo.name, menuPasta.name, menuSalad.name],
      menu_items: [
        { name: menuAdobo.name, note: "Less salt", price: 250 },
        { name: menuPasta.name, note: "Extra cheese", price: 280 },
        { name: menuSalad.name, note: "No nuts", price: 120 }
      ],
      dietary_restrictions: "No shellfish",
      special_requests: "Stage lighting setup.",
      additional_services: ["Styling", "Live host"],
      service_items: [
        { name: "Sound system", quantity: 1, price: 5000 },
        { name: "Stage lights", quantity: 4, price: 2000 }
      ],
      contact_first_name: "Celine",
      contact_last_name: "Customer",
      contact_email: customerUser.email,
      contact_phone: "09191234567",
      contact_method: "email",
      total_price: 42000,
      payment_method: "bank",
      payment_status: "partial",
      status: "active",
      staff_assignments: [
        { role: "Head server", user_id: staffOne._id, name: staffOne.full_name, phone: "09175551234" },
        { role: "Crew", user_id: staffTwo._id, name: staffTwo.full_name, phone: "09175554321" }
      ],
      event_manager_notes: [{ note: "Confirm layout with client." }],
      staff_reports: [
        { staff_id: staffOne._id, role: "Head server", note: "Site ready." }
      ]
    });

    await Quote.create({
      customer_id: customerUser._id,
      service_type: "Full styling",
      event_type: "Wedding",
      event_theme: "Classic",
      event_date: new Date("2026-11-02"),
      start_time: "16:00",
      guest_count: 120,
      duration_hours: 6,
      venue_type: "Event hall",
      indoor_outdoor: "Indoor",
      province: "Batangas",
      municipality: "Batangas City",
      barangay: "Alangilan",
      budget_range: "100k-150k",
      furniture_setup: ["Round tables", "Stage"],
      add_ons: ["Floral arch"],
      lighting_options: ["Warm lights"],
      decor_options: ["Classic white"],
      theme_colors: "White and gold",
      full_name: customerUser.full_name,
      email: customerUser.email,
      phone: "09191234567",
      contact_method: "phone",
      notes: "Preferred 4-tier cake table."
    });

    await Payment.create({
      booking_id: booking._id,
      customer_id: customerUser._id,
      amount: 20000,
      payment_type: "downpayment",
      method: "bank",
      proof_url: "https://example.com/payments/proof1.jpg",
      status: "approved",
      gateway: "manual",
      paid_at: new Date()
    });

    await Rating.create({
      customer_id: customerUser._id,
      booking_id: booking._id,
      stars: 5,
      review: "Great service and tasty food!"
    });

    const conversation = await Conversation.create({
      type: "event",
      customer_id: customerUser._id,
      event_manager_id: manager._id,
      booking_id: booking._id,

      last_message: "Thanks for confirming the menu.",
      last_message_at: new Date()
    });

    await Message.create([
      {
        conversation_id: conversation._id,
        sender_id: customerUser._id,
        body: "Thank you for the quick update!"
      },
      {
        conversation_id: conversation._id,
        sender_id: manager._id,
        body: "We will send the final menu by tomorrow."
      }
    ]);

    await Notification.create([
      {
        user_id: manager._id,
        title: "New booking assigned",
        body: "You have been assigned to a new booking.",
        type: "info",
        link: "/manager/bookings"
      },
      {
        user_id: customerUser._id,
        title: "Payment received",
        body: "We received your downpayment.",
        type: "success",
        link: "/customer/payments"
      }
    ]);

    await SystemLog.create({
      user_id: admin._id,
      action: "seed",
      details: "Mock data seeded via seed1.js"
    });

    await StaffAvailability.create([
      { user_id: staffOne._id, date: new Date("2026-08-15") },
      { user_id: staffTwo._id, date: new Date("2026-08-15") }
    ]);

    console.log("✅ Seed1 mock data inserted");
    process.exit();
  } catch (err) {
    console.error("❌ Seed1 Error:", err.message);
    process.exit(1);
  }
};

seed();
