import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  Edit3,
  Trash2,
  Sparkles,
  LayoutGrid,
  List,
  Utensils,
  Copy,
  CheckCircle2,
  XCircle,
  Package,
  ArrowUpDown,
  X,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import MenuModal from "../../components/admin/ui/MenuModal";
import { DEFAULT_FOOD_CATEGORIES, sortMenuItemsByCategory } from "../../utils/menuCategories";
import AIMenuParserModal from "../../components/admin/ui/AIMenuParserModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import BulkActionBar from "../../components/admin/table/BulkActionBar";
import Pagination from "../../components/admin/table/Pagination";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import FoodDetailDrawer from "../../components/admin/menu/FoodDetailDrawer";
import BulkCategoryModal from "../../components/admin/menu/BulkCategoryModal";

const PAGE_SIZE = 12;

export default function AdminMenu() {
  const { notify } = useToast();

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'

  // Data states
  const [menuItems, setMenuItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, filter, sorting
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all"); // 'all' | 'available' | 'unavailable'
  const [sortField, setSortField] = useState("category"); // 'name' | 'category' | 'price' | 'status' | 'packages' | 'updatedAt'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);

  // Selection & Modals
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const customCats = menuItems
      .map((i) => i?.category?.trim())
      .filter((cat) => cat && !DEFAULT_FOOD_CATEGORIES.some((c) => c.toLowerCase() === cat.toLowerCase()));
    const uniqueCustom = [...new Set(customCats)].sort((a, b) => a.localeCompare(b));
    return ["all", ...DEFAULT_FOOD_CATEGORIES, ...uniqueCustom];
  }, [menuItems]);

  // Load Menu and Packages for usage cross-reference
  const loadData = async () => {
    setLoading(true);
    try {
      const [menuRes, pkgRes] = await Promise.all([
        AdminAPI.getMenu(),
        AdminAPI.getPackages().catch(() => ({ data: [] })),
      ]);
      setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
      setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : []);
    } catch {
      notify("Failed to load menu items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  // Map each dish (by ID and normalized name) to all packages that use it
  const packageUsageMap = useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => {
      // 1. pkg.menu_items
      (pkg.menu_items || []).forEach((m) => {
        const id = typeof m === "object" ? m?._id : m;
        if (id) {
          if (!map.has(id)) map.set(id, []);
          if (!map.get(id).some((p) => p._id === pkg._id)) {
            map.get(id).push(pkg);
          }
        }
        const name = typeof m === "object" ? m?.name?.trim().toLowerCase() : null;
        if (name) {
          if (!map.has(name)) map.set(name, []);
          if (!map.get(name).some((p) => p._id === pkg._id)) {
            map.get(name).push(pkg);
          }
        }
      });

      // 2. pkg.offer_food_items
      (pkg.offer_food_items || []).forEach((ofi) => {
        const name = ofi.item_name?.trim().toLowerCase();
        if (name) {
          if (!map.has(name)) map.set(name, []);
          if (!map.get(name).some((p) => p._id === pkg._id)) {
            map.get(name).push(pkg);
          }
        }
      });
    });
    return map;
  }, [packages]);

  const getAssociatedPackages = (item) => {
    if (!item) return [];
    const pkgsById = packageUsageMap.get(item._id) || [];
    const pkgsByName = item.name ? packageUsageMap.get(item.name.trim().toLowerCase()) || [] : [];
    const combined = [...pkgsById];
    pkgsByName.forEach((p) => {
      if (!combined.some((existing) => existing._id === p._id)) {
        combined.push(p);
      }
    });
    return combined;
  };


  // Filtered & Sorted items
  const filtered = useMemo(() => {
    let result = menuItems.filter((i) => {
      const matchSearch =
        !search ||
        (i.name && i.name.toLowerCase().includes(search.toLowerCase())) ||
        (i.description && i.description.toLowerCase().includes(search.toLowerCase())) ||
        (i.category && i.category.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        categoryFilter === "all" ||
        (i.category && i.category.toLowerCase() === categoryFilter.toLowerCase());

      const matchAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && i.available !== false) ||
        (availabilityFilter === "unavailable" && i.available === false);

      return matchSearch && matchCategory && matchAvailability;
    });

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortField === "status") {
        valA = a.available ? 1 : 0;
        valB = b.available ? 1 : 0;
        return sortOrder === "asc" ? valB - valA : valA - valB;
      } else if (sortField === "packages") {
        valA = getAssociatedPackages(a).length;
        valB = getAssociatedPackages(b).length;
        return sortOrder === "asc" ? valA - valB : valB - valA;
      } else if (sortField === "updatedAt") {
        valA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        valB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return sortOrder === "asc" ? valA - valB : valB - valA;
      } else {
        // category default
        return sortMenuItemsByCategory(result);
      }
    });

    if (sortField === "category") {
      return sortMenuItemsByCategory(result);
    }
    return result;
  }, [menuItems, search, categoryFilter, availabilityFilter, sortField, sortOrder, packageUsageMap]);

  // Pagination slice
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, categoryFilter, availabilityFilter]);

  // Actions
  const handleOpenModal = (item = null) => {
    setActiveItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveItem(null);
  };

  const handleDuplicate = async (item) => {
    try {
      const data = new FormData();
      data.append("name", `${item.name} (Copy)`);
      data.append("category", item.category || "Main Course");
      data.append("price", 0);
      data.append("description", item.description || "");
      data.append("available", item.available !== false);
      if (item.image_url) {
        data.append("image_url", item.image_url);
      }

      await AdminAPI.createMenu(data);
      notify(`Duplicated "${item.name}"`, "success");
      loadData();
    } catch {
      notify("Failed to duplicate item", "error");
    }
  };

  const handleToggleAvailability = async (item) => {
    const newStatus = !item.available;
    try {
      await AdminAPI.updateMenu(item._id, { available: newStatus });
      notify(`"${item.name}" is now marked as ${newStatus ? "available" : "unavailable"}`, "success");
      loadData();
      if (drawerItem && drawerItem._id === item._id) {
        setDrawerItem((prev) => (prev ? { ...prev, available: newStatus } : null));
      }
    } catch {
      notify("Failed to update status", "error");
    }
  };

  const handleDelete = (id) => {
    AdminAPI.deleteMenu(id)
      .then(() => {
        notify("Menu item deleted successfully", "success");
        setCancelTarget(null);
        if (drawerItem && drawerItem._id === id) setDrawerItem(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete menu item", "error"));
  };

  // Bulk operations
  const handleBulkAvailability = async (available) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => AdminAPI.updateMenu(id, { available }))
      );
      notify(
        `Updated ${selectedIds.length} items to ${available ? "available" : "unavailable"}`,
        "success"
      );
      setSelectedIds([]);
      loadData();
    } catch {
      notify("Failed to update selected items", "error");
    }
  };

  const handleBulkCategory = async (newCategory) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => AdminAPI.updateMenu(id, { category: newCategory }))
      );
      notify(`Changed category of ${selectedIds.length} items to "${newCategory}"`, "success");
      setSelectedIds([]);
      loadData();
    } catch {
      notify("Failed to update categories", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => AdminAPI.deleteMenu(id)));
      notify(`Deleted ${selectedIds.length} items successfully`, "success");
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      loadData();
    } catch {
      notify("Failed to delete selected items", "error");
    }
  };

  // Row actions generator
  const getRowActions = (item) => [
    {
      key: "edit",
      label: "Edit Item",
      icon: Edit3,
      onSelect: () => handleOpenModal(item),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: Copy,
      onSelect: () => handleDuplicate(item),
    },
    {
      key: "toggle",
      label: item.available ? "Set Unavailable" : "Set Available",
      icon: item.available ? XCircle : CheckCircle2,
      onSelect: () => handleToggleAvailability(item),
    },
    {
      key: "packages",
      label: `View Packages (${getAssociatedPackages(item).length})`,
      icon: Package,
      onSelect: () => setDrawerItem(item),
    },
    { divider: true },
    {
      key: "delete",
      label: "Delete Item",
      icon: Trash2,
      destructive: true,
      onSelect: () => setCancelTarget(item),
    },
  ];

  // Table Columns
  const columns = [
    {
      key: "thumbnail",
      header: "Photo",
      width: "56px",
      render: (row) =>
        row.image_url ? (
          <img
            src={row.image_url}
            alt={row.name}
            className="w-9 h-9 rounded-md object-cover border border-border/80 bg-muted/20"
          />
        ) : (
          <div className="w-9 h-9 rounded-md bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground/60">
            <Utensils size={14} />
          </div>
        ),
    },
    {
      key: "name",
      header: "Dish Name",
      render: (row) => (
        <div className="min-w-0 max-w-[260px]">
          <button
            type="button"
            onClick={() => setDrawerItem(row)}
            className="font-bold text-foreground text-left hover:text-primary transition-colors truncate block text-[13px] cursor-pointer"
          >
            {row.name}
          </button>
          {row.description && (
            <p className="text-[11.5px] text-muted-foreground truncate max-w-xs mt-0.5">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-block whitespace-nowrap">
          {row.category || "General"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge status={row.available ? "available" : "unavailable"} dot />
      ),
    },
    {
      key: "usage",
      header: "Package Usage",
      render: (row) => {
        const pkgs = getAssociatedPackages(row);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDrawerItem(row);
            }}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
              pkgs.length > 0
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "bg-muted text-muted-foreground/70"
            }`}
            title="Click to view associated packages"
          >
            <Package size={12} />
            <span>{pkgs.length} {pkgs.length === 1 ? "pkg" : "pkgs"}</span>
          </button>
        );
      },
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (row) => {
        const d = row.updatedAt || row.createdAt;
        return (
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {d
              ? new Date(d).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "48px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={getRowActions(row)} />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen pb-10">
        {/* Header Title & Main Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Food Menu Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage dishes, categories, and catering menu items.
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
              <Plus size={13} /> Add Food Item
            </Btn>
          </div>
        </div>

        {/* Bulk Action Bar (when items are selected) */}
        {selectedIds.length > 0 && (
          <BulkActionBar
            count={selectedIds.length}
            onClear={() => setSelectedIds([])}
            actions={[
              {
                key: "category",
                label: "Change Category",
                onSelect: () => setShowBulkCategoryModal(true),
              },
              {
                key: "mark-available",
                label: "Mark Available",
                onSelect: () => handleBulkAvailability(true),
              },
              {
                key: "mark-unavailable",
                label: "Mark Unavailable",
                onSelect: () => handleBulkAvailability(false),
              },
              {
                key: "delete",
                label: "Delete Selected",
                destructive: true,
                onSelect: () => setBulkDeleteConfirm(true),
              },
            ]}
          />
        )}

        {/* Toolbar & Filter Bar */}
        <AdminCard className="!p-3 sm:!p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-md px-3 py-1.5 flex-1 max-w-md shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <Search size={14} className="text-muted-foreground/70 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes, descriptions, categories..."
                className="bg-transparent text-xs sm:text-sm focus:outline-none flex-1 text-foreground"
                style={{ fontFamily: "var(--font-sans, Inter), sans-serif" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter and View Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Category select */}
              <div className="relative shrink-0 w-36 sm:w-44">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-muted/60 border border-border/70 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs capitalize"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="capitalize text-slate-800 bg-white">
                      {c === "all" ? "All Categories" : c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status select */}
              <div className="relative shrink-0 w-32 sm:w-36">
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full bg-muted/60 border border-border/70 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              {/* Sorting select */}
              <div className="relative shrink-0 w-36 sm:w-40">
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [f, o] = e.target.value.split("-");
                    setSortField(f);
                    setSortOrder(o);
                  }}
                  className="w-full bg-muted/60 border border-border/70 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  <option value="category-asc">Sort: Category</option>
                  <option value="name-asc">Sort: Name (A-Z)</option>
                  <option value="name-desc">Sort: Name (Z-A)</option>
                  <option value="packages-desc">Sort: Most Used in Pkgs</option>
                  <option value="updatedAt-desc">Sort: Recently Updated</option>
                </select>
              </div>

              {/* View Toggle: Table / Cards */}
              <div className="flex items-center border border-border/80 rounded-md p-0.5 bg-muted/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-primary shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Compact Table View"
                >
                  <List size={14} />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-primary shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Content View: Table vs Cards */}
        {loading ? (
          <div className="text-center py-16 bg-card rounded-lg border border-border/80">
            <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading menu items...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-lg border border-border/80 p-6">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Utensils size={20} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No menu items found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              {search || categoryFilter !== "all" || availabilityFilter !== "all"
                ? "Try adjusting your search terms or clearing filters."
                : "Get started by adding your first catering dish or importing with AI."}
            </p>
            {(search || categoryFilter !== "all" || availabilityFilter !== "all") && (
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setAvailabilityFilter("all");
                }}
              >
                Clear all filters
              </Btn>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-card rounded-lg border border-border/80 shadow-2xs overflow-hidden">
            <DataTable
              columns={columns}
              rows={paginatedItems}
              getRowId={(row) => row._id}
              selectable={true}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              onRowClick={(row) => setDrawerItem(row)}
              minWidth="760px"
              pinLastColumn={true}
            />

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={totalItems}
              pageSize={PAGE_SIZE}
              shownCount={paginatedItems.length}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          /* Card Grid View (for browsing) */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedItems.map((item) => {
                const pkgs = getAssociatedPackages(item);
                return (
                  <AdminCard
                    key={item._id}
                    className="!p-0 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => setDrawerItem(item)}
                  >
                    {item.image_url ? (
                      <div className="w-full h-44 bg-muted/40 overflow-hidden relative">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <Badge status={item.available ? "available" : "unavailable"} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-44 bg-muted/30 flex items-center justify-center text-muted-foreground/60 relative">
                        <Utensils size={28} />
                        <div className="absolute top-2.5 right-2.5">
                          <Badge status={item.available ? "available" : "unavailable"} />
                        </div>
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-foreground leading-snug text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80 uppercase tracking-wider">
                            {item.category || "General"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {item.description || "No description provided."}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/60 flex items-center justify-between mt-auto">
                        <span
                          className="text-[11px] font-medium text-primary flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerItem(item);
                          }}
                        >
                          <Package size={12} />
                          {pkgs.length} {pkgs.length === 1 ? "package" : "packages"}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <RowActionsMenu actions={getRowActions(item)} />
                        </div>
                      </div>
                    </div>
                  </AdminCard>
                );
              })}
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={totalItems}
              pageSize={PAGE_SIZE}
              shownCount={paginatedItems.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ============ MODALS & DRAWERS ============ */}
      {showAIModal && (
        <AIMenuParserModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onBulkSuccess={() => {
            loadData();
          }}
        />
      )}

      {showModal && (
        <MenuModal
          item={activeItem}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {/* Progressive Disclosure Detail Drawer */}
      <FoodDetailDrawer
        item={drawerItem}
        open={Boolean(drawerItem)}
        onOpenChange={(open) => !open && setDrawerItem(null)}
        associatedPackages={drawerItem ? getAssociatedPackages(drawerItem) : []}
        onEdit={(item) => handleOpenModal(item)}
        onDuplicate={(item) => handleDuplicate(item)}
        onToggleAvailability={(item) => handleToggleAvailability(item)}
        onDelete={(item) => setCancelTarget(item)}
      />

      {/* Bulk Category Modal */}
      <BulkCategoryModal
        isOpen={showBulkCategoryModal}
        onClose={() => setShowBulkCategoryModal(false)}
        selectedCount={selectedIds.length}
        onConfirm={handleBulkCategory}
        availableCategories={DEFAULT_FOOD_CATEGORIES}
      />

      {/* Single Delete Confirmation */}
      {cancelTarget && (
        <ConfirmDialog
          title="Delete Food Menu Item"
          message={`Are you sure you want to delete "${cancelTarget.name}"?${
            getAssociatedPackages(cancelTarget).length > 0
              ? ` Note: This dish is currently used in ${getAssociatedPackages(cancelTarget).length} package(s).`
              : ""
          } This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete Dish"
          confirmVariant="danger"
        />
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeleteConfirm && (
        <ConfirmDialog
          title="Delete Selected Items"
          message={`Are you sure you want to delete all ${selectedIds.length} selected dishes? This action cannot be undone.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteConfirm(false)}
          confirmText={`Delete ${selectedIds.length} Dishes`}
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}