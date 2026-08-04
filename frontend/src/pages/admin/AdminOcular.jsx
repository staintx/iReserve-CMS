import React, { useState, useEffect } from "react";
import { Eye, Plus, Check, Edit3, XCircle, AlertTriangle } from "lucide-react";
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

export default function AdminOcular() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [search, setSearch] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getBookings()
      .then((res) => {
        const ocularBookings = res.data.filter((b) => b.ocular_visit && b.ocular_visit.status);
        setBookings(ocularBookings);
      })
      .catch(() => notify("Failed to load ocular visits", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const formattedOculars = bookings.map((b) => ({
    _id: b._id,
    id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
    customer: b.customer_id?.full_name || `${b.contact_first_name} ${b.contact_last_name}`.trim(),
    coordinator: b.event_manager_id?.full_name || "—",
    date: b.ocular_visit?.scheduled_date ? new Date(b.ocular_visit.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
    time: b.ocular_visit?.scheduled_time || "TBA",
    status: b.ocular_visit?.status || "pending",
    outcome: b.ocular_visit?.outcome || "—",
    notes: b.ocular_visit?.notes || "—",
  }));

  const filtered = formattedOculars.filter(
    (o) => !search || o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase())
  );

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const handleCancel = (item) => {
    setCancelTarget(item);
    setShowCancelModal(true);
    setDrawerRow(null);
  };

  const confirmCancel = () => {
    AdminAPI.completeOcular(cancelTarget._id, { outcome: "cancel", notes: "Cancelled via Admin Ocular interface." })
      .then(() => {
        setShowCancelModal(false);
        setCancelTarget(null);
        notify("Ocular cancelled and booking status updated.", "warning");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to cancel ocular", "error"));
  };

  const handleProceed = (id) => {
    AdminAPI.completeOcular(id, { outcome: "proceed", notes: "Proceeding based on successful ocular visit." })
      .then(() => {
        notify("Ocular visit marked as completed (proceeding).", "success");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to complete ocular", "error"));
  };

  const isPending = (o) => o.status === "scheduled" || o.status === "requested";

  const buildRowActions = (o) =>
    isPending(o)
      ? [
          { key: "proceed", label: "Proceed", icon: Check, onSelect: () => handleProceed(o._id) },
          { key: "revise", label: "Revise", icon: Edit3, onSelect: () => navigate(`/admin/bookings/${o._id}/details`) },
          { key: "cancel", label: "Cancel visit", icon: XCircle, destructive: true, onSelect: () => handleCancel(o) },
        ]
      : [{ key: "view", label: "Open full booking", icon: Eye, onSelect: () => navigate(`/admin/bookings/${o._id}/details`) }];

  // Ocular Visits applies the shared pattern rather than being rebuilt from
  // scratch (design standard §03) — it keeps 5 columns because most of its
  // fields are already decision-relevant at a glance, not trimmed to match
  // Reservations' 6.
  const columns = [
    { key: "customer", header: "Customer", render: (o) => <span className="text-sm font-bold text-[#111]">{o.customer}</span> },
    { key: "datetime", header: "Date / Time", render: (o) => <span className="text-sm text-[#4B5563]">{o.date} · {o.time}</span> },
    { key: "coordinator", header: "Coordinator", className: "text-sm text-[#4B5563]" },
    { key: "status", header: "Status", render: (o) => <Badge status={o.status} /> },
    { key: "outcome", header: "Outcome", render: (o) => <span className="text-sm text-[#4B5563] capitalize">{o.outcome === "proceed" ? "Proceed" : o.outcome}</span> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (o) => <RowActionsMenu actions={buildRowActions(o)} />,
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-[#FAFAFA] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-[#111]">Ocular Visit Management</h2>
          <button className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C5A028] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />
            Schedule Visit
          </button>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by booking or customer..."
          />
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden shadow-sm border border-gray-100">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(o) => o._id}
            loading={loading}
            emptyTitle="No ocular visits found."
            emptyHint={search ? "Try adjusting your search." : undefined}
            onRowClick={(o) => setDrawerRow(o)}
            minWidth="820px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>
      </div>

      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(open) => !open && setDrawerRow(null)}
        title={drawerRow?.customer}
        description={drawerRow ? `${drawerRow.date} · ${drawerRow.time}` : ""}
        footer={
          drawerRow && (
            <>
              {isPending(drawerRow) && (
                <>
                  <Btn variant="danger" size="sm" onClick={() => handleCancel(drawerRow)}>
                    <XCircle size={13} /> Cancel visit
                  </Btn>
                  <Btn variant="secondary" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                    <Edit3 size={13} /> Revise
                  </Btn>
                  <Btn variant="gold" size="sm" onClick={() => handleProceed(drawerRow._id)}>
                    <Check size={13} /> Proceed
                  </Btn>
                </>
              )}
              {!isPending(drawerRow) && (
                <Btn variant="gold" size="sm" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                  Open full booking
                </Btn>
              )}
            </>
          )
        }
      >
        {drawerRow && (
          <div className="grid grid-cols-2 gap-4">
            <DrawerField
              label="Reservation"
              value={
                <span className="text-[#D4AF37] font-mono font-bold cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${drawerRow._id}/details`)}>
                  {drawerRow.id}
                </span>
              }
            />
            <DrawerField label="Coordinator" value={drawerRow.coordinator} />
            <DrawerField label="Status" value={<Badge status={drawerRow.status} />} />
            <DrawerField label="Outcome" value={drawerRow.outcome === "proceed" ? "Proceed" : drawerRow.outcome} />
            <DrawerField label="Notes" value={drawerRow.notes} full />
          </div>
        )}
      </DetailDrawer>

      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-red-50/50">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Cancel Ocular Visit</h3>
                <p className="text-xs text-red-600 font-medium">Booking {cancelTarget.id}</p>
              </div>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                Are you sure you want to cancel the ocular visit for <strong className="text-gray-900">{cancelTarget.customer}</strong>?
              </p>
              <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                This action will mark the booking as cancelled and prepare it for a refund. This cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Scheduled
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                onClick={confirmCancel}
              >
                Cancel & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
