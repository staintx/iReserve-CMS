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
  UserCheck, 
  CheckCircle2, 
  MapPin, 
  FileText,
  Search,
  Filter
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
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

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

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
      const statusLabel = 
        o.status === "requested" ? "Requested" :
        o.status === "scheduled" ? "Scheduled" :
        o.status === "completed" || o.outcome === "proceed" ? "Completed" :
        o.status || "Pending";

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
        outcome: o.outcome || "Pending Inspection",
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
    const completed = formattedOculars.filter((o) => o.status === "Completed").length;

    return { total, requested, scheduled, completed };
  }, [formattedOculars]);

  // Filtered List
  const filtered = useMemo(() => {
    return formattedOculars.filter((o) => {
      if (filterTab === "requested" && o.status !== "Requested") return false;
      if (filterTab === "scheduled" && o.status !== "Scheduled") return false;
      if (filterTab === "completed" && o.status !== "Completed") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.venue.toLowerCase().includes(q);
      }

      return true;
    });
  }, [formattedOculars, filterTab, search]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // Cancellation Handler
  const handleCancel = (item) => {
    setCancelTarget(item);
    setShowCancelModal(true);
    setDrawerRow(null);
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    AdminAPI.completeOcular(cancelTarget._id, { outcome: "cancel", notes: "Cancelled via Admin Ocular interface." })
      .then(() => {
        setShowCancelModal(false);
        setCancelTarget(null);
        notify("Ocular visit cancelled.", "warning");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to cancel ocular visit", "error"));
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
      render: (o) => (
        <span className={`text-xs font-semibold ${
          o.outcome === "proceed" ? "text-emerald-700" :
          o.outcome === "cancel" ? "text-rose-600" : "text-slate-500"
        }`}>
          {o.outcome === "proceed" ? "Proceeding" : o.outcome}
        </span>
      )
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
              Schedule site inspection visits, confirm customer requested dates, and log venue ocular outcomes.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approval</span>
              <h3 className="text-2xl font-bold text-amber-900 mt-0.5">{kpiStats.requested}</h3>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Visits</span>
              <h3 className="text-2xl font-bold text-blue-900 mt-0.5">{kpiStats.scheduled}</h3>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Visits</span>
              <h3 className="text-2xl font-bold text-emerald-700 mt-0.5">{kpiStats.completed}</h3>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Oculars</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{kpiStats.total}</h3>
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

      {/* Quick Drawer Panel */}
      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(open) => !open && setDrawerRow(null)}
        title={drawerRow?.customer}
        description={drawerRow ? `Ocular Date: ${drawerRow.date} @ ${drawerRow.time}` : ""}
        footer={
          drawerRow && (
            <>
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

              <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                Open Full Booking
              </Btn>
            </>
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
            <DrawerField label="Outcome" value={drawerRow.outcome} />
            <DrawerField label="Notes" value={drawerRow.notes} full />
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

      {/* Cancel Ocular Modal */}
      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-rose-50/50">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cancel Ocular Visit</h3>
                <p className="text-xs text-rose-600 font-medium">Booking {cancelTarget.id}</p>
              </div>
            </div>

            <div className="p-6 text-xs text-slate-600 space-y-3">
              <p>Are you sure you want to cancel the ocular visit for <strong>{cancelTarget.customer}</strong>?</p>
              <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                This will mark the site inspection as cancelled and update the booking status.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
              <Btn variant="secondary" size="sm" onClick={() => setShowCancelModal(false)}>
                Keep Scheduled
              </Btn>
              <Btn variant="danger" size="sm" onClick={confirmCancel}>
                Cancel Ocular
              </Btn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
