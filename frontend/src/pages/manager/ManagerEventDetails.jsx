import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import Badge from "../../components/admin/ui/Badge";
import { useConfirm } from "../../components/feedback/confirmContext";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  Sparkles,
  Info,
  AlertCircle,
  AlertTriangle,
  Lock,
  Utensils,
  Layers,
  Banknote,
  ExternalLink,
  CheckCircle2,
  PackageCheck,
  Check,
  FileText,
  ShieldCheck
} from "lucide-react";
import { 
  getEventTimingStatus, 
  getBookingVenueLocation, 
  formatEventStartTime 
} from "../../utils/format";

function QtyStepper({ label, value, max, tone = "neutral", disabled = false, onStep, onChange }) {
  const danger = tone === "danger";
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border p-1.5 ${
        danger ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <span
        className={`pl-1.5 text-[11px] font-bold uppercase tracking-wider ${
          danger ? "text-rose-800" : "text-slate-600"
        }`}
      >
        {label}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={disabled || Number(value) <= 0}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className={`grid h-8 w-8 place-items-center rounded border border-slate-200 text-sm font-bold transition-colors disabled:opacity-40 cursor-pointer ${
            danger
              ? "bg-white text-rose-800 hover:bg-rose-100"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          -
        </button>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max={max}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`h-8 w-12 rounded border bg-white text-center text-xs font-bold tabular-nums outline-none focus:ring-1 focus:ring-[#4C81E0] disabled:bg-slate-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            danger ? "border-rose-300 text-rose-900" : "border-slate-300 text-slate-900"
          }`}
        />
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={disabled || Number(value) >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className={`grid h-8 w-8 place-items-center rounded border border-slate-200 text-sm font-bold transition-colors disabled:opacity-40 cursor-pointer ${
            danger
              ? "bg-white text-rose-800 hover:bg-rose-100"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const TAG_OPTIONS = [
  { label: "No issues", value: "no_issues", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { label: "Late start", value: "late_start", icon: Clock, color: "bg-amber-50 text-amber-800 border-amber-200" },
  { label: "Missing equipment", value: "missing_items", icon: PackageCheck, color: "bg-rose-50 text-rose-800 border-rose-200" },
  { label: "Damaged gear", value: "damaged_gear", icon: AlertTriangle, color: "bg-rose-50 text-rose-800 border-rose-200" },
  { label: "Extra hours", value: "extra_hours", icon: Clock, color: "bg-blue-50 text-blue-800 border-blue-200" },
  { label: "Other", value: "other", icon: FileText, color: "bg-slate-100 text-slate-800 border-slate-200" }
];

export default function ManagerEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Equipment Check State
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [submittingEquipment, setSubmittingEquipment] = useState(false);

  // Incident & Shift Note State
  const [note, setNote] = useState("");
  const [quickTags, setQuickTags] = useState([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [completingEvent, setCompletingEvent] = useState(false);

  const initEquipmentManifest = (data) => {
    const initialReturns = [];
    const assignedItems = data.inventory_items || [];
    const returns = data.equipment_returns || [];

    if (returns.length > 0) {
      returns.forEach((ret) => {
        const booked = Number(ret.quantity_booked || 1);
        const qtyRet = Number(ret.quantity_returned !== undefined ? ret.quantity_returned : booked);
        const qtyDam = Number(ret.quantity_damaged !== undefined ? ret.quantity_damaged : 0);
        const isComplete = (qtyRet + qtyDam) === booked;
        initialReturns.push({
          inventory_id: ret.inventory_id?._id || ret.inventory_id || null,
          name: ret.name || ret.inventory_id?.name || ret.inventory_id?.item_name || "Equipment Item",
          quantity_booked: booked,
          quantity_returned: qtyRet,
          quantity_damaged: qtyDam,
          notes: ret.notes || "",
          _verified: true,
          _markedMissing: !isComplete
        });
      });
    } else if (assignedItems.length > 0) {
      assignedItems.forEach((item) => {
        initialReturns.push({
          inventory_id: item.inventory_id?._id || item.inventory_id || null,
          name: item.name || item.inventory_id?.name || item.inventory_id?.item_name || "Equipment Item",
          quantity_booked: Number(item.quantity || 1),
          quantity_returned: Number(item.quantity || 1),
          quantity_damaged: 0,
          notes: "",
          _verified: false,
          _markedMissing: false
        });
      });
    } else {
      [
        { name: "Chafing Dishes with Fuel Holders", quantity: 4 },
        { name: "Dinner Plates & Utensil Sets", quantity: data.guest_count || 50 },
        { name: "Beverage Dispensers / Pitchers", quantity: 4 },
        { name: "Serving Spoons & Tongs", quantity: 8 },
        { name: "Banquet Linen & Table Covers", quantity: 6 }
      ].forEach((item) => {
        initialReturns.push({
          name: item.name,
          quantity_booked: item.quantity,
          quantity_returned: item.quantity,
          quantity_damaged: 0,
          notes: "",
          _verified: false,
          _markedMissing: false
        });
      });
    }

    setEquipmentList(initialReturns);
    setEquipmentNotes(data.equipment_notes || "");
  };

  const loadEvent = async () => {
    setLoading(true);
    try {
      const res = await ManagerAPI.getBooking(id);
      const data = res.data;
      setBooking(data);
      initEquipmentManifest(data);
    } catch (err) {
      console.error(err);
      notify("Failed to load assigned event details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const timing = useMemo(() => {
    return booking ? getEventTimingStatus(booking) : { isUpcoming: true, isStarted: false, isFinished: false };
  }, [booking]);

  const isCompleted = useMemo(() => {
    return Boolean(booking && ["completed", "Completed"].includes(booking.status));
  }, [booking]);

  const hasSupportingInfo = useMemo(() => {
    if (!booking) return false;
    const hasMenu = (booking.menu_items || []).length > 0;
    const hasServices = (booking.service_items || []).length > 0 || (booking.additional_charges || []).length > 0;
    return hasMenu || hasServices;
  }, [booking]);

  // Back navigation handler preserving origin tab & search if present
  const handleBack = () => {
    const originTab = location.state?.fromTab;
    const originSearch = location.state?.fromSearch;
    if (originTab) {
      const params = new URLSearchParams();
      params.set("tab", originTab);
      if (originSearch) params.set("q", originSearch);
      navigate(`/manager/bookings?${params.toString()}`);
    } else {
      navigate("/manager/bookings");
    }
  };

  // Equipment Stepper and Edit Handlers
  const stepReturnedQty = (index, delta) => {
    setEquipmentList((prev) => {
      const copy = [...prev];
      const maxAllowed = copy[index].quantity_booked - (copy[index].quantity_damaged || 0);
      const current = Number(copy[index].quantity_returned || 0);
      const next = Math.max(0, Math.min(maxAllowed, current + delta));
      const isMatch = (next + (copy[index].quantity_damaged || 0)) === copy[index].quantity_booked;
      copy[index] = { 
        ...copy[index], 
        quantity_returned: next, 
        _verified: true, 
        _markedMissing: !isMatch 
      };
      return copy;
    });
  };

  const stepDamagedQty = (index, delta) => {
    setEquipmentList((prev) => {
      const copy = [...prev];
      const maxAllowed = (copy[index].quantity_booked || 0) - (copy[index].quantity_returned || 0);
      const current = Number(copy[index].quantity_damaged || 0);
      const next = Math.max(0, Math.min(maxAllowed, current + delta));
      const isMatch = (next + (copy[index].quantity_returned || 0)) === copy[index].quantity_booked;
      copy[index] = { 
        ...copy[index], 
        quantity_damaged: next, 
        _verified: true, 
        _markedMissing: !isMatch 
      };
      return copy;
    });
  };

  const handleUpdateReturnedQuantity = (index, value) => {
    setEquipmentList((prev) => {
      const next = [...prev];
      const maxAllowed = next[index].quantity_booked - (next[index].quantity_damaged || 0);
      let val = parseInt(value, 10);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > maxAllowed) val = maxAllowed;
      next[index] = { ...next[index], quantity_returned: val };
      if (val + (next[index].quantity_damaged || 0) === next[index].quantity_booked) {
        next[index]._markedMissing = false;
        next[index]._verified = true;
      }
      return next;
    });
  };

  const handleUpdateDamagedQuantity = (index, value) => {
    setEquipmentList((prev) => {
      const next = [...prev];
      const maxAllowed = next[index].quantity_booked - (next[index].quantity_returned || 0);
      let val = parseInt(value, 10);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > maxAllowed) val = maxAllowed;
      next[index] = { ...next[index], quantity_damaged: val };
      if (val + (next[index].quantity_returned || 0) === next[index].quantity_booked) {
        next[index]._markedMissing = false;
        next[index]._verified = true;
      }
      return next;
    });
  };

  const handleUpdateEquipmentNote = (index, value) => {
    setEquipmentList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes: value };
      return next;
    });
  };

  const handleMatchAllQuantities = () => {
    setEquipmentList((prev) =>
      prev.map((item) => ({
        ...item,
        quantity_returned: item.quantity_booked,
        quantity_damaged: 0,
        _verified: true,
        _markedMissing: false
      }))
    );
  };

  const handleMarkComplete = (index) => {
    setEquipmentList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantity_returned: next[index].quantity_booked,
        quantity_damaged: 0,
        _verified: true,
        _markedMissing: false
      };
      return next;
    });
  };

  const handleMarkMissing = (index) => {
    setEquipmentList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        _markedMissing: true,
        _verified: true
      };
      return next;
    });
  };

  const toggleQuickTag = (tagLabel) => {
    setQuickTags((prev) =>
      prev.includes(tagLabel) ? prev.filter((t) => t !== tagLabel) : [...prev, tagLabel]
    );
  };

  // Submit Equipment Returns
  const handleSubmitEquipmentReturns = async () => {
    if (!booking) return;
    setSubmittingEquipment(true);
    try {
      await ManagerAPI.submitEquipmentReturns(booking._id, {
        returns: equipmentList,
        equipment_returns: equipmentList,
        note: equipmentNotes.trim() || undefined,
        equipment_notes: equipmentNotes.trim() || undefined
      });
      notify("Equipment check saved successfully!", "success");
      await loadEvent();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save equipment check.", "error");
    } finally {
      setSubmittingEquipment(false);
    }
  };

  // Submit Incident / Shift Report
  const handleSubmitReport = async () => {
    if (!booking) return;
    if (!note.trim() && quickTags.length === 0) {
      notify("Please enter a note or select at least one status option.", "error");
      return;
    }

    setSubmittingReport(true);
    try {
      const combinedNote = [
        quickTags.length > 0 ? `[Tags: ${quickTags.join(", ")}]` : "",
        note.trim()
      ]
        .filter(Boolean)
        .join(" - ");

      await ManagerAPI.submitReport(booking._id, { note: combinedNote, role: "Lead Manager" });
      notify("Shift report submitted successfully.", "success");
      setNote("");
      setQuickTags([]);
      await loadEvent();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit report.", "error");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Mark Event Completed
  const executeComplete = async (collectedCash = false) => {
    if (!booking) return;
    setCompletingEvent(true);
    try {
      await ManagerAPI.markCompleted(booking._id, {
        collected_cash_balance: collectedCash
      });
      notify(
        collectedCash
          ? "Event marked completed and cash balance payment confirmed!"
          : "Event marked as completed successfully!",
        "success"
      );
      await loadEvent();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to complete event.", "error");
    } finally {
      setCompletingEvent(false);
    }
  };

  const handleCompleteEvent = async () => {
    if (!booking) return;
    const remainingBal = Number(booking.remaining_balance ?? 0);
    const isCashElected = booking.balance_payment_preference === "in_person";

    if (remainingBal > 0) {
      await confirm({
        tone: "confirm",
        title: "Complete Event & Confirm Cash Payment?",
        description: isCashElected
          ? `The client elected Cash on Event Day. Did you collect the outstanding balance of ₱${remainingBal.toLocaleString("en-PH", { minimumFractionDigits: 2 })} on-site?`
          : `The booking has an outstanding balance of ₱${remainingBal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Full payment is required before completion. If received in cash, choose "Yes, Collected Cash".`,
        confirmLabel: "Yes, Collected Cash",
        cancelLabel: "Cancel",
        onConfirm: async () => {
          await executeComplete(true);
        }
      });
      return;
    }

    await confirm({
      tone: "confirm",
      title: "Mark this event as completed?",
      description: "This closes out the event and moves it into completed history. Make sure all equipment checks and operational notes have been saved.",
      confirmLabel: "Mark Completed",
      cancelLabel: "Not Yet",
      onConfirm: async () => {
        await executeComplete(false);
      }
    });
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl">
          Loading assigned event details...
        </div>
      </ManagerLayout>
    );
  }

  if (!booking) {
    return (
      <ManagerLayout>
        <div className="p-8 text-center space-y-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <AlertCircle size={32} className="mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">Event Not Found</h2>
          <p className="text-xs text-slate-500">The assigned event could not be found or you are not assigned as its lead manager.</p>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            Back to Bookings
          </button>
        </div>
      </ManagerLayout>
    );
  }

  const venueLocation = getBookingVenueLocation(booking);
  const locationAddress =
    venueLocation !== "Location not specified"
      ? venueLocation
      : "Address details will be confirmed by lead.";
  const locationQuery = [booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || (booking.location || "");

  return (
    <ManagerLayout>
      <div className="space-y-4">
        {/* Back navigation */}
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to My Bookings</span>
          </button>
        </div>

        {/* Unified Work Document Container */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs divide-y divide-slate-100 overflow-hidden">
          
          {/* SECTION 1: Event Name & Current Event Status */}
          <div className="p-4 sm:p-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Lead Operations Management
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                  {booking.event_type || "Catering Event"}
                </h1>
                <p className="text-xs text-slate-500">
                  Client: <strong className="text-slate-800">{booking.customer_id?.full_name || "Valued Client"}</strong> · Reference: <span className="font-mono text-slate-700 font-semibold">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start">
                {isCompleted ? (
                  <>
                    <Badge status={booking.status || "Completed"} />
                    <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Completed
                    </span>
                  </>
                ) : (
                  <>
                    {(booking.payment_status === "deposit_pending" || booking.status === "Deposit Pending") && (
                      <Badge status="Deposit Pending" />
                    )}
                    {timing.isStarted && !timing.isFinished && (
                      <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Sparkles size={12} className="text-emerald-600" /> In Progress
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {isCompleted && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2 mt-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>This event is marked completed and read-only. Operational submissions are closed.</span>
              </div>
            )}
          </div>

          {/* SECTION 2: Date, Time, and Venue */}
          <div className="p-4 sm:p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Date, Time &amp; Venue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CalendarIcon size={14} className="text-[#4C81E0]" />
                  <span>Date &amp; Schedule</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {booking.event_date
                    ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                    : "Date TBA"}
                </div>
                <div className="text-slate-600 flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>{formatEventStartTime(booking.start_time)}</span>
                </div>
                {booking.guest_count > 0 && (
                  <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                    {booking.guest_count} guests · {booking.package_id?.name || booking.package_name_snapshot || "Standard Catering"}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin size={14} className="text-[#4C81E0]" />
                    <span>Venue Location</span>
                  </div>
                  {locationQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Open in Google Maps
                    </a>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {locationAddress}
                </div>
                {booking.venue_type && (
                  <div className="text-slate-500 text-xs">
                    Venue Type: {booking.venue_type}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Assigned Staff Team on Duty (Read-Only) */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users size={14} className="text-[#4C81E0]" />
                <span>Assigned Staff Team ({booking.staff_assignments?.length || 0})</span>
              </h2>
              <span className="text-[11px] text-slate-500">
                Assigned by Administrator
              </span>
            </div>

            {(!booking.staff_assignments || booking.staff_assignments.length === 0) ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                No staff crew dispatched yet by the Administrator.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {booking.staff_assignments.map((member, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate">
                        {member.name || member.user_id?.full_name || "Crew Member"}
                      </span>
                      <span className="text-[10.5px] font-semibold text-[#4C81E0]">
                        {member.role || "Staff"}
                      </span>
                    </div>
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="text-[11px] text-[#4C81E0] hover:underline flex items-center gap-1 shrink-0">
                        <Phone size={10} /> {member.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: Important Event Instructions and Briefing */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Info size={14} className="text-[#4C81E0]" />
              <h2>Important Event Instructions &amp; Briefing</h2>
            </div>

            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <span className="font-bold block text-slate-900 text-sm">
                Dietary &amp; Special Requests
              </span>
              <p className="text-slate-700 leading-relaxed text-xs sm:text-[13px] pt-0.5">
                {booking.dietary_restrictions ? `Dietary: ${booking.dietary_restrictions}. ` : ""}
                {booking.allergies ? `Allergies: ${booking.allergies}. ` : ""}
                {booking.special_requests ? `Special: ${booking.special_requests}. ` : ""}
                {booking.notes || (!booking.dietary_restrictions && !booking.allergies && !booking.special_requests ? "Standard catering protocol applies. No special dietary restrictions noted." : "")}
              </p>
            </div>

            {Number(booking.remaining_balance || 0) > 0 && booking.balance_payment_preference === "in_person" && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <Banknote size={16} className="text-amber-600 shrink-0" />
                <div>
                  <strong>Cash Collection:</strong> Client elected to pay the remaining balance of <strong>₱{Number(booking.remaining_balance).toLocaleString()}</strong> in cash on-site to the event lead.
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Equipment Check Manifest */}
          <div id="equipment-check" className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <PackageCheck size={14} className="text-[#4C81E0]" />
                  <span>Equipment Check Manifest</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm catering gear, track expected vs dispatched quantities, and record returned or damaged items.
                </p>
              </div>

              {!isCompleted && !timing.isUpcoming && (
                <button
                  type="button"
                  onClick={handleMatchAllQuantities}
                  className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Check size={14} className="text-emerald-700" />
                  <span>All items returned</span>
                </button>
              )}
            </div>

            {timing.isUpcoming && !isCompleted ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
                  <Lock size={14} className="text-amber-600 shrink-0" />
                  <span>
                    Equipment check opens when the event starts. Below is the dispatched equipment manifest for advance preparation.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {equipmentList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-[11px] text-slate-500">Expected quantity: {item.quantity_booked} units</span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                        Dispatched: {item.quantity_booked}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <ul className="space-y-2.5">
                  {equipmentList.map((item, idx) => {
                    const isMissing = item._verified && item._markedMissing;
                    const isMatch =
                      item._verified &&
                      !item._markedMissing &&
                      (item.quantity_returned || 0) + (item.quantity_damaged || 0) === item.quantity_booked;
                    const shortfall =
                      item.quantity_booked - (item.quantity_returned || 0) - (item.quantity_damaged || 0);

                    return (
                      <li
                        key={idx}
                        className={`p-3 sm:p-4 rounded-xl border transition-all space-y-2.5 ${
                          isMissing
                            ? "border-amber-200 bg-amber-50/40"
                            : isMatch
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-slate-200/80 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 block">{item.name}</span>
                            <span className="text-xs text-slate-500">
                              Dispatched quantity: <strong className="text-slate-800">{item.quantity_booked}</strong>
                            </span>
                          </div>

                          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                            {isMatch && (
                              <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 size={12} /> All returned
                              </span>
                            )}
                            {item.quantity_damaged > 0 && (
                              <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                                <AlertTriangle size={12} /> {item.quantity_damaged} damaged
                              </span>
                            )}
                            {isMissing && shortfall > 0 && (
                              <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                <AlertTriangle size={12} /> {shortfall} missing
                              </span>
                            )}
                          </div>
                        </div>

                        {!isCompleted && (
                          <>
                            {/* Actions */}
                            {isMatch ? (
                              <button
                                type="button"
                                onClick={() => handleMarkMissing(idx)}
                                className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <AlertTriangle size={13} className="text-amber-600" />
                                <span>Report missing or damaged</span>
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMarkComplete(idx)}
                                  className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  <Check size={14} />
                                  <span>All returned</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMarkMissing(idx)}
                                  className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                    isMissing
                                      ? "border-amber-300 bg-amber-100 text-amber-900"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>Change quantity</span>
                                </button>
                              </div>
                            )}

                            {item._markedMissing && (
                              <div className="space-y-2 border-t border-amber-200/80 pt-2.5">
                                <QtyStepper
                                  label="Returned safe"
                                  value={item.quantity_returned}
                                  max={item.quantity_booked}
                                  onStep={(delta) => stepReturnedQty(idx, delta)}
                                  onChange={(value) => handleUpdateReturnedQuantity(idx, value)}
                                />
                                <QtyStepper
                                  label="Damaged / broken"
                                  tone="danger"
                                  value={item.quantity_damaged || 0}
                                  max={item.quantity_booked}
                                  onStep={(delta) => stepDamagedQty(idx, delta)}
                                  onChange={(value) => handleUpdateDamagedQuantity(idx, value)}
                                />
                                <input
                                  type="text"
                                  placeholder="Notes on missing or damaged items (optional)..."
                                  value={item.notes || ""}
                                  onChange={(e) => handleUpdateEquipmentNote(idx, e.target.value)}
                                  className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {!isCompleted && (
                  <>
                    <div className="space-y-1.5 pt-2">
                      <label htmlFor="equipment-notes" className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Equipment Observations &amp; Discrepancy Notes
                      </label>
                      <textarea
                        id="equipment-notes"
                        rows={2}
                        placeholder="Any observations regarding equipment condition or turnover..."
                        value={equipmentNotes}
                        onChange={(e) => setEquipmentNotes(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSubmitEquipmentReturns}
                        disabled={submittingEquipment}
                        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-[#4C81E0] px-4 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#3b6bc4] disabled:opacity-60 cursor-pointer w-full sm:w-auto"
                      >
                        <PackageCheck size={15} />
                        <span>{submittingEquipment ? "Saving equipment check..." : "Save Equipment Check"}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SECTION 6: Report Incident & Shift Note */}
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-[#4C81E0]" />
                <span>Report Incident &amp; Shift Note</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record operational delays, kitchen issues, equipment problems, extra hours, or client feedback.
              </p>
            </div>

            {!isCompleted && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Quick Status Options
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => {
                      const isSelected = quickTags.includes(tag.label);
                      const TagIcon = tag.icon;
                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleQuickTag(tag.label)}
                          className={`px-3 py-1.5 min-h-[34px] rounded-lg border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? `${tag.color} ring-2 ring-[#4C81E0]/30 font-bold`
                              : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <TagIcon size={13} className={isSelected ? "text-current" : "text-slate-400"} />
                          <span>{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="shift-note" className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Incident or Shift Note Details
                  </label>
                  <textarea
                    id="shift-note"
                    rows={3}
                    placeholder="Describe any observations, delays, client feedback, or notes..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    disabled={submittingReport || (!note.trim() && quickTags.length === 0)}
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                  >
                    <FileText size={14} className="text-slate-500" />
                    <span>{submittingReport ? "Submitting Report..." : "Submit Report"}</span>
                  </button>
                </div>
              </>
            )}

            {/* Previously Logged Reports (Historical & Current) */}
            {booking.staff_reports && booking.staff_reports.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logged Shift &amp; Incident Reports ({booking.staff_reports.length})
                </h3>
                <div className="space-y-2">
                  {booking.staff_reports.map((report, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-bold text-slate-800">{report.role || "Event Coordinator"}</span>
                        <span>{new Date(report.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap">{report.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: Supporting Information (Menu & Add-on Services) */}
          {hasSupportingInfo && (
            <div className="p-4 sm:p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Supporting Information
              </h2>

              {/* Menu Items */}
              {booking.menu_items && booking.menu_items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Utensils size={14} className="text-[#4C81E0]" />
                    <span>Catering Menu ({booking.menu_items.length} Dishes)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {booking.menu_items.map((dish, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{dish.name || dish.dish_id?.name || "Catering Dish"}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">{dish.category || dish.dish_id?.category || "Main"}</span>
                        </div>
                        {dish.special_instructions && (
                          <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                            {dish.special_instructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-on Services */}
              {((booking.service_items && booking.service_items.length > 0) || (booking.additional_charges && booking.additional_charges.length > 0)) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Layers size={14} className="text-[#4C81E0]" />
                    <span>Add-on Services &amp; Setup Requirements</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(booking.service_items || []).map((srv, idx) => (
                      <div key={`srv-${idx}`} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{srv.name}</span>
                          {srv.note && <span className="text-[11px] text-slate-500 block">{srv.note}</span>}
                        </div>
                        {srv.quantity > 1 && (
                          <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Qty: {srv.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                    {(booking.additional_charges || []).map((chg, idx) => (
                      <div key={`chg-${idx}`} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs">
                        <span className="font-bold text-slate-900 block">{chg.label}</span>
                        {chg.reason && <span className="text-[11px] text-slate-500 block">{chg.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 8: Event Closeout / Mark Event Completed Action */}
          {!isCompleted && (
            <div className="p-4 sm:p-5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Event Completion Closeout
                </span>
                <p className="text-[11.5px] text-slate-500">
                  Ensure all equipment items are verified and operational notes are logged before completing.
                </p>
              </div>

              <div>
                {timing.isUpcoming ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock size={13} className="text-slate-400" />
                    <span>Event completion opens at event start</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteEvent}
                    disabled={completingEvent}
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer w-full sm:w-auto shadow-2xs"
                  >
                    <CheckCircle2 size={15} />
                    <span>{completingEvent ? "Completing Event..." : "Mark Event Completed"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </ManagerLayout>
  );
}
