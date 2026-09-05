import { Platform } from "react-native";

// In development:
// - Android Emulator uses 10.0.2.2 to access host machine localhost
// - iOS Simulator uses localhost
// - Physical device uses LAN IP address (can be set via EXPO_PUBLIC_API_URL)
const defaultDevHost = Platform.OS === "android" ? "http://10.0.2.2:5000/api" : "http://localhost:5000/api";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultDevHost;
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const ROLES = {
  CUSTOMER: "customer",
  MANAGER: "manager",
  STAFF: "staff",
};

export const BOOKING_STATUSES = {
  DEPOSIT_PENDING: "Deposit Pending",
  DEPOSIT_PAID: "deposit_paid",
  CONFIRMED: "Confirmed",
  OCULAR_SCHEDULED: "Ocular Scheduled",
  FINAL_PAYMENT_PENDING: "Final Payment Pending",
  READY_FOR_EVENT: "Ready for Event",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const INQUIRY_STATUSES = {
  PENDING_REVIEW: "Pending Review",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUESTED: "Revision Requested",
  QUOTATION_SENT: "Quotation Sent",
  QUOTE_ACCEPTED: "Quote Accepted",
  AWAITING_CONFIRMATION: "Awaiting Final Confirmation",
  QUOTE_REJECTED: "Quote Rejected",
  CONVERTED: "Converted to Booking",
  CANCELLED: "Cancelled",
};

export const QUOTATION_STATUSES = {
  DRAFT: "Draft",
  SENT: "Sent",
  REVISION_REQUESTED: "Revision Requested",
  ACCEPTED: "Accepted",
  CONVERTED: "Converted to Booking",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export default {
  API_BASE_URL,
  SOCKET_URL,
  ROLES,
  BOOKING_STATUSES,
  INQUIRY_STATUSES,
  QUOTATION_STATUSES,
};
