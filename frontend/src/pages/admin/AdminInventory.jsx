import React, { useState, useEffect } from "react";
import { Eye, Plus, Edit3, Trash2, Calendar, RotateCcw, Search, X, ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import InventoryModal from "../../components/admin/ui/InventoryModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import usePagination from "../../hooks/usePagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";

// Returns today's local date in YYYY-MM-DD format (as required by HTML5 date inputs)
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

  const CATEGORY_MAP = {
    "Event Setup & Furniture": [
      "equipment",
      "furniture",
      "decorations",
      "decoration",
      "event setup & furniture",
      "event setup",
    ],
    "Dining & Service Inventory": [
      "tableware",
      "dining & service inventory",
      "dining & service",
      "dinnerware",
      "cutlery",
      "food warmer",
      "service",
    ],
  };

  const matchesCategory = (itemCategory, selectedFilter) => {
    if (!selectedFilter || selectedFilter === "all") return true;
    const raw = String(itemCategory || "").trim().toLowerCase();

    if (selectedFilter === "Event Setup & Furniture") {
      return (
        raw === "equipment" ||
        raw === "furniture" ||
        raw === "decorations" ||
        raw === "decoration" ||
        raw === "event setup & furniture" ||
        raw.includes("setup") ||
        raw.includes("furniture") ||
        raw.includes("equipment") ||
        raw.includes("decoration")
      );
    }

    if (selectedFilter === "Dining & Service Inventory") {
      return (
        raw === "tableware" ||
        raw === "dining & service inventory" ||
        raw === "dining & service" ||
        raw === "dinnerware" ||
        raw.includes("tableware") ||
        raw.includes("dining") ||
        raw.includes("service") ||
        raw.includes("cutlery") ||
        raw.includes("warmer")
      );
    }

    return raw === selectedFilter.toLowerCase();
  };

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
    const matchCategory = matchesCategory(i.category, filter);
    const matchAvailability = availabilityFilter === "all" || (availabilityFilter === "available" ? i.available : !i.available);
    return matchSearch && matchCategory && matchAvailability;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Inventory Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track current stock on hand, live reservations, and equipment availability.</p>
          </div>
          <Btn variant="primary" size="sm" onClick={() => handleOpenModal()} className="self-start sm:self-auto"><Plus size={13} /> Add Item</Btn>
        </div>

        {/* ============ INVENTORY TOOLBAR ============ */}
        <AdminCard className="!p-3 sm:!p-3.5 border border-gray-200/80 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
            {/* Left: Wider Search input using the additional space */}
            <div className="flex-1 min-w-0">
              <div className="relative w-full">
                <div className="flex items-center gap-2 bg-gray-50/70 border border-gray-200 rounded-lg px-3 h-9 text-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-white transition-all shadow-2xs">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search inventory by name..."
                    className="w-full bg-transparent text-xs sm:text-sm text-foreground focus:outline-none placeholder:text-gray-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Categories Filter → Date Filter → Availability */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* 1. Categories Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`px-3 py-1.5 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 border ${
                      filter !== "all"
                        ? "bg-primary text-white border-primary shadow-xs font-bold"
                        : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <span>{filter !== "all" ? filter : "Categories"}</span>
                    <ChevronDown
                      size={13}
                      className={filter !== "all" ? "text-white" : "text-gray-400"}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 p-1.5 rounded-xl shadow-lg border border-gray-200/80 bg-white"
                >
                  <DropdownMenuItem
                    onClick={() => setFilter("all")}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      filter === "all"
                        ? "bg-blue-50 text-primary font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>All Categories</span>
                    {filter === "all" && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("Event Setup & Furniture")}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      filter === "Event Setup & Furniture"
                        ? "bg-blue-50 text-primary font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Event Setup & Furniture</span>
                    {filter === "Event Setup & Furniture" && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilter("Dining & Service Inventory")}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      filter === "Dining & Service Inventory"
                        ? "bg-blue-50 text-primary font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>Dining & Service Inventory</span>
                    {filter === "Dining & Service Inventory" && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Date Filter */}
              <div className="flex items-center gap-1.5 px-2.5 h-9 bg-white border border-gray-200 rounded-lg text-xs shadow-2xs hover:border-gray-300 transition-colors">
                <Calendar size={13} className="text-gray-400 shrink-0" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer"
                  title="Select a date to check Stock on Hand for that day"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayDateString())}
                  className={`text-[11px] font-semibold ml-1 cursor-pointer transition-colors whitespace-nowrap ${
                    selectedDate === getTodayDateString()
                      ? "text-primary/60 font-medium"
                      : "text-primary hover:text-primary-hover font-bold"
                  }`}
                  title="Set date to Today"
                >
                  Today
                </button>
              </div>

              {/* 3. Availability Popover */}
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
          </div>

          {(availabilityFilter !== "all" || filter !== "all") && (
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100 flex-wrap">
              {filter !== "all" && (
                <FilterChip
                  label={`Category: ${filter}`}
                  onRemove={() => setFilter("all")}
                />
              )}
              {availabilityFilter !== "all" && (
                <FilterChip
                  label={`Status: ${availabilityFilter}`}
                  onRemove={() => {
                    setAvailabilityFilter("all");
                    setDraftAvailabilityFilter("all");
                  }}
                />
              )}
            </div>
          )}
        </AdminCard>

        {/* ============ INVENTORY TABLE ============ */}
        <AdminCard className="!p-0 overflow-hidden border border-gray-200/80 shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading inventory items...</div>
          ) : pageRows.length === 0 ? (
            <div className="p-12 text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700">No inventory found.</p>
              {(search || filter !== "all" || availabilityFilter !== "all") && (
                <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#F8FAFC] border-b border-gray-200/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Item Name
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Category
                    </th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Total Quantity
                    </th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Stock on Hand
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pageRows.map((i) => {
                    const stockOnHand =
                      i.available_quantity ??
                      Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0));
                    const isAvailable = i.available !== false;

                    // Data-driven Stock on Hand styling:
                    // Green: healthy stock
                    // Amber: low stock (<= 5 or <= 20% of total)
                    // Red: 0 / out of stock / unavailable
                    let stockBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                    if (!isAvailable || stockOnHand <= 0) {
                      stockBadgeStyle = "bg-rose-50 text-rose-700 border-rose-200/80";
                    } else if (
                      stockOnHand <= 5 ||
                      (i.quantity && stockOnHand / i.quantity <= 0.2)
                    ) {
                      stockBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";
                    }

                    return (
                      <tr
                        key={i._id}
                        onClick={() => setDrawerRow(i)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-sm">
                            {i.item_name}
                          </div>
                          {i.reserved_quantity > 0 && (
                            <span className="text-[11px] text-amber-700 font-medium block mt-0.5">
                              {i.reserved_quantity} unit{i.reserved_quantity > 1 ? "s" : ""} in use today
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100/90 text-slate-700 border border-slate-200/60 shadow-2xs">
                            {i.category || "General"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span className="text-sm font-semibold text-gray-800 tabular-nums">
                            {i.quantity || 0}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[2.25rem] px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums border shadow-2xs ${stockBadgeStyle}`}
                            title={`${i.quantity || 0} Total − ${i.reserved_quantity || 0} In Use = ${stockOnHand} Stock on Hand`}
                          >
                            {stockOnHand}
                          </span>
                        </td>

                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(i)}
                            title={`Click to mark ${isAvailable ? "Unavailable" : "Available"}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs transition-all cursor-pointer hover:opacity-85 ${
                              isAvailable
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                : "bg-rose-50 text-rose-700 border-rose-200/80"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isAvailable ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <span>{isAvailable ? "Available" : "Unavailable"}</span>
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <RowActionsMenu
                              actions={[
                                {
                                  key: "view",
                                  label: "View details",
                                  icon: Eye,
                                  onSelect: () => setDrawerRow(i),
                                },
                                {
                                  key: "edit",
                                  label: "Edit item",
                                  icon: Edit3,
                                  onSelect: () => handleOpenModal(i),
                                },
                                {
                                  key: "delete",
                                  label: "Delete item",
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () => setCancelTarget(i),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ============ TABLE FOOTER ============ */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-gray-100 bg-white gap-2">
            <span className="text-xs text-gray-500 font-medium">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      n === page
                        ? "bg-primary text-white shadow-2xs"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      {showModal && (
        <InventoryModal
          item={activeItem}
          existingItems={inventory}
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
            <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-xs text-slate-600 space-y-1 shadow-2xs">
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
