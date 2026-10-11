import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import PageHeader from "../../components/admin/ui/PageHeader";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
import { useConfirm } from "../../components/feedback/confirmContext";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PackageCheck,
  FileText,
  Search,
  Check,
  Lock,
  Sparkles,
  Utensils,
  Layers,
  Banknote,
  Users,
  Eye,
  ExternalLink,
  Phone,
  Mail,
  ShieldCheck
} from "lucide-react";
import { getEventTimingStatus } from "../../utils/format";

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

export default function ManagerBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();

  const tabParam = searchParams.get("tab") || "upcoming";
  const [activeTab, setActiveTab] = useState(tabParam === "completed" ? "completed" : "upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active detail modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Equipment Check State
  const [equipmentList, setEquipmentList] = useState([]);
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [submittingEquipment, setSubmittingEquipment] = useState(false);

  // Incident & Shift Note State
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params, { replace: true });
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const [upcomingRes, completedRes] = await Promise.all([
        ManagerAPI.getBookings("upcoming").catch(() => ({ data: [] })),
        ManagerAPI.getBookings("completed").catch(() => ({ data: [] }))
      ]);
      setUpcomingBookings(Array.isArray(upcomingRes.data) ? upcomingRes.data : []);
      setCompletedBookings(Array.isArray(completedRes.data) ? completedRes.data : []);
    } catch {
      notify("Failed to load assigned bookings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Handle URL query params (e.g. ?booking_id=123)
  useEffect(() => {
    const bookingId = searchParams.get("booking_id") || location.state?.booking_id;
    if (bookingId) {
      openDetail(bookingId);
    }
  }, [location.search, location.state]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await ManagerAPI.getBooking(id);
      const data = res.data;
      setSelectedBooking(data);

      // Initialize equipment return list
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
            quantity_damaged: 0,
            notes: "",
            _verified: false,
            _markedMissing: false
          });
        });
      }

      setEquipmentList(initialReturns);
      setEquipmentNotes(data.equipment_notes || "");
      setNote("");
      setQuickTags([]);
    } catch {
      notify("Failed to load booking details.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedBooking(null);
    const params = new URLSearchParams(searchParams);
    params.delete("booking_id");
    params.delete("action");
    setSearchParams(params, { replace: true });
  };

  const currentList = activeTab === "completed" ? completedBookings : upcomingBookings;

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter((b) => {
      const client = (b.customer_id?.full_name || "").toLowerCase();
      const type = (b.event_type || "").toLowerCase();
      const ref = (b.reference || "").toLowerCase();
      const venue = (b.venue_type || b.municipality || "").toLowerCase();
      return client.includes(q) || type.includes(q) || ref.includes(q) || venue.includes(q);
    });
  }, [currentList, searchQuery]);

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
    if (!selectedBooking) return;
    setSubmittingEquipment(true);
    try {
      await ManagerAPI.submitEquipmentReturns(selectedBooking._id, {
        returns: equipmentList,
        equipment_returns: equipmentList,
        note: equipmentNotes.trim() || undefined,
        equipment_notes: equipmentNotes.trim() || undefined
      });
      notify("Equipment check saved successfully!", "success");
      await openDetail(selectedBooking._id);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save equipment check.", "error");
    } finally {
      setSubmittingEquipment(false);
    }
  };

  // Submit Incident / Shift Report
  const handleSubmitReport = async () => {
    if (!selectedBooking) return;
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

      await ManagerAPI.submitReport(selectedBooking._id, { note: combinedNote, role: "Lead Manager" });
      notify("Shift report submitted successfully.", "success");
      setNote("");
      setQuickTags([]);
      await openDetail(selectedBooking._id);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit report.", "error");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Mark Event Completed
  const executeComplete = async (collectedCash = false) => {
    if (!selectedBooking) return;
    setCompletingEvent(true);
    try {
      await ManagerAPI.markCompleted(selectedBooking._id, {
        collected_cash_balance: collectedCash
      });
      notify(
        collectedCash
          ? "Event marked completed and cash balance payment confirmed!"
          : "Event marked as completed successfully!",
        "success"
      );
      closeDetail();
      loadBookings();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to complete event.", "error");
    } finally {
      setCompletingEvent(false);
    }
  };

  const handleCompleteEvent = async () => {
    if (!selectedBooking) return;
    const remainingBal = Number(selectedBooking.remaining_balance ?? 0);
    const isCashElected = selectedBooking.balance_payment_preference === "in_person";

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

  const isEventDetailCompleted = selectedBooking && ["completed", "Completed"].includes(selectedBooking.status);
  const timing = selectedBooking ? getEventTimingStatus(selectedBooking) : { isUpcoming: true, isStarted: false, isFinished: false };

  return (
    <ManagerLayout>
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title="Assigned Bookings"
          description="Coordinate assigned catering operations, perform on-site equipment checks, and log event shift reports"
        />

        {/* Segmented Controls / Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => handleTabChange("upcoming")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "upcoming"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarIcon size={14} className={activeTab === "upcoming" ? "text-[#4C81E0]" : "text-slate-400"} />
              <span>Upcoming Events</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                activeTab === "upcoming" ? "bg-blue-100 text-[#4C81E0]" : "bg-slate-200 text-slate-600"
              }`}>
                {upcomingBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("completed")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "completed"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 size={14} className={activeTab === "completed" ? "text-emerald-600" : "text-slate-400"} />
              <span>Completed</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                activeTab === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
              }`}>
                {completedBookings.length}
              </span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client, event or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
            />
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-2xl">
            Loading events...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <CalendarIcon size={32} className="mx-auto text-slate-400" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                {activeTab === "completed" ? "No completed events found" : "No upcoming events found"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "No assignments matched your search filter."
                  : activeTab === "completed"
                  ? "You have not completed any event assignments yet."
                  : "You have no upcoming catering assignments scheduled."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {filteredList.map((booking) => {
              const isCompleted = activeTab === "completed" || ["completed", "Completed"].includes(booking.status);
              const eventTiming = getEventTimingStatus(booking);
              const venue = booking.venue_type || [booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") || "Venue TBA";

              return (
                <div
                  key={booking._id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:border-[#4C81E0]/50 transition-all space-y-3.5"
                >
                  {/* Top Row: Type, Status */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                          {isCompleted ? "Historical Event" : "Assigned Event"}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {booking.event_type || "Catering Event"}
                        </h3>
                      </div>
                      <Badge status={booking.status || (isCompleted ? "Completed" : "confirmed")} />
                    </div>

                    <div className="text-xs text-slate-500">
                      Client: <strong className="text-slate-800">{booking.customer_id?.full_name || "Valued Client"}</strong> · Ref <span className="font-mono text-slate-700 font-semibold">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <CalendarIcon size={13} className="text-[#4C81E0] shrink-0" />
                        <span>
                          {booking.event_date
                            ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "Date TBA"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 pl-5 text-[11.5px]">
                        <Clock size={11} className="shrink-0" />
                        <span>{booking.start_time || "Time TBA"} ({booking.duration_hours || 4} hrs)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                        <MapPin size={13} className="text-[#4C81E0] shrink-0" />
                        <span className="truncate">{venue}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 pl-5 text-[11.5px]">
                        <ShieldCheck size={11} className="text-amber-600 shrink-0" />
                        <span>Lead: <strong>Event Lead</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Read-only record
                        </span>
                      ) : (
                        <>
                          {eventTiming.isUpcoming && (
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700">
                              <Lock size={10} className="text-slate-500" /> Upcoming
                            </span>
                          )}
                          {eventTiming.isStarted && !eventTiming.isFinished && (
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                              <Sparkles size={10} className="text-emerald-600" /> In Progress
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openDetail(booking._id)}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Manager Event Details Modal (Includes Equipment Check & Incident Notes) */}
        {selectedBooking && (
          <Modal
            open={Boolean(selectedBooking)}
            onClose={closeDetail}
            title={selectedBooking.event_type || "Event Details"}
            size="2xl"
          >
            <div className="space-y-5">
              {/* Event Header Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Lead Operations Management
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {selectedBooking.event_type || "Catering Event"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Client: <strong className="text-slate-800">{selectedBooking.customer_id?.full_name || "Valued Client"}</strong> · Ref <span className="font-mono text-slate-700 font-semibold">{selectedBooking.reference || selectedBooking._id?.slice(-6).toUpperCase()}</span>
                    </p>
                  </div>
                  <Badge status={selectedBooking.status || "confirmed"} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <CalendarIcon size={12} className="text-[#4C81E0]" /> Schedule
                    </span>
                    <span className="text-slate-600 block">
                      {selectedBooking.event_date ? new Date(selectedBooking.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Date TBA"} at {selectedBooking.start_time || "Time TBA"} ({selectedBooking.duration_hours || 4} hrs)
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <MapPin size={12} className="text-[#4C81E0]" /> Venue
                    </span>
                    <span className="text-slate-600 block truncate">
                      {selectedBooking.venue_type || [selectedBooking.street, selectedBooking.barangay, selectedBooking.municipality].filter(Boolean).join(", ") || "Venue TBA"}
                    </span>
                  </div>
                </div>

                {isEventDetailCompleted && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>This event is marked completed and read-only. Operational submissions are closed.</span>
                  </div>
                )}
              </div>

              {/* SECTION: Assigned Crew on Duty (Read-Only) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users size={14} className="text-[#4C81E0]" />
                    <span>Assigned Staff Team ({selectedBooking.staff_assignments?.length || 0})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Assigned by Administrator
                  </span>
                </div>

                {(!selectedBooking.staff_assignments || selectedBooking.staff_assignments.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                    No staff crew dispatched yet by the Administrator.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedBooking.staff_assignments.map((member, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200/80 bg-white flex items-center justify-between gap-2 shadow-2xs">
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

              {/* SECTION: Equipment Check (Transferred to Manager!) */}
              <div id="equipment-check" className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <PackageCheck size={16} className="text-[#4C81E0]" />
                      <span>Equipment Check Manifest</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confirm catering gear, track expected vs dispatched quantities, and record returned or damaged items.
                    </p>
                  </div>

                  {!isEventDetailCompleted && !timing.isUpcoming && (
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

                {timing.isUpcoming && !isEventDetailCompleted ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
                      <Lock size={14} className="text-amber-600 shrink-0" />
                      <span>
                        Equipment check opens when the event starts. Below is the dispatched equipment manifest for advance preparation.
                      </span>
                    </div>

                    <div className="space-y-2">
                      {equipmentList.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs"
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
                            className={`p-3 rounded-xl border transition-all space-y-2.5 ${
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

                            {!isEventDetailCompleted && (
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

                    {!isEventDetailCompleted && (
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

              {/* SECTION: Report Incident & Shift Note (Transferred to Manager!) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-[#4C81E0]" />
                    <span>Report Incident &amp; Shift Note</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record operational delays, kitchen issues, equipment problems, extra hours, or client feedback.
                  </p>
                </div>

                {!isEventDetailCompleted && (
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleSubmitReport}
                        disabled={submittingReport || (!note.trim() && quickTags.length === 0)}
                        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                      >
                        <FileText size={14} className="text-slate-500" />
                        <span>{submittingReport ? "Submitting Report..." : "Submit Report"}</span>
                      </button>

                      {timing.isUpcoming ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500 justify-end">
                          <Lock size={12} className="text-slate-400" />
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
                  </>
                )}

                {/* Previously Logged Reports (Historical & Current) */}
                {selectedBooking.staff_reports && selectedBooking.staff_reports.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Logged Shift &amp; Incident Reports ({selectedBooking.staff_reports.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedBooking.staff_reports.map((report, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1">
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

              {/* Supporting Details: Menu, Setup Requirements */}
              {(selectedBooking.menu_items?.length > 0 || selectedBooking.service_items?.length > 0) && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Menu &amp; Add-on Requirements
                  </h3>

                  {selectedBooking.menu_items?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Utensils size={13} className="text-[#4C81E0]" /> Catering Menu ({selectedBooking.menu_items.length} Dishes)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {selectedBooking.menu_items.map((dish, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-900">{dish.name || dish.dish_id?.name || "Dish"}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">{dish.category || "Main"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBooking.service_items?.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Layers size={13} className="text-[#4C81E0]" /> Add-on Services
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {selectedBooking.service_items.map((srv, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-900">{srv.name}</span>
                            <span className="text-[11px] text-slate-600">Qty: {srv.quantity || 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </ManagerLayout>
  );
}
