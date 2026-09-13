import React, { useState, useEffect, useMemo } from "react";
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
// One list for the whole product: the booking wizard offers these, and the
// Quotation Builder corrects into the same set.
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

/**
 * Regular packages and Special Offers are the same kind of record, managed in
 * the same place. The tabs separate them so each list is about one thing, and
 * so the create action can open the form already set to the type the admin was
 * looking at.
 */
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

function getRegularPackageCategories(pkg) {
  const categoriesMap = new Map();

  const addCategoryCount = (catName, count = 1) => {
    const cleanCat = String(catName || "").trim() || "Inclusions";
    categoriesMap.set(cleanCat, (categoriesMap.get(cleanCat) || 0) + count);
  };

  // 1. Process inclusions array (e.g. "[Event Setup & Furniture] Stage Setup", etc.)
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
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(OFFER_TYPES.REGULAR);

  // Filter states
  const [filters, setFilters] = useState({
    event_type: "",
    available: "", // "true", "false", or ""
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

  const handleOpenModal = (pkg = null) => {
    setActivePkg(pkg);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActivePkg(null);
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
          "error",
        ),
      );
  };

  const clearFilters = () => {
    setFilters({ event_type: "", available: "" });
  };

  const hasActiveFilters = filters.event_type || filters.available;

  const activeTab = TABS.find((entry) => entry.id === tab) || TABS[0];
  const isOfferTab = activeTab.id === OFFER_TYPES.SPECIAL;

  // Packages written before Special Offers existed carry no offer_type, so
  // "regular" is everything that is not explicitly an offer.
  const inTab = useMemo(
    () =>
      packages.filter((pkg) =>
        isOfferTab ? isSpecialOffer(pkg) : !isSpecialOffer(pkg),
      ),
    [packages, isOfferTab],
  );

  const tabCounts = useMemo(
    () => ({
      [OFFER_TYPES.REGULAR]: packages.filter((pkg) => !isSpecialOffer(pkg)).length,
      [OFFER_TYPES.SPECIAL]: packages.filter(isSpecialOffer).length,
    }),
    [packages],
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

  const fmt = (n) =>
    "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  /**
   * The one line that says what this package costs. A combo is priced per pax
   * against its own guest count; a regular package is priced by the scaffold
   * size the customer picks.
   */
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
        // The combo's real food price, because "₱350 / pax" alone is the one
        // number an admin is most likely to read as the total.
        detail: pax
          ? `${fmt(offerBaseFoodPrice(pkg))} for ${pax} guests — set-up and extras quoted separately`
          : "Set-up and extras quoted separately",
      };
    }
    if (pkg.setup_price) {
      return { headline: fmt(pkg.setup_price), detail: "Base setup fee" };
    }
    // Scaffold sizes carry no price, so a package with only sizes configured
    // has no figure to show. Saying so beats printing a ₱0 nobody set.
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

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {activeTab.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activeTab.blurb}</p>
          </div>
          {/* Creating from a tab opens the form already set to that type */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-powder border border-primary/20 shadow-2xs hover:bg-powder/80 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles size={13} className="text-primary" />
              <span>Import with Zelle AI</span>
            </button>
            <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <Plus size={13} /> {activeTab.cta}
            </Btn>
          </div>
        </div>

        {/* ============ TABS ============ */}
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
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selected
                    ? isOffer
                      ? "border-amber-500 text-amber-700"
                      : "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {isOffer && <Tag size={14} />}
                {entry.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    selected
                      ? isOffer
                        ? "bg-amber-100 text-amber-700"
                        : "bg-primary/10 text-primary"
                      : "bg-gray-100 text-gray-500"
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
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 flex-1 max-w-md shadow-2xs">
              <Search size={14} className="text-muted-foreground/70 flex-shrink-0" />
              <input
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
                  onClick={() => setSearch("")}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors border cursor-pointer shadow-2xs ${
                hasActiveFilters || showFilters
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={14} />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
              <ChevronDown
                size={14}
                className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>

            {/* Active Filter Count */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm text-red-500 hover:text-red-600 font-semibold cursor-pointer"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl shadow-lg">
              {/* Event Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Event Type
                </label>
                <select
                  value={filters.event_type}
                  onChange={(e) =>
                    setFilters({ ...filters, event_type: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
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
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                  Availability
                </label>
                <select
                  value={filters.available}
                  onChange={(e) =>
                    setFilters({ ...filters, available: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {!loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                Showing{" "}
                <strong className="text-foreground">{filteredPackages.length}</strong>{" "}
                of <strong className="text-foreground">{inTab.length}</strong>{" "}
                {isOfferTab ? "combos" : "packages"}
              </span>
              {hasActiveFilters && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Filtered
                </span>
              )}
            </div>
          )}

          {/* Packages Grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-gray-500">Loading packages...</p>
            </div>
          ) : filteredPackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPackages.map((pkg) => {
                const offer = isSpecialOffer(pkg);
                const price = priceLine(pkg);
                const pax = offer ? offerGuestCount(pkg) : null;
                const offerCategories = offer ? offerFoodByCategory(pkg) : [];
                const regularCategories = !offer ? getRegularPackageCategories(pkg) : [];

                return (
                  <AdminCard
                    key={pkg._id}
                    className={`!p-5 transition-all duration-200 group flex flex-col justify-between ${
                      offer
                        ? "border-amber-200 bg-gradient-to-b from-amber-50/60 to-white hover:border-amber-400 hover:shadow-md"
                        : "hover:shadow-md hover:border-primary/30"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-foreground truncate text-base">
                            {pkg.name}
                          </h3>
                        </div>
                        <Badge status={pkg.available ? "available" : "unavailable"} />
                      </div>

                      {/* Package Image */}
                      {pkg.image_url && (
                        <div className="w-full h-36 mb-3 rounded-md overflow-hidden bg-gray-100 border border-slate-200/60">
                          <img
                            src={pkg.image_url}
                            alt={pkg.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {/* Type badges (for regular packages only) */}
                      {!offer && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            Event Setup
                          </span>
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="mb-3">
                        <p
                          className={`text-lg font-bold ${
                            offer ? "text-amber-700" : "text-foreground"
                          }`}
                        >
                          {price.headline}
                        </p>
                        {!offer && price.detail && (
                          <p className="text-xs text-gray-500 mt-0.5">{price.detail}</p>
                        )}
                      </div>

                      {/* Category Summary */}
                      <div>
                        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                          CATEGORIES
                        </p>
                        {offer ? (
                          offerCategories.length > 0 ? (
                            <ul className="space-y-1.5 mb-4">
                              {offerCategories.map((cat, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-foreground flex items-center gap-2 truncate"
                                >
                                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                                  <span className="font-medium text-slate-800">
                                    {cat.category || "Included"}
                                  </span>
                                  <span className="text-slate-400 font-normal">
                                    — {cat.items.length} {cat.items.length === 1 ? "item" : "items"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-400 italic mb-4">
                              No food categories configured yet
                            </p>
                          )
                        ) : (
                          regularCategories.length > 0 ? (
                            <ul className="space-y-1.5 mb-4">
                              {regularCategories.map((cat, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-foreground flex items-center gap-2 truncate"
                                >
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                                  <span className="font-medium text-slate-800">
                                    {cat.category}
                                  </span>
                                  <span className="text-slate-400 font-normal">
                                    — {cat.count} {cat.count === 1 ? "item" : "items"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-400 italic mb-4">
                              No categories configured yet
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                      <Btn
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => handleOpenModal(pkg)}
                      >
                        <Eye size={13} /> View Package
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setCancelTarget(pkg)}
                      >
                        <Trash2 size={13} />
                      </Btn>
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 bg-card rounded-lg border border-border/80 p-4">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                {isOfferTab ? (
                  <Tag size={20} className="text-amber-500" />
                ) : (
                  <Search size={20} className="text-muted-foreground" />
                )}
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">
                {isOfferTab ? "No combos found" : "No packages found"}
              </h3>
              <p className="text-sm text-gray-500">
                {hasActiveFilters || search
                  ? "Try adjusting your filters or search criteria"
                  : activeTab.empty}
              </p>
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
          // An existing package keeps its own type; a new one starts as
          // whichever tab the admin was on.
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
