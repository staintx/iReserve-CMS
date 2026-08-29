import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
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
  ShieldCheck,
  UserCheck,
  Sparkles,
  Info,
  Check,
  AlertCircle,
  ClipboardList,
  Lock,
  Utensils,
  Layers,
  X
} from "lucide-react";
import { getEventTimingStatus } from "../../utils/format";


export default function StaffEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "briefing"); // "briefing" | "equipment" | "report"

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
    { label: "All Smooth ✓", value: "all_smooth", color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
    { label: "Late Start ⏰", value: "late_start", color: "bg-amber-50 text-amber-800 border-amber-300" },
    { label: "Missing Gear ⚠️", value: "missing_items", color: "bg-red-50 text-red-800 border-red-300" },
    { label: "Damaged Items 💥", value: "damaged_gear", color: "bg-rose-50 text-rose-800 border-rose-300" },
    { label: "Leftover Food 🍲", value: "leftover_food", color: "bg-blue-50 text-blue-800 border-blue-300" },
    { label: "Extra Hours ⏱️", value: "extra_hours", color: "bg-purple-50 text-purple-800 border-purple-300" }
  ];

  const loadEvent = async () => {
    setLoading(true);
    try {
      const res = await StaffAPI.getBooking(id);
      const data = res.data;
      setBooking(data);

      // Initialize equipment returns list
      const initialReturns = [];
      const assignedItems = data.inventory_items || [];
      const returns = data.equipment_returns || [];

      if (returns.length > 0) {
        returns.forEach((ret) => {
          const qtyRet = ret.quantity_returned !== undefined ? ret.quantity_returned : (ret.quantity_booked || 1);
          initialReturns.push({
            inventory_id: ret.inventory_id?._id || ret.inventory_id || null,
            name: ret.name || ret.inventory_id?.item_name || "Equipment Item",
            quantity_booked: ret.quantity_booked || 1,
            quantity_returned: qtyRet,
            notes: ret.notes || "",
            _verified: true,
            _markedMissing: qtyRet < (ret.quantity_booked || 1)
          });
        });
      } else if (assignedItems.length > 0) {
        assignedItems.forEach((item) => {
          initialReturns.push({
            inventory_id: item.inventory_id?._id || item.inventory_id || null,
            name: item.name || item.inventory_id?.item_name || "Equipment Item",
            quantity_booked: item.quantity || 1,
            quantity_returned: item.quantity || 1,
            notes: "",
            _verified: false,
            _markedMissing: false
          });
        });
      } else {
        // Fallback default catering gear items if no specific inventory is linked
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
      
      // Auto-complete if everything is accounted for
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
      
      // Auto-complete if everything is accounted for
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
    notify("Matched all items to booked quantity.", "success");
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
        equipment_returns: equipmentList,
        equipment_notes: equipmentNotes
      });
      notify("Equipment return checklist submitted & logged!", "success");
      loadEvent();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit equipment returns.", "error");
    } finally {
      setSubmittingEquipment(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!note.trim() && quickTags.length === 0) {
      notify("Please type a note or choose at least one quick tag.", "error");
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

  const handleCompleteEvent = async () => {
    await confirm({
      tone: "confirm",
      title: "Mark this event as completed?",
      description:
        "This closes out the shift with the notes and equipment returns recorded below. Check them before confirming — you will be taken back to your dashboard.",
      confirmLabel: "Mark completed",
      cancelLabel: "Not yet",
      onConfirm: async () => {
        setCompletingEvent(true);
        try {
          await StaffAPI.completeEvent(id, {
            final_notes: note.trim() || undefined,
            equipment_returns: equipmentList,
          });
          notify("Event marked as completed", "success", { description: "Nice work." });
          navigate("/staff/dashboard");
        } finally {
          setCompletingEvent(false);
        }
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

  const equipmentStats = useMemo(() => {
    let totalBooked = 0;
    let totalReturned = 0;
    let totalDamaged = 0;
    equipmentList.forEach((item) => {
      totalBooked += Number(item.quantity_booked || 0);
      totalReturned += Number(item.quantity_returned || 0);
      totalDamaged += Number(item.quantity_damaged || 0);
    });
    const discrepancy = totalBooked - totalReturned - totalDamaged;
    return { totalBooked, totalReturned, totalDamaged, discrepancy };
  }, [equipmentList]);

  if (loading) {
    return (
      <StaffLayout>
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading event specifications...
        </div>
      </StaffLayout>
    );
  }

  if (!booking) {
    return (
      <StaffLayout>
        <AdminCard className="!p-8 text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-amber-600" />
          <h2 className="text-lg font-bold text-foreground">Event Not Found</h2>
          <p className="text-xs text-muted-foreground">The assigned event could not be loaded or you are not assigned to it.</p>
          <Btn variant="secondary" size="sm" onClick={() => navigate("/staff/dashboard")}>
            Back to Assigned Events
          </Btn>
        </AdminCard>
      </StaffLayout>
    );
  }

  const manager = booking.event_manager_id || null;

  return (
    <StaffLayout>
      <div className="space-y-4">
        {/* Navigation & Header */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/staff/dashboard")}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} /> Back to Assigned Events
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {booking.event_type || "Catering Event"}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-950 border border-amber-300 font-bold text-xs">
                  Role: {myRole}
                </span>

                {timing.isUpcoming && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-[10.5px] flex items-center gap-1">
                    <Lock size={11} className="text-slate-500" />
                    <span>Upcoming Shift</span>
                  </span>
                )}
                {timing.isStarted && !timing.isFinished && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 font-bold text-[10.5px] flex items-center gap-1 animate-pulse">
                    <Sparkles size={11} className="text-emerald-600" />
                    <span>In Progress</span>
                  </span>
                )}
                {timing.isFinished && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-300 font-bold text-[10.5px] flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-blue-600" />
                    <span>Ready for Return Check</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Client: <strong className="text-foreground">{booking.customer_id?.full_name || "Valued Client"}</strong> • REF: <span className="font-mono">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge status={booking.status || "confirmed"} />
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1 p-0.5 bg-muted/80 border border-border/80 rounded-md w-full sm:w-fit overflow-x-auto no-scrollbar scroll-smooth flex-nowrap shrink-0">
          {[
            { id: "briefing", label: "Event Briefing & Team", icon: ClipboardList },
            { 
              id: "equipment", 
              label: timing.isUpcoming 
                ? `Dispatched Gear (${equipmentList.length})` 
                : `Equipment Check (${equipmentList.length})`, 
              icon: timing.isUpcoming ? Lock : PackageCheck,
              isLocked: timing.isUpcoming
            },
            { id: "report", label: "Incident & Completion", icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 sm:py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-2xs border border-border/80 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={13} className={activeTab === tab.id ? "text-primary" : "text-muted-foreground"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: BRIEFING & TEAM */}
        {activeTab === "briefing" && (
          <div className="space-y-4">
            {/* Top Important Instructions / Briefing Alert */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>Shift Briefing &amp; Key Requirements</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-950 dark:text-amber-200">
                <div className="bg-card p-2.5 rounded-md border border-amber-200/60 dark:border-amber-800 shadow-2xs">
                  <span className="font-bold block text-amber-900 dark:text-amber-300 mb-0.5">Dress Code &amp; Arrival:</span>
                  <span>Standard black catering uniform with apron. Arrive at least <strong>1 hour before</strong> start time.</span>
                </div>
                <div className="bg-card p-2.5 rounded-md border border-amber-200/60 dark:border-amber-800 shadow-2xs">
                  <span className="font-bold block text-amber-900 dark:text-amber-300 mb-0.5">Dietary &amp; Special Requests:</span>
                  <span>
                    {booking.dietary_restrictions ? `Dietary: ${booking.dietary_restrictions}. ` : ""}
                    {booking.allergies ? `Allergies: ${booking.allergies}. ` : ""}
                    {booking.special_requests ? `Special: ${booking.special_requests}. ` : ""}
                    {booking.notes || (!booking.dietary_restrictions && !booking.allergies && !booking.special_requests ? "Follow standard catering protocol." : "")}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Specs & Lead Coordinator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Event Schedule & Location */}
              <AdminCard className="space-y-3 lg:col-span-2 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" /> Event Schedule &amp; Venue
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border/80 space-y-0.5 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Date &amp; Duration</span>
                    <div className="text-xs font-bold text-foreground">
                      {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{booking.start_time || "Time TBA"} ({booking.duration_hours || 4} Hours)</div>
                  </div>

                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border/80 space-y-0.5 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Guest Count</span>
                    <div className="text-xs font-bold text-foreground">{booking.guest_count || 0} Guests</div>
                    <div className="text-[11px] text-muted-foreground truncate">Package: {booking.package_id?.name || booking.package_name_snapshot || "Custom Package"}</div>
                  </div>

                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border/80 sm:col-span-2 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Venue Location</span>
                      {(() => {
                        const locQuery = [booking.street, booking.barangay, booking.municipality, booking.venue_type].filter(Boolean).join(", ");
                        return locQuery ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10.5px] font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            🗺️ Open in Google Maps
                          </a>
                        ) : null;
                      })()}
                    </div>
                    <div className="text-xs font-bold text-foreground">{booking.venue_type || "Venue Location"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") || "Address details will be confirmed by lead."}
                    </div>
                  </div>
                </div>
              </AdminCard>

              {/* Lead Coordinator Card */}
              <AdminCard className="space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" /> Lead Event Manager
                </h3>

                {manager ? (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                        {manager.full_name?.slice(0, 2).toUpperCase() || "MG"}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-xs">{manager.full_name}</div>
                        <div className="text-[10.5px] text-amber-800 dark:text-amber-300 font-semibold">Lead Coordinator</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1.5 border-t border-amber-200/80 dark:border-amber-800 text-xs">
                      {manager.phone && (
                        <a 
                          href={`tel:${manager.phone}`} 
                          className="flex items-center gap-1.5 text-foreground font-semibold hover:text-primary transition-colors"
                          title="Tap to call lead manager"
                        >
                          <Phone size={12} className="text-amber-700 dark:text-amber-400 shrink-0" />
                          <span>{manager.phone}</span>
                          <span className="text-[10px] text-primary font-bold ml-auto bg-card px-1.5 py-0.5 rounded border border-border">📞 Call</span>
                        </a>
                      )}
                      {manager.email && (
                        <a 
                          href={`mailto:${manager.email}`}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Mail size={12} className="text-amber-700 dark:text-amber-400 shrink-0" />
                          <span className="truncate">{manager.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3">
                    Lead coordinator not designated yet.
                  </p>
                )}
              </AdminCard>
            </div>

            {/* Catering Menu & Selected Dishes */}
            <AdminCard className="space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Utensils size={15} className="text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Catering Menu &amp; Kitchen Specifications ({(booking.menu_items || []).length} Dishes)
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground">Kitchen Prep Specs</span>
              </div>

              {(booking.menu_items || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No menu dishes attached yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {booking.menu_items.map((dish, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/80 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{dish.name || dish.dish_id?.name || "Catering Dish"}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">{dish.category || dish.dish_id?.category || "Main"}</span>
                      </div>
                      {dish.special_instructions && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1 rounded border border-amber-200 dark:border-amber-800">
                          {dish.special_instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            {/* Add-on Services & Event Setup */}
            {((booking.service_items && booking.service_items.length > 0) || (booking.additional_charges && booking.additional_charges.length > 0)) && (
              <AdminCard className="space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Layers size={15} className="text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Add-on Services &amp; Event Styling</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Special service setup</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(booking.service_items || []).map((srv, idx) => (
                    <div key={`srv-${idx}`} className="p-2.5 bg-muted/30 rounded-lg border border-border/80 flex items-center justify-between text-xs shadow-2xs">
                      <div>
                        <div className="font-bold text-foreground">{srv.name}</div>
                        {srv.note && <div className="text-[10.5px] text-muted-foreground">{srv.note}</div>}
                      </div>
                      {srv.quantity > 1 && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Qty: {srv.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                  {(booking.additional_charges || []).map((chg, idx) => (
                    <div key={`chg-${idx}`} className="p-2.5 bg-muted/30 rounded-lg border border-border/80 text-xs shadow-2xs">
                      <div className="font-bold text-foreground">{chg.label}</div>
                      {chg.reason && <div className="text-[10.5px] text-muted-foreground">{chg.reason}</div>}
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* Coworker Crew List */}
            <AdminCard className="space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Assigned Catering Crew ({(booking.staff_assignments || []).length})</h3>
                </div>
                <span className="text-[11px] text-muted-foreground">On duty this shift</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {Object.entries(teamByRole).map(([roleName, members]) => (
                  <div key={roleName} className="p-2.5 bg-muted/30 rounded-lg border border-border/80 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {roleName} ({members.length})
                    </span>
                    <div className="space-y-1">
                      {members.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-semibold text-foreground py-0.5">
                          <span className="truncate">{member.name || member.user_id?.full_name || "Crew Member"}</span>
                          {member.phone && (
                            <a 
                              href={`tel:${member.phone}`}
                              className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              📞 {member.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}


        {/* TAB 2: EQUIPMENT COUNTING & RETURN VERIFICATION */}
        {activeTab === "equipment" && (
          <div className="space-y-4">
            {/* If event is upcoming (not yet started): Show locked info banner & read-only manifest */}
            {timing.isUpcoming ? (
              <div className="space-y-4">
                {/* Informative Lock Notice Banner */}
                <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 rounded-lg space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                      <Lock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Equipment Return Verification is Locked</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[10.5px]">
                      Opens at Event Start
                    </span>
                  </div>
                  <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                    Gear counting, condition logging, and return verification will automatically unlock when the event starts on{" "}
                    <strong>{booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "the event date"} at {booking.start_time || "scheduled time"}</strong>.
                    Below is the list of catering equipment dispatched for this booking for your advance preparation.
                  </p>
                </div>

                {/* Read-Only Dispatched Gear Manifest Card */}
                <AdminCard className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <PackageCheck size={15} className="text-primary" />
                        <span>Dispatched Catering Gear Manifest</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inventory items packed and dispatched to the venue for this catering event
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border text-xs font-semibold self-start sm:self-auto flex items-center gap-1.5">
                      <Lock size={12} />
                      <span>{equipmentList.length} Items Dispatched</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {equipmentList.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="p-2.5 rounded-lg border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-xs text-foreground">{item.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Expected at Venue: <strong className="text-foreground">{item.quantity_booked} units</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-[11px] font-semibold flex items-center gap-1">
                            <span>Dispatched: {item.quantity_booked}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold flex items-center gap-1">
                            <Lock size={11} /> Return Pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-muted/20 rounded-lg border border-border/80 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 shadow-2xs">
                    <Lock size={12} className="text-muted-foreground" />
                    <span>Return counting and checklist submission will be enabled during the event.</span>
                  </div>
                </AdminCard>
              </div>
            ) : (
              /* If event has started or concluded: Show interactive verification UI */
              <div className="space-y-4">
                {/* Equipment Summary KPI Banner (2x2 on mobile, 4-col on desktop) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <AdminCard className="!p-2.5 sm:!p-3 bg-card border-border/80 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Booked Gear</span>
                    <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{equipmentStats.totalBooked} Units</div>
                    <p className="text-[10.5px] text-muted-foreground">Dispatched</p>
                  </AdminCard>

                  <AdminCard className="!p-2.5 sm:!p-3 bg-card border-border/80 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Returned Safe</span>
                    <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">{equipmentStats.totalReturned} Units</div>
                    <p className="text-[10.5px] text-emerald-600 font-semibold">Accounted</p>
                  </AdminCard>

                  <AdminCard className={`!p-2.5 sm:!p-3 shadow-2xs ${equipmentStats.totalDamaged > 0 ? "bg-rose-50/60 border-rose-200" : "bg-card border-border/80"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Damaged</span>
                    <div className={`text-lg sm:text-xl font-bold mt-0.5 ${equipmentStats.totalDamaged > 0 ? "text-rose-800" : "text-slate-600"}`}>
                      {equipmentStats.totalDamaged > 0 ? `⚠️ ${equipmentStats.totalDamaged}` : "0"}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">Broken</p>
                  </AdminCard>

                  <AdminCard className={`!p-2.5 sm:!p-3 shadow-2xs ${equipmentStats.discrepancy !== 0 ? "bg-amber-50/60 border-amber-200" : "bg-card border-border/80"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discrepancy</span>
                    <div className={`text-lg sm:text-xl font-bold mt-0.5 ${equipmentStats.discrepancy !== 0 ? "text-amber-800" : "text-slate-600"}`}>
                      {equipmentStats.discrepancy > 0 
                        ? `⚠️ ${equipmentStats.discrepancy} Short` 
                        : equipmentStats.discrepancy < 0 
                          ? `⚠️ ${Math.abs(equipmentStats.discrepancy)} Extra` 
                          : "0 All In"}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">Missing items</p>
                  </AdminCard>
                </div>

                {/* Checklist Table */}
                <AdminCard className="space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/60">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Equipment Counting &amp; Return Verification Checklist</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Count and record all catering equipment upon event wrap-up before returning to inventory
                      </p>
                    </div>

                    <button 
                      type="button"
                      onClick={handleMatchAllQuantities}
                      className="self-start sm:self-auto py-1.5 px-3 min-h-[38px] sm:min-h-0 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={13} className="text-emerald-600" />
                      <span>Match All Dispatched</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {equipmentList.map((item, idx) => {
                      const isMissing = item._verified && item._markedMissing;
                      const isMatch = item._verified && !item._markedMissing && ((item.quantity_returned || 0) + (item.quantity_damaged || 0)) === item.quantity_booked;

                      return (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg border transition-all shadow-2xs space-y-2 ${
                            isMissing ? "border-amber-300 bg-amber-50/40" : (isMatch ? "border-emerald-200 bg-emerald-50/30" : "border-border/80 bg-card")
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-foreground">{item.name}</span>
                                {isMatch && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                                    <CheckCircle2 size={10} /> Verified
                                  </span>
                                )}
                                {item.quantity_damaged > 0 && (
                                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300 flex items-center gap-0.5">
                                    <AlertTriangle size={10} /> {item.quantity_damaged} Damaged
                                  </span>
                                )}
                                {isMissing && (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                                    <AlertTriangle size={10} /> {item.quantity_booked - (item.quantity_returned || 0) - (item.quantity_damaged || 0)} Short
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Booked / Dispatched: <strong className="text-foreground">{item.quantity_booked}</strong>
                              </div>
                            </div>

                            {/* Input Controls */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                              {isMatch ? (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => handleMarkMissing(idx)} className="p-1.5 min-h-[38px] rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold" title="Edit counts">
                                    <AlertTriangle size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <div className="px-2.5 py-1.5 min-h-[38px] rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1">
                                    <CheckCircle2 size={13} /> Complete
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                  <button onClick={() => handleMarkComplete(idx)} className="flex-1 sm:flex-initial px-2.5 py-1.5 min-h-[38px] rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer" title="Mark complete">
                                    <Check size={13} /> All Complete
                                  </button>
                                  <button onClick={() => handleMarkMissing(idx)} className="flex-1 sm:flex-initial px-2.5 py-1.5 min-h-[38px] rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer" title="Adjust count">
                                    <X size={13} /> Custom Count
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stepper Count Area */}
                          {item._markedMissing && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                              {/* Safe Return Stepper */}
                              <div className="flex items-center gap-1 bg-card p-1 rounded-md border border-border shadow-2xs">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Safe:</label>
                                <button
                                  type="button"
                                  onClick={() => stepReturnedQty(idx, -1)}
                                  className="w-7 h-7 rounded bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.quantity_booked}
                                  value={item.quantity_returned}
                                  onChange={(e) => handleUpdateReturnedQuantity(idx, e.target.value)}
                                  className="w-10 text-center font-bold text-xs p-0.5 bg-transparent border-0 focus:ring-0 text-foreground"
                                />
                                <button
                                  type="button"
                                  onClick={() => stepReturnedQty(idx, 1)}
                                  className="w-7 h-7 rounded bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95"
                                >
                                  +
                                </button>
                              </div>

                              {/* Damaged Stepper */}
                              <div className="flex items-center gap-1 bg-rose-50/60 p-1 rounded-md border border-rose-200 shadow-2xs">
                                <label className="text-[10px] font-bold text-rose-800 uppercase px-1">Broken:</label>
                                <button
                                  type="button"
                                  onClick={() => stepDamagedQty(idx, -1)}
                                  className="w-7 h-7 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.quantity_booked}
                                  value={item.quantity_damaged || 0}
                                  onChange={(e) => handleUpdateDamagedQuantity(idx, e.target.value)}
                                  className="w-10 text-center font-bold text-xs p-0.5 bg-transparent border-0 focus:ring-0 text-rose-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => stepDamagedQty(idx, 1)}
                                  className="w-7 h-7 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95"
                                >
                                  +
                                </button>
                              </div>

                              <input
                                type="text"
                                placeholder="Notes for missing/damaged..."
                                value={item.notes || ""}
                                onChange={(e) => handleUpdateEquipmentNote(idx, e.target.value)}
                                className="flex-1 min-w-[140px] p-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2 pt-2.5 border-t border-border/60">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Equipment Notes</label>
                    <textarea
                      placeholder="Any overall observations regarding the equipment..."
                      value={equipmentNotes}
                      onChange={(e) => setEquipmentNotes(e.target.value)}
                      className="w-full min-h-[70px] p-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:ring-1 focus:ring-primary placeholder:text-muted-foreground resize-y"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="button"
                      onClick={handleSubmitEquipmentReturns} 
                      disabled={submittingEquipment}
                      className="w-full sm:w-auto py-2 px-4 min-h-[42px] sm:min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PackageCheck size={14} />
                      <span>{submittingEquipment ? "Saving Verification..." : "Save Equipment Verification"}</span>
                    </button>
                  </div>
                </AdminCard>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INCIDENT & COMPLETION */}
        {activeTab === "report" && (
          <div className="space-y-4">
            <AdminCard className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Shift Incident &amp; Handover Reporting</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select tags and log post-event notes for the Lead Event Manager and Admin
                </p>
              </div>

              {/* Quick Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Incident / Status Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => {
                    const isSelected = quickTags.includes(tag.label);
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleQuickTag(tag.label)}
                        className={`px-3 py-2 sm:py-1 min-h-[38px] sm:min-h-0 rounded-md border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                          isSelected ? `${tag.color} ring-2 ring-primary/30 shadow-2xs font-bold` : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shift Report Details</label>
                <textarea
                  rows={3}
                  placeholder="Describe catering execution, leftover food disposition, staff performance, or client feedback..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-border/60">
                <button 
                  type="button"
                  onClick={handleSubmitReport} 
                  disabled={submittingReport || (!note.trim() && quickTags.length === 0)}
                  className="w-full sm:w-auto py-2 px-3.5 min-h-[42px] sm:min-h-0 bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingReport ? "Submitting Log..." : "Submit Incident Report"}
                </button>

                {timing.isUpcoming ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 font-medium">
                      <Lock size={12} className="text-muted-foreground" /> Shift completion opens at event start
                    </span>
                    <button 
                      type="button"
                      disabled={true}
                      className="w-full sm:w-auto py-2 px-4 min-h-[42px] sm:min-h-0 opacity-50 cursor-not-allowed border border-border bg-muted text-muted-foreground font-semibold text-xs rounded-md flex items-center justify-center gap-1.5"
                      title="Shift cannot be marked completed before the event starts"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Shift Completed</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={handleCompleteEvent} 
                    disabled={completingEvent}
                    className="w-full sm:w-auto py-2 px-4 min-h-[42px] sm:min-h-0 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>{completingEvent ? "Completing..." : "Mark Shift Completed"}</span>
                  </button>
                )}
              </div>
            </AdminCard>

            {/* Previously Logged Staff Reports */}
            {booking.staff_reports && booking.staff_reports.length > 0 && (
              <AdminCard className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logged Shift Reports</h4>
                <div className="space-y-2">
                  {booking.staff_reports.map((report, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/80 text-xs space-y-0.5 shadow-2xs">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-bold text-foreground">{report.role || "Staff Member"}</span>
                        <span>{new Date(report.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground mt-0.5">{report.note}</p>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

