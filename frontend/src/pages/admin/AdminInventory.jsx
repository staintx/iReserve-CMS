import React, { useState, useEffect } from "react";
import { Eye, Plus, Edit3, Trash2, Calendar, RotateCcw } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState("");

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

  const loadData = (dateParam = selectedDate) => {
    setLoading(true);
    AdminAPI.getInventoryAvailability(dateParam || undefined)
      .then((res) => setInventory(res.data || []))
      .catch(() => notify("Failed to load inventory", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

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

  const handleToggleStatus = async (item) => {
    const nextStatus = !item.available;
    // Optimistic update
    setInventory((prev) =>
      prev.map((i) => {
        if (i._id === item._id) {
          const total = i.quantity || 0;
          const reserved = i.reserved_quantity || 0;
          const stockOnHand = nextStatus ? Math.max(0, total - reserved) : 0;
          return {
            ...i,
            available: nextStatus,
            available_quantity: stockOnHand,
            stock_on_hand: stockOnHand,
          };
        }
        return i;
      })
    );

    if (drawerRow && drawerRow._id === item._id) {
      setDrawerRow((prev) => (prev ? { ...prev, available: nextStatus } : prev));
    }

    try {
      await AdminAPI.updateInventory(item._id, {
        available: nextStatus,
        reason: nextStatus ? "Item marked as Available" : "Item marked as Unavailable",
      });
      notify(`"${item.item_name}" is now ${nextStatus ? "Available" : "Unavailable"}`, "success");
    } catch (err) {
      notify("Failed to update status", "error");
      loadData(selectedDate);
    }
  };

  const handleDelete = (id) => {
    AdminAPI.deleteInventory(id)
      .then(() => {
        notify("Inventory item deleted successfully", "success");
        setCancelTarget(null);
        setDrawerRow(null);
        loadData(selectedDate);
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

  // Exact 5 required columns: Item Name, Category, Total Quantity, Stock on Hand, Status (+ Actions menu)
  const columns = [
    {
      key: "item_name",
      header: "Item Name",
      render: (i) => (
        <div>
          <span className="text-sm font-bold text-foreground block">{i.item_name}</span>
          {i.reserved_quantity > 0 && (
            <span className="text-[11px] text-amber-700 font-medium">
              {i.reserved_quantity} unit{i.reserved_quantity > 1 ? "s" : ""} in use today
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (i) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          {i.category || "General"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Total Quantity",
      className: "text-center",
      render: (i) => <span className="text-sm font-semibold text-foreground">{i.quantity || 0}</span>,
    },
    {
      key: "stock_on_hand",
      header: "Stock on Hand",
      className: "text-center",
      render: (i) => {
        const stockOnHand = i.available_quantity ?? Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0));
        const isAvailable = i.available !== false;
        
        if (!isAvailable) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500" title="Item is marked Unavailable">
              0 <span className="text-[10px] font-normal text-slate-400">(Unavailable)</span>
            </span>
          );
        }

        if (stockOnHand <= 0) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200" title="Fully reserved/in use">
              0 <span className="text-[10px] font-normal text-rose-500 ml-1">(Out of stock)</span>
            </span>
          );
        }

        return (
          <span 
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
            title={`${i.quantity || 0} Total - ${i.reserved_quantity || 0} In Use = ${stockOnHand} Stock on Hand`}
          >
            {stockOnHand}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      stopRowClick: true,
      render: (i) => {
        const isAvailable = i.available !== false;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(i);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 ${
                isAvailable ? "bg-emerald-600" : "bg-slate-300"
              }`}
              title={`Click to mark ${isAvailable ? "Unavailable" : "Available"}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-semibold ${isAvailable ? "text-emerald-700" : "text-slate-500"}`}>
              {isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>
        );
      },
    },
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
      <div className="p-6 space-y-5 bg-background min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">Inventory Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track current stock on hand, live reservations, and equipment availability.</p>
          </div>
          <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> Add Item</Btn>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search inventory by name..."
            quickFilters={categories.map((c) => ({ value: c, label: c }))}
            activeQuickFilter={filter}
            onQuickFilterChange={setFilter}
            right={
              <div className="flex items-center gap-2">
                {/* Optional Date Selector for checking stock for a specific date */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                    title="Select a date to check Stock on Hand for that day (defaults to Today)"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold ml-1"
                      title="Reset to Today"
                    >
                      Today
                    </button>
                  )}
                </div>

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
                      <label key={v} className="flex items-center gap-2 text-sm text-foreground capitalize cursor-pointer">
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
              </div>
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
            loadData(selectedDate);
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
                variant="primary"
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
              <DrawerField label="Total Quantity" value={drawerRow.quantity || 0} />
              <DrawerField label="In-Use (Today)" value={drawerRow.reserved_quantity || 0} />
              <DrawerField label="Stock on Hand" value={<strong className="text-emerald-700">{drawerRow.available_quantity || 0}</strong>} />
              <DrawerField label="Status" value={<Badge status={drawerRow.available !== false ? "available" : "unavailable"} />} />
            </div>

            {/* Formula explanation box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <span className="font-semibold text-slate-700 block">Stock Calculation:</span>
              <p>
                <strong>{drawerRow.quantity || 0}</strong> (Total Quantity) − <strong>{drawerRow.reserved_quantity || 0}</strong> (In-Use Today) = <strong className="text-emerald-700">{drawerRow.available_quantity || 0}</strong> (Stock on Hand).
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-3">Inventory Log</p>
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
                      {entry.reason && <p className="text-xs text-foreground">{entry.reason}</p>}
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
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
