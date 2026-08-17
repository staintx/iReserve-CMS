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
  ClipboardList
} from "lucide-react";

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
          initialReturns.push({
            inventory_id: ret.inventory_id?._id || ret.inventory_id || null,
            name: ret.name || ret.inventory_id?.item_name || "Equipment Item",
            quantity_booked: ret.quantity_booked || 1,
            quantity_returned: ret.quantity_returned !== undefined ? ret.quantity_returned : (ret.quantity_booked || 1),
            notes: ret.notes || ""
          });
        });
      } else if (assignedItems.length > 0) {
        assignedItems.forEach((item) => {
          initialReturns.push({
            inventory_id: item.inventory_id?._id || item.inventory_id || null,
            name: item.name || item.inventory_id?.item_name || "Equipment Item",
            quantity_booked: item.quantity || 1,
            quantity_returned: item.quantity || 1,
            notes: ""
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
            notes: ""
          });
        });
      }

      setEquipmentList(initialReturns);
    } catch (err) {
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
    const val = Math.max(0, parseInt(value, 10) || 0);
    setEquipmentList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity_returned: val };
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
      prev.map((item) => ({ ...item, quantity_returned: item.quantity_booked }))
    );
    notify("Matched all items to booked quantity.", "success");
  };

  const handleSubmitEquipmentReturns = async () => {
    setSubmittingEquipment(true);
    try {
      await StaffAPI.submitEquipmentReturns(id, {
        equipment_returns: equipmentList
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
    equipmentList.forEach((item) => {
      totalBooked += Number(item.quantity_booked || 0);
      totalReturned += Number(item.quantity_returned || 0);
    });
    const discrepancy = totalBooked - totalReturned;
    return { totalBooked, totalReturned, discrepancy };
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
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/staff/dashboard")}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5 mb-3 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Assigned Events
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl sm:text-3xl font-bold text-foreground">
                  {booking.event_type || "Catering Event"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs">
                  My Role: {myRole}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Client: <strong className="text-foreground">{booking.customer_id?.full_name || "Valued Client"}</strong> • REF: <span className="font-mono">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge status={booking.status || "confirmed"} />
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 p-1 bg-muted/60 border border-border rounded-xl w-fit">
          {[
            { id: "briefing", label: "Event Briefing & Team", icon: ClipboardList },
            { id: "equipment", label: `Equipment Verification (${equipmentList.length})`, icon: PackageCheck },
            { id: "report", label: "Incident & Completion", icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-2xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} className={activeTab === tab.id ? "text-primary" : "text-muted-foreground"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: BRIEFING & TEAM */}
        {activeTab === "briefing" && (
          <div className="space-y-6">
            {/* Top Important Instructions / Briefing Alert */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle size={17} className="text-amber-600 shrink-0" />
                <span>Shift Briefing &amp; Key Requirements</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-amber-950">
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold block text-amber-900 mb-1">Dress Code &amp; Arrival:</span>
                  <span>Standard black catering uniform with apron. Arrive at least <strong>1 hour before</strong> start time.</span>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <span className="font-bold block text-amber-900 mb-1">Client Special Instructions:</span>
                  <span>{booking.notes || "No special dietary restrictions logged. Follow standard catering protocol."}</span>
                </div>
              </div>
            </div>

            {/* Event Specs & Lead Coordinator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Schedule & Location */}
              <AdminCard className="!p-5 space-y-3.5 lg:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" /> Event Schedule &amp; Venue
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Date &amp; Duration</span>
                    <div className="text-sm font-bold text-foreground">
                      {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "TBA"}
                    </div>
                    <div className="text-xs text-muted-foreground">{booking.start_time || "Time TBA"} ({booking.duration_hours || 4} Hours)</div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Guest Count</span>
                    <div className="text-sm font-bold text-foreground">{booking.guest_count || 0} Guests</div>
                    <div className="text-xs text-muted-foreground">Package: {booking.package_id?.name || "Custom Catering Package"}</div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border sm:col-span-2 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Venue Location</span>
                    <div className="text-sm font-bold text-foreground">{booking.venue_type || "Venue Location"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") || "Address details will be confirmed by lead."}
                    </div>
                  </div>
                </div>
              </AdminCard>

              {/* Lead Coordinator Card */}
              <AdminCard className="!p-5 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" /> Lead Event Manager
                </h3>

                {manager ? (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-950 font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
                        {manager.full_name?.slice(0, 2).toUpperCase() || "MG"}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{manager.full_name}</div>
                        <div className="text-[11px] text-amber-800 font-semibold">Lead Coordinator</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-amber-200/80 text-xs">
                      {manager.phone && (
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Phone size={13} className="text-amber-700" />
                          <span>{manager.phone}</span>
                        </div>
                      )}
                      {manager.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail size={13} className="text-amber-700" />
                          <span className="truncate">{manager.email}</span>
                        </div>
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

            {/* Coworker Crew List */}
            <AdminCard className="!p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Assigned Catering Crew ({(booking.staff_assignments || []).length})</h3>
                </div>
                <span className="text-xs text-muted-foreground">Working alongside you on this shift</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(teamByRole).map(([roleName, members]) => (
                  <div key={roleName} className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {roleName} ({members.length})
                    </span>
                    <div className="space-y-1.5">
                      {members.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="truncate">{member.name || member.user_id?.full_name || "Crew Member"}</span>
                          {member.phone && (
                            <span className="text-[10px] text-muted-foreground font-mono">{member.phone}</span>
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
          <div className="space-y-6">
            {/* Equipment Summary KPI Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AdminCard className="!p-4 bg-card border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Gear Booked</span>
                <div className="text-2xl font-bold text-foreground mt-1">{equipmentStats.totalBooked} Units</div>
                <p className="text-[11px] text-muted-foreground">Dispatched for this event</p>
              </AdminCard>

              <AdminCard className="!p-4 bg-card border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items Verified Returned</span>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{equipmentStats.totalReturned} Units</div>
                <p className="text-[11px] text-emerald-600 font-semibold">Accounted &amp; checked</p>
              </AdminCard>

              <AdminCard className={`!p-4 ${equipmentStats.discrepancy > 0 ? "bg-amber-50 border-amber-200" : "bg-card border-border"}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discrepancy / Loss</span>
                <div className={`text-2xl font-bold mt-1 ${equipmentStats.discrepancy > 0 ? "text-amber-800" : "text-slate-600"}`}>
                  {equipmentStats.discrepancy > 0 ? `⚠️ ${equipmentStats.discrepancy} Missing` : "0 (All Accounted)"}
                </div>
                <p className="text-[11px] text-muted-foreground">Difference from dispatch</p>
              </AdminCard>
            </div>

            {/* Checklist Table */}
            <AdminCard className="!p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Equipment Counting &amp; Return Verification Checklist</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Count and record all catering equipment upon event wrap-up before returning to inventory
                  </p>
                </div>

                <Btn 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleMatchAllQuantities}
                  className="self-start sm:self-auto border-border flex items-center gap-1 text-xs"
                >
                  <Check size={13} className="text-emerald-600" />
                  <span>Match All Dispatched</span>
                </Btn>
              </div>

              <div className="space-y-3">
                {equipmentList.map((item, idx) => {
                  const isMissing = (item.quantity_returned || 0) < item.quantity_booked;
                  const isMatch = (item.quantity_returned || 0) === item.quantity_booked;

                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMissing ? "border-amber-300 bg-amber-50/40" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{item.name}</span>
                            {isMatch && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                                <CheckCircle2 size={10} /> Verified
                              </span>
                            )}
                            {isMissing && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                                <AlertTriangle size={10} /> {item.quantity_booked - item.quantity_returned} Short
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Booked / Dispatched: <strong className="text-foreground">{item.quantity_booked}</strong>
                          </div>
                        </div>

                        {/* Input Controls */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground">Returned Qty:</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity_booked * 2}
                              value={item.quantity_returned}
                              onChange={(e) => handleUpdateReturnedQuantity(idx, e.target.value)}
                              className="w-20 p-1.5 rounded-lg border border-border bg-background text-xs font-bold text-center text-foreground focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Condition notes / damages..."
                            value={item.notes || ""}
                            onChange={(e) => handleUpdateEquipmentNote(idx, e.target.value)}
                            className="p-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground w-44 sm:w-56"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Btn 
                  variant="primary" 
                  onClick={handleSubmitEquipmentReturns} 
                  disabled={submittingEquipment}
                  className="flex items-center gap-2"
                >
                  <PackageCheck size={14} />
                  <span>{submittingEquipment ? "Saving Verification..." : "Save Equipment Verification"}</span>
                </Btn>
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 3: INCIDENT & COMPLETION */}
        {activeTab === "report" && (
          <div className="space-y-6">
            <AdminCard className="!p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Shift Incident &amp; Handover Reporting</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select tags and log post-event notes for the Lead Event Manager and Admin
                </p>
              </div>

              {/* Quick Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Incident / Status Tags</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => {
                    const isSelected = quickTags.includes(tag.label);
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleQuickTag(tag.label)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected ? `${tag.color} ring-2 ring-primary/30 shadow-2xs` : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shift Report Details</label>
                <textarea
                  rows={4}
                  placeholder="Describe catering execution, leftover food disposition, staff performance, or client feedback..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <Btn 
                  variant="secondary" 
                  onClick={handleSubmitReport} 
                  disabled={submittingReport || (!note.trim() && quickTags.length === 0)}
                >
                  {submittingReport ? "Submitting Log..." : "Submit Incident Report"}
                </Btn>

                <Btn 
                  variant="primary" 
                  onClick={handleCompleteEvent} 
                  disabled={completingEvent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{completingEvent ? "Completing..." : "Mark Shift Completed"}</span>
                </Btn>
              </div>
            </AdminCard>

            {/* Previously Logged Staff Reports */}
            {booking.staff_reports && booking.staff_reports.length > 0 && (
              <AdminCard className="!p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logged Shift Reports</h4>
                <div className="space-y-2">
                  {booking.staff_reports.map((report, idx) => (
                    <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
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
