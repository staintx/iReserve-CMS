import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Users,
  Tag,
  LayoutGrid,
  List,
  Copy,
  CheckCircle2,
  XCircle,
  Package as PackageIcon,
  Utensils,
  Layers,
  Calendar,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import PackageModal from "../../components/admin/ui/PackageModal";
import AIPackageParserModal from "../../components/admin/ui/AIPackageParserModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/admin/table/DataTable";
import Pagination from "../../components/admin/table/Pagination";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import { EVENT_TYPES } from "../../lib/eventTypes";
import {
  OFFER_TYPES,
  isSpecialOffer,
  offerGuestCount,
  offerPricePerPax,
  offerBaseFoodPrice,
  offerFoodItems,
  offerFoodByCategory,
} from "../../lib/specialOffers";

const TABS = [
  {
    id: OFFER_TYPES.REGULAR,
    label: "Regular Packages",
    title: "Event Setup Packages",
    blurb: "Manage your event setup packages, equipment, and scaffold options.",
    cta: "New Package",
    empty: "Create your first package to get started",
  },
  {
    id: OFFER_TYPES.SPECIAL,
    label: "Special Offers",
    title: "Combo Packs",
    blurb:
      "Combo meals with set servings and per pax pricing, suitable for various events and occasions.",
    cta: "New Combo",
    empty: "Create your first combo pack to get started",
  },
];

const PAGE_SIZE = 12;

function getRegularPackageCategories(pkg) {
  const categoriesMap = new Map();

  const addCategoryCount = (catName, count = 1) => {
    const cleanCat = String(catName || "").trim() || "Inclusions";
    categoriesMap.set(cleanCat, (categoriesMap.get(cleanCat) || 0) + count);
  };

  // 1. Process inclusions array
  if (Array.isArray(pkg?.inclusions)) {
    pkg.inclusions.forEach((inc) => {
      if (!inc || typeof inc !== "string") return;
      const match = inc.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
      if (match && match[1]) {
        addCategoryCount(match[1]);
      } else if (inc.trim()) {
        addCategoryCount("Inclusions");
      }
    });
  }

  // 2. Process offer_food_items / menu_items if present
  if (Array.isArray(pkg?.offer_food_items) && pkg.offer_food_items.length > 0) {
    pkg.offer_food_items.forEach((item) => {
      const cat = item?.menu_category || "Food";
      addCategoryCount(cat);
    });
  } else if (Array.isArray(pkg?.menu_items) && pkg.menu_items.length > 0) {
    pkg.menu_items.forEach((item) => {
      const cat = typeof item === "object" ? (item?.menu_category || item?.category || "Food") : "Food";
      addCategoryCount(cat);
    });
  }

  return Array.from(categoriesMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}

export default function AdminPackages() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(OFFER_TYPES.REGULAR);
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [filters, setFilters] = useState({
    event_type: "",
    available: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activePkg, setActivePkg] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getPackages()
      .then((res) => setPackages(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load packages", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  // Automatically select tab and open package modal if ?id=... or ?tab=... is present
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab === OFFER_TYPES.SPECIAL || paramTab === OFFER_TYPES.REGULAR) {
      setTab(paramTab);
    }
    const paramId = searchParams.get("id");
    if (paramId && packages.length > 0) {
      const target = packages.find((p) => p._id === paramId);
      if (target) {
        if (target.offer_type === "special") {
          setTab(OFFER_TYPES.SPECIAL);
        } else {
          setTab(OFFER_TYPES.REGULAR);
        }
        setActivePkg(target);
        setShowModal(true);
      }
    }
  }, [packages, searchParams]);

  const handleOpenModal = (pkg = null) => {
    setActivePkg(pkg);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActivePkg(null);
    if (searchParams.get("id")) {
      const next = new URLSearchParams(searchParams);
      next.delete("id");
      setSearchParams(next, { replace: true });
    }
  };

  const handleDuplicate = async (pkg) => {
    try {
      const cloned = {
        ...pkg,
        name: `${pkg.name} (Copy)`,
      };
      delete cloned._id;
      delete cloned.createdAt;
      delete cloned.updatedAt;
      await AdminAPI.createPackage(cloned);
      notify(`Duplicated "${pkg.name}" successfully`, "success");
      loadData();
    } catch {
      notify("Failed to duplicate package", "error");
    }
  };

  const handleToggleAvailability = async (pkg) => {
    try {
      const newStatus = !pkg.available;
      await AdminAPI.updatePackage(pkg._id, { available: newStatus });
      notify(`"${pkg.name}" is now ${newStatus ? "available" : "unavailable"}`, "success");
      loadData();
    } catch {
      notify("Failed to update status", "error");
    }
  };

  const handleDelete = (id) => {
    AdminAPI.deletePackage(id)
      .then(() => {
        notify("Package deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch((err) =>
        notify(
          err.response?.data?.message || "Failed to delete package",
          "error"
        )
      );
  };

  const clearFilters = () => {
    setFilters({ event_type: "", available: "" });
  };

  const hasActiveFilters = filters.event_type || filters.available;

  const activeTab = TABS.find((entry) => entry.id === tab) || TABS[0];
  const isOfferTab = activeTab.id === OFFER_TYPES.SPECIAL;

  const inTab = useMemo(
    () =>
      packages.filter((pkg) =>
        isOfferTab ? isSpecialOffer(pkg) : !isSpecialOffer(pkg)
      ),
    [packages, isOfferTab]
  );

  const tabCounts = useMemo(
    () => ({
      [OFFER_TYPES.REGULAR]: packages.filter((pkg) => !isSpecialOffer(pkg)).length,
      [OFFER_TYPES.SPECIAL]: packages.filter(isSpecialOffer).length,
    }),
    [packages]
  );

  const filteredPackages = useMemo(() => {
    return inTab.filter((pkg) => {
      if (
        search &&
        !String(pkg.name || "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (filters.event_type && pkg.event_type !== filters.event_type) {
        return false;
      }
      if (filters.available === "true" && !pkg.available) {
        return false;
      }
      if (filters.available === "false" && pkg.available) {
        return false;
      }
      return true;
    });
  }, [inTab, search, filters]);

  // Reset page when tab/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tab, search, filters]);

  const totalItems = filteredPackages.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPackages.slice(start, start + PAGE_SIZE);
  }, [filteredPackages, currentPage]);

  const fmt = (n) =>
    "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const priceLine = (pkg) => {
    if (isSpecialOffer(pkg)) {
      const perPax = offerPricePerPax(pkg);
      const pax = offerGuestCount(pkg);
      if (!perPax) {
        return {
          headline: "Price not set",
          detail: "Set a price per pax so this combo can be booked",
        };
      }
      return {
        headline: `${fmt(perPax)} / pax`,
        detail: pax
          ? `${fmt(offerBaseFoodPrice(pkg))} for ${pax} guests`
          : "Set-up and extras quoted separately",
      };
    }
    const validScaffoldPrices = (pkg.scaffold_size_options || [])
      .map((o) => Number(o.price || 0))
      .filter((p) => p > 0);

    if (validScaffoldPrices.length > 0) {
      const minPrice = Math.min(...validScaffoldPrices);
      const maxPrice = Math.max(...validScaffoldPrices);
      const headline =
        minPrice === maxPrice
          ? fmt(minPrice)
          : `From ${fmt(minPrice)}`;
      return {
        headline,
        detail: `${pkg.scaffold_size_options.length} scaffold size${
          pkg.scaffold_size_options.length > 1 ? "s" : ""
        } configured`,
      };
    }

    if (pkg.setup_price) {
      return { headline: fmt(pkg.setup_price), detail: "Base setup fee" };
    }
    if (pkg.scaffold_size_options?.length > 0) {
      return {
        headline: "Priced on quotation",
        detail: `${pkg.scaffold_size_options.length} size${
          pkg.scaffold_size_options.length > 1 ? "s" : ""
        } configured`,
      };
    }
    return { headline: "Setup Package", detail: null };
  };

  // Helper to count dishes and addons
  const getPackageMetrics = (pkg) => {
    const offer = isSpecialOffer(pkg);
    const dishCount = offer
      ? (pkg.offer_food_items || []).length
      : (pkg.menu_items || []).length;
    const addonCount = (pkg.add_ons || []).length + (pkg.setup_equipment || []).length;
    return { dishCount, addonCount };
  };

  // Row actions for three-dot menu
  const getRowActions = (pkg) => [
    {
      key: "edit",
      label: "Edit Package",
      icon: Eye,
      onSelect: () => handleOpenModal(pkg),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: Copy,
      onSelect: () => handleDuplicate(pkg),
    },
    {
      key: "toggle",
      label: pkg.available ? "Set Unavailable" : "Set Available",
      icon: pkg.available ? XCircle : CheckCircle2,
      onSelect: () => handleToggleAvailability(pkg),
    },
    { divider: true },
    {
      key: "delete",
      label: "Delete Package",
      icon: Trash2,
      destructive: true,
      onSelect: () => setCancelTarget(pkg),
    },
  ];

  // Table columns for Table View
  const tableColumns = [
    {
      key: "thumbnail",
      header: "Photo",
      width: "56px",
      render: (pkg) =>
        pkg.image_url ? (
          <img
            src={pkg.image_url}
            alt={pkg.name}
            className="w-10 h-8 rounded-md object-cover border border-border/70"
          />
        ) : (
          <div className="w-10 h-8 rounded-md bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground/60">
            <PackageIcon size={14} />
          </div>
        ),
    },
    {
      key: "name",
      header: "Package Name",
      render: (pkg) => (
        <div className="min-w-0 max-w-[280px]">
          <button
            type="button"
            onClick={() => handleOpenModal(pkg)}
            className="font-bold text-foreground text-left hover:text-primary transition-colors truncate block text-[13px] cursor-pointer"
          >
            {pkg.name}
          </button>
          <span className="text-[11px] text-muted-foreground block truncate">
            {pkg.description || "No description"}
          </span>
        </div>
      ),
    },
    {
      key: "eventType",
      header: "Event Type",
      render: (pkg) => (
        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {pkg.event_type || "All Events"}
        </span>
      ),
    },
    {
      key: "dishes",
      header: "Dishes Included",
      render: (pkg) => {
        const { dishCount } = getPackageMetrics(pkg);
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums">
            <Utensils size={13} className="text-primary" />
            {dishCount} {dishCount === 1 ? "dish" : "dishes"}
          </span>
        );
      },
    },
    {
      key: "addons",
      header: "Add-ons / Setup",
      render: (pkg) => {
        const { addonCount } = getPackageMetrics(pkg);
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground tabular-nums">
            <Layers size={13} className="text-slate-500" />
            {addonCount} {addonCount === 1 ? "item" : "items"}
          </span>
        );
      },
    },
    {
      key: "pricing",
      header: "Pricing",
      render: (pkg) => {
        const p = priceLine(pkg);
        return (
          <div>
            <p className="font-bold text-foreground text-xs">{p.headline}</p>
            {p.detail && <p className="text-[10.5px] text-muted-foreground">{p.detail}</p>}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (pkg) => <Badge status={pkg.available ? "available" : "unavailable"} dot />,
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      render: (pkg) => {
        const d = pkg.updatedAt || pkg.createdAt;
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
      render: (pkg) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={getRowActions(pkg)} />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen pb-10">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {activeTab.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activeTab.blurb}</p>
          </div>
          {/* Action buttons */}
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
              <Plus size={13} /> {activeTab.cta}
            </Btn>
          </div>
        </div>

        {/* ============ TABS (Cool SaaS Blue Accent) ============ */}
        <div
          className="flex items-center gap-1 border-b border-border/80"
          role="tablist"
          aria-label="Package type"
        >
          {TABS.map((entry) => {
            const selected = entry.id === activeTab.id;
            const isOffer = entry.id === OFFER_TYPES.SPECIAL;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setTab(entry.id);
                  setSearch("");
                  clearFilters();
                }}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  selected
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {isOffer ? <Tag size={14} /> : <PackageIcon size={14} />}
                {entry.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tabCounts[entry.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {/* Search & Filters Bar */}
          <AdminCard className="!p-3 sm:!p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-md px-3 py-1.5 flex-1 max-w-md shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                <Search size={14} className="text-muted-foreground/70 shrink-0" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isOfferTab
                      ? "Search combos by name..."
                      : "Search packages by name..."
                  }
                  className="bg-transparent text-xs sm:text-sm focus:outline-none flex-1 text-foreground"
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

              {/* Filter Controls & View Switcher */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border cursor-pointer shadow-2xs ${
                    hasActiveFilters || showFilters
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/60 border-border/70 text-foreground hover:bg-muted"
                  }`}
                >
                  <Filter size={13} />
                  <span>Filters</span>
                  {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                  >
                    <X size={13} /> Clear
                  </button>
                )}

                {/* View Switcher: Cards vs Table */}
                <div className="flex items-center border border-border/80 rounded-md p-0.5 bg-muted/60 shrink-0">
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
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="pt-3 border-t border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {/* Event Type Filter */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Event Type
                  </label>
                  <select
                    value={filters.event_type}
                    onChange={(e) =>
                      setFilters({ ...filters, event_type: e.target.value })
                    }
                    className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Event Types</option>
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Availability
                  </label>
                  <select
                    value={filters.available}
                    onChange={(e) =>
                      setFilters({ ...filters, available: e.target.value })
                    }
                    className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Status</option>
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>
            )}
          </AdminCard>

          {/* Results Count */}
          {!loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{filteredPackages.length}</strong>{" "}
                of <strong className="text-foreground">{inTab.length}</strong>{" "}
                {isOfferTab ? "combos" : "packages"}
              </span>
              {hasActiveFilters && (
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                  Filtered
                </span>
              )}
            </div>
          )}

          {/* Content Views */}
          {loading ? (
            <div className="text-center py-16 bg-card rounded-lg border border-border/80">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-muted-foreground">Loading packages...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border/80 p-6">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                {isOfferTab ? <Tag size={20} /> : <PackageIcon size={20} />}
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {isOfferTab ? "No combos found" : "No packages found"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters || search
                  ? "Try adjusting your filters or search criteria"
                  : activeTab.empty}
              </p>
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div className="bg-card rounded-lg border border-border/80 shadow-2xs overflow-hidden">
              <DataTable
                columns={tableColumns}
                rows={paginatedPackages}
                getRowId={(pkg) => pkg._id}
                onRowClick={(pkg) => handleOpenModal(pkg)}
                minWidth="840px"
                pinLastColumn={true}
              />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={totalItems}
                pageSize={PAGE_SIZE}
                shownCount={paginatedPackages.length}
                onPageChange={setCurrentPage}
              />
            </div>
          ) : (
            /* Card Grid View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedPackages.map((pkg) => {
                  const offer = isSpecialOffer(pkg);
                  const price = priceLine(pkg);
                  const offerCategories = offer ? offerFoodByCategory(pkg) : [];
                  const regularCategories = !offer ? getRegularPackageCategories(pkg) : [];

                  return (
                    <AdminCard
                      key={pkg._id}
                      className="!p-5 transition-all duration-200 group flex flex-col justify-between hover:shadow-md hover:border-primary/40 border border-border/80 bg-card cursor-pointer"
                      onClick={() => handleOpenModal(pkg)}
                    >
                      <div>
                        {/* Card Header with Three-Dot Actions */}
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-foreground truncate text-base group-hover:text-primary transition-colors">
                              {pkg.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Badge status={pkg.available ? "available" : "unavailable"} dot />
                            <RowActionsMenu actions={getRowActions(pkg)} />
                          </div>
                        </div>

                        {/* Package Image */}
                        {pkg.image_url ? (
                          <div className="w-full h-36 mb-3 rounded-md overflow-hidden bg-muted/30 border border-border/70 relative">
                            <img
                              src={pkg.image_url}
                              alt={pkg.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 mb-3 rounded-md border border-dashed border-border/80 bg-muted/20 flex items-center justify-center text-muted-foreground/60">
                            <PackageIcon size={24} />
                          </div>
                        )}

                        {/* Event type badge if present */}
                        {pkg.event_type && (
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">
                              {pkg.event_type}
                            </span>
                          </div>
                        )}

                        {/* Pricing */}
                        <div className="mb-3 p-2.5 rounded-md bg-muted/40 border border-border/60">
                          <p className="text-base font-bold text-foreground">
                            {price.headline}
                          </p>
                          {price.detail && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{price.detail}</p>
                          )}
                        </div>

                        {/* Category Summary */}
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                            CATEGORIES INCLUDED
                          </p>
                          {offer ? (
                            offerCategories.length > 0 ? (
                              <ul className="space-y-1 mb-2">
                                {offerCategories.slice(0, 3).map((cat, i) => (
                                 <li
                                    key={i}
                                    className="text-xs text-foreground flex items-center gap-2 truncate"
                                  >
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                                    <span className="font-medium text-slate-800">
                                      {cat.category || "Included"}
                                    </span>
                                    <span className="text-slate-400 font-normal">
                                      — {cat.items.length} {cat.items.length === 1 ? "item" : "items"}
                                    </span>
                                  </li>
                                ))}
                                {offerCategories.length > 3 && (
                                  <li className="text-[11px] text-muted-foreground italic">
                                    +{offerCategories.length - 3} more categories
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground italic mb-2">
                                No food categories configured yet
                              </p>
                            )
                          ) : (
                            regularCategories.length > 0 ? (
                              <ul className="space-y-1 mb-2">
                                {regularCategories.slice(0, 3).map((cat, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-foreground flex items-center gap-2 truncate"
                                  >
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                                    <span className="font-medium text-slate-800">
                                      {cat.category}
                                    </span>
                                    <span className="text-slate-400 font-normal">
                                      — {cat.count} {cat.count === 1 ? "item" : "items"}
                                    </span>
                                  </li>
                                ))}
                                {regularCategories.length > 3 && (
                                  <li className="text-[11px] text-muted-foreground italic">
                                    +{regularCategories.length - 3} more items
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground italic mb-2">
                                No setup categories configured yet
                              </p>
                            )
                          )}
                        </div>
                      </div>

                      {/* Card Bottom CTA */}
                      <div className="pt-3 border-t border-border/70 flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
                          <Eye size={13} /> View Builder
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString() : ""}
                        </span>
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
                shownCount={paginatedPackages.length}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ============ MODALS ============ */}
      {showAIModal && (
        <AIPackageParserModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          offerType={activeTab.id}
          standalone={true}
          onBulkSuccess={() => {
            loadData();
          }}
        />
      )}

      {showModal && (
        <PackageModal
          pkg={activePkg}
          defaultOfferType={activeTab.id}
          onClose={handleCloseModal}
          onSave={(keepOpen, updatedPkg) => {
            loadData();
            if (!keepOpen) {
              handleCloseModal();
            } else if (updatedPkg) {
              setActivePkg(updatedPkg);
            }
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title={
            isSpecialOffer(cancelTarget) ? "Delete Combo" : "Delete Package"
          }
          message={`Are you sure you want to delete "${cancelTarget.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}
