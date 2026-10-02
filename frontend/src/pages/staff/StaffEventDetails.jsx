import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import Badge from "../../components/admin/ui/Badge";
import useToast from "../../hooks/useToast";
import { useConfirm } from "../../components/feedback/confirmContext";
import useAuth from "../../hooks/useAuth";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  PackageCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Phone,
  Mail,
  UserCheck,
  Sparkles,
  Info,
  Check,
  AlertCircle,
  Lock,
  Utensils,
  Layers,
  Banknote,
  ExternalLink
} from "lucide-react";
import { getEventTimingStatus } from "../../utils/format";

function QtyStepper({ label, value, max, tone = "neutral", onStep, onChange }) {
  const danger = tone === "danger";
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded border p-1.5 ${
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
          disabled={Number(value) <= 0}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className={`grid h-9 w-9 place-items-center rounded border border-slate-200 text-sm font-bold transition-colors disabled:opacity-40 cursor-pointer ${
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`h-9 w-12 rounded border bg-white text-center text-xs font-bold tabular-nums outline-none focus:ring-1 focus:ring-[#4C81E0] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            danger ? "border-rose-300 text-rose-900" : "border-slate-300 text-slate-900"
          }`}
        />
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={Number(value) >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className={`grid h-9 w-9 place-items-center rounded border border-slate-200 text-sm font-bold transition-colors disabled:opacity-40 cursor-pointer ${
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

export default function StaffEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Equipment Return State
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [submittingEquipment, setSubmittingEquipment] = useState(false);

  // Incident & Notes State
  const [note, setNote] = useState("");
  const [quickTags, setQuickTags] = useState([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [completingEvent, setCompletingEvent] = useState(false);

  const TAG_OPTIONS = [
    { label: "No issues", value: "no_issues", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { label: "Late start", value: "late_start", icon: Clock, color: "bg-amber-50 text-amber-800 border-amber-200" },
    { label: "Missing equipment", value: "missing_items", icon: PackageCheck, color: "bg-rose-50 text-rose-800 border-rose-200" },
    { label: "Damaged gear", value: "damaged_gear", icon: AlertTriangle, color: "bg-rose-50 text-rose-800 border-rose-200" },
    { label: "Extra hours", value: "extra_hours", icon: Clock, color: "bg-blue-50 text-blue-800 border-blue-200" },
    { label: "Other", value: "other", icon: FileText, color: "bg-slate-100 text-slate-800 border-slate-200" }
  ];

  const loadEvent = async () => {
    setLoading(true);
    try {
      const res = await StaffAPI.getBooking(id);
      const data = res.data;
      setBooking(data);

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
            name: ret.name || ret.inventory_id?.item_name || "Equipment Item",
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
            name: item.name || item.inventory_id?.item_name || "Equipment Item",
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
            notes: "",
            _verified: false,
            _markedMissing: false
          });
        });
      }

      setEquipmentList(initialReturns);
      setEquipmentNotes(data.equipment_notes || "");
    } catch (err) {
      console.error(err);
      notify("Failed to load event details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  // Handle scroll to equipment check if hash or search param exists
  useEffect(() => {
    if (!loading && (location.hash === "#equipment-check" || location.search.includes("tab=equipment"))) {
      const el = document.getElementById("equipment-check");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [loading, location.hash, location.search]);

  const toggleQuickTag = (tagLabel) => {
    setQuickTags((prev) =>
      prev.includes(tagLabel) ? prev.filter((t) => t !== tagLabel) : [...prev, tagLabel]
    );
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
      if (next[index].quantity_returned === next[index].quantity_booked) {
        next[index].quantity_returned = 0; 
      }
      next[index]._verified = true;
      next[index]._markedMissing = true;
      return next;
    });
  };

  const handleMatchAllQuantities = () => {
    setEquipmentList((prev) =>
      prev.map((item) => ({ ...item, quantity_returned: item.quantity_booked, quantity_damaged: 0, _verified: true, _markedMissing: false }))
    );
    notify("All items confirmed returned.", "success");
  };

  const stepReturnedQty = (index, delta) => {
    setEquipmentList((prev) => {
      const copy = [...prev];
      const maxAllowed = (copy[index].quantity_booked || 0) - (copy[index].quantity_damaged || 0);
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

  const handleSubmitEquipmentReturns = async () => {
    setSubmittingEquipment(true);
    try {
      await StaffAPI.submitEquipmentReturns(id, {
        returns: equipmentList,
        equipment_returns: equipmentList,
        note: equipmentNotes.trim() || undefined,
        equipment_notes: equipmentNotes.trim() || undefined,
      });
      notify("Equipment check saved successfully!", "success");
      loadEvent();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save equipment check.", "error");
    } finally {
      setSubmittingEquipment(false);
    }
  };

  const handleSubmitReport = async () => {
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

      await StaffAPI.submitReport(id, { note: combinedNote });
      notify("Shift report submitted successfully.", "success");
      setNote("");
      setQuickTags([]);
      loadEvent();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit report.", "error");
    } finally {
      setSubmittingReport(false);
    }
  };

  const executeComplete = async (collectedCash = false) => {
    setCompletingEvent(true);
    try {
      await StaffAPI.completeEvent(id, {
        note: note.trim() || undefined,
        final_notes: note.trim() || undefined,
        returns: equipmentList,
        equipment_returns: equipmentList,
        collected_cash_balance: collectedCash,
      });
      notify(
        collectedCash
          ? "Event completed and cash balance payment confirmed!"
          : "Event marked as completed",
        "success"
      );
      navigate("/staff/dashboard");
    } finally {
      setCompletingEvent(false);
    }
  };

  const handleCompleteEvent = async () => {
    const remainingBal = Number(booking?.remaining_balance ?? 0);
    const isCashElected = booking?.balance_payment_preference === "in_person";

    if (remainingBal > 0) {
      await confirm({
        tone: "confirm",
        title: "Complete Event & Confirm Cash Payment?",
        description: isCashElected
          ? `The client selected Cash on Event Day. Did you collect the remaining balance of ₱${remainingBal.toLocaleString()} in cash?`
          : `The booking has an outstanding balance of ₱${remainingBal.toLocaleString()}. If you received this in cash on-site, choose "Yes, Collected Cash", otherwise "No, Leave Pending".`,
        confirmLabel: "Yes, Collected Cash",
        cancelLabel: "No, Leave Pending",
        onConfirm: async () => {
          await executeComplete(true);
        },
        onCancel: async () => {
          await executeComplete(false);
        }
      });
      return;
    }

    await confirm({
      tone: "confirm",
      title: "Mark this event as completed?",
      description:
        "This closes out the event with the notes and equipment returns recorded below. Check them before confirming - you will be taken back to your dashboard.",
      confirmLabel: "Mark Completed",
      cancelLabel: "Not Yet",
      onConfirm: async () => {
        await executeComplete(false);
      },
    });
  };

  const myRole = useMemo(() => {
    if (!booking) return "Crew";
    const assignments = booking.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id?._id || item.user_id) === String(user?._id));
    return match?.role || user?.position || "Crew";
  }, [booking, user]);

  const timing = useMemo(() => getEventTimingStatus(booking), [booking]);

  const teamByRole = useMemo(() => {
    if (!booking) return {};
    const map = {};
    (booking.staff_assignments || []).forEach((a) => {
      const role = a.role || "Staff";
      map[role] = map[role] || [];
      map[role].push(a);
    });
    return map;
  }, [booking]);

  const hasSupportingInfo = useMemo(() => {
    if (!booking) return false;
    const hasMenu = (booking.menu_items || []).length > 0;
    const hasServices = (booking.service_items || []).length > 0 || (booking.additional_charges || []).length > 0;
    const hasCrew = (booking.staff_assignments || []).length > 0;
    return hasMenu || hasServices || hasCrew;
  }, [booking]);

  if (loading) {
    return (
      <StaffLayout>
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-lg">
          Loading event details...
        </div>
      </StaffLayout>
    );
  }

  if (!booking) {
    return (
      <StaffLayout>
        <div className="p-8 text-center space-y-3 bg-white border border-slate-200/80 rounded-lg">
          <AlertCircle size={32} className="mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">Event Not Found</h2>
          <p className="text-xs text-slate-500">The assigned event could not be loaded or you are not assigned to it.</p>
          <button
            type="button"
            onClick={() => navigate("/staff/dashboard")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
          >
            Back to Assigned Events
          </button>
        </div>
      </StaffLayout>
    );
  }

  const manager = booking.event_manager_id || null;
  const locationAddress =
    [booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") ||
    "Address details will be confirmed by lead.";
  const locationQuery = [booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ");

  return (
    <StaffLayout>
      <div className="space-y-4">
        {/* Back navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/staff/dashboard")}
            className="-ml-1 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to My Events</span>
          </button>
        </div>

        {/* Unified Work Document Container */}
        <div className="rounded-lg border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-200/80 overflow-hidden">
          
          {/* SECTION 1: Event Name & Current Event Status */}
          <div className="p-4 sm:p-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Catering Event
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                  {booking.event_type || "Catering Event"}
                </h1>
                <p className="text-xs text-slate-500">
                  Client: <strong className="text-slate-700">{booking.customer_id?.full_name || "Valued Client"}</strong> · Reference: <span className="font-mono text-slate-700 font-semibold">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start">
                <Badge status={booking.status || "confirmed"} />
                {timing.isUpcoming && (
                  <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <Lock size={12} className="text-slate-500" /> Upcoming
                  </span>
                )}
                {timing.isStarted && !timing.isFinished && (
                  <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Sparkles size={12} className="text-emerald-600" /> In Progress
                  </span>
                )}
                {timing.isFinished && (
                  <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    <CheckCircle2 size={12} className="text-blue-600" /> Return Check
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Date, Time, and Venue */}
          <div className="p-4 sm:p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Date, Time &amp; Venue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50/70 rounded border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Calendar size={14} className="text-[#4C81E0]" />
                  <span>Date &amp; Schedule</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {booking.event_date
                    ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                    : "Date TBA"}
                </div>
                <div className="text-slate-600 flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>{booking.start_time || "Time TBA"} ({booking.duration_hours || 4} hours duration)</span>
                </div>
                {booking.guest_count > 0 && (
                  <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                    {booking.guest_count} guests · {booking.package_id?.name || booking.package_name_snapshot || "Standard Catering"}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50/70 rounded border border-slate-200/80 space-y-1">
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
                <div className="text-sm font-bold text-slate-900 truncate">
                  {booking.venue_type || "Venue TBA"}
                </div>
                <div className="text-slate-600 text-xs">
                  {locationAddress}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Staff Member's Assigned Role */}
          <div className="p-4 sm:p-5 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Your Assigned Role
            </h2>
            <div className="flex items-center justify-between p-3 bg-slate-50/70 rounded border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] font-bold flex items-center justify-center shrink-0">
                  <UserCheck size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{myRole}</div>
                  <div className="text-[11px] text-slate-500">Catering Operations Roster</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                Active Assignment
              </span>
            </div>
          </div>

          {/* SECTION 4: Event Lead / Manager */}
          <div className="p-4 sm:p-5 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Event Lead / Manager
            </h2>
            {manager ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 rounded border border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] font-bold flex items-center justify-center text-xs shrink-0">
                    {manager.full_name?.slice(0, 2).toUpperCase() || "MG"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{manager.full_name}</div>
                    <div className="text-[11px] text-slate-500">Lead Event Coordinator</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {manager.phone && (
                    <a
                      href={`tel:${manager.phone}`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-colors"
                    >
                      <Phone size={13} />
                      <span>Call Lead ({manager.phone})</span>
                    </a>
                  )}
                  {manager.email && (
                    <a
                      href={`mailto:${manager.email}`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      <Mail size={13} />
                      <span className="hidden sm:inline">{manager.email}</span>
                      <span className="sm:hidden">Email</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50/70 rounded border border-slate-200/80">
                Lead coordinator not designated yet.
              </p>
            )}
          </div>

          {/* SECTION 5: Important Event Instructions and Briefing */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Info size={14} className="text-[#4C81E0]" />
              <h2>Important Event Instructions &amp; Briefing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50/70 rounded border border-slate-200/80 space-y-1">
                <span className="font-bold block text-slate-900">Dress Code &amp; Arrival</span>
                <p className="text-slate-600 leading-relaxed">
                  Standard black catering uniform with apron. Arrive at least <strong>1 hour before</strong> event start time for station setup.
                </p>
              </div>

              <div className="p-3 bg-slate-50/70 rounded border border-slate-200/80 space-y-1">
                <span className="font-bold block text-slate-900">Dietary &amp; Special Requests</span>
                <p className="text-slate-600 leading-relaxed">
                  {booking.dietary_restrictions ? `Dietary: ${booking.dietary_restrictions}. ` : ""}
                  {booking.allergies ? `Allergies: ${booking.allergies}. ` : ""}
                  {booking.special_requests ? `Special: ${booking.special_requests}. ` : ""}
                  {booking.notes || (!booking.dietary_restrictions && !booking.allergies && !booking.special_requests ? "Standard catering protocol applies. No special dietary restrictions noted." : "")}
                </p>
              </div>
            </div>

            {Number(booking.remaining_balance || 0) > 0 && booking.balance_payment_preference === "in_person" && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded flex items-center gap-2.5 text-xs text-amber-900">
                <Banknote size={16} className="text-amber-600 shrink-0" />
                <div>
                  <strong>Cash Collection:</strong> Client elected to pay the remaining balance of <strong>₱{Number(booking.remaining_balance).toLocaleString()}</strong> in cash on-site to the event lead.
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: Equipment Check */}
          <div id="equipment-check" className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <PackageCheck size={16} className="text-[#4C81E0]" />
                  <span>Equipment Check</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Did you return all assigned equipment? Confirm catering gear or report missing and damaged quantities.
                </p>
              </div>

              {!timing.isUpcoming && (
                <button
                  type="button"
                  onClick={handleMatchAllQuantities}
                  className="inline-flex min-h-[38px] items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Check size={14} className="text-emerald-700" />
                  <span>All items returned</span>
                </button>
              )}
            </div>

            {timing.isUpcoming ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded flex items-center gap-2 text-xs text-amber-900">
                  <Lock size={14} className="text-amber-600 shrink-0" />
                  <span>
                    Equipment check opens when the event starts. Below is the dispatched equipment manifest for advance preparation.
                  </span>
                </div>

                <div className="space-y-2">
                  {equipmentList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
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
                        className={`p-3 rounded border transition-all space-y-2.5 ${
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

                        {/* Actions */}
                        {isMatch ? (
                          <button
                            type="button"
                            onClick={() => handleMarkMissing(idx)}
                            className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <AlertTriangle size={13} className="text-amber-600" />
                            <span>Report missing or damaged</span>
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkComplete(idx)}
                              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <Check size={14} />
                              <span>All returned</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkMissing(idx)}
                              className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded border text-xs font-semibold transition-colors cursor-pointer ${
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
                              className="min-h-[38px] w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-1.5 pt-2">
                  <label htmlFor="equipment-notes" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Equipment Notes (Optional)
                  </label>
                  <textarea
                    id="equipment-notes"
                    rows={2}
                    placeholder="Any observations regarding equipment condition or handover..."
                    value={equipmentNotes}
                    onChange={(e) => setEquipmentNotes(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitEquipmentReturns}
                    disabled={submittingEquipment}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md bg-[#4C81E0] px-4 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#3b6bc4] disabled:opacity-60 cursor-pointer w-full sm:w-auto"
                  >
                    <PackageCheck size={15} />
                    <span>{submittingEquipment ? "Saving equipment check..." : "Save Equipment Check"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: Incident Reporting */}
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-[#4C81E0]" />
                <span>Report Incident &amp; Shift Note</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record any shift delays, equipment problems, extra hours, or client feedback.
              </p>
            </div>

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
                      className={`px-3 py-2 min-h-[38px] rounded border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? `${tag.color} ring-2 ring-[#4C81E0]/30 font-bold`
                          : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <TagIcon size={14} className={isSelected ? "text-current" : "text-slate-400"} />
                      <span>{tag.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="shift-note" className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Incident or Note Details (Optional)
              </label>
              <textarea
                id="shift-note"
                rows={3}
                placeholder="Describe any incidents, kitchen delays, client feedback, or shift observations..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={submittingReport || (!note.trim() && quickTags.length === 0)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer w-full sm:w-auto"
              >
                <FileText size={14} className="text-slate-500" />
                <span>{submittingReport ? "Submitting Report..." : "Submit Report"}</span>
              </button>

              {timing.isUpcoming ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <span className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Lock size={12} className="text-slate-400" /> Shift completion opens at event start
                  </span>
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-4 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60"
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark Event Completed</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteEvent}
                  disabled={completingEvent}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <CheckCircle2 size={15} />
                  <span>{completingEvent ? "Completing..." : "Mark Event Completed"}</span>
                </button>
              )}
            </div>

            {/* Previously Logged Staff Reports */}
            {booking.staff_reports && booking.staff_reports.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logged Shift Reports
                </h3>
                <div className="space-y-2">
                  {booking.staff_reports.map((report, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50/70 rounded border border-slate-200/80 text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-slate-500 text-[10.5px]">
                        <span className="font-bold text-slate-800">{report.role || "Staff Member"}</span>
                        <span>{new Date(report.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-800 mt-0.5">{report.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 8: Other Supporting Information (Only when relevant) */}
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
                      <div key={idx} className="p-2.5 bg-slate-50/70 rounded border border-slate-200/80 text-xs space-y-1">
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
                      <div key={`srv-${idx}`} className="p-2.5 bg-slate-50/70 rounded border border-slate-200/80 flex items-center justify-between text-xs">
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
                      <div key={`chg-${idx}`} className="p-2.5 bg-slate-50/70 rounded border border-slate-200/80 text-xs">
                        <span className="font-bold text-slate-900 block">{chg.label}</span>
                        {chg.reason && <span className="text-[11px] text-slate-500 block">{chg.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Catering Crew */}
              {booking.staff_assignments && booking.staff_assignments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Users size={14} className="text-[#4C81E0]" />
                    <span>Assigned Crew on Duty ({booking.staff_assignments.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(teamByRole).map(([roleName, members]) => (
                      <div key={roleName} className="p-2.5 bg-slate-50/70 rounded border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          {roleName} ({members.length})
                        </span>
                        <div className="space-y-1">
                          {members.map((member, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5">
                              <span className="truncate">{member.name || member.user_id?.full_name || "Crew Member"}</span>
                              {member.phone && (
                                <a 
                                  href={`tel:${member.phone}`}
                                  className="text-[11px] text-[#4C81E0] hover:underline inline-flex items-center gap-1 shrink-0"
                                >
                                  <Phone size={10} /> {member.phone}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </StaffLayout>
  );
}
