import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Search, Plus, ChevronRight, ChevronLeft, User, CalendarDays,
  Utensils, Package, Box, CreditCard, CheckCircle2, AlertCircle,
  Loader2, Check, Minus, Users, Phone, Mail, ShoppingCart, Sliders, Sparkles,
} from "lucide-react";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import { isSpecialOffer, offerGuestCount, offerPricePerPax } from "../../../lib/specialOffers";
import {
  SERVICE_TYPES,
  VENUE_TYPES,
  OTHER_VENUE_TYPE,
} from "../../../pages/customer/booking/lib/bookingRules";
import { EVENT_TYPES, OTHER_EVENT_TYPE } from "../../../lib/eventTypes";
import {
  BATANGAS_PROVINCE,
  getBatangasBarangays,
  getBatangasMunicipalities,
} from "../../../utils/batangas";
import { formatCurrency } from "../../../utils/format";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = ["Booking Setup", "Event & Services", "Review & Payment"];

const SERVICE_TYPE_OPTIONS = [
  { value: "food_only",  label: "Food Only",          description: "Menu & catering services without event setup or styling", icon: Utensils },
  { value: "event_only", label: "Event Setup Only",   description: "Planning, setup & decor without food catering services", icon: Box },
  { value: "food_event", label: "Food & Event Setup", description: "Complete catering & full event styling services together", icon: Sparkles },
];

const PAYMENT_METHODS = [
  { value: "cash",     label: "Cash" },
  { value: "gcash",    label: "GCash" },
  { value: "bank",     label: "Bank Transfer" },
  { value: "paymongo", label: "PayMongo" },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const LABEL_CLS =
  "block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1.5";
const INPUT_CLS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400";

// ─── Shared mini-components ───────────────────────────────────────────────────
function Field({ label, required, error, hint, children, className = "" }) {
  return (
    <div className={className}>
      {label && (
        <label className={LABEL_CLS}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
          <AlertCircle size={11} className="shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1 text-[11.5px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function Sel({ value, onChange, disabled, children, hasError, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(INPUT_CLS, hasError && "border-red-300 bg-red-50/40", className)}
    >
      {children}
    </select>
  );
}

function QtyBtn({ onClick, icon: Icon, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
    >
      <Icon size={13} />
    </button>
  );
}


// ─── Stage 1: Booking Setup ───────────────────────────────────────────────────
function StageBookingSetup({ form, setForm, packages, errors }) {
  const [pkgTab, setPkgTab] = useState("all");
  const [pkgSearch, setPkgSearch] = useState("");

  const regularPackages = useMemo(() => {
    return packages.filter((p) => !isSpecialOffer(p));
  }, [packages]);

  const comboPackages = useMemo(() => {
    return packages.filter((p) => isSpecialOffer(p));
  }, [packages]);

  const filteredPackages = useMemo(() => {
    let list = packages;
    if (pkgTab === "regular") list = regularPackages;
    else if (pkgTab === "combo") list = comboPackages;

    if (pkgSearch.trim()) {
      const q = pkgSearch.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.package_type || "").toLowerCase().includes(q) ||
          (p.event_type || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [packages, pkgTab, pkgSearch, regularPackages, comboPackages]);

  const handleSelectPackage = (pkg) => {
    const pkgEquip = Array.isArray(pkg.setup_equipment)
      ? pkg.setup_equipment.map((eq) => ({
          inventory_id: eq.inventory_id?._id || eq.inventory_id,
          name: eq.name || eq.item_name || "Equipment Item",
          quantity: Number(eq.quantity || 1),
        }))
      : [];
    const isCombo = isSpecialOffer(pkg);
    const comboPax = isCombo ? offerGuestCount(pkg) : 0;

    let serviceType = "food_event";
    let includeFood = true;
    if (pkg.package_type === "Food Only") {
      serviceType = "food_only";
      includeFood = true;
    } else if (pkg.package_type === "Event Setup Only") {
      serviceType = "event_only";
      includeFood = false;
    }

    setForm((prev) => ({
      ...prev,
      package_id: pkg._id,
      service_type: serviceType,
      include_food: includeFood,
      ...(comboPax > 0 ? { guest_count: String(comboPax) } : {}),
      inventory_items: isCombo
        ? []
        : pkgEquip.length > 0
        ? pkgEquip
        : prev.inventory_items,
    }));
  };

  const handleSelectServiceType = (val) => {
    setForm((prev) => ({
      ...prev,
      service_type: val,
      include_food: val !== "event_only",
      package_id: "",
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── Section: Booking Type ── */}
      <div>
        <p className={LABEL_CLS}>Booking Type</p>
        <p className="text-xs text-slate-500 mb-3.5">
          First, choose whether you are selecting an existing predefined package or creating a customized booking.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Card 1: Existing Package */}
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                package_type: "existing",
              }));
            }}
            className={cn(
              "group relative flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer",
              form.package_type === "existing"
                ? "border-blue-600 bg-blue-50/50 shadow-sm ring-4 ring-blue-600/10"
                : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            <div className="flex w-full items-start justify-between">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                  form.package_type === "existing"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600"
                )}
              >
                <Package size={24} />
              </div>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                  form.package_type === "existing"
                    ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                    : "border-slate-300 bg-white group-hover:border-blue-400"
                )}
              >
                {form.package_type === "existing" && <Check size={12} strokeWidth={3} />}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Existing Package
              </span>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Select from predefined catering packages, full event setups, or special offer combo packs with fixed pricing.
              </p>
            </div>
          </button>

          {/* Card 2: Customize Booking */}
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                package_type: "custom",
                package_id: "",
                service_type: prev.service_type || "food_event",
                include_food: prev.service_type !== "event_only",
              }));
            }}
            className={cn(
              "group relative flex flex-col items-start p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer",
              form.package_type === "custom"
                ? "border-blue-600 bg-blue-50/50 shadow-sm ring-4 ring-blue-600/10"
                : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            <div className="flex w-full items-start justify-between">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                  form.package_type === "custom"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600"
                )}
              >
                <Sliders size={24} />
              </div>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                  form.package_type === "custom"
                    ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                    : "border-slate-300 bg-white group-hover:border-blue-400"
                )}
              >
                {form.package_type === "custom" && <Check size={12} strokeWidth={3} />}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Customize Booking
              </span>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Manually configure the service type, tailor menu courses, select individual equipment pieces, and configure pricing.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Option A: Existing Packages Selection (shown ONLY when Existing Package is active) ── */}
      {form.package_type === "existing" && (
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className={LABEL_CLS}>Existing Packages</p>
              <p className="text-xs text-slate-500">
                Choose a predefined package or special offer combo pack from your system.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category tabs */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPkgTab("all")}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors cursor-pointer",
                    pkgTab === "all" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  All ({packages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPkgTab("regular")}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors cursor-pointer",
                    pkgTab === "regular" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Regular Packages ({regularPackages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPkgTab("combo")}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors cursor-pointer",
                    pkgTab === "combo" ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Combo Packs ({comboPackages.length})
                </button>
              </div>

              {/* Search packages */}
              <div className="relative min-w-[200px]">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search packages..."
                  value={pkgSearch}
                  onChange={(e) => setPkgSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                {pkgSearch && (
                  <button
                    type="button"
                    onClick={() => setPkgSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {errors.package_id && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-medium text-red-700">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errors.package_id}</span>
            </div>
          )}

          {filteredPackages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <Package size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No packages found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or tab filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredPackages.map((pkg) => {
                const isSelected = form.package_id === pkg._id;
                const isCombo = isSpecialOffer(pkg);
                const pax = isCombo ? offerGuestCount(pkg) : 0;
                const pricePax = isCombo ? offerPricePerPax(pkg) : 0;

                return (
                  <button
                    key={pkg._id}
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className={cn(
                      "group relative flex flex-col rounded-2xl border-2 p-3.5 text-left transition-all duration-150 cursor-pointer overflow-hidden",
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 ring-4 ring-blue-600/10 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                        {pkg.image_url ? (
                          <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <Package size={22} className="text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider",
                              isCombo
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {isCombo ? (
                              <>
                                <Sparkles size={10} /> Combo Pack
                              </>
                            ) : (
                              pkg.package_type || "Regular"
                            )}
                          </span>

                          <div
                            className={cn(
                              "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all",
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white group-hover:border-blue-400"
                            )}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>

                        <p className="mt-1 font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {pkg.name}
                        </p>
                        {pkg.description && (
                          <p className="text-[11.5px] text-slate-500 line-clamp-1 mt-0.5">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      {isCombo ? (
                        <>
                          <span className="font-bold text-blue-700">
                            {formatCurrency(pricePax)} <span className="text-[11px] font-normal text-slate-500">/ pax</span>
                          </span>
                          <span className="text-[11.5px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {pax} guests
                          </span>
                        </>
                      ) : pkg.package_type === "Event Setup Only" ? (
                        <>
                          <span className="font-bold text-blue-700">
                            {formatCurrency(pkg.setup_price || 0)} <span className="text-[11px] font-normal text-slate-500">setup</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Event Setup
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-blue-700">
                            {formatCurrency(pkg.price_per_guest || 0)} <span className="text-[11px] font-normal text-slate-500">/ guest</span>
                          </span>
                          {(pkg.guest_min || pkg.guest_max) && (
                            <span className="text-[11px] text-slate-500">
                              {pkg.guest_min || 0}–{pkg.guest_max || 0} pax
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Option B: Customize Booking Services (shown ONLY when Customize Booking is active) ── */}
      {form.package_type === "custom" && (
        <div className="pt-4 border-t border-slate-100 space-y-3.5">
          <div>
            <p className={LABEL_CLS}>Service Type</p>
            <p className="text-xs text-slate-500">
              Select the service combination to customize. You can select specific food dishes and equipment in the next step.
            </p>
          </div>

          {errors.service_type && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-medium text-red-700">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errors.service_type}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SERVICE_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = form.service_type === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectServiceType(opt.value)}
                  className={cn(
                    "group relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 shadow-sm ring-4 ring-blue-600/10"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex w-full items-start justify-between">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600"
                      )}
                    >
                      <Icon size={22} />
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                          : "border-slate-300 bg-white group-hover:border-blue-400"
                      )}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {opt.label}
                    </span>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stage 2: Event & Services ────────────────────────────────────────────────
function StageEventAndServices({
  form, setForm, packages, menuItems, inventoryItems,
  selectedMenuIds, setSelectedMenuIds, selectedInventory, setSelectedInventory, errors,
}) {
  const [tab,        setTab]        = useState("event");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCat,    setMenuCat]    = useState("All");
  const [equipSearch,setEquipSearch]= useState("");
  const [equipCat,   setEquipCat]   = useState("All");

  const selectedPkg    = packages.find((p) => p._id === form.package_id);
  const isCombo        = selectedPkg && isSpecialOffer(selectedPkg);
  const municipalities = getBatangasMunicipalities();
  const barangays      = getBatangasBarangays(form.municipality);

  const menuCats = useMemo(() => {
    const cats = new Set(menuItems.map((m) => m.category).filter(Boolean));
    return ["All", ...Array.from(cats).sort()];
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    let items = menuItems;
    if (menuCat !== "All") items = items.filter((m) => m.category === menuCat);
    if (menuSearch) {
      const q = menuSearch.toLowerCase();
      items = items.filter((m) => (m.name || "").toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, menuCat, menuSearch]);

  const groupedMenu = useMemo(() => {
    const g = {};
    filteredMenu.forEach((item) => {
      const cat = item.category || "Other";
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return g;
  }, [filteredMenu]);

  const equipCats = useMemo(() => {
    const cats = new Set(inventoryItems.map((inv) => inv.category).filter(Boolean));
    return ["All", ...Array.from(cats).sort()];
  }, [inventoryItems]);

  const filteredEquip = useMemo(() => {
    let items = inventoryItems;
    if (equipCat !== "All") items = items.filter((i) => i.category === equipCat);
    if (equipSearch) {
      const q = equipSearch.toLowerCase();
      items = items.filter((i) => (i.item_name || "").toLowerCase().includes(q));
    }
    return items;
  }, [inventoryItems, equipCat, equipSearch]);

  const getInvQty = (id) => selectedInventory.find((s) => s.inventory_id === id)?.quantity || 0;
  const setInvQty = (id, name, qty) => {
    setSelectedInventory((prev) => {
      const idx = prev.findIndex((s) => s.inventory_id === id);
      if (qty <= 0) return idx > -1 ? prev.filter((_, i) => i !== idx) : prev;
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: qty };
        return next;
      }
      return [...prev, { inventory_id: id, name, quantity: qty }];
    });
  };

  const tabBtn = (key, label, Icon) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors",
        tab === key
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      )}
    >
      <Icon size={14} />{label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">Event & Services</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Provide the event details and select menu items and equipment.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabBtn("event", "Event & Venue", CalendarDays)}
        {form.include_food && !isCombo && tabBtn("menu", "Menu", Utensils)}
        {tabBtn("equipment", "Equipment & Services", Box)}
      </div>

      {/* ── Event & Venue ── */}
      {tab === "event" && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <div className="col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Event Details
            </p>
          </div>

          <Field label="Event Theme or Colors">
            <input
              type="text"
              placeholder="e.g. Blue & White"
              className={INPUT_CLS}
              value={form.event_theme}
              onChange={(e) => setForm((p) => ({ ...p, event_theme: e.target.value }))}
            />
          </Field>

          <Field label="Event Type" required error={errors.event_type}>
            <Sel
              value={EVENT_TYPES.includes(form.event_type) ? form.event_type : form.event_type ? OTHER_EVENT_TYPE : ""}
              onChange={(v) => setForm((p) => ({ ...p, event_type: v === OTHER_EVENT_TYPE ? "" : v }))}
              hasError={!!errors.event_type}
            >
              <option value="">Select event type</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Sel>
            {!EVENT_TYPES.includes(form.event_type) && form.event_type !== "" && (
              <input
                type="text"
                className={cn(INPUT_CLS, "mt-2")}
                placeholder="Describe the event type"
                value={form.event_type}
                onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
              />
            )}
          </Field>

          <Field label="Event Date" required error={errors.event_date}>
            <input
              type="date"
              className={cn(INPUT_CLS, errors.event_date && "border-red-300")}
              value={form.event_date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
            />
          </Field>

          <Field label="Start Time" required error={errors.start_time}>
            <input
              type="time"
              className={cn(INPUT_CLS, errors.start_time && "border-red-300")}
              value={form.start_time}
              onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            />
          </Field>

          <Field label="Estimated Guest Count" required error={errors.guest_count}>
            <input
              type="number"
              min="1"
              className={cn(INPUT_CLS, errors.guest_count && "border-red-300")}
              placeholder="e.g. 50"
              value={form.guest_count}
              onChange={(e) => setForm((p) => ({ ...p, guest_count: e.target.value }))}
              disabled={!!isCombo}
            />
            {isCombo && (
              <p className="mt-1 text-[11.5px] font-medium text-blue-600">
                Fixed at {offerGuestCount(selectedPkg)} guests for this combo.
              </p>
            )}
          </Field>

          <Field label="Event Duration (hours)">
            <input
              type="number"
              min="1"
              className={INPUT_CLS}
              placeholder="e.g. 4"
              value={form.duration_hours}
              onChange={(e) => setForm((p) => ({ ...p, duration_hours: e.target.value }))}
            />
          </Field>

          <div className="col-span-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Venue Information
            </p>
          </div>

          <Field label="Venue Type">
            <Sel
              value={VENUE_TYPES.includes(form.venue_type) ? form.venue_type : form.venue_type ? OTHER_VENUE_TYPE : ""}
              onChange={(v) => setForm((p) => ({ ...p, venue_type: v === OTHER_VENUE_TYPE ? "" : v }))}
            >
              <option value="">Select venue type</option>
              {VENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Sel>
            {!VENUE_TYPES.includes(form.venue_type) && form.venue_type && (
              <input
                type="text"
                className={cn(INPUT_CLS, "mt-2")}
                placeholder="Describe venue type"
                value={form.venue_type}
                onChange={(e) => setForm((p) => ({ ...p, venue_type: e.target.value }))}
              />
            )}
          </Field>

          <Field label="Indoor or Outdoor">
            <Sel value={form.indoor_outdoor || ""} onChange={(v) => setForm((p) => ({ ...p, indoor_outdoor: v }))}>
              <option value="">Select option</option>
              <option value="Indoor">Indoor</option>
              <option value="Outdoor">Outdoor</option>
              <option value="Both">Both</option>
            </Sel>
          </Field>

          <Field label="Province">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.province || BATANGAS_PROVINCE}
              onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
            />
          </Field>

          <Field label="Municipality" required error={errors.municipality}>
            <Sel
              value={form.municipality || ""}
              onChange={(v) => setForm((p) => ({ ...p, municipality: v, barangay: "" }))}
              hasError={!!errors.municipality}
            >
              <option value="">Select municipality</option>
              {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </Sel>
          </Field>

          <Field label="Barangay" required error={errors.barangay}>
            <Sel
              value={form.barangay || ""}
              onChange={(v) => setForm((p) => ({ ...p, barangay: v }))}
              disabled={!form.municipality}
              hasError={!!errors.barangay}
            >
              <option value="">Select barangay</option>
              {barangays.map((b) => <option key={b} value={b}>{b}</option>)}
            </Sel>
          </Field>

          <Field label="Street Name">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. Name St."
              value={form.street || ""}
              onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
            />
          </Field>

          <Field label="Landmark">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. Near the church"
              value={form.landmark || ""}
              onChange={(e) => setForm((p) => ({ ...p, landmark: e.target.value }))}
            />
          </Field>

          <Field label="ZIP Code">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. 4200"
              value={form.zip_code || ""}
              onChange={(e) => setForm((p) => ({ ...p, zip_code: e.target.value }))}
            />
          </Field>

          <div className="col-span-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Venue Contact
            </p>
          </div>

          <Field label="Contact Name">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. Juan Dela Cruz"
              value={form.venue_contact_name || ""}
              onChange={(e) => setForm((p) => ({ ...p, venue_contact_name: e.target.value }))}
            />
          </Field>

          <Field label="Contact Number">
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. 0917 123 4567"
              value={form.venue_contact_phone || ""}
              onChange={(e) => setForm((p) => ({ ...p, venue_contact_phone: e.target.value }))}
            />
          </Field>

          <div className="col-span-2 flex justify-end pt-2">
            {form.include_food && !isCombo ? (
              <button
                type="button"
                onClick={() => setTab("menu")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Continue to Menu <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTab("equipment")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Continue to Equipment <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Menu tab ── */}
      {tab === "menu" && form.include_food && !isCombo && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className={cn(INPUT_CLS, "pl-9")}
                placeholder="Search menu items..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
            </div>
            <Sel value={menuCat} onChange={setMenuCat} className="w-44 shrink-0">
              {menuCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </Sel>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-4">
              {Object.entries(groupedMenu).map(([cat, items]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-slate-600">{cat}</p>
                    <span className="text-[11px] text-slate-400">{items.length}</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const sel = selectedMenuIds.includes(item._id);
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() =>
                            setSelectedMenuIds((prev) =>
                              prev.includes(item._id)
                                ? prev.filter((id) => id !== item._id)
                                : [...prev, item._id]
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all",
                            sel
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          )}
                        >
                          <span className="text-[13px] font-medium text-slate-700 truncate">{item.name}</span>
                          <span className="ml-2 shrink-0 text-xs tabular-nums text-slate-500">
                            {formatCurrency(item.price)} / pc
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupedMenu).length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No menu items found.</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-600">Selected Items ({selectedMenuIds.length})</p>
                {selectedMenuIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMenuIds([])}
                    className="text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="min-h-[200px] rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                {selectedMenuIds.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Select items from the left</p>
                ) : (
                  menuItems
                    .filter((m) => selectedMenuIds.includes(m._id))
                    .map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="text-[13px] font-medium text-slate-700 truncate">{item.name}</span>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <span className="text-xs tabular-nums text-slate-400">
                            {formatCurrency(item.price)} / pc
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMenuIds((prev) => prev.filter((id) => id !== item._id))
                            }
                            className="text-slate-400 hover:text-red-500 transition"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setTab("event")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ChevronLeft size={15} /> Back to Event
            </button>
            <button
              type="button"
              onClick={() => setTab("equipment")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Continue to Equipment <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Equipment & Services ── */}
      {tab === "equipment" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className={cn(INPUT_CLS, "pl-9")}
                placeholder="Search equipment or services..."
                value={equipSearch}
                onChange={(e) => setEquipSearch(e.target.value)}
              />
            </div>
            <Sel value={equipCat} onChange={setEquipCat} className="w-44 shrink-0">
              {equipCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </Sel>
          </div>
          {!form.event_date && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={15} className="shrink-0" />
              Select an event date first to see accurate availability.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2.5 text-left font-semibold text-slate-600">Item</th>
                  <th className="pb-2.5 text-center font-semibold text-slate-600">Available</th>
                  <th className="pb-2.5 text-center font-semibold text-slate-600">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquip.map((inv) => {
                  const available = inv.available_quantity ?? inv.quantity ?? 0;
                  const qty = getInvQty(inv._id);
                  return (
                    <tr key={inv._id} className="transition hover:bg-slate-50/60">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-slate-800">{inv.item_name}</p>
                        {inv.category && (
                          <p className="text-xs text-slate-400">{inv.category}</p>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            available > 10
                              ? "bg-emerald-50 text-emerald-700"
                              : available > 0
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {available}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <QtyBtn
                            icon={Minus}
                            disabled={qty <= 0}
                            onClick={() => setInvQty(inv._id, inv.item_name, qty - 1)}
                          />
                          <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-800">
                            {qty}
                          </span>
                          <QtyBtn
                            icon={Plus}
                            disabled={qty >= available}
                            onClick={() => {
                              if (qty >= available) return;
                              setInvQty(inv._id, inv.item_name, qty + 1);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredEquip.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No equipment items found.</p>
            )}
          </div>
          <div className="flex pt-4">
            <button
              type="button"
              onClick={() => setTab(form.include_food && !isCombo ? "menu" : "event")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ChevronLeft size={15} /> Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stage 3: Review & Payment ────────────────────────────────────────────────
function StageReviewAndPayment({
  form, setForm, customers, packages, menuItems, selectedMenuIds, selectedInventory, onEdit, errors,
}) {
  const pkg    = packages.find((p) => p._id === form.package_id);
  const dishes = menuItems.filter((m) => selectedMenuIds.includes(m._id));
  const guestCount = Number(form.guest_count) || 0;

  let pkgTotal = 0;
  if (pkg) {
    if (isSpecialOffer(pkg)) pkgTotal = offerGuestCount(pkg) * (offerPricePerPax(pkg) || 0);
    else if (pkg.package_type === "Event Setup Only") pkgTotal = Number(pkg.setup_price) || 0;
    else pkgTotal = (Number(pkg.price_per_guest) || 0) * guestCount;
  }
  const foodTotal =
    !isSpecialOffer(pkg) && form.include_food
      ? dishes.reduce((s, d) => s + (Number(d.price) || 0) * guestCount, 0)
      : 0;
  const computedTotal = pkgTotal + foodTotal;
  const finalTotal =
    form.total_price !== "" && form.total_price !== undefined
      ? Number(form.total_price) || 0
      : computedTotal;
  const totalEquipment = selectedInventory.reduce((s, e) => s + (e.quantity || 0), 0);

  const SummaryCard = ({ icon: Icon, title, onEditClick, children }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
        </div>
        <button
          type="button"
          onClick={onEditClick}
          className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">Review & Payment</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Review the booking details and complete the customer contact and payment info.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard icon={CalendarDays} title="Event Details" onEditClick={() => onEdit(1)}>
          <p className="font-semibold text-sm text-slate-800">{form.event_type || "—"}</p>
          {form.event_date && (
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <CalendarDays size={12} />
              {new Date(form.event_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {form.start_time ? ` · ${form.start_time}` : ""}
            </p>
          )}
          {form.guest_count && (
            <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5">
              <Users size={12} />
              {form.guest_count} guests
            </p>
          )}
        </SummaryCard>

        <SummaryCard icon={Package} title="Package & Services" onEditClick={() => onEdit(0)}>
          <p className="font-semibold text-sm text-slate-800">
            {pkg?.name || (form.package_type === "custom" ? "Custom Setup" : "—")}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {form.service_type === "food_event"
              ? "Food & Event Setup"
              : form.service_type === "food_only"
              ? "Food Only"
              : "Event Setup Only"}
          </p>
          {dishes.length > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">{dishes.length} menu items</p>
          )}
          {totalEquipment > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">{totalEquipment} equipment units</p>
          )}
        </SummaryCard>
      </div>

      {/* Contact info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Customer Contact Information
          </p>
          {customers?.length > 0 && (
            <select
              className="text-xs text-blue-700 bg-blue-50/80 border border-blue-200/80 rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              defaultValue=""
              onChange={(e) => {
                const cust = customers.find((c) => c._id === e.target.value);
                if (cust) {
                  setForm((p) => ({
                    ...p,
                    customer_id: cust._id,
                    contact_first_name: (cust.full_name || "").split(" ")[0] || cust.first_name || p.contact_first_name,
                    contact_last_name: (cust.full_name || "").split(" ").slice(1).join(" ") || cust.last_name || p.contact_last_name,
                    contact_email: cust.email || p.contact_email,
                    contact_phone: cust.phone || p.contact_phone,
                  }));
                }
                e.target.value = "";
              }}
            >
              <option value="" disabled>Autofill from existing customer (optional)...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.full_name || c.email} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.contact_first_name}>
            <input
              type="text"
              className={cn(INPUT_CLS, errors.contact_first_name && "border-red-300")}
              value={form.contact_first_name}
              onChange={(e) => setForm((p) => ({ ...p, contact_first_name: e.target.value }))}
            />
          </Field>
          <Field label="Last Name" required error={errors.contact_last_name}>
            <input
              type="text"
              className={cn(INPUT_CLS, errors.contact_last_name && "border-red-300")}
              value={form.contact_last_name}
              onChange={(e) => setForm((p) => ({ ...p, contact_last_name: e.target.value }))}
            />
          </Field>
          <Field label="Email Address" required error={errors.contact_email}>
            <input
              type="email"
              className={cn(INPUT_CLS, errors.contact_email && "border-red-300")}
              value={form.contact_email}
              onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
            />
          </Field>
          <Field label="Phone Number" required error={errors.contact_phone}>
            <input
              type="text"
              className={cn(INPUT_CLS, errors.contact_phone && "border-red-300")}
              value={form.contact_phone}
              onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
            />
          </Field>
          <Field label="Alternate Phone">
            <input
              type="text"
              className={INPUT_CLS}
              value={form.contact_alt_phone || ""}
              onChange={(e) => setForm((p) => ({ ...p, contact_alt_phone: e.target.value }))}
            />
          </Field>
          <Field label="Preferred Contact Method">
            <Sel
              value={form.contact_method || "email"}
              onChange={(v) => setForm((p) => ({ ...p, contact_method: v }))}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="sms">SMS</option>
            </Sel>
          </Field>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
          Payment Method
        </p>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, payment_method: pm.value }))}
              className={cn(
                "rounded-xl border-2 px-3 py-3.5 text-center transition-all",
                form.payment_method === pm.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
              )}
            >
              <CreditCard
                size={18}
                className={cn(
                  "mx-auto mb-1.5",
                  form.payment_method === pm.value ? "text-blue-600" : "text-slate-400"
                )}
              />
              <p className="text-[13px] font-semibold">{pm.label}</p>
            </button>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 mb-4">
          {pkg && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Package Price</span>
              <span className="font-semibold tabular-nums">{formatCurrency(pkgTotal)}</span>
            </div>
          )}
          {foodTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
                Food ({dishes.length} items × {guestCount} guests)
              </span>
              <span className="font-semibold tabular-nums">{formatCurrency(foodTotal)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-800">Total</span>
            <span className="text-base font-bold tabular-nums text-slate-900">
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>

        {/* Override */}
        <Field label="Override Total Price" hint="Leave blank to use the computed total above.">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              ₱
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={cn(INPUT_CLS, "pl-7 font-semibold")}
              placeholder={computedTotal > 0 ? String(computedTotal) : "0.00"}
              value={form.total_price}
              onChange={(e) => setForm((p) => ({ ...p, total_price: e.target.value }))}
              onKeyDown={(e) => ["e", "E", "-", "+"].includes(e.key) && e.preventDefault()}
            />
          </div>
          {errors.total_price && (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
              <AlertCircle size={11} />{errors.total_price}
            </p>
          )}
        </Field>

        <Field label="Balance Payment Preference" className="mt-4">
          <Sel
            value={form.balance_payment_preference || "unselected"}
            onChange={(v) => setForm((p) => ({ ...p, balance_payment_preference: v }))}
          >
            <option value="unselected">Not selected</option>
            <option value="online">Online</option>
            <option value="in_person">In Person</option>
          </Sel>
        </Field>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  customer_id: "", package_type: "existing", package_id: "",
  service_type: "food_event", include_food: true,
  event_type: "", event_theme: "", event_date: "", start_time: "12:00",
  duration_hours: "4", guest_count: "",
  venue_type: "", indoor_outdoor: "", province: BATANGAS_PROVINCE,
  municipality: "", barangay: "", street: "", landmark: "", zip_code: "",
  venue_contact_name: "", venue_contact_phone: "",
  contact_first_name: "", contact_last_name: "",
  contact_email: "", contact_phone: "", contact_alt_phone: "",
  contact_method: "email", payment_method: "cash",
  total_price: "", balance_payment_preference: "unselected",
  inventory_items: [],
};

export default function WalkInBookingModal({ open, onClose, onCreated }) {
  const { notify } = useToast();
  const [stage,      setStage]      = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [stageErrors, setStageErrors] = useState({});
  const contentRef = useRef(null);

  const [packages,       setPackages]       = useState([]);
  const [menuItems,      setMenuItems]      = useState([]);
  const [customers,      setCustomers]      = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingCatalogs,setLoadingCatalogs]= useState(false);

  const [form,              setForm]              = useState(EMPTY_FORM);
  const [selectedMenuIds,   setSelectedMenuIds]   = useState([]);
  const [selectedInventory, setSelectedInventory] = useState([]);

  // Load catalogs once on open
  useEffect(() => {
    if (!open) return;
    setLoadingCatalogs(true);
    Promise.all([AdminAPI.getPackages(), AdminAPI.getMenu(), AdminAPI.getCustomers()])
      .then(([pkgRes, menuRes, custRes]) => {
        setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : []);
        setMenuItems(
          Array.isArray(menuRes.data)
            ? menuRes.data.filter((m) => m.available !== false)
            : []
        );
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      })
      .catch(() => notify("Failed to load booking data.", "error"))
      .finally(() => setLoadingCatalogs(false));
  }, [open]);

  // Reload inventory when event date changes
  useEffect(() => {
    if (!open) return;
    AdminAPI.getInventoryAvailability(form.event_date || undefined)
      .then((res) => setInventoryItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setInventoryItems([]));
  }, [open, form.event_date]);

  // Sync selectedInventory from form.inventory_items when package changes
  useEffect(() => {
    if (form.inventory_items && form.inventory_items.length > 0) {
      setSelectedInventory(
        form.inventory_items.map((item) => ({
          inventory_id: item.inventory_id,
          name:         item.name,
          quantity:     item.quantity,
        }))
      );
    }
  }, [form.package_id]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStage(0);
      setStageErrors({});
      setForm(EMPTY_FORM);
      setSelectedMenuIds([]);
      setSelectedInventory([]);
    }
  }, [open]);

  // Scroll to top on stage change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  const validate = useCallback(
    (upToStage) => {
      const errs = {};
      if (upToStage >= 0) {
        if (form.package_type === "existing" && !form.package_id)
          errs.package_id = "Please select a package to proceed.";
        if (form.package_type === "custom" && !form.service_type)
          errs.service_type = "Please select a service type.";
      }
      if (upToStage >= 1) {
        if (!form.event_type)   errs.event_type   = "Event type is required.";
        if (!form.event_date)   errs.event_date   = "Event date is required.";
        if (!form.start_time)   errs.start_time   = "Start time is required.";
        if (!form.guest_count || Number(form.guest_count) < 1)
          errs.guest_count = "Guest count must be at least 1.";
        if (!form.municipality) errs.municipality = "Municipality is required.";
        if (!form.barangay)     errs.barangay     = "Barangay is required.";
      }
      if (upToStage >= 2) {
        if (!form.contact_first_name) errs.contact_first_name = "First name is required.";
        if (!form.contact_last_name)  errs.contact_last_name  = "Last name is required.";
        if (!form.contact_email)      errs.contact_email      = "Email is required.";
        if (!form.contact_phone) {
          errs.contact_phone = "Phone is required.";
        } else if (!/^09\d{9}$/.test(form.contact_phone.replace(/\s+/g, ""))) {
          errs.contact_phone = "Phone must be in 09xxxxxxxxx format (11 digits).";
        }
        if (form.total_price !== "" && form.total_price !== undefined) {
          const t = Number(form.total_price);
          if (!Number.isFinite(t) || t < 0)
            errs.total_price = "Total price must be a non-negative number.";
        }
      }
      return errs;
    },
    [form]
  );

  const handleNext = () => {
    const errs = validate(stage);
    setStageErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStage((s) => Math.min(s + 1, STAGES.length - 1));
  };

  const handleBack = () => {
    setStageErrors({});
    setStage((s) => Math.max(s - 1, 0));
  };

  const handleEditStage = (s) => {
    setStageErrors({});
    setStage(s);
  };

  const handleSubmit = async () => {
    const errs = validate(2);
    setStageErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const pkg     = packages.find((p) => p._id === form.package_id);
      const isCombo = pkg && isSpecialOffer(pkg);

      let serviceType = SERVICE_TYPES.FULL_SERVICE;
      if (form.service_type === "food_only")  serviceType = SERVICE_TYPES.FOOD_ONLY;
      if (form.service_type === "event_only") serviceType = SERVICE_TYPES.SETUP_ONLY;

      // Compute total price if not manually overridden
      let finalPrice = Number(form.total_price);
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        let pkgTotal = 0;
        if (pkg) {
          if (isSpecialOffer(pkg)) pkgTotal = offerGuestCount(pkg) * (offerPricePerPax(pkg) || 0);
          else if (pkg.package_type === "Event Setup Only") pkgTotal = Number(pkg.setup_price) || 0;
          else pkgTotal = (Number(pkg.price_per_guest) || 0) * Number(form.guest_count || 0);
        }
        const dishes = menuItems.filter((m) => selectedMenuIds.includes(m._id));
        const foodTotal =
          !isSpecialOffer(pkg) && form.include_food
            ? dishes.reduce((s, d) => s + (Number(d.price) || 0) * Number(form.guest_count || 0), 0)
            : 0;
        finalPrice = pkgTotal + foodTotal;
      }

      const cleanPhone = (val) => (val ? String(val).replace(/\s+/g, "") : undefined);
      const cleanZip = form.zip_code && /^\d{4}$/.test(form.zip_code.trim()) ? form.zip_code.trim() : undefined;

      // Auto-match existing customer by email if customer_id not yet explicitly set
      let customerId = form.customer_id;
      if (!customerId && form.contact_email && customers?.length > 0) {
        const found = customers.find(
          (c) => (c.email || "").toLowerCase() === form.contact_email.trim().toLowerCase()
        );
        if (found) customerId = found._id;
      }

      const payload = {
        customer_id:  customerId || undefined,
        package_id:
          form.package_type === "existing" && form.package_id
            ? form.package_id
            : undefined,
        service_type:  serviceType,
        include_food:  form.include_food,
        event_type:    form.event_type,
        event_theme:   form.event_theme   || undefined,
        event_date:    form.event_date,
        start_time:    form.start_time,
        duration_hours: Number(form.duration_hours) || 4,
        guest_count:   Number(form.guest_count),
        venue_type:    form.venue_type    || undefined,
        indoor_outdoor: form.indoor_outdoor || undefined,
        province:      form.province      || BATANGAS_PROVINCE,
        municipality:  form.municipality  || undefined,
        barangay:      form.barangay      || undefined,
        street:        form.street        || undefined,
        landmark:      form.landmark      || undefined,
        zip_code:      cleanZip,
        venue_contact_name: form.venue_contact_name || undefined,
        venue_contact_phone: cleanPhone(form.venue_contact_phone),
        contact_first_name: form.contact_first_name,
        contact_last_name:  form.contact_last_name,
        contact_email:      form.contact_email,
        contact_phone:      cleanPhone(form.contact_phone) || form.contact_phone,
        contact_alt_phone:  cleanPhone(form.contact_alt_phone),
        contact_method:     form.contact_method,
        payment_method:     form.payment_method,
        total_price:        Number(finalPrice) || 0,
        balance_payment_preference: form.balance_payment_preference || "unselected",
        selected_menu:    form.include_food && !isCombo ? selectedMenuIds : [],
        inventory_items:  selectedInventory.filter((s) => s.quantity > 0),
        status:           "pending deposit",
      };

      await AdminAPI.createBooking(payload);
      notify("Booking created successfully.", "success");
      onCreated?.();
      onClose();
    } catch (err) {
      notify(
        err.response?.data?.message || "Could not create the booking. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      style={{ animation: "wibm-fade 0.15s ease" }}
    >
      <div
        className="relative flex h-[94dvh] w-[95vw] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        style={{ animation: "wibm-up 0.18s ease" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 sm:px-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Add New Booking
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
              Create a new reservation for an existing or walk-in customer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Main content - uses full usable width */}
          <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
            {loadingCatalogs ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {stage === 0 && (
                  <StageBookingSetup
                    form={form}
                    setForm={setForm}
                    packages={packages}
                    errors={stageErrors}
                  />
                )}
                {stage === 1 && (
                  <StageEventAndServices
                    form={form}
                    setForm={setForm}
                    packages={packages}
                    menuItems={menuItems}
                    inventoryItems={inventoryItems}
                    selectedMenuIds={selectedMenuIds}
                    setSelectedMenuIds={setSelectedMenuIds}
                    selectedInventory={selectedInventory}
                    setSelectedInventory={setSelectedInventory}
                    errors={stageErrors}
                  />
                )}
                {stage === 2 && (
                  <StageReviewAndPayment
                    form={form}
                    setForm={setForm}
                    customers={customers}
                    packages={packages}
                    menuItems={menuItems}
                    selectedMenuIds={selectedMenuIds}
                    selectedInventory={selectedInventory}
                    onEdit={handleEditStage}
                    errors={stageErrors}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {stage > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            {stage < STAGES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 cursor-pointer"
              >
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Create Booking
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wibm-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes wibm-up   { from { opacity:0; transform:translateY(12px) scale(0.98) } to { opacity:1; transform:translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
