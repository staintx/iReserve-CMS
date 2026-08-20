import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Users,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import PackageModal from "../../components/admin/ui/PackageModal";
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
      "Fixed combo meals. Each one serves a set number of guests at a set price per pax, and the food that comes with it is decided here.",
    cta: "New Combo",
    empty: "Create your first combo pack to get started",
  },
];

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
          : "Set a guest count so this combo can be booked",
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
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2
              style={{ fontFamily: "Playfair Display, serif" }}
              className="text-2xl font-bold text-foreground"
            >
              {activeTab.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{activeTab.blurb}</p>
          </div>
          {/* Creating from a tab opens the form already set to that type, so an
              admin never has to restate what they were just looking at. */}
          <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
            <Plus size={13} /> {activeTab.cta}
          </Btn>
        </div>

        {/* ============ TABS ============ */}
        <div
          className="flex items-center gap-1 border-b border-gray-200"
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
                {isOffer && <Sparkles size={14} />}
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
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-md">
              <Search size={14} className="text-muted-foreground/70 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isOfferTab
                    ? "Search combos by name..."
                    : "Search packages by name..."
                }
                className="bg-transparent text-sm focus:outline-none flex-1"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                hasActiveFilters || showFilters
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600 font-medium"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
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
                const food = offer ? offerFoodItems(pkg) : [];

                return (
                  <AdminCard
                    key={pkg._id}
                    // An offer reads as an offer at a glance: a warm border and
                    // a tinted ground against the neutral package cards. Same
                    // card, same actions — the distinction is deliberate rather
                    // than a separate screen.
                    className={`!p-5 transition-all duration-200 group ${
                      offer
                        ? "border-amber-200 bg-gradient-to-b from-amber-50/60 to-white hover:border-amber-400 hover:shadow-md"
                        : "hover:shadow-md hover:border-primary/30"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground truncate">
                          {pkg.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground font-mono">
                            #{pkg._id.substring(pkg._id.length - 6).toUpperCase()}
                          </p>
                          {pkg.event_type && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {pkg.event_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge status={pkg.available ? "available" : "unavailable"} />
                    </div>

                    {/* Package Image */}
                    {pkg.image_url && (
                      <div className="w-full h-36 mb-3 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    {/* Type badges */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {offer ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white">
                          <Sparkles size={11} /> Combo Pack
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          Event Setup
                        </span>
                      )}
                      {/* A combo without a guest count cannot be booked, so the
                          gap is named rather than left blank. */}
                      {offer && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            pax
                              ? "bg-white text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-600 border-red-200"
                          }`}
                        >
                          <Users size={11} />{" "}
                          {pax ? `Serves ${pax} guests` : "No guest count set"}
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="mb-3">
                      <p
                        className={`text-lg font-bold ${
                          offer ? "text-amber-700" : "text-foreground"
                        }`}
                      >
                        {price.headline}
                      </p>
                      {price.detail && (
                        <p className="text-xs text-gray-500 mt-0.5">{price.detail}</p>
                      )}
                    </div>

                    {/* What the customer gets: the dishes for a combo, the
                        inclusion list for a regular package. */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                        {offer ? "Food" : "Inclusions"}
                      </p>
                      <ul className="space-y-1 mb-4 h-24 overflow-y-auto">
                        {offer ? (
                          food.length > 0 ? (
                            food.map((item, i) => (
                              <li
                                key={i}
                                className="text-sm text-foreground flex items-center gap-2 truncate"
                                title={
                                  item.menu_category
                                    ? `${item.menu_category} — ${item.item_name}`
                                    : item.item_name
                                }
                              >
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                                <span className="truncate">
                                  {item.item_name}
                                  {item.menu_category ? (
                                    <span className="text-gray-400">
                                      {" "}
                                      · {item.menu_category}
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="text-sm text-gray-400 italic">
                              No food items configured yet
                            </li>
                          )
                        ) : (
                          <>
                            {(pkg.inclusions || []).slice(0, 4).map((inc, i) => (
                              <li
                                key={i}
                                className="text-sm text-foreground flex items-center gap-2 truncate"
                                title={inc}
                              >
                                <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                                <span className="truncate">{inc}</span>
                              </li>
                            ))}
                            {(pkg.inclusions || []).length > 4 && (
                              <li className="text-xs text-gray-400 italic">
                                +{pkg.inclusions.length - 4} more items
                              </li>
                            )}
                            {(pkg.inclusions || []).length === 0 && (
                              <li className="text-sm text-gray-400 italic">
                                No inclusions specified
                              </li>
                            )}
                          </>
                        )}
                      </ul>
                    </div>

                    {/* Card Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <Btn
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => handleOpenModal(pkg)}
                      >
                        <Edit3 size={13} /> Edit
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
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {isOfferTab ? (
                  <Sparkles size={24} className="text-amber-500" />
                ) : (
                  <Search size={24} className="text-gray-400" />
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
      {showModal && (
        <PackageModal
          pkg={activePkg}
          // An existing package keeps its own type; a new one starts as
          // whichever tab the admin was on.
          defaultOfferType={activeTab.id}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
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
