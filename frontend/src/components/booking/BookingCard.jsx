import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { Button } from "../ui/button";
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Settings, 
  Plus, 
  Download, 
  Eye, 
  Calendar, 
  Send, 
  TrendingUp, 
  Utensils, 
  Sparkles, 
  Layers, 
  MessageSquare, 
  CreditCard, 
  Clock, 
  MapPin, 
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "₱0.00";
  return `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function BookingCard({
  booking,
  payments = [],
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
  
  // Ocular schedule form state
  const [showOcularForm, setShowOcularForm] = useState(false);
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [isRequestingOcular, setIsRequestingOcular] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Service type determination
  const serviceType = booking.service_type || (
    booking.event_type?.toLowerCase().includes("food delivery") || booking.delivery_method !== "setup" ? "Food Only" :
    !booking.include_food ? "Event Setup Only" : "Food and Event Setup"
  );
  const isFoodOnly = serviceType === "Food Only";

  // Financial calculations
  const paidAmount = useMemo(() => {
    return payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [booking, payments]);

  const total = Number(booking.total_price || 0);
  const displayPaid = total > 0 ? Math.min(paidAmount, total) : paidAmount;
  const balance = Math.max(0, total - displayPaid);
  const isFullyPaid = balance <= 0 && total > 0;

  // Status Badge Logic
  const rawStatus = (booking.status || "").toLowerCase();
  let statusBadge = {
    label: booking.status,
    className: "bg-slate-100 text-slate-700 font-semibold"
  };

  if (["confirmed", "converted to booking"].includes(rawStatus)) {
    statusBadge = {
      label: "Confirmed & Reserved",
      className: "bg-emerald-600 text-white font-bold shadow-xs"
    };
  } else if (["deposit pending", "pending deposit"].includes(rawStatus)) {
    statusBadge = {
      label: "Deposit Needed",
      className: "bg-amber-500 text-slate-950 font-bold shadow-xs"
    };
  } else if (rawStatus === "ocular scheduled") {
    statusBadge = {
      label: "Ocular Scheduled",
      className: "bg-blue-600 text-white font-bold shadow-xs"
    };
  } else if (rawStatus === "completed") {
    statusBadge = {
      label: "Event Completed",
      className: "bg-slate-100 text-slate-700 font-semibold"
    };
  } else if (rawStatus === "cancelled") {
    statusBadge = {
      label: "Cancelled",
      className: "bg-rose-100 text-rose-700 font-semibold"
    };
  } else if (booking.ocular_visit?.status === "requested") {
    statusBadge = {
      label: "Ocular Visit Requested",
      className: "bg-blue-100 text-blue-900 font-semibold border border-blue-200"
    };
  }

  // Ocular Visit Request Handler
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
      setShowOcularForm(false);
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to request ocular visit.", "error");
    } finally {
      setIsRequestingOcular(false);
    }
  };

  // Cancellation Request Handler
  const handleCancellationRequest = async () => {
    if (!window.confirm("Are you sure you want to request cancellation for this booking? An admin will review your request.")) return;
    try {
      setIsCancelling(true);
      await CustomerAPI.requestCancellation(booking._id);
      notify("Cancellation request sent to admin team.", "success");
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit cancellation request.", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const eventDateStr = booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA";
  const refCode = booking.reference || `BK-${booking._id.substring(0, 6).toUpperCase()}`;
  const eventTitle = booking.event_type === "Other" ? booking.event_type_other : booking.event_type;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-md mb-4">
      
      {/* Primary Card Header */}
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Left Info Group */}
        <div className="flex items-start gap-4">
          
          {/* Dynamic Service Icon Avatar */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            serviceType === "Food Only" ? "bg-amber-50 text-amber-600 border-amber-200/80" :
            serviceType === "Event Setup Only" ? "bg-blue-50 text-blue-600 border-blue-200/80" :
            "bg-indigo-50 text-indigo-600 border-indigo-200/80"
          }`}>
            {serviceType === "Food Only" ? <Utensils className="w-6 h-6" /> :
             serviceType === "Event Setup Only" ? <Layers className="w-6 h-6" /> :
             <Sparkles className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-serif font-bold text-slate-900 text-base">
                {booking.contact_first_name ? `${booking.contact_first_name}'s ` : ""}{eventTitle}
              </h3>

              <span className={`px-2.5 py-0.5 rounded-full text-xs ${statusBadge.className}`}>
                {statusBadge.label}
              </span>

              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                {serviceType}
              </span>

              {booking.is_revised && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Revised (v{booking.revision_count || 1})
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-slate-600">{refCode}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {eventDateStr} {booking.start_time ? `@ ${booking.start_time}` : ""}
              </span>
              <span>•</span>
              <span>{booking.package_id?.name || "Custom Catering"}</span>
            </div>
          </div>
        </div>

        {/* Right Financial & Action Group */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400 font-medium">Grand Total</div>
            <div className="font-bold text-slate-900 text-base">{formatCurrency(total)}</div>
            
            {isFullyPaid ? (
              <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 sm:justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
              </div>
            ) : balance > 0 ? (
              <div className="text-xs font-bold text-amber-600">
                Balance: {formatCurrency(balance)}
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Action Banners & Primary Payment Call-to-Actions */}
      {["deposit pending", "pending deposit"].includes(rawStatus) && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Deposit payment required to confirm and lock in your reservation date.</span>
          </div>
          
          <Button
            onClick={() => startPayment(booking, false)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2 rounded-xl shadow-sm shrink-0"
          >
            <CreditCard className="w-4 h-4 mr-1.5" /> Pay Deposit Now
          </Button>
        </div>
      )}

      {["confirmed", "converted to booking"].includes(rawStatus) && balance > 0 && (
        <div className="px-5 py-3 bg-blue-50/70 border-t border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-900">
            <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Remaining balance of <strong>{formatCurrency(balance)}</strong> is due prior to event setup.</span>
          </div>
          
          <Button
            onClick={() => startPayment(booking, true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm shrink-0"
          >
            Pay Remaining Balance
          </Button>
        </div>
      )}

      {/* Expanded Content Section */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-6">
          
          {/* Quick Metrics 4-Column Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Package & Service</span>
              <strong className="text-slate-900 text-sm block truncate">{booking.package_id?.name || "Custom Booking"}</strong>
              <span className="text-slate-500 text-[11px]">{serviceType}</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Guest Count</span>
              <strong className="text-slate-900 text-sm block">{booking.guest_count} Guests</strong>
              <button 
                onClick={() => setAddingGuestsBooking && setAddingGuestsBooking(booking)}
                className="text-amber-700 font-semibold text-[11px] hover:underline flex items-center gap-0.5 mt-0.5"
              >
                + Add Guests
              </button>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Deposit Paid</span>
              <strong className="text-slate-900 text-sm block">{formatCurrency(displayPaid)}</strong>
              <span className="text-emerald-600 text-[11px] font-medium">Approved</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Remaining Balance</span>
              <strong className={`text-sm block ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {formatCurrency(balance)}
              </strong>
              <span className="text-slate-500 text-[11px]">{isFullyPaid ? "Fully Cleared" : "Payment Due"}</span>
            </div>
          </div>

          {/* Pending Change Request Alert */}
          {booking.change_request?.status === "pending" && booking.change_request?.message && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-xs">
              <Send className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <strong className="font-bold text-indigo-950 block mb-0.5">Change Request Under Admin Review</strong>
                <p className="text-indigo-800 leading-relaxed">{booking.change_request.message}</p>
                <span className="text-[11px] text-indigo-600 mt-1 block">Sent on: {booking.change_request.requested_at ? new Date(booking.change_request.requested_at).toLocaleDateString() : "Recently"}</span>
              </div>
            </div>
          )}

          {/* Ocular Scheduling Box (Setup events only) */}
          {!isFoodOnly && ["confirmed", "converted to booking"].includes(rawStatus) && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" /> Site Ocular Visit Schedule
                </span>
                
                {booking.ocular_visit?.scheduled_date ? (
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full text-xs">
                    {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()} {booking.ocular_visit.scheduled_time || ""}
                  </span>
                ) : (
                  <button 
                    onClick={() => setShowOcularForm(!showOcularForm)}
                    className="text-xs text-amber-700 font-semibold hover:underline"
                  >
                    {showOcularForm ? "Cancel" : "+ Request Ocular Date"}
                  </button>
                )}
              </div>

              {showOcularForm && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <input 
                    type="date" 
                    value={ocularDate}
                    onChange={(e) => setOcularDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-amber-500 focus:border-amber-500"
                  />
                  <input 
                    type="time" 
                    value={ocularTime}
                    onChange={(e) => setOcularTime(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-amber-500 focus:border-amber-500"
                  />
                  <Button 
                    onClick={handleOcularRequest}
                    disabled={isRequestingOcular}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs"
                  >
                    {isRequestingOcular ? "Submitting..." : "Submit Ocular Schedule"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Structured Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customer/bookings/${booking._id}`)}
              className="text-xs rounded-xl border-slate-200 hover:bg-slate-100 font-medium"
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> View Full Reservation
            </Button>

            {openCatererChat && (
              <Button
                variant="outline"
                size="sm"
                onClick={openCatererChat}
                className="text-xs rounded-xl border-slate-200 hover:bg-purple-50 hover:border-purple-200 text-purple-700 font-medium"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Chat with Caterer
              </Button>
            )}

            {openChangeRequest && (
              <Button
                variant="outline"
                size="sm"
                onClick={openChangeRequest}
                className="text-xs rounded-xl border-slate-200 hover:bg-slate-100 font-medium"
              >
                <Settings className="w-3.5 h-3.5 mr-1 text-slate-500" /> Request Details Change
              </Button>
            )}

            {setUpgradingBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUpgradingBooking(booking)}
                className="text-xs rounded-xl border-slate-200 hover:bg-amber-50 hover:border-amber-200 text-amber-800 font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> Upgrade Package
              </Button>
            )}

            {!["cancelled", "completed"].includes(rawStatus) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancellationRequest}
                disabled={isCancelling || booking.change_request?.status === "pending"}
                className="text-xs rounded-xl text-rose-600 hover:bg-rose-50 font-medium ml-auto"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> {isCancelling ? "Processing..." : "Cancel Reservation"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
