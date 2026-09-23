import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  RotateCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  Package as PackageIcon,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import InventoryModal from "../../components/admin/ui/InventoryModal";
import AIInventoryParserModal from "../../components/admin/ui/AIInventoryParserModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ItemDeleteWarningModal from "../../components/admin/common/ItemDeleteWarningModal";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import usePagination from "../../hooks/usePagination";

// Returns today's local date in YYYY-MM-DD format (as required by HTML5 date inputs)
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseInclusionItem = (str) => {
  if (!str) return { name: "", quantity: 1 };
  let text = String(str).trim();
  for (let i = 0; i < 4; i++) {
    text = text.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }
  text = text.replace(/^\s*\[[^\]]*\]\s*/, "").trim();
  for (let i = 0; i < 2; i++) {
    text = text.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }
  let quantity = 1;
  const parenMatch = text.match(/\(([^)]*)\)\s*$/);
  if (parenMatch) {
    const digits = parenMatch[1].match(/\d+/);
    if (digits) quantity = parseInt(digits[0], 10);
    text = text.replace(/\s*\([^)]*\)\s*$/, "").trim();
  } else {
    const xMatch = text.match(/[\s×x](\d+)\s*$/i);
    if (xMatch) {
      quantity = parseInt(xMatch[1], 10);
      text = text.replace(/[\s×x](\d+)\s*$/i, "").trim();
    } else {
      const leadMatch = text.match(/^(\d+)\s+(.*)$/);
      if (leadMatch) {
        quantity = parseInt(leadMatch[1], 10);
        text = leadMatch[2].trim();
      }
    }
  }
  return { name: text.trim(), quantity: Math.max(1, quantity) };
};

const normalizeInvName = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
};

export default function AdminInventory() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [inventory, setInventory] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);

  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [draftAvailabilityFilter, setDraftAvailabilityFilter] = useState("all");

  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [draftStockStatusFilter, setDraftStockStatusFilter] = useState("all");

  const [logState, setLogState] = useState({ itemId: null, entries: [] });

  const eventLabel = {
    created: "Created",
    manual_adjustment: "Manual Adjustment",
    reservation_allocated: "Reservation Allocated",
    reservation_released: "Reservation Released",
    retired: "Retired",
  };

  const loadData = async (dateParam = selectedDate) => {
    setLoading(true);
    try {
      const [invRes, pkgRes] = await Promise.all([
        AdminAPI.getInventoryAvailability(dateParam || undefined),
        AdminAPI.getPackages().catch(() => ({ data: [] })),
      ]);
      setInventory(invRes.data || []);
      setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : []);
    } catch {
      notify("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  const getAssociatedPackages = (item) => {
    if (!item || !packages.length) return [];
    const itemIdStr = String(item._id);
    const itemNorm = normalizeInvName(item.item_name);
    const itemIdent = item.identifier ? normalizeInvName(item.identifier) : "";

    return packages.filter((pkg) => {
      if (Array.isArray(pkg.setup_equipment)) {
        for (const eq of pkg.setup_equipment) {
          const eqId = String(eq.inventory_id?._id || eq.inventory_id || "");
          if (eqId && eqId === itemIdStr) return true;
        }
      }
      if (Array.isArray(pkg.inclusions)) {
        for (const inc of pkg.inclusions) {
          const parsed = parseInclusionItem(inc);
          const incNorm = normalizeInvName(parsed.name);
          if (incNorm === itemNorm) return true;
          if (itemIdent && incNorm === itemIdent) return true;
          if (itemNorm.endsWith("s") && incNorm === itemNorm.slice(0, -1)) return true;
          if (incNorm.endsWith("s") && incNorm.slice(0, -1) === itemNorm) return true;
          if (itemNorm.length >= 4 && (incNorm.includes(itemNorm) || itemNorm.includes(incNorm))) return true;
        }
      }
      return false;
    });
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  // Keep drawerRow synchronized with fresh availability & event_usages when date or inventory data updates
  useEffect(() => {
    if (!drawerRow) return;
    const fresh = inventory.find((i) => i._id === drawerRow._id);
    if (fresh) {
      setDrawerRow(fresh);
    }
  }, [inventory]);

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
          return {
            ...i,
            available: nextStatus,
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
    const matchAvailability = availabilityFilter === "all" || (availabilityFilter === "available" ? i.available : !i.available);
    
    const stockOnHand = i.available_quantity ?? Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0));
    const threshold = i.low_stock_threshold;
    let sStatus = i.stock_status;
    if (!sStatus) {
      if (stockOnHand === 0) sStatus = "no_stock";
      else if (threshold != null && threshold > 0 && stockOnHand <= threshold) sStatus = "low_stock";
      else sStatus = "in_stock";
    }
    const matchStockStatus = stockStatusFilter === "all" || sStatus === stockStatusFilter;

    return matchSearch && matchAvailability && matchStockStatus;
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
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary bg-powder border border-primary/20 shadow-2xs hover:bg-powder/80 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles size={13} className="text-primary" />
              <span>Import with Zelle AI</span>
            </button>
            <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <Plus size={13} /> Add Item
            </Btn>
          </div>
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

            {/* Right: Date Filter → Availability */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Date Filter */}
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

              {/* Availability Popover */}
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
                      {v === "all" ? "All availability" : v}
                    </label>
                  ))}
                </div>
              </FilterPopover>

              {/* Stock Status Popover */}
              <FilterPopover
                label="Stock Status"
                activeCount={stockStatusFilter !== "all" ? 1 : 0}
                onApply={() => setStockStatusFilter(draftStockStatusFilter)}
                onClear={() => {
                  setDraftStockStatusFilter("all");
                  setStockStatusFilter("all");
                }}
              >
                <div className="space-y-1.5">
                  {[
                    { value: "all", label: "All stock conditions" },
                    { value: "in_stock", label: "In Stock" },
                    { value: "low_stock", label: "Low Stock" },
                    { value: "no_stock", label: "No Stock" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="inventory-stock-status"
                        checked={draftStockStatusFilter === opt.value}
                        onChange={() => setDraftStockStatusFilter(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </FilterPopover>
            </div>
          </div>

          {(availabilityFilter !== "all" || stockStatusFilter !== "all") && (
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100 flex-wrap">
              {availabilityFilter !== "all" && (
                <FilterChip
                  label={`Availability: ${availabilityFilter}`}
                  onRemove={() => {
                    setAvailabilityFilter("all");
                    setDraftAvailabilityFilter("all");
                  }}
                />
              )}
              {stockStatusFilter !== "all" && (
                <FilterChip
                  label={`Stock Status: ${
                    stockStatusFilter === "in_stock" 
                      ? "In Stock" 
                      : stockStatusFilter === "low_stock" 
                        ? "Low Stock" 
                        : "No Stock"
                  }`}
                  onRemove={() => {
                    setStockStatusFilter("all");
                    setDraftStockStatusFilter("all");
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
              {(search || availabilityFilter !== "all") && (
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
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Total Quantity
                    </th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Stock on Hand
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Stock Status
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Availability
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
                    const threshold = i.low_stock_threshold;

                    let stockStatus = i.stock_status;
                    if (!stockStatus) {
                      if (stockOnHand === 0) stockStatus = "no_stock";
                      else if (threshold != null && threshold > 0 && stockOnHand <= threshold) stockStatus = "low_stock";
                      else stockStatus = "in_stock";
                    }

                    // Data-driven Stock on Hand styling:
                    // Green: healthy stock (> threshold)
                    // Amber: low stock (<= threshold)
                    // Red: 0 / no stock
                    let stockBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                    if (stockStatus === "no_stock" || stockOnHand <= 0) {
                      stockBadgeStyle = "bg-rose-50 text-rose-700 border-rose-200/80";
                    } else if (stockStatus === "low_stock") {
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
                              {i.reserved_quantity} unit{i.reserved_quantity > 1 ? "s" : ""} {selectedDate && selectedDate !== getTodayDateString() ? "in use on this date" : "in use today"}
                            </span>
                          )}
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

                        {/* Stock Status (Automatic calculation) */}
                        <td className="px-5 py-3.5 text-left">
                          <Badge 
                            status={
                              stockStatus === "no_stock" 
                                ? "No Stock" 
                                : stockStatus === "low_stock" 
                                  ? "Low Stock" 
                                  : "In Stock"
                            } 
                            dot 
                          />
                        </td>

                        {/* Availability Status (Manual Admin Switch) */}
                        <td className="px-5 py-3.5 text-left" onClick={(e) => e.stopPropagation()}>
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

      {showAIModal && (
        <AIInventoryParserModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          existingItems={inventory}
          onBulkSuccess={() => {
            loadData(selectedDate);
          }}
        />
      )}

      {cancelTarget && (
        <ItemDeleteWarningModal
          isOpen={!!cancelTarget}
          item={cancelTarget}
          type="inventory"
          onClose={() => setCancelTarget(null)}
          onConfirm={() => handleDelete(cancelTarget._id)}
        />
      )}

      <DetailDrawer
        open={!!drawerRow}
        onOpenChange={(open) => !open && setDrawerRow(null)}
        title={drawerRow?.item_name}
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
        {drawerRow && (() => {
          const stockOnHand =
            drawerRow.available_quantity ??
            Math.max(0, (drawerRow.quantity || 0) - (drawerRow.reserved_quantity || 0));
          const threshold = drawerRow.low_stock_threshold;
          let stockStatus = drawerRow.stock_status;
          if (!stockStatus) {
            if (stockOnHand === 0) stockStatus = "no_stock";
            else if (threshold != null && threshold > 0 && stockOnHand <= threshold) stockStatus = "low_stock";
            else stockStatus = "in_stock";
          }

          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Total Quantity" value={drawerRow.quantity || 0} />
                <DrawerField label="Low Stock Threshold" value={threshold != null ? `${threshold} units` : "Not set"} />
                <DrawerField label={selectedDate && selectedDate !== getTodayDateString() ? "In-Use (Selected Date)" : "In-Use (Today)"} value={drawerRow.reserved_quantity || 0} />
                <DrawerField 
                  label="Stock on Hand" 
                  value={
                    <strong className={stockStatus === "no_stock" ? "text-rose-700" : stockStatus === "low_stock" ? "text-amber-700" : "text-emerald-700"}>
                      {stockOnHand}
                    </strong>
                  } 
                />
                <DrawerField 
                  label="Stock Status" 
                  value={
                    <Badge 
                      status={
                        stockStatus === "no_stock" 
                          ? "No Stock" 
                          : stockStatus === "low_stock" 
                            ? "Low Stock" 
                            : "In Stock"
                      } 
                      dot 
                    />
                  } 
                />
                <DrawerField 
                  label="Availability Status" 
                  value={
                    <Badge 
                      status={drawerRow.available !== false ? "available" : "unavailable"} 
                      dot 
                    />
                  } 
                />
              </div>

              {/* Formula explanation box */}
              <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-xs text-slate-600 space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-700 block">Stock &amp; Status Calculation:</span>
                <p>
                  <strong>{drawerRow.quantity || 0}</strong> (Total Quantity) − <strong>{drawerRow.reserved_quantity || 0}</strong> ({selectedDate && selectedDate !== getTodayDateString() ? "In-Use on Date" : "In-Use Today"}) = <strong className={stockStatus === "no_stock" ? "text-rose-700" : stockStatus === "low_stock" ? "text-amber-700" : "text-emerald-700"}>{stockOnHand}</strong> (Stock on Hand).
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Threshold: <strong>{threshold != null ? `${threshold} units` : "Not set"}</strong> → Automatic Stock Status: <strong className={stockStatus === "no_stock" ? "text-rose-700" : stockStatus === "low_stock" ? "text-amber-700" : "text-emerald-700"}>{stockStatus === "no_stock" ? "No Stock" : stockStatus === "low_stock" ? "Low Stock" : "In Stock"}</strong>.
                </p>
              </div>

            {/* Associated Packages */}
            {(() => {
              const associated = getAssociatedPackages(drawerRow);
              return (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <PackageIcon size={13} className="text-primary" /> Associated Packages ({associated.length})
                    </span>
                  </div>

                  {associated.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {associated.map((pkg) => (
                        <div
                          key={pkg._id}
                          className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-bold text-foreground truncate">{pkg.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {pkg.offer_type === "special" ? "Special Combo" : "Event Package"} · {pkg.event_type || "Catering"}
                            </p>
                          </div>
                          <Link
                            to={`/admin/packages?id=${pkg._id}&tab=${pkg.offer_type === "special" ? "special" : "regular"}`}
                            onClick={() => setDrawerRow(null)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            View <ExternalLink size={11} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-md bg-muted/20 border border-dashed border-border/60 text-center">
                      <p className="text-xs text-muted-foreground italic">
                        This inventory item is not currently included in any packages.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Upcoming Event Usage (for selected date) */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-600" />
                  Upcoming Event Usage ({(drawerRow.event_usages || []).length})
                </span>
                <span className="text-[10px] font-mono font-medium text-muted-foreground/80 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selectedDate
                    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Today"}
                </span>
              </div>

              {drawerRow.event_usages && drawerRow.event_usages.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {drawerRow.event_usages.map((usage, idx) => (
                    <div
                      key={usage.booking_id || idx}
                      className="p-3 rounded-lg border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70 transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {usage.package_name || usage.event_name || "Event Reservation"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Customer: <span className="font-semibold text-foreground/90">{usage.customer_name}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Event Date:{" "}
                            <span className="font-medium text-foreground/80">
                              {usage.event_date
                                ? new Date(usage.event_date).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                          </p>
                          <p className="text-[11px] font-semibold text-amber-900 mt-1 flex items-center gap-1.5">
                            <span>Quantity:</span>
                            <span className="bg-amber-100/90 text-amber-950 px-1.5 py-0.5 rounded text-[11px] font-bold">
                              {usage.quantity} {usage.unit || (usage.quantity === 1 ? "unit" : "pcs")}
                            </span>
                            {usage.reference && (
                              <span className="text-[10px] font-mono text-muted-foreground/80 font-normal">
                                (#{usage.reference})
                              </span>
                            )}
                          </p>
                        </div>
                        <Link
                          to={`/admin/bookings/${usage.booking_id}/details`}
                          onClick={() => setDrawerRow(null)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors bg-white px-2 py-1 rounded border border-primary/20 shadow-2xs shrink-0 self-start"
                        >
                          View <ExternalLink size={11} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-md bg-muted/20 border border-dashed border-border/60 text-center">
                  <p className="text-xs text-muted-foreground italic">
                    No upcoming events are using this item on the selected date.
                  </p>
                </div>
              )}
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

            {/* Metadata timestamps */}
            <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold">Created</p>
                  <p className="text-foreground/80 font-medium">
                    {drawerRow.createdAt
                      ? new Date(drawerRow.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold">Last Updated</p>
                  <p className="text-foreground/80 font-medium">
                    {drawerRow.updatedAt
                      ? new Date(drawerRow.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DetailDrawer>
    </AdminLayout>
  );
}
