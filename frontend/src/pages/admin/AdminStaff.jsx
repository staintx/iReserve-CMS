import React, { useState, useEffect, useMemo } from "react";
import { Eye, Plus, Edit3, Trash2, Calendar } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import StaffModal from "../../components/admin/ui/StaffModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminStaff() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activeStaff, setActiveStaff] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");

  const loadData = () => {
    setLoading(true);
    AdminAPI.getStaff()
      .then((res) => setStaff(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load staff", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const positions = useMemo(() => {
    const distinct = Array.from(new Set(staff.map((s) => s.position).filter(Boolean)));
    return ["all", ...distinct];
  }, [staff]);

  const filtered = staff.filter((s) => {
    const matchSearch = !search || (s.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchPosition = filter === "all" || s.position === filter;
    const matchStatus = statusFilter === "all" || (statusFilter === "available" ? s.is_active : !s.is_active);
    return matchSearch && matchPosition && matchStatus;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const initials = (name) => (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleOpenModal = (member = null) => {
    setActiveStaff(member);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveStaff(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteStaff(id)
      .then(() => {
        notify("Staff member deleted successfully", "success");
        setCancelTarget(null);
        setDrawerRow(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete staff member", "error"));
  };

  // Staff isn't the busiest workflow, so it keeps 4 columns — the fields
  // that actually support a quick roster scan — not Reservations' 6.
  const columns = [
    {
      key: "name",
      header: "Staff Member",
      render: (s) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">
            {initials(s.full_name)}
          </div>
          <span className="text-sm font-semibold text-[#111]">{s.full_name}</span>
        </div>
      ),
    },
    { key: "position", header: "Position", render: (s) => <span className="text-xs text-[#374151]">{s.position || "—"}</span> },
    { key: "status", header: "Status", render: (s) => <Badge status={s.is_active ? "available" : "off"} /> },
    { key: "events", header: "Events Handled", className: "text-center", render: (s) => <span className="text-sm font-semibold text-[#111]">{s.events_handled || 0}</span> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (s) => (
        <RowActionsMenu
          actions={[
            { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(s) },
            { key: "edit", label: "Edit staff member", icon: Edit3, onSelect: () => handleOpenModal(s) },
            { key: "delete", label: "Delete staff member", icon: Trash2, destructive: true, onSelect: () => setCancelTarget(s) },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Staff Management</h2>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/dashboard")}><Calendar size={13} /> View Schedule</Btn>
            <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> Add Staff</Btn>
          </div>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search staff..."
            quickFilters={positions.map((p) => ({ value: p, label: p === "all" ? "All Positions" : p }))}
            activeQuickFilter={filter}
            onQuickFilterChange={setFilter}
            right={
              <FilterPopover
                label="Status"
                activeCount={statusFilter !== "all" ? 1 : 0}
                onApply={() => setStatusFilter(draftStatusFilter)}
                onClear={() => {
                  setDraftStatusFilter("all");
                  setStatusFilter("all");
                }}
              >
                <div className="space-y-1.5">
                  {["all", "available", "off"].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm text-[#374151] capitalize cursor-pointer">
                      <input
                        type="radio"
                        name="staff-status"
                        checked={draftStatusFilter === v}
                        onChange={() => setDraftStatusFilter(v)}
                      />
                      {v === "all" ? "All statuses" : v}
                    </label>
                  ))}
                </div>
              </FilterPopover>
            }
          />
          {statusFilter !== "all" && (
            <div className="flex items-center gap-2 mt-3">
              <FilterChip label={`Status: ${statusFilter}`} onRemove={() => { setStatusFilter("all"); setDraftStatusFilter("all"); }} />
            </div>
          )}
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(s) => s._id}
            loading={loading}
            emptyTitle="No staff found."
            emptyHint={search || filter !== "all" || statusFilter !== "all" ? "Try adjusting your search or filters." : undefined}
            onRowClick={(s) => setDrawerRow(s)}
            minWidth="700px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>
      </div>

      {showModal && (
        <StaffModal
          staff={activeStaff}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Staff Member"
          message={`Are you sure you want to delete "${cancelTarget.full_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}

      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(open) => !open && setDrawerRow(null)}
        title={drawerRow?.full_name}
        description={drawerRow?.position || ""}
        footer={
          drawerRow && (
            <>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => {
                  const row = drawerRow;
                  setDrawerRow(null);
                  setCancelTarget(row);
                }}
              >
                <Trash2 size={13} /> Delete
              </Btn>
              <Btn
                variant="gold"
                size="sm"
                onClick={() => {
                  const row = drawerRow;
                  setDrawerRow(null);
                  handleOpenModal(row);
                }}
              >
                <Edit3 size={13} /> Edit staff member
              </Btn>
            </>
          )
        }
      >
        {drawerRow && (
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="Phone" value={drawerRow.phone || "—"} />
            <DrawerField label="Email" value={drawerRow.email || "—"} />
            <DrawerField label="Position" value={drawerRow.position || "—"} />
            <DrawerField label="Status" value={<Badge status={drawerRow.is_active ? "available" : "off"} />} />
            <DrawerField label="Events Handled" value={drawerRow.events_handled || 0} full />
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
