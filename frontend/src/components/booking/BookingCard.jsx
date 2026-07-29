import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Settings, 
  ArrowUpCircle, 
  Plus, 
  Download, 
  Activity, 
  X,
  Eye,
  Calendar,
  Send,
  TrendingUp,
  Minus
} from "lucide-react";


const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function BookingCard({
  booking,
  payments,
  canRequestChange,
  startPayment,
  setUpgradingBooking,
  openChangeRequest,
  setAddingGuestsBooking,
  openCatererChat,
  onBookingUpdate
}) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [expanded, setExpanded] = useState(false);
  
  // Local state for guest count editing
  const originalGuestCount = booking.guest_count || 0;
  const [editedGuestCount, setEditedGuestCount] = useState(originalGuestCount);
  const [isSubmittingGuestChange, setIsSubmittingGuestChange] = useState(false);

  // Local state for ocular request
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [isRequestingOcular, setIsRequestingOcular] = useState(false);
  
  const [isCancelling, setIsCancelling] = useState(false);

  const paidAmount = useMemo(() => {
    return payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [booking, payments]);

  const total = Number(booking.total_price || 0);
  const displayPaid = total > 0 ? Math.min(paidAmount, total) : paidAmount;
  const balance = Math.max(0, total - displayPaid);

  let statusVariant = "bg-gray-100 text-gray-600";
  let statusText = booking.status;

  if (booking.status === "confirmed") {
    statusVariant = "bg-emerald-100 text-emerald-700";
    statusText = "Confirmed";
  } else if (booking.status === "pending deposit") {
    statusVariant = "bg-orange-100 text-orange-700";
    statusText = "Deposit Pending";
  } else if (booking.status === "pending") {
    statusVariant = "bg-gray-100 text-gray-700";
    statusText = "Pending";
  } else if (booking.status === "cancelled") {
    statusVariant = "bg-red-100 text-red-700";
    statusText = "Cancelled";
  }

  if (booking.ocular_visit?.status === "pending" || booking.ocular_visit?.status === "requested") {
    statusVariant = "bg-blue-100 text-blue-700";
    statusText = "Ocular Pending";
  }

  const handleGuestChangeRequest = async () => {
    if (editedGuestCount === originalGuestCount) return;
    try {
      setIsSubmittingGuestChange(true);
      await CustomerAPI.requestBookingChange(booking._id, {
        message: `Please update the guest count to ${editedGuestCount}.`
      });
      notify("Guest count change request sent to admin.", "success");
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit change request", "error");
    } finally {
      setIsSubmittingGuestChange(false);
    }
  };

  const handleOcularRequest = async () => {
    if (!ocularDate) {
      notify("Please select a date for the ocular visit.", "error");
      return;
    }
    try {
      setIsRequestingOcular(true);
      await CustomerAPI.requestOcular(booking._id, {
        scheduled_date: ocularDate,
        scheduled_time: ocularTime
      });
      notify("Ocular visit schedule requested.", "success");
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to request ocular visit", "error");
    } finally {
      setIsRequestingOcular(false);
    }
  };

  const handleCancellationRequest = async () => {
    if (!window.confirm("Are you sure you want to request a cancellation and refund? An admin will review this request.")) return;
    try {
      setIsCancelling(true);
      await CustomerAPI.requestCancellation(booking._id);
      notify("Cancellation request sent to admin.", "success");
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit cancellation request", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const eventDateStr = booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBA";
  const refCode = booking.reference || booking._id.substring(0, 8).toUpperCase();
  const title = booking.event_type === "Other" ? booking.event_type_other : booking.event_type;

  return (
    <div className="bg-white rounded-[20px] border border-gray-200 mb-5 shadow-sm overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header (Always Visible) */}
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fdfaf3] flex items-center justify-center text-[#D4AF37] border border-[#f0e6d2]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 11V3"/><path d="M11 11a4 4 0 0 1-8 0V3"/><path d="M7 3v8"/><path d="M3 3v8"/><path d="M11 21v-5"/><path d="M19 3v18"/><path d="M19 11h-4a4 4 0 0 1 0-8h4"/></svg>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-gray-900 text-base">
                {booking.contact_first_name ? `${booking.contact_first_name}'s ` : ""}{title}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusVariant}`}>
                {statusText}
              </span>
            </div>
            <div className="text-[13px] text-gray-400 flex items-center gap-1.5">
              <span>{refCode}</span>
              <span>·</span>
              <span>{title}</span>
              <span>·</span>
              <span>{eventDateStr}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex items-center gap-6">
          <div>
            <div className="font-bold text-gray-900 text-[15px] mb-0.5">{formatCurrency(total)}</div>
            <div className={`text-[13px] font-medium ${balance > 0 ? 'text-[#f97316]' : 'text-emerald-500'}`}>
              Balance: {formatCurrency(balance)}
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors mt-1">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 bg-white">
          <div className="px-6 py-5 grid grid-cols-4 gap-6 text-[13px]">
            <div>
              <p className="text-gray-400 mb-1">Package</p>
              <p className="font-bold text-gray-900 text-[14px]">{booking.package_id?.name || "Custom"}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Guests</p>
              <p className="font-bold text-gray-900 text-[14px]">{booking.guest_count} pax</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Deposit Paid</p>
              <p className="font-bold text-gray-900 text-[14px]">{formatCurrency(displayPaid)}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Balance</p>
              <p className="font-bold text-gray-900 text-[14px]">{formatCurrency(balance)}</p>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Guest Count Editor */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Edit Guest Count</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setEditedGuestCount(Math.max(1, editedGuestCount - 1))}
                    className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="w-24 h-9 rounded-[14px] bg-[#FAF9F5] border border-[#F3F0E6] flex items-center justify-center font-semibold text-[14px] text-gray-900">
                    {editedGuestCount}
                  </div>
                  <button 
                    onClick={() => setEditedGuestCount(editedGuestCount + 1)}
                    className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {editedGuestCount !== originalGuestCount && (
                  <button 
                    onClick={handleGuestChangeRequest}
                    disabled={isSubmittingGuestChange}
                    className="px-4 py-1.5 bg-[#D4AF37] text-white rounded-full text-[13px] font-semibold hover:bg-[#C5A028] disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingGuestChange ? "Submitting..." : "Confirm Change"}
                  </button>
                )}
              </div>
            </div>

            {/* Change Request Banner */}
            {booking.change_request?.status === "pending" && (
              <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-[16px] p-4 flex items-start gap-3">
                <Send className="w-[18px] h-[18px] text-[#3B82F6] mt-0.5" />
                <div>
                  <p className="font-semibold text-[14px] text-[#1E3A8A] mb-0.5">Request sent to Admin for review.</p>
                  <p className="text-[13px] text-[#1E3A8A] opacity-80">Admin will Approve, Reject, or Request Clarification within 24 hours. You'll be notified by email and SMS.</p>
                </div>
              </div>
            )}

            {/* Upgrade Banner Example (If there was a system for tracking upgrade requests specifically) */}
            {booking.upgrade_request?.status === "pending" && (
              <div className="bg-[#FFFDF0] border border-[#FDF3C8] rounded-[16px] p-4 flex items-start gap-3">
                <TrendingUp className="w-[18px] h-[18px] text-[#D4AF37] mt-0.5" />
                <div>
                  <p className="font-semibold text-[14px] text-[#9A7D18] mb-0.5">Package Upgrade Request Sent</p>
                  <p className="text-[13px] text-[#9A7D18] opacity-80">Admin will review and send an updated invoice. The price difference will be charged via PayMongo.</p>
                </div>
              </div>
            )}

            {/* Ocular Request UI if booking is confirmed but no ocular yet */}
            {booking.status === "confirmed" && (!booking.ocular_visit || booking.ocular_visit.status === "pending") && (
              <div className="bg-[#FFFDF0] rounded-[16px] p-4 border border-[#FDF3C8]">
                <p className="text-[11px] font-bold text-[#9A7D18] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar size={13} /> Schedule Ocular Visit
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input 
                    type="date" 
                    value={ocularDate}
                    onChange={(e) => setOcularDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#E8DFB3] rounded-xl text-[13px] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <input 
                    type="time" 
                    value={ocularTime}
                    onChange={(e) => setOcularTime(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#E8DFB3] rounded-xl text-[13px] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button 
                    onClick={handleOcularRequest}
                    disabled={isRequestingOcular}
                    className="px-4 py-1.5 bg-[#D4AF37] text-white rounded-full text-[13px] font-semibold hover:bg-[#C5A028] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isRequestingOcular ? "Requesting..." : "Send Request"}
                  </button>
                </div>
              </div>
            )}

            {/* Ocular Pending Banner */}
            {booking.ocular_visit?.status === "requested" && (
              <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-[16px] p-4 flex items-start gap-3">
                <Calendar className="w-[18px] h-[18px] text-[#3B82F6] mt-0.5" />
                <div>
                  <p className="font-semibold text-[14px] text-[#1E3A8A] mb-0.5">Ocular Visit Request Sent</p>
                  <p className="text-[13px] text-[#1E3A8A] opacity-80">Waiting for admin to confirm the schedule: {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} {booking.ocular_visit.scheduled_time}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button onClick={() => navigate(`/customer/bookings/${booking._id}`)} className="px-4 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <Eye size={14} /> View Reservation
              </button>
              <button onClick={openChangeRequest} className="px-4 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <Settings size={14} /> Edit Details
              </button>
              <button onClick={() => setUpgradingBooking(booking)} className="px-4 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <TrendingUp size={14} /> Upgrade Package
              </button>
              <button className="px-4 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <Plus size={14} /> Add Services
              </button>
              <button className="px-4 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <Download size={14} /> Download Invoice
              </button>
              <button onClick={() => navigate("/customer/payments")} className="px-4 py-1.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
                <Activity size={14} /> Track Payments
              </button>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              {booking.status === "pending deposit" && (
                <button onClick={() => startPayment(booking, false)} className="px-6 py-2 bg-[#D4AF37] text-gray-900 rounded-full text-[13px] font-bold hover:bg-[#C5A028] transition-colors shadow-sm">
                  Pay Deposit
                </button>
              )}
              
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <button 
                  onClick={handleCancellationRequest}
                  disabled={isCancelling || booking.change_request?.status === "pending"}
                  className="px-4 py-1.5 border border-red-200 text-red-500 rounded-full text-[13px] font-medium hover:bg-red-50 flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  <X size={14} /> {isCancelling ? "Processing..." : "Cancel Booking"}
                </button>
              )}
            </div>

            <p className="text-[12px] text-gray-400 mt-2">
              Note: Minor changes (guest count ±10, dietary updates) apply instantly. Package upgrades and major changes require admin approval.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
