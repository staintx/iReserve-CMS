import React, { useState, useEffect, useMemo } from "react";
import { Eye, Plus, Edit3, Trash2, Calendar, ShieldCheck, UserCheck, Users } from "lucide-react";
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
  const [roleTab, setRoleTab] = useState("all"); // "all" | "manager" | "staff"
  const [positionFilter, setPositionFilter] = useState("all");

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalRole, setModalRole] = useState("staff");
  const [activeStaff, setActiveStaff] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");

  const loadData = () => {
    setLoading(true);
    AdminAPI.getStaff()
      .then((res) => setStaff(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load staff & managers", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    const managers = staff.filter((s) => s.role === "manager").length;
    const staffMembers = staff.filter((s) => s.role === "staff" || !s.role).length;
    return {
      all: staff.length,
      manager: managers,
      staff: staffMembers
    };
  }, [staff]);

  const positions = useMemo(() => {
    const subset = roleTab === "all" ? staff : staff.filter((s) => (s.role || "staff") === roleTab);
    const distinct = Array.from(new Set(subset.map((s) => s.position).filter(Boolean)));
    return ["all", ...distinct];
  }, [staff, roleTab]);

  const filtered = staff.filter((s) => {
    const matchSearch = !search || 
      (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.position || "").toLowerCase().includes(search.toLowerCase());
    
    const userRole = s.role || "staff";
    const matchRole = roleTab === "all" || userRole === roleTab;
    const matchPosition = positionFilter === "all" || s.position === positionFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "available" ? s.is_active : !s.is_active);

    return matchSearch && matchRole && matchPosition && matchStatus;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const initials = (name) => (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleOpenModal = (member = null, defaultRole = "staff") => {
    setActiveStaff(member);
    setModalRole(member?.role || defaultRole);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveStaff(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteStaff(id)
      .then(() => {
        notify("Account deleted successfully", "success");
        setCancelTarget(null);
        setDrawerRow(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete account", "error"));
  };

  const columns = [
    {
      key: "name",
      header: "Staff / Manager Member",
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
            s.role === "manager" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-muted text-foreground"
          }`}>
            {initials(s.full_name)}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>{s.full_name}</span>
              {s.role === "manager" ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold rounded-md">
                  <ShieldCheck size={11} className="text-amber-600" /> Manager
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-medium rounded-md">
                  Staff
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">{s.email || "No email"}</div>
          </div>
        </div>
      ),
    },
    { key: "position", header: "Position / Title", render: (s) => <span className="text-xs text-foreground font-medium">{s.role === "manager" ? "Event Manager" : (s.position || "—")}</span> },
    { key: "status", header: "Status", render: (s) => <Badge status={s.is_active ? "available" : "off"} /> },
    { key: "events", header: "Events Handled", className: "text-center", render: (s) => <span className="text-sm font-semibold text-foreground">{s.events_handled || 0}</span> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (s) => (
        <RowActionsMenu
          actions={[
            { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(s) },
            { key: "edit", label: "Edit account", icon: Edit3, onSelect: () => handleOpenModal(s) },
            { key: "delete", label: "Delete account", icon: Trash2, destructive: true, onSelect: () => setCancelTarget(s) },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Staff &amp; Managers
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create and manage Event Manager and Staff portal accounts
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center self-start sm:self-auto">

            <Btn variant="secondary" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <Calendar size={13} /> View Schedule
            </Btn>
            <Btn 
              variant="primary" 
              size="sm" 
              onClick={() => handleOpenModal(null, roleTab === "manager" ? "manager" : "staff")}
            >
              <Plus size={13} /> {roleTab === "manager" ? "Add Manager" : roleTab === "staff" ? "Add Staff" : "Add Account"}
            </Btn>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border rounded-md shadow-2xs w-fit">
          {[
            { id: "all", label: "All Accounts", count: counts.all },
            { id: "manager", label: "Managers", count: counts.manager },
            { id: "staff", label: "Staff", count: counts.staff }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setRoleTab(tab.id);
                setPositionFilter("all");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                roleTab === tab.id 
                  ? "bg-card text-foreground shadow-2xs border border-border" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                roleTab === tab.id ? "bg-primary-100 text-primary-900 border border-primary-200" : "bg-muted text-muted-foreground border border-border/60"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, email, or position..."
            quickFilters={positions.map((p) => ({ value: p, label: p === "all" ? "All Positions" : p }))}
            activeQuickFilter={positionFilter}
            onQuickFilterChange={setPositionFilter}
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
                    <label key={v} className="flex items-center gap-2 text-sm text-foreground capitalize cursor-pointer">
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
            emptyTitle="No accounts found."
            emptyHint={search || positionFilter !== "all" || statusFilter !== "all" || roleTab !== "all" ? "Try adjusting your search or filters." : undefined}
            onRowClick={(s) => setDrawerRow(s)}
            minWidth="700px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>
      </div>

      {showModal && (
        <StaffModal
          staff={activeStaff}
          defaultRole={modalRole}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Account"
          message={`Are you sure you want to delete "${cancelTarget.full_name}" (${cancelTarget.role === "manager" ? "Manager" : "Staff"})? This action cannot be undone.`}
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
        description={drawerRow?.role === "manager" ? "Event Manager" : (drawerRow?.position || "Staff Member")}
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
                variant="primary"
                size="sm"
                onClick={() => {
                  const row = drawerRow;
                  setDrawerRow(null);
                  handleOpenModal(row, row.role || "staff");
                }}
              >
                <Edit3 size={13} /> Edit account
              </Btn>
            </>
          )
        }
      >
        {drawerRow && (
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label="Account Role" value={
              <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                drawerRow.role === "manager" ? "text-amber-700" : "text-slate-700"
              }`}>
                {drawerRow.role === "manager" ? <ShieldCheck size={14} /> : <UserCheck size={14} />}
                {drawerRow.role === "manager" ? "Event Manager" : "Staff Member"}
              </span>
            } />
            <DrawerField label="Status" value={<Badge status={drawerRow.is_active ? "available" : "off"} />} />
            <DrawerField label="Position / Role" value={drawerRow.role === "manager" ? "Event Manager" : (drawerRow.position || "—")} />
            <DrawerField label="Username" value={drawerRow.username || "—"} />
            <DrawerField label="Phone" value={drawerRow.phone || "—"} />
            <DrawerField label="Email" value={drawerRow.email || "—"} full />
            <DrawerField label="Events Handled" value={drawerRow.events_handled || 0} full />
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
