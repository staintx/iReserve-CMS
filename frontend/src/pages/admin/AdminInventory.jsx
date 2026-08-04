import React, { useState, useEffect } from "react";
import { Eye, Plus, Edit3, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import InventoryModal from "../../components/admin/ui/InventoryModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminInventory() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [draftAvailabilityFilter, setDraftAvailabilityFilter] = useState("all");

  const [logState, setLogState] = useState({ itemId: null, entries: [] });

  const categories = ["all", "Equipment", "Furniture", "Tableware", "Decorations"];

  const eventLabel = {
    created: "Created",
    manual_adjustment: "Manual Adjustment",
    reservation_allocated: "Reservation Allocated",
    reservation_released: "Reservation Released",
    retired: "Retired",
  };

  const loadData = () => {
    setLoading(true);
    // Use getAvailability to also get reserved quantities
    AdminAPI.getInventoryAvailability()
      .then((res) => setInventory(res.data))
      .catch(() => notify("Failed to load inventory", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!drawerRow) return;
    AdminAPI.getInventoryLogs(drawerRow._id)
      .then((res) => setLogState({ itemId: drawerRow._id, entries: res.data }))
      .catch(() => notify("Failed to load inventory log", "error"));
  }, [drawerRow?._id]);

  const logsLoading = !!drawerRow && logState.itemId !== drawerRow._id;
  const logs = drawerRow && logState.itemId === drawerRow._id ? logState.entries : [];

  const handleOpenModal = (item = null) => {
    setActiveItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveItem(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteInventory(id)
      .then(() => {
        notify("Inventory item deleted successfully", "success");
        setCancelTarget(null);
        setDrawerRow(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete item", "error"));
  };

  const filtered = inventory.filter((i) => {
    const matchSearch = !search || (i.item_name && i.item_name.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filter === "all" || i.category === filter;
    const matchAvailability = availabilityFilter === "all" || (availabilityFilter === "available" ? i.available : !i.available);
    return matchSearch && matchCategory && matchAvailability;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // Inventory keeps 4 columns — what an admin actually scans stock levels
  // for — not Reservations' 6. Total stock / reserved / min stock move to
  // the drawer, which also hosts the per-item Inventory Log.
  const columns = [
    { key: "item", header: "Item Name", render: (i) => <span className="text-sm font-semibold text-[#111]">{i.item_name}</span> },
    { key: "category", header: "Category", className: "text-xs text-[#374151]" },
    { key: "available", header: "Available", className: "text-center", render: (i) => <span className="text-sm font-semibold text-emerald-600">{i.available_quantity || 0}</span> },
    { key: "status", header: "Status", render: (i) => <Badge status={i.available ? "available" : "unavailable"} /> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (item) => (
        <RowActionsMenu
          actions={[
            { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(item) },
            { key: "edit", label: "Edit item", icon: Edit3, onSelect: () => handleOpenModal(item) },
            { key: "delete", label: "Delete item", icon: Trash2, destructive: true, onSelect: () => setCancelTarget(item) },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Inventory Management</h2>
          <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> Add Item</Btn>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search inventory..."
            quickFilters={categories.map((c) => ({ value: c, label: c }))}
            activeQuickFilter={filter}
            onQuickFilterChange={setFilter}
            right={
              <FilterPopover
                label="Availability"
                activeCount={availabilityFilter !== "all" ? 1 : 0}
                onApply={() => setAvailabilityFilter(draftAvailabilityFilter)}
                onClear={() => {
                  setDraftAvailabilityFilter("all");
                  setAvailabilityFilter("all");
                }}
              >
                <div className="space-y-1.5">
                  {["all", "available", "unavailable"].map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm text-[#374151] capitalize cursor-pointer">
                      <input
                        type="radio"
                        name="inventory-availability"
                        checked={draftAvailabilityFilter === v}
                        onChange={() => setDraftAvailabilityFilter(v)}
                      />
                      {v === "all" ? "All items" : v}
                    </label>
                  ))}
                </div>
              </FilterPopover>
            }
          />
          {availabilityFilter !== "all" && (
            <div className="flex items-center gap-2 mt-3">
              <FilterChip label={`Status: ${availabilityFilter}`} onRemove={() => { setAvailabilityFilter("all"); setDraftAvailabilityFilter("all"); }} />
            </div>
          )}
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(i) => i._id}
            loading={loading}
            emptyTitle="No inventory found."
            emptyHint={search || filter !== "all" || availabilityFilter !== "all" ? "Try adjusting your search or filters." : undefined}
            onRowClick={(i) => setDrawerRow(i)}
            minWidth="680px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>
      </div>

      {showModal && (
        <InventoryModal
          item={activeItem}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
            // Force a fresh fetch of the item's log/detail rather than showing
            // stale data behind the modal — reopen the drawer to see updates.
            setDrawerRow(null);
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Item"
          message={`Are you sure you want to delete "${cancelTarget.item_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}

      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(open) => !open && setDrawerRow(null)}
        title={drawerRow?.item_name}
        description={drawerRow?.category}
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
                <Edit3 size={13} /> Edit item
              </Btn>
            </>
          )
        }
      >
        {drawerRow && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Total Stock" value={drawerRow.quantity} />
              <DrawerField label="Reserved" value={drawerRow.reserved_quantity || 0} />
              <DrawerField label="Available" value={drawerRow.available_quantity || 0} />
              <DrawerField label="Min Stock" value={drawerRow.minStock || 0} />
              <DrawerField label="Status" value={<Badge status={drawerRow.available ? "available" : "unavailable"} />} full />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">Inventory Log</p>
              {logsLoading ? (
                <p className="text-xs text-gray-400">Loading log…</p>
              ) : logs.length === 0 ? (
                <p className="text-xs text-gray-400">No stock changes recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {logs.map((entry) => (
                    <div key={entry._id}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge status={eventLabel[entry.event_type] || entry.event_type} />
                        {entry.delta !== 0 && (
                          <span className={`text-xs font-bold ${entry.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                          </span>
                        )}
                      </div>
                      {entry.reason && <p className="text-xs text-[#374151]">{entry.reason}</p>}
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {entry.actor_id?.full_name || "System"} · {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {entry.booking_id?.reference && ` · Booking ${entry.booking_id.reference}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </AdminLayout>
  );
}
