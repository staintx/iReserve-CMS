import React, { useState, useEffect, useMemo } from "react";
import { 
  Eye, 
  Plus, 
  Check, 
  Edit3, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  FileText,
  Search,
  Sparkles,
  Sliders
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import { useConfirm } from "../../components/feedback/confirmContext";
import DataTable from "../../components/admin/table/DataTable";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Btn from "../../components/admin/ui/Btn";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

export default function AdminOcular() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [drawerRow, setDrawerRow] = useState(null);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Ocular Revision Proposal Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionBooking, setRevisionBooking] = useState(null);
  const [ocularNotes, setOcularNotes] = useState("");
  const [revisedGuestCount, setRevisedGuestCount] = useState("");
  const [revisedSetupNotes, setRevisedSetupNotes] = useState("");
  const [revisedTotalPrice, setRevisedTotalPrice] = useState("");
  const [revisionMessage, setRevisionMessage] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getBookings()
      .then((res) => {
        setBookings(res.data || []);
      })
      .catch(() => notify("Failed to load ocular visits", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter out bookings that don't need oculars or have no requested/scheduled dates
  const ocularBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Exclude Food Only delivery bookings
      const st = b.service_type || (b.event_type?.toLowerCase().includes("food delivery") ? "Food Only" : "Setup");
      if (st === "Food Only") return false;

      // Include if ocular has scheduled_date OR status is requested/scheduled/completed
      const o = b.ocular_visit;
      if (!o) return false;

      return Boolean(o.scheduled_date || o.status === "requested" || o.status === "scheduled" || o.status === "completed" || o.outcome);
    });
  }, [bookings]);

  // Formatted Ocular List
  const formattedOculars = useMemo(() => {
    return ocularBookings.map((b) => {
      const o = b.ocular_visit || {};
      const rawOutcome = o.outcome;
      
      let statusLabel = "Pending";
      if (rawOutcome === "revise") {
        statusLabel = "Revision Needed";
      } else if (rawOutcome === "proceed" || (o.status === "completed" && !rawOutcome)) {
        statusLabel = "Completed";
      } else if (rawOutcome === "cancel" || o.status === "cancelled") {
        statusLabel = "Cancelled";
      } else if (rawOutcome === "reschedule") {
        statusLabel = "Reschedule Needed";
      } else if (o.status === "requested") {
        statusLabel = "Requested";
      } else if (o.status === "scheduled") {
        statusLabel = "Scheduled";
      } else if (o.status) {
        statusLabel = o.status.charAt(0).toUpperCase() + o.status.slice(1);
      }

      let outcomeBadge = "Pending Inspection";
      if (rawOutcome === "proceed") outcomeBadge = "Inspection Passed";
      else if (rawOutcome === "revise") outcomeBadge = "Revision Needed";
      else if (rawOutcome === "cancel") outcomeBadge = "Cancelled";
      else if (rawOutcome === "reschedule") outcomeBadge = "Reschedule Needed";
      else if (o.outcome) outcomeBadge = o.outcome;

      return {
        _id: b._id,
        id: b.reference || `BK-${b._id.substring(b._id.length - 6).toUpperCase()}`,
        customer: b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || "Customer",
        email: b.customer_id?.email || b.contact_email || "",
        phone: b.contact_phone || b.customer_id?.phone || "",
        eventType: b.event_type || "Catering Event",
        venue: [b.venue_type, b.municipality, b.province].filter(Boolean).join(", ") || "Venue TBA",
        coordinator: b.event_manager_id?.full_name || "Unassigned",
        date: o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
        rawDate: o.scheduled_date ? new Date(o.scheduled_date) : null,
        time: o.scheduled_time || "TBA",
        status: statusLabel,
        rawStatus: o.status,
        outcome: o.outcome || "pending",
        outcomeBadge,
        notes: o.notes || "—",
        rawBooking: b
      };
    });
  }, [ocularBookings]);

  // KPI Metrics
  const kpiStats = useMemo(() => {
    const total = formattedOculars.length;
    const requested = formattedOculars.filter((o) => o.status === "Requested").length;
    const scheduled = formattedOculars.filter((o) => o.status === "Scheduled").length;
    const revisionNeeded = formattedOculars.filter((o) => o.outcome === "revise" || o.status === "Revision Needed").length;
    const completed = formattedOculars.filter((o) => o.status === "Completed" || o.outcome === "proceed").length;

    return { total, requested, scheduled, revisionNeeded, completed };
  }, [formattedOculars]);

  // Filtered List
  const filtered = useMemo(() => {
    return formattedOculars.filter((o) => {
      if (filterTab === "requested" && o.status !== "Requested") return false;
      if (filterTab === "scheduled" && o.status !== "Scheduled") return false;
      if (filterTab === "revise" && o.outcome !== "revise" && o.status !== "Revision Needed") return false;
      if (filterTab === "completed" && o.status !== "Completed" && o.outcome !== "proceed") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.venue.toLowerCase().includes(q);
      }

      return true;
    });
  }, [formattedOculars, filterTab, search]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // Cancellation Handler
  const handleCancel = async (item) => {
    if (!item) return;
    setDrawerRow(null);
    await confirm({
      tone: "destructive",
      title: "Cancel this ocular visit?",
      description: `This marks the site inspection for ${item.customer || "this booking"} as cancelled and updates the booking status. It does not cancel the booking itself.`,
      confirmLabel: "Cancel ocular",
      cancelLabel: "Keep scheduled",
      onConfirm: async () => {
        await AdminAPI.completeOcular(item._id, {
          outcome: "cancel",
          notes: "Cancelled via Admin Ocular interface.",
        });
        notify("Ocular visit cancelled", "warning", {
          description: item.id ? `Booking ${item.id} has been updated.` : undefined,
        });
        loadData();
      },
    });
  };

  // Complete / Proceed Handler
  const handleProceed = (id) => {
    AdminAPI.completeOcular(id, { outcome: "proceed", notes: "Proceeding based on successful ocular visit inspection." })
      .then(() => {
        notify("Ocular visit marked as completed (inspection passed).", "success");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to complete ocular visit", "error"));
  };

  // Schedule Ocular Handler
  const handleConfirmSchedule = (e) => {
    e.preventDefault();
    const bId = selectedBookingId || drawerRow?._id;
    if (!bId) {
      notify("Please select a booking.", "error");
      return;
    }
    if (!scheduleDate) {
      notify("Please select a date for the ocular visit.", "error");
      return;
    }

    setIsSubmittingSchedule(true);
    AdminAPI.scheduleOcular(bId, {
      scheduled_date: scheduleDate,
      scheduled_time: scheduleTime
    })
    .then(() => {
      notify("Ocular visit schedule confirmed and saved.", "success");
      setShowScheduleModal(false);
      setSelectedBookingId("");
      setScheduleDate("");
      setScheduleTime("");
      if (drawerRow) setDrawerRow(null);
      loadData();
    })
    .catch((err) => notify(err.response?.data?.message || "Failed to schedule ocular visit.", "error"))
    .finally(() => setIsSubmittingSchedule(false));
  };

  // Open Revision Proposal Modal Handler
  const openRevisionModal = (item) => {
    setRevisionBooking(item);
    setOcularNotes(
      item.notes !== "—"
        ? item.notes
        : `Ocular Inspection & Measurement Notes:\n- Venue area measured for ${item.eventType} setup.\n- Space layout check: scaffold size adjustment required from 20x20 to 30x40 based on place dimensions and ${item.rawBooking?.guest_count || 100} guest count.`
    );
    setRevisedGuestCount(item.rawBooking?.guest_count || "");
    setRevisedSetupNotes(item.rawBooking?.special_requests || "Adjust scaffold size from 20x20 to 30x40 based on venue space measure.");
    setRevisedTotalPrice(item.rawBooking?.total_price || "");
    setRevisionMessage(
      `Based on our ocular site visit and place measurement, a booking revision is required. We recommend expanding the scaffold setup size from 20x20 to 30x40 to safely accommodate your ${item.rawBooking?.guest_count || 100} guests and venue layout.`
    );
    setShowRevisionModal(true);
  };

  // Apply Scaffold Preset Helper
  const applyScaffoldPreset = () => {
    if (!revisionBooking) return;
    const currentGuests = revisionBooking.rawBooking?.guest_count || 150;
    setOcularNotes(
      `Ocular place measurement completed for ${revisionBooking.venue}.\n- Measured setup area: 30x40 meters.\n- Current 20x20 scaffold is too small for ${currentGuests} guests on this terrain.\n- Recommendation: Increase scaffold size to 30x40.`
    );
    setRevisedGuestCount(currentGuests);
    setRevisedSetupNotes("Upgraded scaffold structure size from 20x20 to 30x40 with heavy-duty framing.");
    setRevisionMessage(
      `Based on the site inspection and venue measurement, your current scaffold size (20x20) needs to be expanded to 30x40 to comfortably fit ${currentGuests} guests and setup equipment.`
    );
  };

  // Submit Ocular Revision Proposal Handler
  const handleConfirmRevision = async (e) => {
    e.preventDefault();
    if (!revisionBooking) return;
    if (!revisionMessage.trim()) {
      notify("Please enter a revision message for the customer.", "error");
      return;
    }

    try {
      setIsSubmittingRevision(true);
      const bId = revisionBooking._id;

      // 1. Log ocular outcome as 'revise'
      await AdminAPI.completeOcular(bId, {
        outcome: "revise",
        notes: ocularNotes.trim() || "Ocular inspection complete. Booking revision requested."
      });

      // 2. Propose booking revision
      await AdminAPI.proposeRevision(bId, {
        message: revisionMessage.trim(),
        guest_count: revisedGuestCount ? Number(revisedGuestCount) : undefined,
        special_requests: revisedSetupNotes.trim() || undefined,
        total_price: revisedTotalPrice !== "" ? Number(revisedTotalPrice) : undefined
      });

      notify("Ocular outcome logged as Revision Needed & proposal sent to customer!", "success");
      setShowRevisionModal(false);
      setRevisionBooking(null);
      if (drawerRow) setDrawerRow(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit ocular revision proposal.", "error");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const isPending = (o) => o.status === "Scheduled" || o.status === "Requested";

  const buildRowActions = (o) => [
    { key: "view", label: "Inspect Details", icon: Eye, onSelect: () => setDrawerRow(o) },
    ...(o.status === "Requested"
      ? [{ key: "confirm", label: "Confirm Date & Schedule", icon: Calendar, onSelect: () => {
          setSelectedBookingId(o._id);
          setScheduleDate(o.rawDate ? o.rawDate.toISOString().split('T')[0] : "");
          setScheduleTime(o.time !== "TBA" ? o.time : "");
          setShowScheduleModal(true);
        }}]
      : []),
    ...(o.status === "Scheduled"
      ? [{ key: "proceed", label: "Mark Inspection Passed", icon: Check, onSelect: () => handleProceed(o._id) }]
      : []),
    { key: "revise", label: "Request Booking Revision", icon: Edit3, onSelect: () => openRevisionModal(o) },
    { key: "full", label: "Open Full Booking", icon: FileText, onSelect: () => navigate(`/admin/bookings/${o._id}/details`) },
    ...(isPending(o)
      ? [{ key: "cancel", label: "Cancel Visit", icon: XCircle, destructive: true, onSelect: () => handleCancel(o) }]
      : []),
  ];

  const columns = [
    {
      key: "id",
      header: "Booking ID",
      render: (o) => <span className="text-xs font-mono font-bold text-primary">{o.id}</span>,
    },
    { 
      key: "customer", 
      header: "Customer", 
      render: (o) => (
        <div>
          <span className="text-sm font-bold text-slate-900 block">{o.customer}</span>
          <span className="text-xs text-slate-500">{o.phone || o.email}</span>
        </div>
      )
    },
    {
      key: "venue",
      header: "Venue Location",
      render: (o) => <span className="text-xs text-slate-700 font-medium max-w-44 block truncate">{o.venue}</span>
    },
    { 
      key: "datetime", 
      header: "Visit Date & Time", 
      render: (o) => (
        <div>
          <span className="text-xs font-semibold text-slate-900 block">{o.date}</span>
          <span className="text-[11px] text-slate-500">{o.time !== "TBA" ? `@ ${o.time}` : "Time TBA"}</span>
        </div>
      )
    },
    { key: "status", header: "Status", render: (o) => <Badge status={o.status} /> },
    { 
      key: "outcome", 
      header: "Outcome", 
      render: (o) => <Badge status={o.outcomeBadge} />
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (o) => <RowActionsMenu actions={buildRowActions(o)} />,
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">
              Ocular Visit Management
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Schedule site inspection visits, log venue place measurements, and request booking revisions based on ocular findings.
            </p>
          </div>

          <Btn 
            variant="primary" 
            size="sm"
            onClick={() => {
              setSelectedBookingId("");
              setScheduleDate("");
              setScheduleTime("");
              setShowScheduleModal(true);
            }}
          >
            <Plus size={14} /> Schedule New Visit
          </Btn>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pending</span>
              <h3 className="text-xl font-bold text-amber-900 mt-0.5">{kpiStats.requested}</h3>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Scheduled</span>
              <h3 className="text-xl font-bold text-blue-900 mt-0.5">{kpiStats.scheduled}</h3>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Revisions Needed</span>
              <h3 className="text-xl font-bold text-orange-900 mt-0.5">{kpiStats.revisionNeeded}</h3>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
              <h3 className="text-xl font-bold text-emerald-700 mt-0.5">{kpiStats.completed}</h3>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Oculars</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{kpiStats.total}</h3>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Tabs */}
        <AdminCard className="!p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Active ({kpiStats.total})
              </button>
              <button
                onClick={() => setFilterTab("requested")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "requested" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Pending Requests ({kpiStats.requested})
              </button>
              <button
                onClick={() => setFilterTab("scheduled")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "scheduled" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Scheduled ({kpiStats.scheduled})
              </button>
              <button
                onClick={() => setFilterTab("revise")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "revise" ? "bg-orange-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Revision Needed ({kpiStats.revisionNeeded})
              </button>
              <button
                onClick={() => setFilterTab("completed")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === "completed" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Completed ({kpiStats.completed})
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search customer, booking ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs rounded-xl border-slate-200"
              />
            </div>
          </div>
        </AdminCard>

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden shadow-xs border border-slate-200">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(o) => o._id}
            loading={loading}
            emptyTitle="No ocular visit records found."
            emptyHint={search || filterTab !== "all" ? "Try adjusting your search or status filter." : "Ocular visits requested by customers for setup events will appear here."}
            onRowClick={(o) => setDrawerRow(o)}
            minWidth="850px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>
      </div>

      {/* Quick Detail Drawer Panel */}
      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(open) => !open && setDrawerRow(null)}
        title={drawerRow?.customer}
        description={drawerRow ? `Ocular Date: ${drawerRow.date} @ ${drawerRow.time}` : ""}
        footer={
          drawerRow && (
            <div className="flex flex-wrap gap-2 justify-end w-full">
              {drawerRow.status === "Requested" && (
                <Btn 
                  variant="primary" 
                  size="sm" 
                  onClick={() => {
                    setSelectedBookingId(drawerRow._id);
                    setScheduleDate(drawerRow.rawDate ? drawerRow.rawDate.toISOString().split('T')[0] : "");
                    setScheduleTime(drawerRow.time !== "TBA" ? drawerRow.time : "");
                    setShowScheduleModal(true);
                  }}
                >
                  <Calendar size={13} /> Confirm Schedule
                </Btn>
              )}

              {drawerRow.status === "Scheduled" && (
                <Btn variant="primary" size="sm" onClick={() => handleProceed(drawerRow._id)}>
                  <Check size={13} /> Mark Inspection Passed
                </Btn>
              )}

              <Btn 
                variant="outline" 
                size="sm" 
                className="border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100" 
                onClick={() => openRevisionModal(drawerRow)}
              >
                <Edit3 size={13} /> Request Revision
              </Btn>

              <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                Open Full Booking
              </Btn>
            </div>
          )
        }
      >
        {drawerRow && (
          <div className="grid grid-cols-2 gap-4">
            <DrawerField
              label="Booking Reference"
              value={
                <span className="text-amber-700 font-mono font-bold cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                  {drawerRow.id}
                </span>
              }
            />
            <DrawerField label="Event Type" value={drawerRow.eventType} />
            <DrawerField label="Visit Date" value={drawerRow.date} />
            <DrawerField label="Visit Time" value={drawerRow.time} />
            <DrawerField label="Venue Location" value={drawerRow.venue} full />
            <DrawerField label="Status" value={<Badge status={drawerRow.status} />} />
            <DrawerField label="Outcome" value={<Badge status={drawerRow.outcomeBadge} />} />
            <DrawerField label="Inspection Notes" value={drawerRow.notes} full />
          </div>
        )}
      </DetailDrawer>

      {/* Schedule Ocular Dialog */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleConfirmSchedule}>
            <DialogHeader>
              <DialogTitle>Schedule Ocular Visit</DialogTitle>
              <DialogDescription>Set or confirm the site inspection date and time.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!selectedBookingId && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Select Event Booking</label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Select Booking --</option>
                    {bookings.filter(b => b.service_type !== "Food Only").map(b => (
                      <option key={b._id} value={b._id}>
                        {b.reference || b._id} - {b.contact_first_name} {b.contact_last_name} ({b.event_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ocular Visit Date</label>
                <Input 
                  type="date" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ocular Visit Time</label>
                <Input 
                  type="time" 
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Btn type="button" variant="secondary" onClick={() => setShowScheduleModal(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={isSubmittingSchedule}>
                {isSubmittingSchedule ? "Saving..." : "Confirm Schedule"}
              </Btn>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Ocular Revision Dialog */}
      <Dialog open={showRevisionModal} onOpenChange={setShowRevisionModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleConfirmRevision}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-700">
                <Edit3 className="w-5 h-5" />
                <DialogTitle>Request Booking Revision from Ocular Review</DialogTitle>
              </div>
              <DialogDescription>
                Log inspection findings and propose booking adjustments (e.g. scaffold sizing, guest count, place dimensions) to the customer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {revisionBooking && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-amber-900">
                    <span>Booking: {revisionBooking.id} ({revisionBooking.customer})</span>
                    <span>{revisionBooking.eventType}</span>
                  </div>
                  <div className="text-slate-600">
                    Venue: <strong>{revisionBooking.venue}</strong> | Current Guests: <strong>{revisionBooking.rawBooking?.guest_count || "—"}</strong>
                  </div>
                </div>
              )}

              {/* Preset Helper Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 gap-2">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500 shrink-0" /> Fast preset helper for site measurements:
                </span>
                <button
                  type="button"
                  onClick={applyScaffoldPreset}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-300 shrink-0"
                >
                  ⚡ Scaffold Resize Example (20x20 → 30x40)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ocular Inspection & Place Measurement Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={ocularNotes}
                  onChange={(e) => setOcularNotes(e.target.value)}
                  placeholder="Record venue dimensions, terrain checks, scaffold size requirements (e.g. 20x20 needs to be 30x40)..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Adjusted Guest Count</label>
                  <Input
                    type="number"
                    value={revisedGuestCount}
                    onChange={(e) => setRevisedGuestCount(e.target.value)}
                    placeholder="e.g. 150"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Adjusted Total Price (₱)</label>
                  <Input
                    type="number"
                    value={revisedTotalPrice}
                    onChange={(e) => setRevisedTotalPrice(e.target.value)}
                    placeholder="Leave blank to keep current price"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Setup & Equipment Adjustments</label>
                <textarea
                  rows={2}
                  value={revisedSetupNotes}
                  onChange={(e) => setRevisedSetupNotes(e.target.value)}
                  placeholder="e.g. Upgraded scaffold structure size from 20x20 to 30x40 to fit venue area"
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Revision Reason / Message to Customer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={revisionMessage}
                  onChange={(e) => setRevisionMessage(e.target.value)}
                  placeholder="Explain why this revision is required based on the ocular site inspection..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Btn type="button" variant="secondary" onClick={() => setShowRevisionModal(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={isSubmittingRevision}>
                {isSubmittingRevision ? "Submitting Revision..." : "Log Outcome & Request Revision"}
              </Btn>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
