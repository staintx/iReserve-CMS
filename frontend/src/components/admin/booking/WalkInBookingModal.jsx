import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Search, Plus, ChevronRight, ChevronLeft, User, CalendarDays,
  Utensils, Package, Box, CreditCard, CheckCircle2, AlertCircle,
  Loader2, Check, Minus, Users, Phone, Mail, ShoppingCart,
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
  { value: "food_event", label: "Food & Event Setup", description: "Complete catering & event services", icon: Utensils },
  { value: "food_only",  label: "Food Only",          description: "Menu & catering services",           icon: ShoppingCart },
  { value: "event_only", label: "Event Setup Only",   description: "Planning, setup & decor",           icon: Box },
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

// ─── Stage progress bar ───────────────────────────────────────────────────────
function StageBar({ stage }) {
  return (
    <div className="flex items-center">
      {STAGES.map((s, i) => {
        const active = i === stage;
        const done   = i < stage;
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                  done
                    ? "bg-blue-600 text-white"
                    : active
                    ? "bg-blue-600 text-white ring-4 ring-blue-600/20"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {done ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[13px] font-semibold transition-colors",
                  active ? "text-slate-900" : done ? "text-blue-600" : "text-slate-400"
                )}
              >
                {s}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px flex-1 min-w-[16px] transition-colors",
                  done ? "bg-blue-400" : "bg-slate-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Booking Summary Sidebar ──────────────────────────────────────────────────
function BookingSummary({ form, packages, menuItems, selectedMenuIds, selectedInventory }) {
  const pkg    = packages.find((p) => p._id === form.package_id);
  const dishes = menuItems.filter((m) => selectedMenuIds.includes(m._id));
  const customerName =
    [form.contact_first_name, form.contact_last_name].filter(Boolean).join(" ") || "—";
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
  const estimatedTotal =
    form.total_price !== "" && form.total_price !== undefined
      ? Number(form.total_price) || 0
      : pkgTotal + foodTotal;

  const menuCount  = dishes.length;
  const equipCount = selectedInventory.reduce((s, e) => s + (e.quantity || 0), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-[13px] font-bold text-slate-900">Booking Summary</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Customer
          </p>
          <p className="font-semibold text-slate-800 leading-snug">{customerName}</p>
          {form.contact_email && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{form.contact_email}</p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Booking Type
          </p>
          <p className="font-medium text-slate-700">
            {form.package_type === "existing" ? "Existing Package" : "Customize Booking"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {form.service_type === "food_event"
              ? "Food & Event Setup"
              : form.service_type === "food_only"
              ? "Food Only"
              : "Event Setup Only"}
          </p>
        </div>

        {pkg && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Package
            </p>
            <p className="font-semibold text-slate-800 text-[13px] leading-snug">{pkg.name}</p>
            <p className="text-xs text-slate-500">
              {isSpecialOffer(pkg)
                ? `Combo · ${offerGuestCount(pkg)} guests · ${formatCurrency(offerPricePerPax(pkg))}/pax`
                : pkg.package_type}
            </p>
            {menuCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Menu Items</span>
                <span className="font-semibold text-slate-700">{menuCount} selected</span>
              </div>
            )}
            {equipCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Equipment</span>
                <span className="font-semibold text-slate-700">{equipCount} units</span>
              </div>
            )}
          </div>
        )}

        {(form.event_type || form.event_date) && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Event
            </p>
            {form.event_type && (
              <p className="font-semibold text-slate-800">{form.event_type}</p>
            )}
            {form.event_date && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <CalendarDays size={11} />
                {new Date(form.event_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {form.start_time ? ` · ${form.start_time}` : ""}
              </p>
            )}
            {form.guest_count && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Users size={11} />
                {form.guest_count} guests
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Pricing
            </p>
          </div>
          <div className="px-3 py-2.5 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Package Price</span>
              <span className="tabular-nums">{formatCurrency(pkgTotal)}</span>
            </div>
            {foodTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Additional Services</span>
                <span className="tabular-nums">{formatCurrency(foodTotal)}</span>
              </div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800">Total</span>
            <span className="text-sm font-bold text-blue-700 tabular-nums">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 1: Booking Setup ───────────────────────────────────────────────────
function StageBookingSetup({ form, setForm, customers, packages, errors }) {
  const [search, setSearch]     = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  const selectedCustomer = customers.find((c) => c._id === form.customer_id);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    return customers
      .filter(
        (c) =>
          (c.full_name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [customers, search]);

  const filteredPackages = useMemo(() => {
    if (form.service_type === "food_only")
      return packages.filter((p) => p.package_type === "Food Only" || isSpecialOffer(p));
    if (form.service_type === "event_only")
      return packages.filter((p) => p.package_type === "Event Setup Only");
    return packages.filter((p) => p.package_type !== "Food Only");
  }, [packages, form.service_type]);

  useEffect(() => {
    function handler(e) {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pickCustomer = (c) => {
    setForm((prev) => ({
      ...prev,
      customer_id:        c._id,
      contact_first_name: prev.contact_first_name || (c.full_name || "").split(" ")[0] || "",
      contact_last_name:
        prev.contact_last_name || (c.full_name || "").split(" ").slice(1).join(" ") || "",
      contact_email: prev.contact_email || c.email || "",
      contact_phone: prev.contact_phone || c.phone || "",
    }));
    setSearch("");
    setShowDrop(false);
  };

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">Booking Setup</h2>
        <p className="mt-0.5 text-sm text-slate-500">Choose the details for this booking.</p>
      </div>

      {/* Customer search */}
      <div>
        <p className={LABEL_CLS}>Customer</p>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search existing customer..."
            className={cn(INPUT_CLS, "pl-9 pr-32", errors.customer_id && "border-red-300 bg-red-50/40")}
            value={selectedCustomer ? (selectedCustomer.full_name || selectedCustomer.email) : search}
            onChange={(e) => {
              if (selectedCustomer) setForm((p) => ({ ...p, customer_id: "" }));
              setSearch(e.target.value);
              setShowDrop(true);
            }}
            onFocus={() => setShowDrop(true)}
          />
          {selectedCustomer ? (
            <button
              type="button"
              onClick={() => { setForm((p) => ({ ...p, customer_id: "" })); setSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDrop(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition"
            >
              <Plus size={11} />New Customer
            </button>
          )}
          {showDrop && !selectedCustomer && (
            <div
              ref={dropRef}
              className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
            >
              {filteredCustomers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">No customers found.</p>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => pickCustomer(c)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {(c.full_name || c.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{c.full_name || "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{c.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {errors.customer_id && (
          <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
            <AlertCircle size={11} />{errors.customer_id}
          </p>
        )}
      </div>

      {/* Booking Type */}
      <div>
        <p className={LABEL_CLS}>Booking Type</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "existing", label: "Existing Package",  description: "Select from predefined packages." },
            { value: "custom",   label: "Customize Booking", description: "Manually configure services and equipment." },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  package_type: opt.value,
                  package_id: opt.value === "custom" ? "" : p.package_id,
                }))
              }
              className={cn(
                "rounded-xl border-2 px-4 py-4 text-left transition-all",
                form.package_type === opt.value
                  ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-blue-300"
              )}
            >
              <p className="font-semibold text-[13px] text-slate-800">{opt.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Service Type */}
      <div>
        <p className={LABEL_CLS}>Service Type</p>
        <div className="grid grid-cols-3 gap-3">
          {SERVICE_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    service_type: opt.value,
                    include_food: opt.value !== "event_only",
                  }))
                }
                className={cn(
                  "rounded-xl border-2 px-3 py-4 text-left transition-all",
                  form.service_type === opt.value
                    ? "border-blue-500 bg-blue-50/60"
                    : "border-slate-200 bg-white hover:border-blue-300"
                )}
              >
                <Icon size={18} className={form.service_type === opt.value ? "text-blue-600" : "text-slate-400"} />
                <p className="mt-2 font-semibold text-[13px] text-slate-800">{opt.label}</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Package grid */}
      {form.package_type === "existing" && (
        <Field label="Package" required error={errors.package_id}>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {filteredPackages.map((pkg) => (
              <button
                key={pkg._id}
                type="button"
                onClick={() => {
                  const pkgEquip = Array.isArray(pkg.setup_equipment)
                    ? pkg.setup_equipment.map((eq) => ({
                        inventory_id: eq.inventory_id?._id || eq.inventory_id,
                        name:         eq.name || eq.item_name || "Equipment Item",
                        quantity:     Number(eq.quantity || 1),
                      }))
                    : [];
                  const isCombo  = isSpecialOffer(pkg);
                  const comboPax = isCombo ? offerGuestCount(pkg) : 0;
                  setForm((prev) => ({
                    ...prev,
                    package_id:      pkg._id,
                    ...(comboPax > 0 ? { guest_count: String(comboPax) } : {}),
                    inventory_items: isCombo
                      ? []
                      : pkgEquip.length > 0
                      ? pkgEquip
                      : prev.inventory_items,
                  }));
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
                  form.package_id === pkg._id
                    ? "border-blue-500 bg-blue-50/60"
                    : "border-slate-200 bg-white hover:border-blue-300"
                )}
              >
                <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                  {pkg.image_url ? (
                    <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[13px] text-slate-800 leading-snug">{pkg.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isSpecialOffer(pkg)
                      ? `Combo · ${offerGuestCount(pkg)} guests · ${formatCurrency(offerPricePerPax(pkg))}/pax`
                      : pkg.package_type}
                  </p>
                </div>
                {form.package_id === pkg._id && (
                  <CheckCircle2 size={16} className="shrink-0 text-blue-600" />
                )}
              </button>
            ))}
            {filteredPackages.length === 0 && (
              <p className="col-span-2 py-3 text-sm text-slate-400">
                No packages available for this service type.
              </p>
            )}
          </div>
        </Field>
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
  form, setForm, packages, menuItems, selectedMenuIds, selectedInventory, onEdit, errors,
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
          className="text-[11px] font-semibold text-blue-600 hover:underline"
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
          Review the booking details and complete the payment.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={User} title="Customer Info" onEditClick={() => onEdit(0)}>
          <p className="font-semibold text-sm text-slate-800">
            {[form.contact_first_name, form.contact_last_name].filter(Boolean).join(" ") || "—"}
          </p>
          {form.contact_email && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Mail size={11} className="shrink-0" />{form.contact_email}
            </p>
          )}
          {form.contact_phone && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={11} className="shrink-0" />{form.contact_phone}
            </p>
          )}
        </SummaryCard>

        <SummaryCard icon={CalendarDays} title="Event Details" onEditClick={() => onEdit(1)}>
          <p className="font-semibold text-sm text-slate-800">{form.event_type || "—"}</p>
          {form.event_date && (
            <p className="mt-1 text-xs text-slate-500">
              {new Date(form.event_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {form.start_time ? ` · ${form.start_time}` : ""}
            </p>
          )}
          {form.guest_count && (
            <p className="mt-0.5 text-xs text-slate-500">{form.guest_count} guests</p>
          )}
        </SummaryCard>

        <SummaryCard icon={Package} title="Package & Services" onEditClick={() => onEdit(1)}>
          <p className="font-semibold text-sm text-slate-800">
            {pkg?.name || (form.package_type === "custom" ? "Custom Setup" : "—")}
          </p>
          {dishes.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">{dishes.length} menu items</p>
          )}
          {totalEquipment > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">{totalEquipment} equipment units</p>
          )}
        </SummaryCard>
      </div>

      {/* Contact info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
          Contact Information
        </p>
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
        if (!form.customer_id) errs.customer_id = "Please select a customer.";
        if (form.package_type === "existing" && !form.package_id)
          errs.package_id = "Please select a package.";
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

      const payload = {
        customer_id:  form.customer_id,
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
        className="relative flex h-[96dvh] w-[96vw] max-w-[1360px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        style={{ animation: "wibm-up 0.18s ease" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="shrink-0">
            <h1 className="text-[14px] font-bold leading-none text-slate-900">Add New Booking</h1>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Create a new reservation for an existing or walk-in customer
            </p>
          </div>
          <div className="flex-1 min-w-0 flex justify-center">
            <StageBar stage={stage} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Main content */}
          <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-7 py-7">
            {loadingCatalogs ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {stage === 0 && (
                  <StageBookingSetup
                    form={form}
                    setForm={setForm}
                    customers={customers}
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

          {/* Summary sidebar — xl+ only */}
          <div className="hidden xl:flex w-72 shrink-0 flex-col border-l border-slate-200 bg-slate-50/60">
            <BookingSummary
              form={form}
              packages={packages}
              menuItems={menuItems}
              selectedMenuIds={selectedMenuIds}
              selectedInventory={selectedInventory}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {stage > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            {stage < STAGES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
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
