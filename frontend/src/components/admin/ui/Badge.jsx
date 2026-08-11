export default function Badge({ status }) {
  const map = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-600",
    refunded: "bg-purple-100 text-purple-700",
    "ocular-pending": "bg-cyan-100 text-cyan-700",
    Paid: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    ok: "bg-emerald-100 text-emerald-700",
    low: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
    available: "bg-emerald-100 text-emerald-700",
    assigned: "bg-blue-100 text-blue-700",
    off: "bg-gray-100 text-gray-500",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
    scheduled: "bg-cyan-100 text-cyan-700",
    VIP: "bg-amber-100 text-amber-700",
    Corporate: "bg-blue-100 text-blue-700",
    Regular: "bg-gray-100 text-gray-600",
    New: "bg-purple-100 text-purple-700",
    "Created": "bg-emerald-100 text-emerald-700",
    "Manual Adjustment": "bg-blue-100 text-blue-700",
    "Reservation Allocated": "bg-amber-100 text-amber-700",
    "Reservation Released": "bg-emerald-100 text-emerald-700",
    "Retired": "bg-red-100 text-red-700",
    "Pending Review": "bg-amber-100 text-amber-800 border border-amber-200",
    "Under Review": "bg-blue-100 text-blue-800 border border-blue-200",
    "Quotation Sent": "bg-blue-100 text-blue-800 border border-blue-200",
    "Revision Requested": "bg-orange-100 text-orange-800 border border-orange-200",
    "Quote Accepted": "bg-emerald-100 text-emerald-800 border border-emerald-200",
    "Awaiting Final Confirmation": "bg-purple-100 text-purple-800 border border-purple-200",
    "change requests": "bg-indigo-100 text-indigo-800 border border-indigo-200",
    "Change Requested": "bg-indigo-100 text-indigo-800 border border-indigo-200",
    "pending deposit": "bg-amber-100 text-amber-800 border border-amber-200",
    "Deposit Pending": "bg-amber-100 text-amber-800 border border-amber-200",
    "Confirmed": "bg-emerald-100 text-emerald-800 border border-emerald-200",
    "Converted to Booking": "bg-emerald-100 text-emerald-800 border border-emerald-200",
    "Cancelled": "bg-red-100 text-red-700 border border-red-200",
    "Quote Rejected": "bg-red-100 text-red-700 border border-red-200",
    "Expired": "bg-gray-100 text-gray-700 border border-gray-200",
    "Ocular Scheduled": "bg-blue-100 text-blue-800 border border-blue-200",
  };
  const cls = map[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}
