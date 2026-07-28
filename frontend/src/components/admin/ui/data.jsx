import React from "react";
import { BookOpen, CreditCard, AlertCircle, RefreshCw, CheckCircle2, Package, UserCheck, FileText } from "lucide-react";

export const RESERVATIONS_DATA = [
  { id: "CRS-KP8X4M", customer: "Sofia Reyes", phone: "+63 917 234 5678", email: "sofia@email.com", eventType: "Wedding Reception", pkg: "Gold Prestige", guests: 120, date: "Aug 2, 2025", venue: "Shangri-La BGC", depositStatus: "Paid", finalPayment: "Pending", status: "confirmed", coordinator: "Ana Santos", total: 146500, deposit: 43950 },
  { id: "CRS-AB3Z9Q", customer: "Ricardo Tan", phone: "+63 998 765 4321", email: "rtan@synergy.ph", eventType: "Corporate Gala", pkg: "Platinum Royal", guests: 200, date: "Sep 18, 2025", venue: "Manila Hotel Grand Ballroom", depositStatus: "Pending", finalPayment: "Pending", status: "pending", coordinator: "—", total: 312000, deposit: 93600 },
  { id: "CRS-RT7D2K", customer: "Ana Villanueva", phone: "+63 912 111 2222", email: "ana.v@gmail.com", eventType: "Debut / 18th Birthday", pkg: "Silver Elegance", guests: 40, date: "Oct 5, 2025", venue: "The Ruins, Cebu", depositStatus: "Paid", finalPayment: "Pending", status: "ocular-pending", coordinator: "Marco Cruz", total: 28500, deposit: 8550 },
  { id: "CRS-MN9P4F", customer: "James Lim", phone: "+63 927 333 4444", email: "j.lim@corp.com", eventType: "Product Launch", pkg: "Gold Prestige", guests: 80, date: "Oct 20, 2025", venue: "Raffles Makati", depositStatus: "Paid", finalPayment: "Paid", status: "completed", coordinator: "Ana Santos", total: 89600, deposit: 26880 },
  { id: "CRS-QW2R5T", customer: "Maria Garcia", phone: "+63 935 555 6666", email: "mgarcia@email.com", eventType: "Birthday Celebration", pkg: "Silver Elegance", guests: 50, date: "Nov 3, 2025", venue: "Home venue", depositStatus: "Pending", finalPayment: "Pending", status: "pending", coordinator: "—", total: 35000, deposit: 10500 },
  { id: "CRS-YU8I1O", customer: "David Santos", phone: "+63 917 777 8888", email: "dsantos@mail.com", eventType: "Anniversary Party", pkg: "Gold Prestige", guests: 60, date: "Nov 15, 2025", venue: "Fairmont Makati", depositStatus: "Paid", finalPayment: "Pending", status: "confirmed", coordinator: "Liza Mendoza", total: 67200, deposit: 20160 },
  { id: "CRS-ER3T6Y", customer: "Claire Reyes", phone: "+63 945 999 0000", email: "claire@email.com", eventType: "Christmas Party", pkg: "Platinum Royal", guests: 150, date: "Dec 20, 2025", venue: "Solaire Resort", depositStatus: "Paid", finalPayment: "Pending", status: "confirmed", coordinator: "Ana Santos", total: 228000, deposit: 68400 },
  { id: "CRS-UJ5K9L", customer: "Tony Marcos", phone: "+63 956 111 3333", email: "tmarcos@mail.com", eventType: "Wedding Reception", pkg: "Gold Prestige", guests: 90, date: "Jan 10, 2026", venue: "Okada Manila", depositStatus: "Paid", finalPayment: "Pending", status: "confirmed", coordinator: "Marco Cruz", total: 99000, deposit: 29700 },
];

export const CUSTOMERS_DATA = [
  { id: 1, name: "Sofia Reyes", phone: "+63 917 234 5678", email: "sofia@email.com", spending: 146500, reservations: 3, lastBooking: "Aug 2, 2025", rating: 5, status: "VIP" },
  { id: 2, name: "Ricardo Tan", phone: "+63 998 765 4321", email: "rtan@synergy.ph", spending: 312000, reservations: 1, lastBooking: "Sep 18, 2025", rating: 4, status: "Corporate" },
  { id: 3, name: "Ana Villanueva", phone: "+63 912 111 2222", email: "ana.v@gmail.com", spending: 28500, reservations: 1, lastBooking: "Oct 5, 2025", rating: 4, status: "New" },
  { id: 4, name: "James Lim", phone: "+63 927 333 4444", email: "j.lim@corp.com", spending: 220000, reservations: 4, lastBooking: "Oct 20, 2025", rating: 5, status: "VIP" },
  { id: 5, name: "Maria Garcia", phone: "+63 935 555 6666", email: "mgarcia@email.com", spending: 35000, reservations: 2, lastBooking: "Nov 3, 2025", rating: 3, status: "Regular" },
  { id: 6, name: "David Santos", phone: "+63 917 777 8888", email: "dsantos@mail.com", spending: 140000, reservations: 3, lastBooking: "Nov 15, 2025", rating: 4, status: "Regular" },
];

export const STAFF_DATA = [
  { id: 1, name: "Marco Dela Cruz", role: "Head Chef", avatar: "MC", rating: 4.9, events: 48, status: "available", phone: "+63 917 100 2000", cert: "Culinary Arts, ServSafe" },
  { id: 2, name: "Ana Santos", role: "Event Coordinator", avatar: "AS", rating: 4.8, events: 62, status: "assigned", phone: "+63 918 200 3000", cert: "MICE Certified" },
  { id: 3, name: "Rico Villanueva", role: "Service Captain", avatar: "RV", rating: 4.7, events: 55, status: "available", phone: "+63 919 300 4000", cert: "Food Safety Level 2" },
  { id: 4, name: "Liza Mendoza", role: "Pastry Chef", avatar: "LM", rating: 4.9, events: 38, status: "available", phone: "+63 920 400 5000", cert: "Patisserie Diploma" },
  { id: 5, name: "Carlo Buenaventura", role: "Sous Chef", avatar: "CB", rating: 4.6, events: 41, status: "off", phone: "+63 921 500 6000", cert: "Culinary Arts" },
  { id: 6, name: "Grace Tan", role: "Event Server", avatar: "GT", rating: 4.5, events: 72, status: "available", phone: "+63 922 600 7000", cert: "BartendingPro" },
  { id: 7, name: "Paolo Reyes", role: "Driver / Delivery", avatar: "PR", rating: 4.4, events: 89, status: "assigned", phone: "+63 923 700 8000", cert: "Driver's License Pr." },
  { id: 8, name: "Jenny Cruz", role: "Event Server", avatar: "JC", rating: 4.7, events: 66, status: "available", phone: "+63 924 800 9000", cert: "Food Safety Level 1" },
];

export const INVENTORY_DATA = [
  { id: 1, name: "Chafing Dishes (Full Size)", category: "Equipment", stock: 24, reserved: 12, available: 12, minStock: 10, supplier: "Kitchen Pro PH", status: "ok" },
  { id: 2, name: "Round Tables (5ft)", category: "Furniture", stock: 40, reserved: 35, available: 5, minStock: 10, supplier: "Event Rentals MNL", status: "low" },
  { id: 3, name: "White Banquet Chairs", category: "Furniture", stock: 300, reserved: 260, available: 40, minStock: 50, supplier: "Event Rentals MNL", status: "low" },
  { id: 4, name: "Porcelain Dinner Plates", category: "Tableware", stock: 500, reserved: 200, available: 300, minStock: 100, supplier: "TableSet PH", status: "ok" },
  { id: 5, name: "Crystal Wine Glasses", category: "Tableware", stock: 400, reserved: 180, available: 220, minStock: 100, supplier: "TableSet PH", status: "ok" },
  { id: 6, name: "White Table Linens", category: "Decorations", stock: 80, reserved: 78, available: 2, minStock: 20, supplier: "Linen House PH", status: "critical" },
  { id: 7, name: "Floral Centerpieces", category: "Decorations", stock: 30, reserved: 24, available: 6, minStock: 10, supplier: "Bloom Events PH", status: "low" },
  { id: 8, name: "Portable Gas Stoves", category: "Equipment", stock: 12, reserved: 4, available: 8, minStock: 5, supplier: "Kitchen Pro PH", status: "ok" },
];

export const PAYMENTS_DATA = [
  { id: "PAY-001", booking: "CRS-KP8X4M", customer: "Sofia Reyes", txnId: "pm_live_Kp8x4mQrSt", paymongo: "Paid", method: "GCash", amount: 43950, date: "Jul 10, 2025", invoice: "INV-2025-0891" },
  { id: "PAY-002", booking: "CRS-MN9P4F", customer: "James Lim", txnId: "pm_live_Mn9p4fABcD", paymongo: "Paid", method: "Card", amount: 26880, date: "Jul 5, 2025", invoice: "INV-2025-0887" },
  { id: "PAY-003", booking: "CRS-YU8I1O", customer: "David Santos", txnId: "pm_live_Yu8i1oEfGh", paymongo: "Paid", method: "Maya", amount: 20160, date: "Jul 15, 2025", invoice: "INV-2025-0894" },
  { id: "PAY-004", booking: "CRS-ER3T6Y", customer: "Claire Reyes", txnId: "pm_live_Er3t6yIjKl", paymongo: "Paid", method: "GCash", amount: 68400, date: "Jul 18, 2025", invoice: "INV-2025-0896" },
  { id: "PAY-005", booking: "CRS-AB3Z9Q", customer: "Ricardo Tan", txnId: "—", paymongo: "Pending", method: "—", amount: 93600, date: "—", invoice: "INV-2025-0895" },
  { id: "PAY-006", booking: "CRS-RT7D2K", customer: "Ana Villanueva", txnId: "pm_live_Rt7d2kMnOp", paymongo: "Paid", method: "Online Banking", amount: 8550, date: "Jul 20, 2025", invoice: "INV-2025-0898" },
];

export const REFUNDS_DATA = [
  { id: "REF-001", customer: "Petra Lim", booking: "CRS-XY1234", deposit: 32000, pct: "80%", amount: 25600, reason: "Cancelled 45 days before event", status: "pending" },
  { id: "REF-002", customer: "Ben Torres", booking: "CRS-ZZ5678", deposit: 15000, pct: "50%", amount: 7500, reason: "Ocular visit — venue not suitable", status: "approved" },
  { id: "REF-003", customer: "Nina Cruz", booking: "CRS-AA9012", deposit: 44000, pct: "0%", amount: 0, reason: "Cancelled 3 days before event", status: "rejected" },
];

export const OCULAR_DATA = [
  { id: 1, customer: "Sofia Reyes", booking: "CRS-KP8X4M", coordinator: "Ana Santos", date: "Jul 25, 2025", time: "2:00 PM", status: "completed", outcome: "Proceed" },
  { id: 2, customer: "Ana Villanueva", booking: "CRS-RT7D2K", coordinator: "Marco Cruz", date: "Jul 30, 2025", time: "10:00 AM", status: "scheduled", outcome: "—" },
  { id: 3, customer: "David Santos", booking: "CRS-YU8I1O", coordinator: "Liza Mendoza", date: "Aug 5, 2025", time: "3:00 PM", status: "scheduled", outcome: "—" },
  { id: 4, customer: "James Lim", booking: "CRS-MN9P4F", coordinator: "Ana Santos", date: "Jul 10, 2025", time: "11:00 AM", status: "completed", outcome: "Proceed" },
];

export const AUDIT_DATA = [
  { date: "Jul 22, 2025", time: "09:42 AM", admin: "System Admin", action: "Approved booking", module: "Reservations", record: "CRS-KP8X4M", ip: "203.177.12.45", device: "Chrome / Mac" },
  { date: "Jul 22, 2025", time: "09:38 AM", admin: "System Admin", action: "Verified payment", module: "Finance", record: "PAY-001", ip: "203.177.12.45", device: "Chrome / Mac" },
  { date: "Jul 21, 2025", time: "04:15 PM", admin: "Ana Santos", action: "Assigned to event", module: "Staff", record: "CRS-ER3T6Y", ip: "180.190.44.21", device: "Firefox / Win" },
  { date: "Jul 21, 2025", time: "02:30 PM", admin: "System Admin", action: "Updated inventory", module: "Inventory", record: "Round Tables", ip: "203.177.12.45", device: "Chrome / Mac" },
  { date: "Jul 20, 2025", time: "11:00 AM", admin: "System Admin", action: "Generated invoice", module: "Finance", record: "INV-2025-0898", ip: "203.177.12.45", device: "Chrome / Mac" },
  { date: "Jul 19, 2025", time: "03:00 PM", admin: "Ana Santos", action: "Completed ocular visit", module: "Ocular", record: "CRS-MN9P4F", ip: "180.190.44.21", device: "Chrome / iOS" },
];


export const REVENUE_DATA = [
  { month: "Jan", revenue: 280000, expenses: 95000 },
  { month: "Feb", revenue: 320000, expenses: 110000 },
  { month: "Mar", revenue: 410000, expenses: 135000 },
  { month: "Apr", revenue: 375000, expenses: 120000 },
  { month: "May", revenue: 490000, expenses: 155000 },
  { month: "Jun", revenue: 520000, expenses: 165000 },
  { month: "Jul", revenue: 615000, expenses: 190000 },
  { month: "Aug", revenue: 580000, expenses: 175000 },
  { month: "Sep", revenue: 710000, expenses: 220000 },
  { month: "Oct", revenue: 670000, expenses: 205000 },
  { month: "Nov", revenue: 820000, expenses: 255000 },
  { month: "Dec", revenue: 950000, expenses: 295000 },
];

export const BOOKINGS_DATA = [
  { day: "Mon", bookings: 4 }, { day: "Tue", bookings: 7 }, { day: "Wed", bookings: 5 },
  { day: "Thu", bookings: 9 }, { day: "Fri", bookings: 12 }, { day: "Sat", bookings: 15 }, { day: "Sun", bookings: 8 },
];

export const STATUS_PIE = [
  { name: "Confirmed", value: 48, color: "#22C55E" },
  { name: "Pending", value: 22, color: "#F59E0B" },
  { name: "Completed", value: 18, color: "#3B82F6" },
  { name: "Cancelled", value: 8, color: "#EF4444" },
  { name: "Refunded", value: 4, color: "#8B5CF6" },
];

export const PKG_DATA = [
  { name: "Gold Prestige", bookings: 45 },
  { name: "Platinum Royal", bookings: 28 },
  { name: "Silver Elegance", bookings: 19 },
  { name: "Custom Menu", bookings: 13 },
];

export const ACTIVITY_FEED = [
  { icon: <BookOpen size={13} />, color: "bg-blue-100 text-blue-600", msg: "New booking received — CRS-QW2R5T by Maria Garcia", time: "3 min ago" },
  { icon: <CreditCard size={13} />, color: "bg-emerald-100 text-emerald-600", msg: "Deposit payment verified — CRS-ER3T6Y · ₱68,400", time: "12 min ago" },
  { icon: <AlertCircle size={13} />, color: "bg-red-100 text-red-600", msg: "Inventory alert — White Table Linens at critical stock (2 remaining)", time: "1 hr ago" },
  { icon: <RefreshCw size={13} />, color: "bg-orange-100 text-orange-600", msg: "Refund request submitted — CRS-XY1234 · ₱25,600", time: "2 hrs ago" },
  { icon: <CheckCircle2 size={13} />, color: "bg-emerald-100 text-emerald-600", msg: "Booking approved — CRS-UJ5K9L", time: "3 hrs ago" },
  { icon: <Package size={13} />, color: "bg-purple-100 text-purple-600", msg: "Package modified — Gold Prestige price updated to ₱880/pax", time: "5 hrs ago" },
  { icon: <UserCheck size={13} />, color: "bg-blue-100 text-blue-600", msg: "Staff assigned — Ana Santos → CRS-ER3T6Y", time: "6 hrs ago" },
  { icon: <FileText size={13} />, color: "bg-gray-100 text-gray-600", msg: "Invoice generated — INV-2025-0898 for CRS-RT7D2K", time: "8 hrs ago" },
];

export const KANBAN_DATA = {
  "Pending Review": [
    { id: "CB-001", customer: "Josie Tan", guests: 80, budget: "₱55,000", menu: "Filipino + Western Fusion", date: "Nov 20, 2025", requests: "Surprise element for birthday" },
    { id: "CB-002", customer: "Karl Mendez", guests: 200, budget: "₱180,000", menu: "Full International Buffet", date: "Dec 5, 2025", requests: "Halal section required" },
  ],
  "Needs Revision": [
    { id: "CB-003", customer: "Pia Santos", guests: 50, budget: "₱40,000", menu: "Vegetarian Only", date: "Oct 30, 2025", requests: "No dairy, nut-free zone" },
  ],
  "Approved": [
    { id: "CB-004", customer: "Leo Cruz", guests: 120, budget: "₱95,000", menu: "Seafood Specialties", date: "Sep 25, 2025", requests: "Live cooking station" },
  ],
  "Rejected": [
    { id: "CB-005", customer: "Rose Bautista", guests: 30, budget: "₱8,000", menu: "Custom Desserts Only", date: "Aug 30, 2025", requests: "Below minimum budget" },
  ],
};
