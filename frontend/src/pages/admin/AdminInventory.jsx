import React, { useState, useEffect, useMemo } from "react";
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
  ChevronUp,
  ArrowUpDown,
  Check,
  Sparkles,
  Package as PackageIcon,
  ExternalLink,
  Layers,
  Boxes,
  Wrench,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import InventoryModal from "../../components/admin/ui/InventoryModal";
import AIInventoryParserModal from "../../components/admin/ui/AIInventoryParserModal";
import ResolveTurnoverModal from "../../components/admin/ui/ResolveTurnoverModal";
import ItemDeleteWarningModal from "../../components/admin/common/ItemDeleteWarningModal";
import FilterPill from "../../components/admin/table/FilterPill";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
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

  // Filters & Sorting
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name"); // 'name' | 'quantity' | 'stockOnHand'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' | 'desc'

  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveInitialMode, setResolveInitialMode] = useState("repair_damages");
  const [drawerRow, setDrawerRow] = useState(null);

  const [logState, setLogState] = useState({ itemId: null, entries: [] });

  const eventLabel = {
    created: "Created",
    manual_adjustment: "Manual Adjustment",
    adjustment: "Stock Adjustment",
    reservation_allocated: "Reserved for Event",
    reservation_released: "Turnover Returned / Released",
    retired: "Retired",
    damage_loss: "Equipment Damage / Loss",
    missing: "Equipment Missing",
    repaired_restored: "Repaired & Restored",
    recovered: "Recovered from Venue",
    written_off: "Written Off / Disposed",
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

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  useRealTimeRefresh(() => loadData(selectedDate));

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
    } catch {
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const list = inventory.filter((i) => {
      const matchSearch =
        !search || (i.item_name && i.item_name.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        categoryFilter === "all" ||
        (i.category && i.category.toLowerCase() === categoryFilter.toLowerCase());

      const matchAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" ? i.available : !i.available);

      const stockOnHand =
        i.available_quantity ?? Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0));
      const threshold = i.low_stock_threshold;
      let sStatus = i.stock_status;
      if (!sStatus) {
        if (stockOnHand === 0) sStatus = "no_stock";
        else if (threshold != null && threshold > 0 && stockOnHand <= threshold) sStatus = "low_stock";
        else sStatus = "in_stock";
      }

      let matchStockStatus = false;
      if (stockStatusFilter === "all") {
        matchStockStatus = true;
      } else if (stockStatusFilter === "has_damaged") {
        matchStockStatus = (Number(i.damaged_quantity) || 0) > 0;
      } else if (stockStatusFilter === "has_missing") {
        matchStockStatus = (Number(i.missing_quantity) || 0) > 0;
      } else {
        matchStockStatus = sStatus === stockStatusFilter;
      }

      return matchSearch && matchCategory && matchAvailability && matchStockStatus;
    });

    list.sort((a, b) => {
      let valA, valB;
      if (sortField === "name") {
        valA = (a.item_name || "").toLowerCase();
        valB = (b.item_name || "").toLowerCase();
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === "quantity") {
        valA = a.quantity || 0;
        valB = b.quantity || 0;
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      if (sortField === "stockOnHand") {
        valA = a.available_quantity ?? Math.max(0, (a.quantity || 0) - (a.reserved_quantity || 0));
        valB = b.available_quantity ?? Math.max(0, (b.quantity || 0) - (b.reserved_quantity || 0));
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return 0;
    });

    return list;
  }, [inventory, search, categoryFilter, availabilityFilter, stockStatusFilter, sortField, sortOrder]);

  const { pageRows, page, setPage, totalPages, pageSize } = usePagination(filteredAndSorted, 10);

  // Filter count summaries
  const categoryCounts = useMemo(() => {
    let setupCount = 0;
    let diningCount = 0;
    inventory.forEach((i) => {
      if (i.category === "Dining & Service Inventory") diningCount++;
      else setupCount++;
    });
    return { all: inventory.length, setup: setupCount, dining: diningCount };
  }, [inventory]);

  const availabilityCounts = useMemo(() => {
    let avail = 0;
    let unavail = 0;
    inventory.forEach((i) => {
      if (i.available !== false) avail++;
      else unavail++;
    });
    return { all: inventory.length, available: avail, unavailable: unavail };
  }, [inventory]);

  const stockCounts = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let noStock = 0;
    let hasDamaged = 0;
    let hasMissing = 0;
    inventory.forEach((i) => {
      const stockOnHand =
        i.available_quantity ?? Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0));
      const threshold = i.low_stock_threshold;
      if (stockOnHand === 0) noStock++;
      else if (threshold != null && threshold > 0 && stockOnHand <= threshold) lowStock++;
      else inStock++;

      if ((Number(i.damaged_quantity) || 0) > 0) hasDamaged++;
      if ((Number(i.missing_quantity) || 0) > 0) hasMissing++;
    });
    return {
      all: inventory.length,
      in_stock: inStock,
      low_stock: lowStock,
      no_stock: noStock,
      has_damaged: hasDamaged,
      has_missing: hasMissing,
    };
  }, [inventory]);

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Inventory Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track current stock on hand, live reservations, and equipment availability.
            </p>
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

        {/* ============ TOOLBAR ============ */}
        <AdminCard className="!p-3 sm:!p-3.5 border border-gray-200/80 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
            {/* Search */}
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

            {/* Filter Pills & Date Picker */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Date Filter */}
              <div className="flex items-center gap-1.5 px-2.5 h-8 bg-white border border-gray-200 rounded-lg text-xs shadow-2xs hover:border-gray-300 transition-colors">
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

              {/* Category Filter Pill */}
              <FilterPill
                label="Category"
                value={categoryFilter}
                defaultValue="all"
                options={[
                  { value: "all", label: "All Categories", count: categoryCounts.all },
                  { value: "Event Setup & Furniture", label: "Event Setup & Furniture", count: categoryCounts.setup },
                  { value: "Dining & Service Inventory", label: "Dining & Service Inventory", count: categoryCounts.dining },
                ]}
                onSelect={(val) => setCategoryFilter(val)}
                onClear={() => setCategoryFilter("all")}
              />

              {/* Availability Filter Pill */}
              <FilterPill
                label="Availability"
                value={availabilityFilter}
                defaultValue="all"
                options={[
                  { value: "all", label: "All Availability", count: availabilityCounts.all },
                  { value: "available", label: "Available", count: availabilityCounts.available },
                  { value: "unavailable", label: "Unavailable", count: availabilityCounts.unavailable },
                ]}
                onSelect={(val) => setAvailabilityFilter(val)}
                onClear={() => setAvailabilityFilter("all")}
              />

              {/* Stock Status Filter Pill */}
              <FilterPill
                label="Stock Condition"
                value={stockStatusFilter}
                defaultValue="all"
                options={[
                  { value: "all", label: "All Conditions", count: stockCounts.all },
                  { value: "in_stock", label: "In Stock", count: stockCounts.in_stock },
                  { value: "low_stock", label: "Low Stock", count: stockCounts.low_stock },
                  { value: "no_stock", label: "No Stock", count: stockCounts.no_stock },
                  ...(stockCounts.has_damaged > 0
                    ? [{ value: "has_damaged", label: "Has Damaged Units", count: stockCounts.has_damaged }]
                    : []),
                  ...(stockCounts.has_missing > 0
                    ? [{ value: "has_missing", label: "Has Missing Units", count: stockCounts.has_missing }]
                    : []),
                ]}
                onSelect={(val) => setStockStatusFilter(val)}
                onClear={() => setStockStatusFilter("all")}
              />
            </div>
          </div>
        </AdminCard>

        {/* ============ INVENTORY TABLE ============ */}
        <AdminCard className="!p-0 overflow-hidden border border-gray-200/80 shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading inventory items...</div>
          ) : pageRows.length === 0 ? (
            <div className="p-12 text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700">No inventory found.</p>
              {search || categoryFilter !== "all" || availabilityFilter !== "all" || stockStatusFilter !== "all" ? (
                <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
              ) : (
                <p className="text-xs text-gray-400">Create an inventory item or import with Zelle AI!</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#F8FAFC] border-b border-gray-200/80">
                  <tr>
                    <th
                      onClick={() => handleSort("name")}
                      className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-800 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Item Name</span>
                        {sortField === "name" ? (
                          sortOrder === "asc" ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />
                        ) : (
                          <ArrowUpDown size={11} className="text-gray-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Category
                    </th>
                    <th
                      onClick={() => handleSort("quantity")}
                      className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-800 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Total Quantity</span>
                        {sortField === "quantity" ? (
                          sortOrder === "asc" ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />
                        ) : (
                          <ArrowUpDown size={11} className="text-gray-400 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("stockOnHand")}
                      className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-800 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Stock on Hand</span>
                        {sortField === "stockOnHand" ? (
                          sortOrder === "asc" ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />
                        ) : (
                          <ArrowUpDown size={11} className="text-gray-400 opacity-60" />
                        )}
                      </div>
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

                    let stockBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                    if (stockStatus === "no_stock" || stockOnHand <= 0) {
                      stockBadgeStyle = "bg-rose-50 text-rose-700 border-rose-200/80";
                    } else if (stockStatus === "low_stock") {
                      stockBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";
                    }

                    const categoryLabel = i.category || "Event Setup & Furniture";

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
                          {((Number(i.damaged_quantity) || 0) > 0 || (Number(i.missing_quantity) || 0) > 0) && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {(Number(i.damaged_quantity) || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle size={10} />
                                  {i.damaged_quantity} damaged
                                </span>
                              )}
                              {(Number(i.missing_quantity) || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  <AlertCircle size={10} />
                                  {i.missing_quantity} missing
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70 truncate max-w-[180px]">
                            {categoryLabel}
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

                        {/* Stock Status */}
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

                        {/* Availability Status */}
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
                                ...(((Number(i.damaged_quantity) || 0) > 0 || (Number(i.missing_quantity) || 0) > 0)
                                  ? [
                                      {
                                        key: "resolve",
                                        label: "Resolve turnover stock",
                                        icon: Wrench,
                                        onSelect: () => {
                                          setResolveInitialMode((Number(i.damaged_quantity) || 0) > 0 ? "repair_damages" : "recover_missing");
                                          setResolveTarget(i);
                                        },
                                      },
                                    ]
                                  : []),
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
              Showing {filteredAndSorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}
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

      {resolveTarget && (
        <ResolveTurnoverModal
          item={resolveTarget}
          initialMode={resolveInitialMode}
          onClose={() => setResolveTarget(null)}
          onSuccess={(updatedItem) => {
            loadData(selectedDate);
            if (drawerRow && drawerRow._id === updatedItem?._id) {
              setDrawerRow(updatedItem);
            }
          }}
        />
      )}

      {(() => {
        const stockOnHand = drawerRow
          ? (drawerRow.available_quantity ?? Math.max(0, (drawerRow.quantity || 0) - (drawerRow.reserved_quantity || 0)))
          : 0;
        const threshold = drawerRow?.low_stock_threshold;
        let stockStatus = drawerRow?.stock_status;
        if (drawerRow && !stockStatus) {
          if (stockOnHand === 0) stockStatus = "no_stock";
          else if (threshold != null && threshold > 0 && stockOnHand <= threshold) stockStatus = "low_stock";
          else stockStatus = "in_stock";
        }

        return (
          <DetailDrawer
            open={!!drawerRow}
            onOpenChange={(open) => !open && setDrawerRow(null)}
            title={drawerRow?.item_name || ""}
            headerExtra={
              drawerRow && (
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
                  <Badge 
                    status={drawerRow.available !== false ? "available" : "unavailable"} 
                    dot 
                  />
                </div>
              )
            }
            footer={
              drawerRow && (
                <div className="flex items-center justify-between w-full gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const row = drawerRow;
                      setDrawerRow(null);
                      setCancelTarget(row);
                    }}
                    className="py-2 px-3 rounded-lg font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0 bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.99]"
                  >
                    <Trash2 size={13} /> Delete
                  </button>

                  {((Number(drawerRow.damaged_quantity) || 0) > 0 || (Number(drawerRow.missing_quantity) || 0) > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setResolveInitialMode((Number(drawerRow.damaged_quantity) || 0) > 0 ? "repair_damages" : "recover_missing");
                        setResolveTarget(drawerRow);
                      }}
                      className="py-2 px-3 rounded-lg font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.99]"
                    >
                      <Wrench size={13} /> Resolve Turnover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const row = drawerRow;
                      setDrawerRow(null);
                      handleOpenModal(row);
                    }}
                    className="flex-1 py-2 px-3.5 rounded-lg font-semibold text-xs text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.99]"
                  >
                    <Edit3 size={13} /> Edit item
                  </button>
                </div>
              )
            }
          >
            {drawerRow && (
              <div className="space-y-3">
                {/* 5 Key Metric Blocks */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <div className="bg-slate-50/70 rounded-lg p-2 border border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">Active Stock</span>
                    <span className="font-mono font-semibold text-sm text-slate-800 block truncate mt-0.5">{drawerRow.quantity || 0}</span>
                  </div>
                  <div className="bg-slate-50/70 rounded-lg p-2 border border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                      {selectedDate && selectedDate !== getTodayDateString() ? "In-Use (Date)" : "In-Use (Today)"}
                    </span>
                    <span className={`font-mono font-semibold text-sm block truncate mt-0.5 ${drawerRow.reserved_quantity > 0 ? "text-amber-600" : "text-slate-800"}`}>
                      {drawerRow.reserved_quantity || 0}
                    </span>
                  </div>
                  <div className="bg-slate-50/90 rounded-lg p-2 border border-slate-300/70 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block truncate">Stock on Hand</span>
                    <span className={`font-mono font-extrabold text-base sm:text-lg leading-tight block truncate mt-0.5 ${
                      stockStatus === "no_stock" ? "text-rose-600" : stockStatus === "low_stock" ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {stockOnHand}
                    </span>
                  </div>
                  <div className={`rounded-lg p-2 border ${
                    (Number(drawerRow.damaged_quantity) || 0) > 0 ? "bg-rose-50/80 border-rose-200/80 text-rose-800" : "bg-slate-50/70 border-slate-200/60 text-slate-400"
                  }`}>
                    <span className="text-[10px] uppercase font-bold block truncate">Damaged</span>
                    <span className="font-mono font-bold text-sm block truncate mt-0.5">
                      {drawerRow.damaged_quantity || 0}
                    </span>
                  </div>
                  <div className={`rounded-lg p-2 border ${
                    (Number(drawerRow.missing_quantity) || 0) > 0 ? "bg-amber-50/80 border-amber-200/80 text-amber-800" : "bg-slate-50/70 border-slate-200/60 text-slate-400"
                  }`}>
                    <span className="text-[10px] uppercase font-bold block truncate">Missing</span>
                    <span className="font-mono font-bold text-sm block truncate mt-0.5">
                      {drawerRow.missing_quantity || 0}
                    </span>
                  </div>
                </div>

                {/* Turnover Quarantine Notice & Actions */}
                {((Number(drawerRow.damaged_quantity) || 0) > 0 || (Number(drawerRow.missing_quantity) || 0) > 0) && (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                        <AlertTriangle size={13} className="text-amber-600" />
                        <span>Turnover Quarantine Notice</span>
                      </div>
                      <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                        {(Number(drawerRow.damaged_quantity) || 0) + (Number(drawerRow.missing_quantity) || 0)} Units Logged
                      </span>
                    </div>

                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      {(Number(drawerRow.damaged_quantity) || 0) > 0 && (
                        <span>
                          <strong>{drawerRow.damaged_quantity}</strong> unit{drawerRow.damaged_quantity > 1 ? "s" : ""} marked damaged from event returns.{" "}
                        </span>
                      )}
                      {(Number(drawerRow.missing_quantity) || 0) > 0 && (
                        <span>
                          <strong>{drawerRow.missing_quantity}</strong> unit{drawerRow.missing_quantity > 1 ? "s" : ""} reported missing / unreturned.
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      {(Number(drawerRow.damaged_quantity) || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setResolveInitialMode("repair_damages");
                            setResolveTarget(drawerRow);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Wrench size={11} className="text-emerald-600" />
                          Resolve Damaged ({drawerRow.damaged_quantity})
                        </button>
                      )}
                      {(Number(drawerRow.missing_quantity) || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setResolveInitialMode("recover_missing");
                            setResolveTarget(drawerRow);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-md font-semibold text-[11px] bg-white text-amber-900 border border-amber-300 hover:bg-amber-50 transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={11} className="text-amber-700" />
                          Resolve Missing ({drawerRow.missing_quantity})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Category & Low Stock Threshold Details */}
                <div className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</span>
                    <span className="font-semibold text-slate-800">{drawerRow.category || "Event Setup & Furniture"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Threshold</span>
                    <span className="font-semibold text-slate-800">
                      {threshold != null ? `${threshold} units` : "Not set"}
                    </span>
                  </div>
                </div>

                {/* Formula explanation box */}
                <div className="px-2.5 py-2 bg-slate-50/60 rounded-md border border-slate-200/60 text-[11px] text-slate-600 space-y-0.5">
                  <span className="font-semibold text-slate-700 block text-[11px]">Stock &amp; Status Calculation:</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    <strong className="text-slate-900 font-semibold">{drawerRow.quantity || 0}</strong> (Active Stock) −{" "}
                    <strong className="text-slate-900 font-semibold">{drawerRow.reserved_quantity || 0}</strong> (
                    {selectedDate && selectedDate !== getTodayDateString() ? "In-Use on Date" : "In-Use Today"}
                    ) ={" "}
                    <strong className={stockStatus === "no_stock" ? "text-rose-600 font-semibold" : stockStatus === "low_stock" ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                      {stockOnHand}
                    </strong>{" "}
                    (Stock on Hand).
                  </p>
                  <p className="text-[10.5px] text-slate-500">
                    Threshold:{" "}
                    <strong className="text-slate-700 font-semibold">{threshold != null ? `${threshold} units` : "Not set"}</strong>{" "}
                    → Automatic Stock Status:{" "}
                    <strong className={stockStatus === "no_stock" ? "text-rose-600 font-semibold" : stockStatus === "low_stock" ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                      {stockStatus === "no_stock" ? "No Stock" : stockStatus === "low_stock" ? "Low Stock" : "In Stock"}
                    </strong>.
                  </p>
                </div>

                {/* Associated Packages */}
                {(() => {
                  const associated = getAssociatedPackages(drawerRow);
                  return (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <PackageIcon size={11} className="text-blue-600" /> Associated Packages ({associated.length})
                        </h5>
                      </div>

                      {associated.length > 0 ? (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {associated.map((pkg) => (
                            <div
                              key={pkg._id}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-xs font-semibold text-slate-900 truncate">{pkg.name}</p>
                                <p className="text-[10.5px] text-slate-500 mt-0.5">
                                  {pkg.offer_type === "special" ? "Special Combo" : "Event Package"} · {pkg.event_type || "Catering"}
                                </p>
                              </div>
                              <Link
                                to={`/admin/packages?id=${pkg._id}&tab=${pkg.offer_type === "special" ? "special" : "regular"}`}
                                onClick={() => setDrawerRow(null)}
                                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs hover:bg-slate-50 shrink-0"
                              >
                                View <ExternalLink size={10} />
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-2 px-3 rounded-md bg-slate-50/40 border border-dashed border-slate-200/80 text-center">
                          <p className="text-[11px] text-slate-400 italic">
                            This inventory item is not currently included in any packages.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Upcoming Event Usage (for selected date) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar size={11} className="text-blue-600" />
                      Upcoming Event Usage ({(drawerRow.event_usages || []).length})
                    </h5>
                    <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
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
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                      {drawerRow.event_usages.map((usage, idx) => (
                        <div
                          key={usage.booking_id || idx}
                          className="p-2 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/70 transition-colors flex flex-col gap-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {usage.package_name || usage.event_name || "Event Reservation"}
                              </p>
                              <div className="grid grid-cols-2 gap-1 mt-0.5 text-[10.5px] text-slate-500">
                                <div>
                                  Customer: <span className="font-semibold text-slate-800">{usage.customer_name}</span>
                                </div>
                                <div>
                                  Event Date:{" "}
                                  <span className="font-medium text-slate-800">
                                    {usage.event_date
                                      ? new Date(usage.event_date).toLocaleDateString("en-US", {
                                          long: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10.5px]">
                                <span className="text-slate-500 font-medium">Quantity:</span>
                                <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded text-[10.5px] font-bold border border-amber-200">
                                  {usage.quantity} {usage.unit || (usage.quantity === 1 ? "unit" : "pcs")}
                                </span>
                                {usage.reference && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    (#{usage.reference})
                                  </span>
                                )}
                              </div>
                            </div>
                            <Link
                              to={`/admin/bookings/${usage.booking_id}/details`}
                              onClick={() => setDrawerRow(null)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs hover:bg-slate-50 shrink-0"
                            >
                              View <ExternalLink size={10} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 px-3 rounded-md bg-slate-50/40 border border-dashed border-slate-200/80 text-center">
                      <p className="text-[11px] text-slate-400 italic">
                        No upcoming events are using this item on the selected date.
                      </p>
                    </div>
                  )}
                </div>

                {/* Inventory Log */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <RotateCcw size={11} className="text-blue-600" /> Inventory Log
                  </h5>
                  {logsLoading ? (
                    <p className="text-xs text-slate-400 py-1.5 text-center">Loading log…</p>
                  ) : logs.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-1.5 text-center italic">No stock changes recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                      {logs.map((entry) => {
                        const isPositive = entry.delta > 0;
                        const isNegative = entry.delta < 0;
                        let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200/80";
                        if (entry.event_type === "damage_loss" || entry.event_type === "written_off" || entry.event_type === "retired") {
                          badgeStyle = "bg-rose-50 text-rose-700 border-rose-200/80";
                        } else if (entry.event_type === "repaired_restored" || entry.event_type === "recovered" || entry.event_type === "reservation_released") {
                          badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                        } else if (entry.event_type === "missing" || entry.event_type === "reservation_allocated") {
                          badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";
                        }

                        return (
                          <div key={entry._id} className="space-y-0.5 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold border ${badgeStyle}`}>
                                {eventLabel[entry.event_type] || entry.event_type}
                              </span>
                              {entry.delta !== 0 && (
                                <span className={`text-xs font-bold font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                  {isPositive ? `+${entry.delta}` : entry.delta}
                                </span>
                              )}
                            </div>
                            {entry.reason && <p className="text-xs text-slate-800 font-medium">{entry.reason}</p>}
                            <p className="text-[10.5px] text-slate-400">
                              {entry.actor_id?.full_name || "System"} · {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                              {entry.booking_id?.reference && ` · Booking #${entry.booking_id.reference}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Metadata timestamps */}
                <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Created</p>
                      <p className="text-slate-700 font-medium text-[11px]">
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
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Last Updated</p>
                      <p className="text-slate-700 font-medium text-[11px]">
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
            )}
          </DetailDrawer>
        );
      })()}
    </AdminLayout>
  );
}
