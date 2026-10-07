import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Utensils,
  Package,
  Box,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Sparkles,
  Sliders,
  Pencil,
  Clock,
  MapPin,
  Heart,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Info,
  Receipt,
  Percent,
  FileText,
  Banknote,
  ShieldAlert,
} from "lucide-react";
import { AdminAPI } from "../../../api/admin";
import { CustomerAPI } from "../../../api/customer";
import useToast from "../../../hooks/useToast";
import {
  isSpecialOffer,
  offerGuestCount,
  offerPricePerPax,
  offerBaseFoodPrice,
  offerFoodByCategory,
  offerCourseRequirement,
  offerInclusions,
  offerBookingProblem,
  offerFoodItems,
} from "../../../lib/specialOffers";
import {
  computeQuotationTotals,
  derivePackageStartingPrice,
  inclusionAdjustmentAmount,
  MENU_PRICING,
  money,
} from "../../../utils/quotationPricing";
import { parseInclusionQuantity, eventSpaceLabel } from "../../../lib/packageDisplay";
import { resolveDishImageUrl } from "../quotation/DishThumbnail";
import {
  SERVICE_TYPES,
  SERVICE_LABELS,
  buildEstimate,
  cateringRequested,
  contactFieldError,
  OTHER_VENUE_TYPE,
  resolveVenueType,
} from "../../../pages/customer/booking/lib/bookingRules";
import { OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../../lib/eventTypes";
import {
  BATANGAS_PROVINCE,
  getBatangasBarangays,
  getBatangasMunicipalities,
} from "../../../utils/batangas";
import {
  guestRange,
  capacityLabel,
  serviceLabel,
  eventTypeForPackage,
  packagePriceParts,
  peso,
} from "../../../lib/packageDisplay";
import { formatCurrency, formatEventDate } from "../../../utils/format";
import { cn } from "@/lib/utils";
import { validateName, validatePhone, validateAddress, validateSafeText } from "@/lib/validationRules";

// Step components from Customer flow
import StepServiceType from "../../../pages/customer/booking/steps/StepServiceType";
import StepDateTime from "../../../pages/customer/booking/steps/StepDateTime";
import StepEventDetails from "../../../pages/customer/booking/steps/StepEventDetails";
import StepDeliveryDetails from "../../../pages/customer/booking/steps/StepDeliveryDetails";
import StepMenuSelection from "../../../pages/customer/booking/steps/StepMenuSelection";
import StepDietaryNeeds from "../../../pages/customer/booking/steps/StepDietaryNeeds";
import StepPackageSelection from "../../../pages/customer/booking/steps/StepPackageSelection";
import StepPackageAddOns from "../../../pages/customer/booking/steps/StepPackageAddOns";
import StepContactInfo from "../../../pages/customer/booking/steps/StepContactInfo";
import BookingStepper from "../../../pages/customer/booking/components/BookingStepper";
import WalkInQuotationStep from "./WalkInQuotationStep";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "bank", label: "Bank Transfer" },
  { value: "paymongo", label: "PayMongo" },
];

const SERVICE_TYPE_OPTIONS = [
  {
    value: SERVICE_TYPES.FOOD_ONLY,
    label: "Food Only",
    description: "Menu & catering services without event setup or styling",
    icon: Utensils,
  },
  {
    value: SERVICE_TYPES.SETUP_ONLY,
    label: "Event Setup Only",
    description: "Planning, setup & decor without food catering services",
    icon: Box,
  },
  {
    value: SERVICE_TYPES.FULL_SERVICE,
    label: "Food & Event Setup",
    description: "Complete catering & full event styling services together",
    icon: Sparkles,
  },
];

const parseNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

const parseName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const EMPTY_FORM = {
  customer_id: "",
  package_type: "existing", // "existing" | "custom"
  package_id: "",
  service_type: SERVICE_TYPES.FULL_SERVICE,
  include_food: true,
  event_type: "",
  event_type_other: "",
  event_theme: "",
  event_palette: [],
  booking_for: "myself",
  celebrant_name: "",
  is_custom_setup: false,
  custom_setup_scope: [],
  inspiration_images: [],
  custom_setup_notes: "",
  event_date: "",
  start_time: "12:00 PM",
  duration_hours: "4",
  guest_count: "50",
  venue_type: "",
  venue_type_other: "",
  indoor_outdoor: "Indoor",
  province: BATANGAS_PROVINCE,
  municipality: "",
  barangay: "",
  street: "",
  landmark: "",
  zip_code: "",
  delivery_method: "setup",
  delivery_instructions: "",
  pickup_location: "",
  selected_menu: [],
  offer_food_snapshot: [],
  dietary_restrictions: "",
  allergies: "",
  special_requests: "",
  additional_services: [],
  selected_package_addons: [],
  inventory_items: [],
  selected_scaffold_option_id: "",
  scaffold_size: "",
  scaffold_width: undefined,
  scaffold_length: undefined,
  scaffold_base_area: undefined,
  scaffold_price: undefined,
  scaffold_guest_min: undefined,
  scaffold_guest_max: undefined,
  contact_first_name: "",
  contact_last_name: "",
  contact_email: "",
  contact_phone: "",
  contact_alt_phone: "",
  contact_method: "Walk-in",
  payment_method: "cash",
  total_price: "",
  balance_payment_preference: "in_person",
};

// ─── Square / Rich Package Card (Matching Customer Dashboard & Packages Layout) ─────
function WalkInPackageCard({ pkg, isSelected, onSelect }) {
  const isCombo = isSpecialOffer(pkg);
  const capacity = capacityLabel(pkg);
  const service = serviceLabel(pkg);
  const event = eventTypeForPackage(pkg);
  const priceInfo = packagePriceParts(pkg);
  const perPax = isCombo ? offerPricePerPax(pkg) : 0;
  const pax = isCombo ? offerGuestCount(pkg) : 0;

  if (isCombo) {
    return (
      <article
        onClick={onSelect}
        className={cn(
          "ls-pkg ls-offer relative transition-all duration-200 cursor-pointer select-none",
          isSelected
            ? "!border-amber-400 ring-2 ring-amber-400 shadow-xl"
            : "hover:border-amber-300"
        )}
      >
        <div className="ls-pkg-media">
          {pkg.image_url ? (
            <img
              src={pkg.image_url}
              alt={`${pkg.name} combo pack`}
              loading="lazy"
            />
          ) : (
            <div className="ls-pkg-media-empty">{pkg.name}</div>
          )}
          <span className="ls-offer-tag">Combo pack</span>
          {isSelected && (
            <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-md">
              <Check size={13} strokeWidth={3} />
            </span>
          )}
        </div>

        <div className="ls-pkg-body">
          <h3>{pkg.name}</h3>

          {perPax > 0 && (
            <p className="ls-offer-price">
              <strong>{peso(perPax)}</strong>
              <span>per pax</span>
            </p>
          )}

          {pkg.description && (
            <p className="ls-pkg-desc">{pkg.description}</p>
          )}

          <div className="ls-pkg-actions">
            <button
              type="button"
              className={cn(
                "ls-btn ls-btn--block",
                isSelected
                  ? "!bg-amber-400 !border-amber-400 !text-slate-950 font-bold hover:bg-amber-300"
                  : "ls-btn--primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected ? (
                <>
                  <Check size={14} strokeWidth={2.5} /> Selected Combo
                </>
              ) : (
                "Select Combo"
              )}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onSelect}
      className={cn(
        "ls-pkg relative transition-all duration-200 cursor-pointer select-none",
        isSelected
          ? "!border-[#4C81E0] ring-2 ring-[#4C81E0] shadow-md bg-blue-50/15"
          : "hover:border-slate-300"
      )}
    >
      <div className="ls-pkg-media">
        {pkg.image_url ? (
          <img
            src={pkg.image_url}
            alt={`${pkg.name} package`}
            loading="lazy"
          />
        ) : (
          <div className="ls-pkg-media-empty">{pkg.name}</div>
        )}
        {event ? (
          <span className="ls-pkg-tag">{event}</span>
        ) : (
          <span className="ls-pkg-tag">{pkg.package_type || "Package"}</span>
        )}
        {isSelected && (
          <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#4C81E0] text-white shadow-md">
            <Check size={13} strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="ls-pkg-body">
        <h3>{pkg.name}</h3>
        {service && <p className="ls-pkg-service">{service}</p>}
        {pkg.description && (
          <p className="ls-pkg-desc">{pkg.description}</p>
        )}

        <dl className="ls-pkg-facts">
          <div className="ls-pkg-fact">
            <dt>Price</dt>
            <dd className="ls-pkg-price-val">
              {priceInfo.amount ? (
                <>
                  {priceInfo.prefix && (
                    <span className="ls-pkg-price-sub">{priceInfo.prefix}</span>
                  )}
                  <strong className="ls-pkg-price-amount">{priceInfo.amount}</strong>
                  {priceInfo.suffix && (
                    <span className="ls-pkg-price-sub">{priceInfo.suffix}</span>
                  )}
                </>
              ) : (
                <strong className="ls-pkg-price-text">{priceInfo.text}</strong>
              )}
            </dd>
          </div>
          {capacity && (
            <div className="ls-pkg-fact">
              <dt>Estimated Guests</dt>
              <dd>
                <strong className="ls-pkg-guests-val">{capacity}</strong>
              </dd>
            </div>
          )}
        </dl>

        <div className="ls-pkg-actions">
          <button
            type="button"
            className={cn(
              "ls-btn ls-btn--block",
              isSelected
                ? "!bg-[#4C81E0] !border-[#4C81E0] text-white font-bold hover:bg-[#3b6ecc]"
                : "ls-btn--primary"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {isSelected ? (
              <>
                <Check size={14} strokeWidth={2.5} /> Selected Package
              </>
            ) : (
              "Select Package"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Step 0: Booking Setup ───────────────────────────────────────────────────
function StageBookingSetup({ form, setForm, packages, errors }) {
  const [pkgTab, setPkgTab] = useState("all");
  const [pkgSearch, setPkgSearch] = useState("");

  const regularPackages = useMemo(() => {
    return packages.filter((p) => !isSpecialOffer(p));
  }, [packages]);

  const comboPackages = useMemo(() => {
    return packages.filter((p) => isSpecialOffer(p));
  }, [packages]);

  const filterList = (list) => {
    if (!pkgSearch.trim()) return list;
    const q = pkgSearch.toLowerCase();
    return list.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.package_type || "").toLowerCase().includes(q) ||
        (p.event_type || "").toLowerCase().includes(q)
    );
  };

  const filteredRegular = useMemo(() => filterList(regularPackages), [regularPackages, pkgSearch]);
  const filteredCombo = useMemo(() => filterList(comboPackages), [comboPackages, pkgSearch]);

  const totalFilteredCount =
    pkgTab === "regular"
      ? filteredRegular.length
      : pkgTab === "combo"
        ? filteredCombo.length
        : filteredRegular.length + filteredCombo.length;

  const handleSelectPackage = (pkg) => {
    const isCombo = isSpecialOffer(pkg);
    const comboPax = isCombo ? offerGuestCount(pkg) : 0;
    const isFoodOnlyPkg = pkg.package_type === "Food Only";

    let serviceType = SERVICE_TYPES.FULL_SERVICE;
    let includeFood = true;
    if (isFoodOnlyPkg) {
      serviceType = SERVICE_TYPES.FOOD_ONLY;
      includeFood = true;
    } else if (pkg.package_type === "Event Setup Only") {
      // In walk-in client booking flow, existing packages include the Menu step by default.
      // Customer/admin can choose catering dishes to go with the setup.
      serviceType = SERVICE_TYPES.FULL_SERVICE;
      includeFood = true;
    }

    setForm((prev) => ({
      ...prev,
      package_id: pkg._id,
      service_type: serviceType,
      include_food: includeFood,
      is_custom_setup: false,
      ...(comboPax > 0 ? { guest_count: String(comboPax) } : {}),
      delivery_method: isCombo
        ? (isFoodOnlyPkg ? "pickup" : (prev.delivery_method || "pickup"))
        : "setup",
    }));
  };

  const handleSelectServiceType = (val) => {
    setForm((prev) => ({
      ...prev,
      service_type: val,
      include_food: val !== SERVICE_TYPES.SETUP_ONLY,
      package_id: "",
      is_custom_setup: true,
      selected_menu: val === SERVICE_TYPES.SETUP_ONLY ? [] : prev.selected_menu,
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── Section: Booking Type ── */}
      <div>
        <p className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1.5">
          Booking Type
        </p>
        <p className="text-xs text-slate-500 mb-3.5">
          Choose whether you are selecting an existing predefined package or creating a customized booking for the walk-in customer.
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
                service_type: prev.service_type || SERVICE_TYPES.FULL_SERVICE,
                include_food: prev.service_type !== SERVICE_TYPES.SETUP_ONLY,
                is_custom_setup: true,
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
        <div className="pt-5 border-t border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1">
                Existing Packages
              </p>
              <p className="text-xs text-slate-500">
                Choose a predefined package or special offer combo pack from your system.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category tabs */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPkgTab("all")}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors cursor-pointer",
                    pkgTab === "all"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  All ({packages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPkgTab("regular")}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors cursor-pointer",
                    pkgTab === "regular"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Regular Packages ({regularPackages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPkgTab("combo")}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors cursor-pointer",
                    pkgTab === "combo"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Combo Packs ({comboPackages.length})
                </button>
              </div>

              {/* Search packages */}
              <div className="relative min-w-[200px]">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
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

          {totalFilteredCount === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <Package size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No packages match your search</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or tab filter.</p>
              {(pkgSearch || pkgTab !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setPkgSearch("");
                    setPkgTab("all");
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Clear search &amp; filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Category 1: Regular Packages */}
              {(pkgTab === "all" || pkgTab === "regular") && filteredRegular.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        Regular Packages
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {filteredRegular.length} {filteredRegular.length === 1 ? "package" : "packages"} available
                      </p>
                    </div>
                  </div>

                  <div className="ls-card-grid">
                    {filteredRegular.map((pkg) => (
                      <WalkInPackageCard
                        key={pkg._id}
                        pkg={pkg}
                        isSelected={form.package_id === pkg._id}
                        onSelect={() => handleSelectPackage(pkg)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Special Offers & Combo Packs */}
              {(pkgTab === "all" || pkgTab === "combo") && filteredCombo.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={16} className="text-amber-500" />
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Special Offers &amp; Combo Packs
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Curated combo meals with set pricing per plate ready to book
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {filteredCombo.length} {filteredCombo.length === 1 ? "combo" : "combos"}
                    </span>
                  </div>

                  <div className="ls-card-grid">
                    {filteredCombo.map((pkg) => (
                      <WalkInPackageCard
                        key={pkg._id}
                        pkg={pkg}
                        isSelected={form.package_id === pkg._id}
                        onSelect={() => handleSelectPackage(pkg)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Option B: Customize Booking Services (shown ONLY when Customize Booking is active) ── */}
      {form.package_type === "custom" && (
        <div className="pt-5 border-t border-slate-100 space-y-4">
          <div>
            <p className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1">
              Service Type
            </p>
            <p className="text-xs text-slate-500">
              Select the service combination to customize. Next steps will guide you through date, theme, menu, and equipment.
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

// ─── Contact Info Wrapper with Customer Autofill ──────────────────────────────
function WalkInContactStep({ form, setForm, customers, errors }) {
  return (
    <div className="space-y-4">
      {/* Existing Customer Quick Selector */}
      {customers?.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 sm:px-4">
          <div>
            <p className="text-xs font-bold text-blue-900">Existing Customer Account</p>
            <p className="text-[11.5px] text-blue-700/80">
              Optional: Select an existing client to autofill contact details or link this walk-in booking.
            </p>
          </div>
          <select
            className="text-xs text-blue-800 bg-white border border-blue-300 rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[220px]"
            defaultValue=""
            onChange={(e) => {
              const cust = customers.find((c) => c._id === e.target.value);
              if (cust) {
                const parts = String(cust.full_name || "").trim().split(/\s+/).filter(Boolean);
                const firstName = cust.first_name || parts[0] || "";
                const lastName = cust.last_name || parts.slice(1).join(" ") || "";
                setForm((prev) => ({
                  ...prev,
                  customer_id: cust._id,
                  contact_first_name: firstName || prev.contact_first_name,
                  contact_last_name: lastName || prev.contact_last_name,
                  contact_email: cust.email || prev.contact_email,
                  contact_phone: normalizePhone(cust.phone || prev.contact_phone),
                }));
              }
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Select existing customer...
            </option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.full_name || c.email} {c.email ? `(${c.email})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Customer Step Form */}
      <StepContactInfo form={form} setForm={setForm} errors={errors} />
    </div>
  );
}

// ─── Quotation Builder Helpers ───────────────────────────────────────────────
const inclusionText = (inclusion) =>
  typeof inclusion === "string" ? inclusion : String(inclusion?.name || inclusion || "");

const inclusionRow = (name, partial = {}) => {
  const text = inclusionText(name);
  const parsed = parseInclusionQuantity(text);
  return {
    name: text,
    removed: false,
    deduction: "",
    fromPackage: true,
    baseQuantity: parsed ? parsed.quantity : null,
    quantity: parsed ? parsed.quantity : null,
    unitPrice: "",
    ...partial,
  };
};

const menuRow = (partial = {}) => ({
  name: "",
  category: "",
  note: "",
  quantity: 1,
  unit: "",
  pricing_type: MENU_PRICING.QUANTITY,
  price: "",
  image_url: "",
  isCustomUnit: false,
  removed: false,
  ...partial,
});

const numberOf = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const toDateInput = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

// ─── Step: Review & Final Confirmation (Read-only Summary) ───────────────────
function WalkInReviewAndQuotation({
  form,
  packageDetails,
  estimate,
  quotationItems = [],
  quotationSubtotal = 0,
  quotationGrandTotal = 0,
  depositAmount = 0,
  depositPercentage = 20,
  remainingBalance = 0,
  paymentMethod = "cash",
  depositPaidImmediately = true,
  balancePreference = "in_person",
  quotationNotes = "",
  onEditStep,
  editTargets,
}) {
  const isOffer = isSpecialOffer(packageDetails);
  const guestCount = parseNumber(form.guest_count) || 0;
  const dishes = form.selected_menu || [];
  const addOns = form.selected_package_addons || [];

  const paymentMethodObj = PAYMENT_METHODS.find((pm) => pm.value === paymentMethod) || {
    label: paymentMethod || "Cash",
  };

  const balancePrefLabel =
    balancePreference === "in_person"
      ? "In Person / On Event Day"
      : balancePreference === "online"
        ? "Online (GCash / Bank Transfer / PayMongo)"
        : "Not Selected";

  const getCategoryBadge = (category) => {
    switch (category) {
      case "Package":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Menu":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Add-on":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Equipment":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Deduction":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Extra":
      case "Logistics":
      case "Fee":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const SummaryCard = ({ icon: Icon, title, onEditClick, children }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-blue-600" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{title}</p>
        </div>
        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            <Pencil size={11} /> Edit
          </button>
        )}
      </div>
      <div className="space-y-1 text-xs text-slate-600">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          Review &amp; Final Confirmation
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Review client details, event schedule, and the priced quotation breakdown before confirming and creating the reservation.
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <SummaryCard
          icon={Users}
          title="Client Information"
          onEditClick={() => onEditStep(editTargets?.contact)}
        >
          <p className="font-semibold text-sm text-slate-800">
            {form.contact_first_name} {form.contact_last_name}
          </p>
          <p className="text-slate-500">{form.contact_email}</p>
          <p className="text-slate-500">{form.contact_phone}</p>
          {form.contact_alt_phone && (
            <p className="text-slate-400">Alt: {form.contact_alt_phone}</p>
          )}
          <p className="text-slate-400 capitalize">Method: {form.contact_method}</p>
        </SummaryCard>

        {/* Event Details */}
        <SummaryCard
          icon={CalendarDays}
          title="Event & Schedule"
          onEditClick={() => onEditStep(editTargets?.schedule)}
        >
          <p className="font-semibold text-sm text-slate-800">
            {form.event_type || "Event"}
            {form.celebrant_name ? ` (Honoree: ${form.celebrant_name})` : ""}
          </p>
          <p className="text-slate-500">
            {form.event_date ? formatEventDate(form.event_date) : "—"} · {form.start_time} (
            {form.duration_hours} hrs)
          </p>
          <p className="font-medium text-slate-700">{guestCount} Guests</p>
          {form.event_theme && (
            <p className="text-slate-500">Theme: {form.event_theme}</p>
          )}
          {form.delivery_method === "pickup" ? (
            <p className="text-slate-500">Fulfillment: Pickup</p>
          ) : (
            <p className="text-slate-500 line-clamp-1">
              Venue: {[form.street, form.barangay, form.municipality, form.province]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          )}
        </SummaryCard>

        {/* Package & Setup */}
        <SummaryCard
          icon={Package}
          title="Package & Service"
          onEditClick={() => onEditStep(editTargets?.packageSetup)}
        >
          <p className="font-semibold text-sm text-slate-800">
            {packageDetails?.name ||
              (form.is_custom_setup ? "Custom Setup Design" : "Custom Service")}
          </p>
          <p className="text-slate-500">
            {SERVICE_LABELS[form.service_type] || form.service_type}
          </p>
          {(form.scaffold_width && form.scaffold_length) ? (
            <p className="text-slate-500">
              Setup Size: {form.scaffold_width}×{form.scaffold_length} ft
            </p>
          ) : form.scaffold_size ? (
            <p className="text-slate-500">
              Setup Size: {form.scaffold_size}
            </p>
          ) : null}
        </SummaryCard>

        {/* Food & Add-ons */}
        <SummaryCard
          icon={Utensils}
          title="Menu & Add-ons"
          onEditClick={() => onEditStep(editTargets?.food || editTargets?.extras)}
        >
          {isOffer ? (
            <p className="font-semibold text-slate-800">Combo Special Offer Menu</p>
          ) : form.include_food !== false ? (
            <p className="font-semibold text-slate-800">
              {dishes.length} Catering Dishes Selected
            </p>
          ) : (
            <p className="text-slate-400 italic">No food included</p>
          )}
          {addOns.length > 0 && (
            <p className="text-slate-500">{addOns.length} Add-on Services</p>
          )}
          {form.dietary_restrictions && (
            <p className="text-amber-700 line-clamp-1">
              Dietary: {form.dietary_restrictions}
            </p>
          )}
          {form.allergies && (
            <p className="text-red-700 line-clamp-1">Allergies: {form.allergies}</p>
          )}
        </SummaryCard>
      </div>

      {/* ── Read-Only Itemized Quotation Table ── */}
      <div className="rounded-2xl border-2 border-blue-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-blue-200 bg-blue-50/50 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
              Finalized Quotation Breakdown ({quotationItems.length} lines)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(editTargets?.quotation || "Quotation")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-50 transition cursor-pointer"
          >
            <Pencil size={12} /> Edit Quotation &amp; Prices
          </button>
        </div>

        {quotationItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No items in quotation. Please click &ldquo;Edit Quotation &amp; Prices&rdquo; to add items.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Desktop Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-5 py-2.5 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-6">Item / Service</div>
              <div className="col-span-2 text-center">Qty &amp; Unit</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            {/* Rows */}
            {quotationItems.map((item, idx) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.unitPrice) || 0;
              const lineTotal = qty * price;

              return (
                <div
                  key={item.key || `row-${idx}`}
                  className="px-5 py-3 flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 items-start sm:items-center hover:bg-slate-50/50 transition-colors text-xs"
                >
                  <div className="sm:col-span-6 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border shrink-0",
                          getCategoryBadge(item.category)
                        )}
                      >
                        {item.category || "Item"}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2 text-left sm:text-center text-slate-700 font-medium">
                    <span className="sm:hidden text-slate-400">Qty: </span>
                    {qty} {item.unit || "unit"}
                  </div>

                  <div className="sm:col-span-2 text-left sm:text-right text-slate-600 font-mono">
                    <span className="sm:hidden text-slate-400">Unit: </span>
                    {price < 0 ? `-${formatCurrency(Math.abs(price))}` : formatCurrency(price)}
                  </div>

                  <div className="sm:col-span-2 text-left sm:text-right font-bold tabular-nums">
                    <span className="sm:hidden text-slate-400 font-normal">Subtotal: </span>
                    <span className={lineTotal < 0 ? "text-emerald-700 font-bold" : "text-slate-900"}>
                      {lineTotal < 0 ? `-${formatCurrency(Math.abs(lineTotal))}` : formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Totals Summary Footer */}
        <div className="bg-slate-50/90 border-t border-slate-200 px-5 py-3 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Quotation Subtotal:</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatCurrency(quotationSubtotal)}
            </span>
          </div>


          <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Booking Amount:</span>
            <span className="text-base text-blue-700 font-extrabold tabular-nums">
              {formatCurrency(quotationGrandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Financial Highlights & Payment Confirmation ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Payment Terms &amp; Confirmation Status
        </h3>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Booking Price
            </span>
            <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {formatCurrency(quotationGrandTotal)}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Deposit Required ({depositPercentage}%)
            </span>
            <p className="text-lg sm:text-xl font-bold text-blue-800 tabular-nums mt-0.5">
              {formatCurrency(depositAmount)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Balance Remaining
            </span>
            <p className="text-lg sm:text-xl font-bold text-slate-700 tabular-nums mt-0.5">
              {formatCurrency(remainingBalance)}
            </p>
          </div>
        </div>

        {/* Payment Details List */}
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-500">Payment Method:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CreditCard size={14} className="text-blue-600" />
              {paymentMethodObj.label}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-500">Deposit Status:</span>
            {depositPaidImmediately ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 size={12} /> Immediate Deposit Collected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                <Clock size={12} /> Pending Deposit Payment
              </span>
            )}
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="text-slate-500">Balance Payment:</span>
            <span className="font-medium text-slate-700">{balancePrefLabel}</span>
          </div>

          {quotationNotes && (
            <div className="p-3">
              <span className="text-slate-500 block mb-0.5">Quotation Remarks:</span>
              <p className="text-slate-800 font-medium italic">{quotationNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────
export default function WalkInBookingModal({ open, onClose, onCreated }) {
  const { notify } = useToast();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  // Flow State
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Walk-in Quotation Builder State (Exact Admin Quotation Builder)
  const [quotationPackageName, setQuotationPackageName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [inclusions, setInclusions] = useState([]);
  const [selectedScaffoldId, setSelectedScaffoldId] = useState("");
  const [scaffoldWidth, setScaffoldWidth] = useState("");
  const [scaffoldLength, setScaffoldLength] = useState("");
  const [isCustomScaffold, setIsCustomScaffold] = useState(false);
  const [quotationMenuItems, setQuotationMenuItems] = useState([]);
  const [quotationAddOns, setQuotationAddOns] = useState([]);
  const [transportationFee, setTransportationFee] = useState("");
  const [additionalFees, setAdditionalFees] = useState([]);
  const [depositPercent, setDepositPercent] = useState(20);
  const [customDeposit, setCustomDeposit] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [depositPaidImmediately, setDepositPaidImmediately] = useState(true);
  const [balancePreference, setBalancePreference] = useState("in_person");
  const [quotationNotes, setQuotationNotes] = useState("");
  const [isQuotationDirty, setIsQuotationDirty] = useState(false);

  // Catalogs
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [addons, setAddons] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({});
  const [packageDetails, setPackageDetails] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Availability State
  const [availability, setAvailability] = useState({ status: "idle", message: "" });
  const [suggestedDates, setSuggestedDates] = useState([]);
  const [availabilityNonce, setAvailabilityNonce] = useState(0);

  // Form State
  const [form, setForm] = useState(EMPTY_FORM);
  const [menuNav, setMenuNav] = useState(null);

  // Load catalogs on modal open
  useEffect(() => {
    if (!open) return;
    setLoadingCatalogs(true);
    Promise.all([
      AdminAPI.getPackages(),
      AdminAPI.getMenu(),
      AdminAPI.getCustomers(),
      CustomerAPI.getAddons(),
      CustomerAPI.getBusinessInfo(),
    ])
      .then(([pkgRes, menuRes, custRes, addRes, bizRes]) => {
        setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : []);
        setMenuItems(
          (Array.isArray(menuRes.data) ? menuRes.data : []).filter(
            (m) => m?.available !== false
          )
        );
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
        setAddons(
          (Array.isArray(addRes.data) ? addRes.data : []).filter(
            (a) => a?.available !== false
          )
        );
        setBusinessInfo(bizRes.data || {});
        if (bizRes.data?.deposit_percentage) {
          setDepositPercent(bizRes.data.deposit_percentage);
        }
      })
      .catch(() => notify("Failed to load catalog data.", "error"))
      .finally(() => setLoadingCatalogs(false));
  }, [open]);

  // Load packageDetails when package_id changes
  useEffect(() => {
    if (!form.package_id || form.package_id === "none") {
      setPackageDetails(null);
      return;
    }
    CustomerAPI.getPackageById(form.package_id)
      .then((res) => setPackageDetails(res.data))
      .catch(() => setPackageDetails(null));
  }, [form.package_id]);

  // Reload inventory availability when event date changes
  useEffect(() => {
    if (!open) return;
    AdminAPI.getInventoryAvailability(form.event_date || undefined)
      .then((res) => setInventoryItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setInventoryItems([]));
  }, [open, form.event_date]);

  // Track maximum step reached for clickable stepper navigation
  useEffect(() => {
    setMaxStepReached((prev) => Math.max(prev, step));
  }, [step]);

  // Reset maxStepReached if flow configuration changes on Step 0
  const prevFlowRef = useRef(`${form.package_type}:${form.service_type}`);
  useEffect(() => {
    const currentFlow = `${form.package_type}:${form.service_type}`;
    if (prevFlowRef.current !== currentFlow) {
      prevFlowRef.current = currentFlow;
      if (step === 0) {
        setMaxStepReached(0);
      }
    }
  }, [form.package_type, form.service_type, step]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setMaxStepReached(0);
      setIsEditing(false);
      setStepErrors({});
      setForm(EMPTY_FORM);
      setPackageDetails(null);
      setDepositPaidImmediately(true);
      setQuotationPackageName("");
      setStartingPrice("");
      setInclusions([]);
      setSelectedScaffoldId("");
      setScaffoldWidth("");
      setScaffoldLength("");
      setIsCustomScaffold(false);
      setQuotationMenuItems([]);
      setQuotationAddOns([]);
      setTransportationFee("");
      setAdditionalFees([]);
      setDepositPercent(businessInfo?.deposit_percentage ?? 20);
      setCustomDeposit("");
      setPaymentMethod("cash");
      setBalancePreference("in_person");
      setQuotationNotes("");
      setIsQuotationDirty(false);
    }
  }, [open, businessInfo?.deposit_percentage]);

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Selected package resolution (either detailed package or matching package in list)
  const activePackage = packageDetails || packages.find((p) => p._id === form.package_id) || null;
  const isOffer = isSpecialOffer(activePackage);
  const offerPax = isOffer ? offerGuestCount(activePackage) : 0;
  const isCustomBooking = form.package_type === "custom";

  const hasSelectedFood =
    (Array.isArray(form.selected_menu) && form.selected_menu.length > 0) ||
    (isOffer && Array.isArray(form.offer_food_snapshot) && form.offer_food_snapshot.length > 0);

  const isFoodOnly =
    (isCustomBooking && form.service_type === SERVICE_TYPES.FOOD_ONLY) ||
    (isOffer && form.service_type === SERVICE_TYPES.FOOD_ONLY) ||
    form.service_type === SERVICE_TYPES.FOOD_ONLY ||
    (activePackage?.package_type === "Food Only" && !form.is_custom_setup);

  const isSetupOnly =
    !hasSelectedFood &&
    ((isCustomBooking && form.service_type === SERVICE_TYPES.SETUP_ONLY) ||
      (form.include_food === false && packageDetails?.package_type === "Event Setup Only") ||
      form.service_type === SERVICE_TYPES.SETUP_ONLY);

  const isEventSetupOnly = isSetupOnly;
  const isFoodAndEventSetup =
    (isCustomBooking && form.service_type === SERVICE_TYPES.FULL_SERVICE) ||
    (!isFoodOnly && !isSetupOnly);

  const deliveryMethod = isOffer
    ? form.delivery_method || "setup"
    : isFoodOnly
      ? form.delivery_method
      : "setup";

  const requireAvailabilityCheck = isOffer
    ? form.delivery_method === "setup"
    : !isFoodOnly;

  // Guest bounds calculation
  const { guestMin, guestMax } = useMemo(() => {
    const positive = (candidate) => {
      const parsed = Number(candidate);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    if (isOffer) {
      const pkgMin = positive(packageDetails?.guest_min) || 1;
      const pkgMax =
        positive(packageDetails?.guest_max) ||
        positive(packageDetails?.guest_count) ||
        null;
      return { guestMin: pkgMin, guestMax: pkgMax };
    }

    const scaffoldMax = positive(form.scaffold_guest_max);
    const pkgExplicitMax = positive(packageDetails?.guest_max);

    if (scaffoldMax || pkgExplicitMax) {
      return {
        guestMin: 1,
        guestMax: scaffoldMax || pkgExplicitMax || null,
      };
    }

    const [, rangeMax] = guestRange(packageDetails);
    if (rangeMax) {
      return {
        guestMin: 1,
        guestMax: rangeMax || null,
      };
    }

    return { guestMin: 1, guestMax: null };
  }, [
    isOffer,
    packageDetails,
    form.scaffold_guest_max,
  ]);

  // Setup capacity indicator
  const setupCapacity = useMemo(() => {
    if (
      form.service_type !== SERVICE_TYPES.SETUP_ONLY &&
      !form.selected_scaffold_option_id &&
      !form.scaffold_width
    )
      return null;

    let max = Number(form.scaffold_guest_max) || null;

    if (!max) return null;

    const guests = parseNumber(form.guest_count) || 0;
    const label = `up to ${max} guests`;

    if (!guests) return { status: "info", message: `Setup recommended for ${label}.` };
    if (max && guests > max)
      return { status: "over", message: `Setup recommended for ${label}. Consider larger size.` };
    return { status: "ok", message: `Setup comfortably fits ${label}.` };
  }, [
    form.service_type,
    form.selected_scaffold_option_id,
    form.scaffold_guest_max,
    form.scaffold_width,
    form.guest_count,
  ]);

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(form.municipality),
    [form.municipality]
  );

  // Sync scaffold options when packageDetails loads
  useEffect(() => {
    if (!packageDetails || isOffer || form.is_custom_setup) return;
    const opts = packageDetails.scaffold_size_options;
    if (!Array.isArray(opts) || opts.length === 0) return;

    setForm((prev) => {
      const currentMatched = opts.find(
        (o) => String(o._id) === String(prev.selected_scaffold_option_id)
      );
      const chosen =
        currentMatched ||
        opts.find((o) => String(o._id) === String(packageDetails.default_scaffold_option_id)) ||
        opts[0];

      if (!chosen) return prev;

      const max = chosen.guest_max ? Number(chosen.guest_max) : null;
      let nextGuests = prev.guest_count;
      const parsed = Number(prev.guest_count);
      if (Number.isFinite(parsed)) {
        if (max && parsed > max) nextGuests = String(max);
        else if (parsed < 1) nextGuests = "1";
      }

      const area =
        chosen.area_ft2 ||
        (chosen.width_ft && chosen.length_ft ? chosen.width_ft * chosen.length_ft : undefined);

      return {
        ...prev,
        selected_scaffold_option_id: String(chosen._id),
        scaffold_width: chosen.width_ft,
        scaffold_length: chosen.length_ft,
        scaffold_base_area: area,
        scaffold_price: chosen.price,
        scaffold_guest_min: chosen.guest_min,
        scaffold_guest_max: chosen.guest_max,
        guest_count: nextGuests,
      };
    });
  }, [packageDetails, isOffer, form.is_custom_setup]);


  // Seed menu from package
  const seededPackageId = useRef(null);
  useEffect(() => {
    if (!packageDetails) return;
    if (form.service_type !== SERVICE_TYPES.FULL_SERVICE) return;
    if (!Array.isArray(packageDetails.menu_items)) return;
    if (menuItems.length === 0) return;
    if (seededPackageId.current === String(packageDetails._id)) return;

    seededPackageId.current = String(packageDetails._id);
    const packageMenuIds = packageDetails.menu_items.map((entry) =>
      String(entry?._id || entry)
    );
    setForm((prev) => ({
      ...prev,
      selected_menu: menuItems.filter((item) =>
        packageMenuIds.includes(String(item._id))
      ),
    }));
  }, [packageDetails, form.service_type, menuItems]);

  // Carry equipment from package
  useEffect(() => {
    if (!packageDetails || isOffer || form.service_type === SERVICE_TYPES.FOOD_ONLY) return;
    const equipment = packageDetails.setup_equipment;
    if (!Array.isArray(equipment) || equipment.length === 0) return;

    setForm((prev) => ({
      ...prev,
      inventory_items: equipment.map((item) => ({
        inventory_id: item.inventory_id?._id || item.inventory_id,
        name: item.name || item.item_name || "Equipment item",
        quantity: Number(item.quantity || 1),
      })),
    }));
  }, [packageDetails, form.service_type, isOffer]);

  // Availability checking
  useEffect(() => {
    if (!form.event_date || !form.start_time) {
      setAvailability({ status: "idle", message: "" });
      return undefined;
    }

    setAvailability({ status: "checking", message: "" });

    const params = {
      event_date: form.event_date,
      start_time: form.start_time,
      duration_hours: form.duration_hours,
      venue_type: resolveVenueType({
        venue_type: form.venue_type,
        venue_type_other: form.venue_type_other,
      }),
      province: form.province,
      municipality: form.municipality,
      barangay: form.barangay,
      street: form.street,
      delivery_method: deliveryMethod,
      service_type: form.service_type,
    };

    const timer = setTimeout(() => {
      CustomerAPI.checkAvailability(params)
        .then((res) => {
          if (res.data?.available) {
            setAvailability({ status: "available", message: "" });
            setSuggestedDates([]);
            return;
          }
          setAvailability({
            status:
              res.data?.blocked || res.data?.inventory_issue ? "blocked" : "unavailable",
            message:
              res.data?.reason ||
              res.data?.inventory_issue ||
              "We already have an event booked at this time.",
          });
        })
        .catch(() => {
          setAvailability({ status: "error", message: "" });
          setSuggestedDates([]);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [
    form.event_date,
    form.start_time,
    form.duration_hours,
    form.venue_type,
    form.venue_type_other,
    form.province,
    form.municipality,
    form.barangay,
    form.street,
    deliveryMethod,
    form.service_type,
    availabilityNonce,
  ]);

  const removeDish = useCallback((item) => {
    setForm((prev) => ({
      ...prev,
      selected_menu: (prev.selected_menu || []).filter(
        (chosen) => String(chosen._id || chosen) !== String(item._id || item)
      ),
    }));
  }, []);

  const clearAllDishes = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      selected_menu: [],
    }));
  }, []);

  // ─── Quotation Builder Synchronization & Handlers ──────────────────────────
  const syncQuotationFromWizard = useCallback(() => {
    // 1. Package Name
    const resolvedPkgName = form.is_custom_setup
      ? form.event_theme
        ? `Custom ${form.event_theme} Event Setup`
        : "Bespoke Custom Event Setup"
      : packageDetails?.name || "Custom Package";
    setQuotationPackageName(resolvedPkgName);

    // 2. Inclusions
    if (form.is_custom_setup) {
      setInclusions(
        (Array.isArray(form.custom_setup_scope) ? form.custom_setup_scope : []).map((s) =>
          inclusionRow(s)
        )
      );
    } else {
      const rawInclusions = Array.isArray(packageDetails?.inclusions)
        ? packageDetails.inclusions
        : [];
      setInclusions(rawInclusions.map((entry) => inclusionRow(entry)));
    }

    // 3. Starting Price
    const guests = parseNumber(form.guest_count) || 1;
    if (isOffer) {
      const baseFood = offerBaseFoodPrice(packageDetails, guests);
      setStartingPrice(baseFood ? String(baseFood) : "");
    } else if (form.is_custom_setup) {
      setStartingPrice("");
    } else {
      const selectedScaffoldOption = Array.isArray(packageDetails?.scaffold_size_options)
        ? packageDetails.scaffold_size_options.find(
            (o) => String(o._id) === String(form.selected_scaffold_option_id)
          )
        : null;
      const effectiveScaffoldPrice = selectedScaffoldOption?.price ?? form.scaffold_price;

      const derived = derivePackageStartingPrice(
        {
          ...form,
          package_id: packageDetails,
          guest_count: form.guest_count,
          scaffold_price: effectiveScaffoldPrice,
        },
        guests
      );
      if (derived) {
        setStartingPrice(String(derived));
      } else if (effectiveScaffoldPrice && Number(effectiveScaffoldPrice) > 0) {
        setStartingPrice(String(effectiveScaffoldPrice));
      } else if (packageDetails?.setup_price) {
        setStartingPrice(String(packageDetails.setup_price));
      } else if (packageDetails?.price_per_guest) {
        setStartingPrice(String(Number(packageDetails.price_per_guest) * guests));
      } else {
        setStartingPrice("");
      }
    }

    // 4. Scaffold size & options
    if (form.is_custom_setup) {
      const parsedDims = form.scaffold_size
        ? String(form.scaffold_size).match(/^(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)/)
        : null;
      const effectiveWidth = form.scaffold_width || (parsedDims ? parsedDims[1] : undefined);
      const effectiveLength = form.scaffold_length || (parsedDims ? parsedDims[2] : undefined);

      setSelectedScaffoldId("custom");
      setIsCustomScaffold(true);
      setScaffoldWidth(effectiveWidth ? String(effectiveWidth) : "");
      setScaffoldLength(effectiveLength ? String(effectiveLength) : "");
    } else {
      const preMadeOptId = form.selected_scaffold_option_id
        ? String(form.selected_scaffold_option_id)
        : packageDetails?.scaffold_size_options?.[0]?._id
          ? String(packageDetails.scaffold_size_options[0]._id)
          : "";
      const chosenOpt = packageDetails?.scaffold_size_options?.find(
        (o) => String(o._id) === String(preMadeOptId)
      );
      setSelectedScaffoldId(preMadeOptId);
      setIsCustomScaffold(Boolean(form.is_custom_scaffold || form.selected_scaffold_option_id === "custom"));
      setScaffoldWidth(
        form.scaffold_width ? String(form.scaffold_width) : (chosenOpt?.width_ft ? String(chosenOpt.width_ft) : "")
      );
      setScaffoldLength(
        form.scaffold_length ? String(form.scaffold_length) : (chosenOpt?.length_ft ? String(chosenOpt.length_ft) : "")
      );
    }

    // 5. Menu Items
    if (isOffer) {
      const foodList =
        Array.isArray(form.offer_food_snapshot) && form.offer_food_snapshot.length > 0
          ? form.offer_food_snapshot.map((item) => ({
            name: item.item_name || item.name,
            category: item.menu_category || item.category || "",
            image_url: item.image_url || "",
          }))
          : packageDetails
            ? offerFoodItems(packageDetails).map((item) => ({
              name: item.item_name || item.name,
              category: item.menu_category || item.category || "",
              image_url: item.image_url || "",
            }))
            : [];

      setQuotationMenuItems(
        foodList.map(({ name, category, image_url }) =>
          menuRow({
            name,
            category,
            note: "Covered by combo package",
            price: 0,
            unit: "Included",
            quantity: 1,
            image_url: image_url || resolveDishImageUrl({ name }, menuItems),
          })
        )
      );
    } else if (cateringIncluded || hasSelectedFood || (Array.isArray(form.selected_menu) && form.selected_menu.length > 0)) {
      setQuotationMenuItems(
        (Array.isArray(form.selected_menu) ? form.selected_menu : []).map((item) => {
          if (item && typeof item === "object") {
            const rawUnit = item.unit || item.portion_unit || "Pax";
            return menuRow({
              name: item.name || "",
              category: item.category || "",
              note: item.note || "",
              unit: rawUnit,
              price: item.price ? String(item.price) : "",
              quantity: item.quantity ? Math.max(1, Number(item.quantity)) : 1,
              image_url: item.image_url || resolveDishImageUrl({ name: item.name }, menuItems),
            });
          }
          return menuRow({
            name: String(item || ""),
            image_url: resolveDishImageUrl({ name: String(item || "") }, menuItems),
          });
        })
      );
    } else {
      setQuotationMenuItems([]);
    }

    // 6. Add-ons
    setQuotationAddOns(
      (Array.isArray(form.selected_package_addons) ? form.selected_package_addons : []).map((item) => ({
        name: item.name || "",
        price: item.price ? String(item.price) : "",
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        note: item.note || "",
        pricing_type: "quantity",
        removed: false,
      }))
    );
  }, [form, packageDetails, isOffer, menuItems]);

  const handleResetQuotationToDefaults = useCallback(() => {
    syncQuotationFromWizard();
    setIsQuotationDirty(false);
    setTransportationFee("");
    setAdditionalFees([]);
    notify("Quotation builder reset to step selections & catalog defaults.", "info");
  }, [syncQuotationFromWizard, notify]);

  // Synchronize quotation when wizard selections change and quotation is not manually edited
  useEffect(() => {
    if (!open) return;
    if (!isQuotationDirty) {
      syncQuotationFromWizard();
    }
  }, [
    open,
    isQuotationDirty,
    syncQuotationFromWizard,
    form.package_id,
    form.package_type,
    form.service_type,
    form.is_custom_setup,
    form.event_theme,
    form.guest_count,
    form.selected_menu,
    form.offer_food_snapshot,
    form.selected_package_addons,
    form.scaffold_price,
    form.scaffold_width,
    form.scaffold_length,
    form.selected_scaffold_option_id,
    packageDetails,
    isOffer,
  ]);

  // Data consistency: Whenever form.selected_menu changes (e.g. user goes back to menu step and changes dishes),
  // synchronize quotationMenuItems so new dishes appear and removed dishes are removed,
  // while preserving any unit price or quantity the admin already configured in Quotation step!
  useEffect(() => {
    if (!open || isOffer) return;
    if (!isQuotationDirty) return;

    setQuotationMenuItems((prevQuoted) => {
      const selectedList = Array.isArray(form.selected_menu) ? form.selected_menu : [];
      const updated = selectedList.map((selectedItem) => {
        const itemName = typeof selectedItem === "object" ? selectedItem.name : String(selectedItem || "");
        const existing = prevQuoted.find(
          (q) => (q.name || "").trim().toLowerCase() === (itemName || "").trim().toLowerCase()
        );
        if (existing) {
          return {
            ...existing,
            category: existing.category || (typeof selectedItem === "object" ? selectedItem.category : ""),
            image_url:
              existing.image_url ||
              (typeof selectedItem === "object" ? selectedItem.image_url : "") ||
              resolveDishImageUrl({ name: itemName }, menuItems),
          };
        }
        return menuRow({
          name: itemName,
          category: typeof selectedItem === "object" ? selectedItem.category || "" : "",
          unit: typeof selectedItem === "object" ? selectedItem.unit || selectedItem.portion_unit || "Pax" : "Pax",
          quantity: typeof selectedItem === "object" && selectedItem.quantity ? Number(selectedItem.quantity) : 1,
          price: typeof selectedItem === "object" && selectedItem.price ? String(selectedItem.price) : "",
          note: typeof selectedItem === "object" ? selectedItem.note || "" : "",
          image_url:
            (typeof selectedItem === "object" ? selectedItem.image_url : "") ||
            resolveDishImageUrl({ name: itemName }, menuItems),
        });
      });
      // Also preserve dishes added manually in the Quotation step that aren't in selectedList
      const extraManual = prevQuoted.filter(
        (pq) => !selectedList.some((s) => {
          const sName = typeof s === "object" ? s.name : String(s || "");
          return (sName || "").trim().toLowerCase() === (pq.name || "").trim().toLowerCase();
        })
      );
      return [...updated, ...extraManual];
    });
  }, [open, isOffer, isQuotationDirty, form.selected_menu, menuItems]);

  // Data consistency: Whenever form.selected_package_addons changes,
  // synchronize quotationAddOns preserving existing prices entered by admin
  useEffect(() => {
    if (!open) return;
    if (!isQuotationDirty) return;

    setQuotationAddOns((prevAddOns) => {
      const selectedList = Array.isArray(form.selected_package_addons) ? form.selected_package_addons : [];
      const updated = selectedList.map((selectedItem) => {
        const itemName = selectedItem.name || "";
        const existing = prevAddOns.find(
          (a) => (a.name || "").trim().toLowerCase() === (itemName || "").trim().toLowerCase()
        );
        if (existing) {
          return {
            ...existing,
            quantity: Number(selectedItem.quantity) || existing.quantity || 1,
          };
        }
        return {
          name: itemName,
          price: selectedItem.price ? String(selectedItem.price) : "",
          quantity: Number(selectedItem.quantity) > 0 ? Number(selectedItem.quantity) : 1,
          note: selectedItem.note || "",
          pricing_type: "quantity",
          removed: false,
        };
      });
      // Also preserve add-ons added manually in the Quotation step that aren't in selectedList
      const extraManualAddons = prevAddOns.filter(
        (pa) => !selectedList.some((s) => (s.name || "").trim().toLowerCase() === (pa.name || "").trim().toLowerCase())
      );
      return [...updated, ...extraManualAddons];
    });
  }, [open, isQuotationDirty, form.selected_package_addons]);

  /* ─── Quotation Builder User Edit Handlers ─── */
  const handleInclusionQuantity = (index, value) => {
    setIsQuotationDirty(true);
    setInclusions((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, quantity: value === "" ? "" : Number(value) } : entry))
    );
  };

  const handleInclusionUnitPrice = (index, value) => {
    setIsQuotationDirty(true);
    setInclusions((prev) => prev.map((entry, i) => (i === index ? { ...entry, unitPrice: value } : entry)));
  };

  const handleInclusionDeduction = (index, value) => {
    setIsQuotationDirty(true);
    setInclusions((prev) => prev.map((entry, i) => (i === index ? { ...entry, deduction: value } : entry)));
  };

  const toggleInclusionRemoved = (index) => {
    setIsQuotationDirty(true);
    setInclusions((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
            ...entry,
            removed: !entry.removed,
            deduction: !entry.removed ? entry.deduction || "" : "",
          }
          : entry
      )
    );
  };

  const scaffoldOptions = useMemo(() => {
    if (form.is_custom_setup) return [];
    return Array.isArray(packageDetails?.scaffold_size_options) ? packageDetails.scaffold_size_options : [];
  }, [form.is_custom_setup, packageDetails]);

  const handleScaffoldOptionChange = (optionId) => {
    setIsQuotationDirty(true);
    if (optionId === "custom") {
      setIsCustomScaffold(true);
      setSelectedScaffoldId("custom");
      return;
    }
    const opt = scaffoldOptions.find(
      (entry, idx) => String(entry?._id) === String(optionId) || String(idx) === String(optionId)
    );
    if (opt) {
      setIsCustomScaffold(false);
      setSelectedScaffoldId(String(opt._id || optionId));
      setScaffoldWidth(opt.width_ft ? String(opt.width_ft) : "");
      setScaffoldLength(opt.length_ft ? String(opt.length_ft) : "");
      if (opt.price != null && Number(opt.price) > 0) {
        setStartingPrice(String(opt.price));
      }
    }
  };

  const handleCustomScaffoldChange = (w, l) => {
    setIsQuotationDirty(true);
    setIsCustomScaffold(true);
    setSelectedScaffoldId("custom");
    setScaffoldWidth(w);
    setScaffoldLength(l);
    setForm((prev) => ({
      ...prev,
      scaffold_width: w ? Number(w) : undefined,
      scaffold_length: l ? Number(l) : undefined,
      scaffold_base_area: (w && l) ? Number(w) * Number(l) : undefined,
      scaffold_size: (w && l) ? `${w}×${l}` : prev.scaffold_size,
    }));
  };

  const handleMenuChange = (index, field, value) => {
    setIsQuotationDirty(true);
    setQuotationMenuItems((prev) => {
      const next = prev.map((item, i) => {
        if (i !== index) return item;
        if (typeof field === "object" && field !== null) {
          return { ...item, ...field };
        }
        return { ...item, [field]: value };
      });

      const updatedItem = next[index];
      if (updatedItem?.name) {
        setForm((prevForm) => {
          if (!Array.isArray(prevForm.selected_menu)) return prevForm;
          return {
            ...prevForm,
            selected_menu: prevForm.selected_menu.map((sm) => {
              const smName = typeof sm === "object" ? sm.name : String(sm || "");
              if ((smName || "").trim().toLowerCase() === (updatedItem.name || "").trim().toLowerCase()) {
                if (typeof sm === "object") {
                  return {
                    ...sm,
                    unit: updatedItem.unit,
                    portion_unit: updatedItem.unit,
                    isCustomUnit: updatedItem.isCustomUnit,
                    quantity: updatedItem.quantity,
                    price: updatedItem.price,
                  };
                }
              }
              return sm;
            }),
          };
        });
      }

      return next;
    });
  };

  const toggleMenuRemoved = (index) => {
    setIsQuotationDirty(true);
    setQuotationMenuItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
  };

  const handleDeleteMenu = (index) => {
    setIsQuotationDirty(true);
    setQuotationMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogDish = (dish) => {
    setIsQuotationDirty(true);
    setQuotationMenuItems((prev) => [
      ...prev,
      menuRow({
        name: dish.name,
        category: dish.category || "",
        price: dish.price ? String(dish.price) : "",
        unit: dish.unit || "Pax",
        quantity: 1,
        image_url: dish.image_url || "",
      }),
    ]);
  };

  const handleAddCustomDish = (name) => {
    if (!name?.trim()) return;
    setIsQuotationDirty(true);
    setQuotationMenuItems((prev) => [
      ...prev,
      menuRow({
        name: name.trim(),
        category: "Custom",
        price: "",
        unit: "Pax",
        quantity: 1,
      }),
    ]);
  };

  const handleSpecialOfferDishReplace = (category, oldDishName, newDishName) => {
    setIsQuotationDirty(true);
    const dishImg = resolveDishImageUrl({ name: newDishName }, menuItems) || "";
    setQuotationMenuItems((prev) => {
      const cleanCat = (category || "").toLowerCase();
      const targetIdx = prev.findIndex(
        (m) =>
          !m.removed &&
          (m.category || "").toLowerCase() === cleanCat &&
          (m.name || "").trim().toLowerCase() === (oldDishName || "").trim().toLowerCase()
      );
      if (targetIdx !== -1) {
        const next = [...prev];
        next[targetIdx] = menuRow({
          name: newDishName,
          category: category,
          note: "Included in combo package",
          unit: "Included",
          price: 0,
          quantity: 1,
          image_url: dishImg,
        });
        return next;
      }
      return [
        ...prev,
        menuRow({
          name: newDishName,
          category: category,
          note: "Included in combo package",
          unit: "Included",
          price: 0,
          quantity: 1,
          image_url: dishImg,
        }),
      ];
    });
  };

  const handleSpecialOfferDishRemove = (dishName, category) => {
    setIsQuotationDirty(true);
    setQuotationMenuItems((prev) =>
      prev.filter((m) => {
        const sameName = (m.name || "").trim().toLowerCase() === (dishName || "").trim().toLowerCase();
        const sameCat = !category || (m.category || "").toLowerCase() === (category || "").toLowerCase();
        return !(sameName && sameCat);
      })
    );
  };

  const handleSpecialOfferDishSelect = (dishName, category) => {
    setIsQuotationDirty(true);
    const dishImg = resolveDishImageUrl({ name: dishName }, menuItems) || "";
    setQuotationMenuItems((prev) => {
      if (prev.some((m) => !m.removed && (m.name || "").trim().toLowerCase() === (dishName || "").trim().toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        menuRow({
          name: dishName,
          category: category,
          note: "Included in combo package",
          unit: "Included",
          price: 0,
          quantity: 1,
          image_url: dishImg,
        }),
      ];
    });
  };

  const handleResetSpecialOfferFood = () => {
    setIsQuotationDirty(true);
    const original = (Array.isArray(form.offer_food_snapshot) && form.offer_food_snapshot.length > 0)
      ? form.offer_food_snapshot.map((item) => ({ name: item.item_name, category: item.menu_category || "", image_url: item.image_url || "" }))
      : (packageDetails ? offerFoodItems(packageDetails).map((item) => ({ name: item.item_name, category: item.menu_category || "", image_url: item.image_url || "" })) : []);

    setQuotationMenuItems(
      original.map(({ name, category, image_url }) =>
        menuRow({
          name,
          category,
          note: "Covered by combo package",
          price: 0,
          unit: "Included",
          quantity: 1,
          image_url: image_url || resolveDishImageUrl({ name }, menuItems) || "",
        })
      )
    );
  };

  const handleAddOnChange = (index, field, value) => {
    setIsQuotationDirty(true);
    setQuotationAddOns((prev) => {
      const next = prev.map((item, i) => {
        if (i !== index) return item;
        if (typeof field === "object" && field !== null) {
          return { ...item, ...field };
        }
        return { ...item, [field]: value };
      });

      const updatedAddon = next[index];
      if (updatedAddon?.name) {
        setForm((prevForm) => {
          if (!Array.isArray(prevForm.selected_package_addons)) return prevForm;
          return {
            ...prevForm,
            selected_package_addons: prevForm.selected_package_addons.map((sa) => {
              if ((sa.name || "").trim().toLowerCase() === (updatedAddon.name || "").trim().toLowerCase()) {
                return {
                  ...sa,
                  quantity: updatedAddon.quantity,
                  price: updatedAddon.price,
                };
              }
              return sa;
            }),
          };
        });
      }

      return next;
    });
  };

  const toggleAddOnRemoved = (index) => {
    setIsQuotationDirty(true);
    setQuotationAddOns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
  };

  const handleDeleteAddOn = (index) => {
    setIsQuotationDirty(true);
    setQuotationAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogAddon = (addon) => {
    const addonName = (addon.name || "").trim();
    if (!addonName) return;
    setIsQuotationDirty(true);
    setQuotationAddOns((prev) => {
      const activeIdx = prev.findIndex(
        (a) => !a.removed && (a.name || "").trim().toLowerCase() === addonName.toLowerCase()
      );
      if (activeIdx !== -1) {
        return prev;
      }
      const removedIdx = prev.findIndex(
        (a) => a.removed && (a.name || "").trim().toLowerCase() === addonName.toLowerCase()
      );
      if (removedIdx !== -1) {
        return prev.map((a, i) =>
          i === removedIdx
            ? { ...a, removed: false, quantity: 1, price: addon.price ? String(addon.price) : a.price }
            : a
        );
      }
      return [
        ...prev,
        {
          name: addonName,
          price: addon.price ? String(addon.price) : "",
          quantity: 1,
          note: "",
          pricing_type: "quantity",
          removed: false,
        },
      ];
    });
  };

  const handleAddCustomAddon = (name) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    setIsQuotationDirty(true);
    setQuotationAddOns((prev) => {
      const activeIdx = prev.findIndex(
        (a) => !a.removed && (a.name || "").trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (activeIdx !== -1) {
        return prev;
      }
      const removedIdx = prev.findIndex(
        (a) => a.removed && (a.name || "").trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (removedIdx !== -1) {
        return prev.map((a, i) =>
          i === removedIdx ? { ...a, removed: false, quantity: 1 } : a
        );
      }
      return [
        ...prev,
        {
          name: trimmed,
          price: "",
          quantity: 1,
          note: "",
          pricing_type: "quantity",
          removed: false,
        },
      ];
    });
  };

  const handleFeeChange = (index, field, value) => {
    setIsQuotationDirty(true);
    setAdditionalFees((prev) =>
      prev.map((fee, i) => (i === index ? { ...fee, [field]: value } : fee))
    );
  };

  const handleRemoveFee = (index) => {
    setIsQuotationDirty(true);
    setAdditionalFees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddFee = () => {
    setIsQuotationDirty(true);
    setAdditionalFees((prev) => [...prev, { name: "", amount: "" }]);
  };

  // ─── Dynamic Steps Array (Identical to Customer Booking Sequence) ───────────
  const wizardSteps = useMemo(() => {
    const steps = [];

    // Step 0: Always Booking Setup (Package / Service type selection)
    steps.push({
      id: "BookingSetup",
      label: form.package_type === "existing" ? "Package" : "Service",
      title: form.package_type === "existing" ? "Select Package" : "Select Service Type",
      key: "setup",
    });

    // Step 1: Date & Time
    steps.push({
      id: "DateTime",
      label: "Date & time",
      title: "Event Date & Time",
      key: "datetime",
    });

    if (form.package_type === "existing") {
      // Existing Package sequence: For combos and food-only, match customer Guests & Delivery flow
      if (isOffer || isFoodOnly) {
        steps.push({
          id: "DeliveryDetails",
          label: "Guests & delivery",
          title: "Guests & Delivery",
          key: "delivery",
        });
        steps.push({
          id: "MenuSelection",
          label: isOffer ? "Combo menu" : "Dishes",
          title: isOffer ? "Combo Food Menu" : "Menu & Dish Selection",
          key: "menu",
        });
        steps.push({
          id: "DietaryNeeds",
          label: "Dietary needs",
          title: "Allergies & Dietary Needs",
          key: "dietary",
        });
      } else {
        steps.push({
          id: "EventDetails",
          label: "Event details",
          title: "Event & Venue Details",
          key: "event",
        });
        steps.push({
          id: "MenuSelection",
          label: "Menu",
          title: "Catering Menu Selection",
          key: "menu",
        });
        if (form.include_food !== false) {
          steps.push({
            id: "DietaryNeeds",
            label: "Dietary needs",
            title: "Allergies & Dietary Needs",
            key: "dietary",
          });
        }
        steps.push({
          id: "PackageAddOns",
          label: "Extras",
          title: "Inclusions & Add-on Services",
          key: "addons",
        });
      }
    } else {
      // Customize Booking sequence
      if (isFoodOnly) {
        steps.push({
          id: "DeliveryDetails",
          label: "Guests & delivery",
          title: "Guests & Delivery Details",
          key: "delivery",
        });
        steps.push({
          id: "MenuSelection",
          label: "Dishes",
          title: "Menu & Dish Selection",
          key: "menu",
        });
        steps.push({
          id: "DietaryNeeds",
          label: "Dietary needs",
          title: "Allergies & Dietary Needs",
          key: "dietary",
        });
      } else if (isEventSetupOnly) {
        steps.push({
          id: "PackageSelection",
          label: "Package",
          title: "Setup Package & Custom Theme",
          key: "package",
        });
        steps.push({
          id: "EventDetails",
          label: "Event details",
          title: "Event & Venue Details",
          key: "event",
        });
        steps.push({
          id: "PackageAddOns",
          label: "Extras",
          title: "Equipment & Add-ons",
          key: "addons",
        });
      } else {
        // Food and Event Setup
        steps.push({
          id: "PackageSelection",
          label: "Package",
          title: "Setup Package & Custom Theme",
          key: "package",
        });
        steps.push({
          id: "EventDetails",
          label: "Event details",
          title: "Event & Venue Details",
          key: "event",
        });
        steps.push({
          id: "MenuSelection",
          label: "Menu",
          title: "Catering Menu Selection",
          key: "menu",
        });
        if (form.include_food !== false) {
          steps.push({
            id: "DietaryNeeds",
            label: "Dietary needs",
            title: "Allergies & Dietary Needs",
            key: "dietary",
          });
        }
        steps.push({
          id: "PackageAddOns",
          label: "Extras",
          title: "Equipment & Add-ons",
          key: "addons",
        });
      }
    }

    // Common Walk-in Client Info
    steps.push({
      id: "ContactInfo",
      label: "Contact",
      title: "Walk-in Client Information",
      key: "contact",
    });

    // Quotation Step (Immediate price assignment for walk-in client)
    steps.push({
      id: "Quotation",
      label: "Quotation",
      title: "Quotation & Pricing",
      key: "quotation",
    });

    // Review Step (Read-only final confirmation)
    steps.push({
      id: "ReviewAndQuotation",
      label: "Review",
      title: "Review & Confirmation",
      key: "review",
    });

    return steps;
  }, [
    form.package_type,
    form.service_type,
    form.include_food,
    isOffer,
    isFoodOnly,
    isEventSetupOnly,
  ]);

  const currentStepId = wizardSteps[step]?.id;

  // Keep step index bounded
  useEffect(() => {
    if (step >= wizardSteps.length) {
      setStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, step]);

  // ─── Quotation Financial Totals & Items (Reusing computeQuotationTotals) ───
  const removedInclusions = useMemo(
    () =>
      inclusions
        .filter((entry) => entry.removed)
        .map((entry) => ({ name: String(entry.name || "").trim(), deduction: numberOf(entry.deduction) })),
    [inclusions]
  );

  const keptInclusions = useMemo(
    () =>
      inclusions
        .filter((entry) => !entry.removed)
        .map((entry) => String(entry.name || "").trim())
        .filter(Boolean),
    [inclusions]
  );

  const inclusionAdjustments = useMemo(
    () =>
      inclusions
        .filter(
          (entry) =>
            !entry.removed &&
            entry.baseQuantity !== null &&
            entry.baseQuantity !== undefined &&
            Number(entry.quantity) !== Number(entry.baseQuantity)
        )
        .map((entry) => ({
          name: String(entry.name || "").trim(),
          base_quantity: Number(entry.baseQuantity) || 0,
          quantity: Number(entry.quantity) || 0,
          unit_price: numberOf(entry.unitPrice),
        }))
        .filter((entry) => entry.name),
    [inclusions]
  );

  const cateringIncluded = hasSelectedFood || (!isSetupOnly && form.include_food !== false);

  const chargeableMenuItems = useMemo(
    () => (cateringIncluded ? quotationMenuItems.filter((item) => !item.removed) : []),
    [cateringIncluded, quotationMenuItems]
  );

  const chargeableAddOns = useMemo(
    () => quotationAddOns.filter((item) => !item.removed),
    [quotationAddOns]
  );


  const activeSpecialDishes = useMemo(
    () => (cateringIncluded ? quotationMenuItems.filter((m) => !m.removed) : []),
    [cateringIncluded, quotationMenuItems]
  );

  const offerContext = useMemo(() => {
    if (!isOffer) return null;
    const guests = Number(form.guest_count) || offerGuestCount(packageDetails) || 1;
    const perPax =
      offerPricePerPax(packageDetails) ||
      Number(packageDetails?.price_per_guest) ||
      0;

    const snapshot = (isOffer && activeSpecialDishes.length > 0)
      ? activeSpecialDishes.map((item) => ({
        menu_category: item.category || "",
        item_name: item.name || "",
      }))
      : (Array.isArray(form.offer_food_snapshot) && form.offer_food_snapshot.length > 0
        ? form.offer_food_snapshot
        : (packageDetails ? offerFoodItems(packageDetails) : []));

    const basePrice = Math.round(perPax * guests * 100) / 100;

    return {
      name: packageDetails?.name || "Special Offer",
      guests,
      perPax,
      basePrice,
      food: snapshot.map((item) => (item.menu_category ? `${item.item_name} (${item.menu_category})` : item.item_name)),
      foodItems: snapshot.map((item) => ({ name: item.item_name, category: item.menu_category || "" })),
      included: [
        ...snapshot.map((item) => (item.menu_category ? `${item.item_name} (${item.menu_category})` : item.item_name)),
        ...(packageDetails ? offerInclusions(packageDetails) : []),
      ],
    };
  }, [
    isOffer,
    packageDetails,
    form.guest_count,
    form.offer_food_snapshot,
    activeSpecialDishes,
  ]);

  const inquiryContext = useMemo(
    () => ({
      special_requests: form.special_requests,
      dietary_restrictions: form.dietary_restrictions,
      allergies: form.allergies,
      custom_setup_notes: form.custom_setup_notes,
      delivery_instructions: form.delivery_instructions,
      event_theme: form.event_theme,
      event_palette: form.event_palette,
      custom_setup_scope: form.custom_setup_scope,
      is_custom_setup: form.is_custom_setup,
      inspiration_images: form.inspiration_images,
      guest_count: form.guest_count,
      venue_type: form.venue_type,
      venue_type_other: form.venue_type_other,
      province: form.province,
      municipality: form.municipality,
      barangay: form.barangay,
      street: form.street,
      landmark: form.landmark,
      event_date: form.event_date,
      start_time: form.start_time,
      duration_hours: form.duration_hours,
    }),
    [form]
  );

  const pricingInput = useMemo(
    () => ({
      is_special_offer: isOffer,
      booking_type: isOffer ? "special" : "regular",
      package_starting_price: startingPrice,
      removed_inclusions: removedInclusions,
      inclusion_adjustments: inclusionAdjustments,
      guest_count: form.guest_count,
      menu_items: isOffer ? [] : chargeableMenuItems,
      add_ons: chargeableAddOns,
      transportation_fee: transportationFee,
      additional_fees: additionalFees,
      deposit_amount: customDeposit !== "" ? customDeposit : undefined,
    }),
    [
      isOffer,
      startingPrice,
      removedInclusions,
      inclusionAdjustments,
      form.guest_count,
      chargeableMenuItems,
      chargeableAddOns,
      transportationFee,
      additionalFees,
      customDeposit,
    ]
  );

  const quotationTotals = useMemo(() => {
    const calc = computeQuotationTotals(pricingInput);
    if (customDeposit !== "" && customDeposit !== undefined) {
      const parsedCustom = Math.min(calc.totalCost, Math.max(0, Number(customDeposit) || 0));
      return {
        ...calc,
        depositAmount: parsedCustom,
        remainingBalance: Math.max(0, calc.totalCost - parsedCustom),
      };
    }
    const pct = Number(depositPercent || businessInfo?.deposit_percentage || 20);
    const dep = Math.round((calc.totalCost * pct) / 100);
    return {
      ...calc,
      depositAmount: dep,
      remainingBalance: Math.max(0, calc.totalCost - dep),
    };
  }, [pricingInput, customDeposit, depositPercent, businessInfo?.deposit_percentage]);

  const eventSpace = useMemo(() => {
    if (scaffoldWidth && scaffoldLength) {
      return `${scaffoldWidth}×${scaffoldLength}`;
    }
    if (form.scaffold_size) {
      return form.scaffold_size;
    }
    return eventSpaceLabel(form, packageDetails);
  }, [scaffoldWidth, scaffoldLength, form.scaffold_size, form, packageDetails]);

  // Review table line items constructed from authoritative quotation data
  const reviewQuotationItems = useMemo(() => {
    const rows = [];
    // 1. Package Line
    rows.push({
      key: "pkg-base",
      category: "Package",
      name: quotationPackageName || packageDetails?.name || "Package",
      description: isFoodOnly ? "Food Catering" : eventSpace || "Event Setup",
      quantity: 1,
      unit: isFoodOnly ? "Package" : "Setup",
      unitPrice: quotationTotals.packagePrice,
    });

    // 2. Removed Inclusions (Deductions)
    removedInclusions
      .filter((i) => i.deduction > 0)
      .forEach((i, idx) => {
        rows.push({
          key: `deduct-${idx}`,
          category: "Deduction",
          name: `Deduction: ${i.name}`,
          description: "Removed from package inclusions",
          quantity: 1,
          unit: "Item",
          unitPrice: -i.deduction,
        });
      });

    // 3. Inclusion Variations
    inclusionAdjustments
      .filter((i) => i.unit_price > 0 && i.quantity !== i.base_quantity)
      .forEach((i, idx) => {
        const delta = i.quantity - i.base_quantity;
        rows.push({
          key: `adj-${idx}`,
          category: "Extra",
          name: `${i.name} (Variation)`,
          description: `Base: ${i.base_quantity} → New: ${i.quantity}`,
          quantity: delta,
          unit: "Unit",
          unitPrice: i.unit_price,
        });
      });

    // 4. Menu Items
    if (isOffer && offerContext) {
      offerContext.foodItems.forEach((m, idx) => {
        rows.push({
          key: `offer-food-${idx}`,
          category: "Menu",
          name: m.name,
          description: m.category ? `${m.category} (Covered in combo)` : "Covered in combo",
          quantity: Number(form.guest_count) || 1,
          unit: "Pax",
          unitPrice: 0,
        });
      });
    } else {
      chargeableMenuItems.forEach((m, idx) => {
        rows.push({
          key: `menu-${idx}`,
          category: "Menu",
          name: m.name,
          description: m.category || m.note || "Catering Dish",
          quantity: Number(m.quantity) || 1,
          unit: m.unit || "Pax",
          unitPrice: Number(m.price) || 0,
        });
      });
    }

    // 5. Add-ons
    chargeableAddOns.forEach((a, idx) => {
      rows.push({
        key: `addon-${idx}`,
        category: "Add-on",
        name: a.name,
        description: a.note || "Add-on Service",
        quantity: Number(a.quantity) || 1,
        unit: "Unit",
        unitPrice: Number(a.price) || 0,
      });
    });

    // 6. Transportation
    if (Number(transportationFee) > 0) {
      rows.push({
        key: "logistics-trans",
        category: "Logistics",
        name: "Transportation & Delivery",
        description: "Venue delivery & logistics fee",
        quantity: 1,
        unit: "Trip",
        unitPrice: Number(transportationFee),
      });
    }

    // 7. Additional Fees
    additionalFees
      .filter((f) => Number(f.amount) > 0)
      .forEach((f, idx) => {
        rows.push({
          key: `fee-${idx}`,
          category: "Fee",
          name: f.name || "Additional Fee",
          description: "Custom adjustment",
          quantity: 1,
          unit: "Fee",
          unitPrice: Number(f.amount),
        });
      });

    return rows;
  }, [
    quotationPackageName,
    packageDetails?.name,
    isFoodOnly,
    eventSpace,
    quotationTotals.packagePrice,
    removedInclusions,
    inclusionAdjustments,
    isOffer,
    offerContext,
    form.guest_count,
    chargeableMenuItems,
    chargeableAddOns,
    transportationFee,
    additionalFees,
  ]);

  // ─── Live Quotation & Estimate Calculation (Fallback) ───────────────────────
  const estimate = useMemo(() => {
    const est = buildEstimate({
      form,
      packageDetails,
      businessInfo,
      isCustomBooking: form.package_type === "custom",
      standardPackagePrice: packageDetails?.setup_price || packageDetails?.price_per_guest || 0,
      currentStepId,
    });

    const guestCount = Number(form.guest_count) || 0;
    const dishes = form.selected_menu || [];

    // Food price calculation
    let foodTotal = 0;
    if (!isOffer && form.include_food !== false && dishes.length > 0) {
      foodTotal = dishes.reduce(
        (sum, d) => sum + (Number(d.price) || 0) * (guestCount || 1),
        0
      );
    }

    // Package price calculation
    let packageTotal = 0;
    if (isOffer) {
      packageTotal = offerBaseFoodPrice(packageDetails, guestCount);
    } else if (packageDetails) {
      if (packageDetails.package_type === "Event Setup Only") {
        packageTotal = Number(form.scaffold_price || packageDetails.setup_price || 0);
      } else if (packageDetails.price_per_guest) {
        packageTotal = Number(packageDetails.price_per_guest || 0) * guestCount;
      }
    }

    // Add-ons total
    const addOnsTotal = (form.selected_package_addons || []).reduce(
      (sum, a) => sum + (Number(a.price) || 0) * (Number(a.quantity) || 1),
      0
    );

    const calculatedTotal = isOffer
      ? packageTotal + addOnsTotal
      : packageTotal + foodTotal + addOnsTotal;

    const depositPercentage = businessInfo?.deposit_percentage ?? 20;

    const finalTotal =
      form.total_price !== "" && form.total_price !== undefined
        ? Number(form.total_price) || 0
        : calculatedTotal;

    const depositAmount = Math.round((finalTotal * depositPercentage) / 100);
    const remainingBalance = Math.max(0, finalTotal - depositAmount);

    return {
      ...est,
      packageTotal,
      foodTotal,
      addOnsTotal,
      calculatedTotal,
      finalTotal,
      depositPercentage,
      depositAmount,
      remainingBalance,
    };
  }, [form, packageDetails, businessInfo, currentStepId, isOffer]);

  // Edit targets for Review step
  const editTargets = useMemo(() => {
    const ids = new Set(wizardSteps.map((entry) => entry.id));
    const firstPresent = (...candidates) => candidates.find((id) => ids.has(id)) || null;

    return {
      service: firstPresent("BookingSetup"),
      packageSetup: firstPresent("BookingSetup", "PackageSelection"),
      schedule: firstPresent("DateTime"),
      details: firstPresent("DeliveryDetails", "EventDetails"),
      food: firstPresent("MenuSelection"),
      dietary: firstPresent("DietaryNeeds"),
      extras: firstPresent("PackageAddOns", "MenuSelection"),
      contact: firstPresent("ContactInfo"),
      quotation: firstPresent("Quotation"),
    };
  }, [wizardSteps]);

  // ─── Step Validation ────────────────────────────────────────────────────────
  const validateStep = (stepId) => {
    const errs = {};
    let msg = "";

    switch (stepId) {
      case "BookingSetup": {
        if (form.package_type === "existing" && !form.package_id) {
          errs.package_id = "Please select a predefined package or combo pack to proceed.";
          msg = "Please select a package.";
        }
        if (form.package_type === "custom" && !form.service_type) {
          errs.service_type = "Please choose a service type.";
          msg = "Please choose a service type.";
        }
        break;
      }

      case "DateTime": {
        if (!form.event_date) {
          errs.event_date = "Please choose an event date.";
          msg = "Choose an event date.";
        } else if (!form.start_time) {
          errs.start_time = "Please choose a start time.";
          msg = "Choose a start time.";
        } else if (availability.status === "blocked") {
          errs.event_date = availability.message || "This slot is blocked.";
          msg = availability.message || "This slot is blocked.";
        }
        break;
      }

      case "PackageSelection": {
        if (!form.is_custom_setup && (!form.package_id || form.package_id === "none")) {
          errs.package_id = "Choose a setup package or switch to custom design theme.";
          msg = "Choose a setup package or switch to custom design.";
        }
        if (form.is_custom_setup && !String(form.event_theme || "").trim()) {
          errs.event_theme = "Please enter your event theme or colors.";
          msg = "Please enter your event theme.";
        }
        break;
      }

      case "EventDetails": {
        const guests = parseNumber(form.guest_count) || 0;

        if (isOffer) {
          if (guests <= 0) {
            errs.guest_count = "Enter how many guests you're catering for.";
          } else {
            const problem = offerBookingProblem(packageDetails, guests);
            if (problem) errs.guest_count = problem;
          }

          if (form.delivery_method === "pickup") {
            // Food only pickup: no address, venue, or event type required
          } else if (form.delivery_method === "delivery") {
            if (
              form.booking_for === "someone_else" &&
              !String(form.celebrant_name || "").trim()
            ) {
              errs.celebrant_name = "Enter the celebrant or honoree's name.";
            }
            if (!form.municipality)
              errs.municipality = "Select the delivery municipality.";
            if (!form.barangay) errs.barangay = "Select the delivery barangay.";
            if (!String(form.street || "").trim())
              errs.street = "Enter the delivery street address.";
          } else {
            // With Event Setup
            if (
              form.booking_for === "someone_else" &&
              !String(form.celebrant_name || "").trim()
            ) {
              errs.celebrant_name = "Enter the celebrant or honoree's name.";
            }
            const eventType =
              form.event_type === OTHER_EVENT_TYPE
                ? String(form.event_type_other || "").trim()
                : form.event_type;
            if (!eventType) {
              errs[form.event_type === OTHER_EVENT_TYPE ? "event_type_other" : "event_type"] =
                "Tell us what kind of event this is.";
            }
            if (!form.municipality)
              errs.municipality = "Select the municipality of your venue.";
            if (!form.barangay) errs.barangay = "Select the barangay.";
            if (
              form.venue_type === OTHER_VENUE_TYPE &&
              !String(form.venue_type_other || "").trim()
            ) {
              errs.venue_type_other = "Tell us what kind of venue this is.";
            }
          }
          if (Object.keys(errs).length > 0) {
            msg = Object.values(errs)[0];
          }
          break;
        }

        // Regular Package or Custom Setup
        if (form.booking_for === "someone_else") {
          const celErr = validateName(form.celebrant_name, "Celebrant name", { min: 2, max: 80, required: true });
          if (celErr) errs.celebrant_name = celErr;
        }

        if (form.event_type === OTHER_EVENT_TYPE) {
          const etErr = validateSafeText(form.event_type_other, "Event type", { max: 50, required: true });
          if (etErr) errs.event_type_other = etErr;
        } else if (!form.event_type) {
          errs.event_type = "Tell us what kind of event this is.";
        }
        if (!form.municipality)
          errs.municipality = "Select the municipality of your venue.";
        if (!form.barangay) errs.barangay = "Select the barangay.";
        if (form.street?.trim()) {
          const stErr = validateAddress(form.street, "Street address", { max: 150, required: false });
          if (stErr) errs.street = stErr;
        }
        if (form.landmark?.trim()) {
          const lmErr = validateAddress(form.landmark, "Landmark", { max: 100, required: false });
          if (lmErr) errs.landmark = lmErr;
        }
        if (form.event_theme?.trim()) {
          const thErr = validateSafeText(form.event_theme, "Event theme", { max: 100, required: false });
          if (thErr) errs.event_theme = thErr;
        }
        if (form.venue_type === OTHER_VENUE_TYPE) {
          const vtErr = validateSafeText(form.venue_type_other, "Venue type", { max: 60, required: true });
          if (vtErr) errs.venue_type_other = vtErr;
        }

        if (guests <= 0) {
          errs.guest_count = "Enter how many guests you're expecting.";
        } else if (guests < (guestMin || 1)) {
          errs.guest_count = `Enter a guest count of at least ${guestMin || 1}.`;
        } else if (guestMax && guests > guestMax) {
          errs.guest_count = `The maximum guest count for this package setup is ${guestMax}.`;
        }
        if (Object.keys(errs).length > 0) {
          msg = Object.values(errs)[0];
        }
        break;
      }

      case "DeliveryDetails": {
        const guests = parseNumber(form.guest_count) || 0;
        if (guests <= 0) {
          errs.guest_count = "Enter how many guests you're feeding.";
        } else if (guests < (guestMin || 1)) {
          errs.guest_count = `Enter a guest count of at least ${guestMin || 1}.`;
        } else if (guestMax && guests > guestMax) {
          errs.guest_count = `The maximum guest count for this package is ${guestMax}.`;
        }
        if (form.delivery_method !== "pickup") {
          if (!form.municipality)
            errs.municipality = "Select the delivery municipality.";
          if (!form.barangay) errs.barangay = "Select the delivery barangay.";
          if (!String(form.street || "").trim()) {
            errs.street = "Enter the street and building so we can find you.";
          } else {
            const stErr = validateAddress(form.street, "Street and building", { max: 150, required: true });
            if (stErr) errs.street = stErr;
          }
          if (form.landmark?.trim()) {
            const lmErr = validateAddress(form.landmark, "Landmark", { max: 100, required: false });
            if (lmErr) errs.landmark = lmErr;
          }
        }
        if (Object.keys(errs).length > 0) {
          msg = Object.values(errs)[0];
        }
        break;
      }

      case "DietaryNeeds": {
        if (form.allergies?.trim()) {
          const alErr = validateSafeText(form.allergies, "Allergies note", { max: 300, required: false });
          if (alErr) errs.allergies = alErr;
        }
        if (form.dietary_restrictions?.trim()) {
          const drErr = validateSafeText(form.dietary_restrictions, "Dietary restrictions", { max: 300, required: false });
          if (drErr) errs.dietary_restrictions = drErr;
        }
        break;
      }

      case "MenuSelection": {
        if (isOffer) {
          const courses = offerFoodByCategory(packageDetails);
          const snapshot = Array.isArray(form.offer_food_snapshot)
            ? form.offer_food_snapshot
            : [];
          const missing = [];
          courses.forEach((course) => {
            const req = offerCourseRequirement(course.category);
            const count = snapshot.filter(
              (entry) => entry.menu_category === course.category
            ).length;
            if (course.items.length > 1 && count < req) {
              missing.push(course.category);
            }
          });
          if (missing.length > 0) {
            msg = `Please select your dish for: ${missing.join(", ")}`;
            errs.menu = msg;
          }
        }
        break;
      }

      case "ContactInfo": {
        const fnErr = validateName(form.contact_first_name, "First name", { min: 2, max: 50, required: true });
        if (fnErr) errs.contact_first_name = fnErr;
        const lnErr = validateName(form.contact_last_name, "Last name", { min: 2, max: 50, required: true });
        if (lnErr) errs.contact_last_name = lnErr;
        if (!form.contact_email?.trim())
          errs.contact_email = "Email is required.";
        const pErr = validatePhone(form.contact_phone, "Mobile phone", { required: true });
        if (pErr) errs.contact_phone = pErr;
        if (Object.keys(errs).length > 0) msg = "Please complete client contact details.";
        break;
      }

      case "Quotation": {
        if (!quotationTotals || quotationTotals.totalCost <= 0) {
          errs.quotation = "Quotation total must be greater than zero.";
          msg = "Quotation total must be greater than zero. Please review package and item prices.";
        }
        break;
      }

      case "ReviewAndQuotation": {
        break;
      }

      default:
        break;
    }

    const valid = !msg && Object.keys(errs).length === 0;
    return { valid, errors: errs, message: msg };
  };

  // Clear stale errors once step becomes valid
  useEffect(() => {
    if (Object.keys(stepErrors).length === 0) return;
    const { valid } = validateStep(currentStepId);
    if (valid) {
      setStepErrors({});
    }
  }, [form, currentStepId]);

  const handleNext = () => {
    const { valid, errors: errs, message } = validateStep(currentStepId);
    if (!valid) {
      setStepErrors(errs);
      if (message) notify(message, "warning");
      return;
    }
    setStepErrors({});
    if (isEditing) {
      setIsEditing(false);
      const reviewIdx = wizardSteps.findIndex((e) => e.id === "ReviewAndQuotation");
      setStep(reviewIdx >= 0 ? reviewIdx : wizardSteps.length - 1);
      return;
    }
    setStep((s) => Math.min(s + 1, wizardSteps.length - 1));
  };

  const handleBack = () => {
    setStepErrors({});
    if (isEditing) {
      setIsEditing(false);
      const reviewIdx = wizardSteps.findIndex((e) => e.id === "ReviewAndQuotation");
      setStep(reviewIdx >= 0 ? reviewIdx : wizardSteps.length - 1);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleJumpToStep = (targetId) => {
    const idx = wizardSteps.findIndex((entry) => entry.id === targetId);
    if (idx >= 0) {
      setIsEditing(true);
      setStepErrors({});
      setStep(idx);
    }
  };

  const handleStepClick = (targetIndex) => {
    if (targetIndex === step) return;
    if (targetIndex > step) {
      const { valid, errors: errs, message } = validateStep(currentStepId);
      if (!valid) {
        setStepErrors(errs);
        if (message) notify(message, "warning");
        return;
      }
    }
    setStepErrors({});
    const reviewIdx = wizardSteps.findIndex((e) => e.id === "ReviewAndQuotation");
    if (isEditing && targetIndex === reviewIdx) {
      setIsEditing(false);
    }
    setStep(targetIndex);
  };

  // ─── Final Direct Submission ────────────────────────────────────────────────
  const handleConfirmBooking = async () => {
    const { valid, errors: errs, message } = validateStep("ReviewAndQuotation");
    if (!valid) {
      setStepErrors(errs);
      if (message) notify(message, "warning");
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = (val) => (val ? String(val).replace(/\s+/g, "") : undefined);
      const cleanZip =
        form.zip_code && /^\d{4}$/.test(form.zip_code.trim())
          ? form.zip_code.trim()
          : undefined;

      // Auto-match existing customer by email if customer_id not yet explicitly set
      let customerId = form.customer_id;
      if (!customerId && form.contact_email && customers?.length > 0) {
        const found = customers.find(
          (c) => (c.email || "").toLowerCase() === form.contact_email.trim().toLowerCase()
        );
        if (found) customerId = found._id;
      }

      // Step 1: Create the Inquiry record
      const inquiryPayload = {
        customer_id: customerId || undefined,
        package_id:
          form.package_type === "existing" && form.package_id && form.package_id !== "none"
            ? form.package_id
            : undefined,
        service_type: form.service_type,
        booking_type: isOffer ? "special" : form.package_id ? "regular" : "custom",
        include_food: form.include_food !== false,
        event_type:
          (form.event_type === OTHER_EVENT_TYPE
            ? String(form.event_type_other || "").trim()
            : String(form.event_type || "").trim()) ||
          (isFoodOnly || (isOffer && form.delivery_method !== "setup")
            ? "Special Offer Catering"
            : isOffer
              ? "Special Offer Event"
              : "Food Delivery"),
        event_theme: form.event_theme || undefined,
        event_palette: form.event_palette || [],
        booking_for: form.booking_for || "myself",
        celebrant_name: form.celebrant_name || undefined,
        event_date: form.event_date,
        start_time: form.start_time,
        duration_hours: Number(form.duration_hours) || 4,
        guest_count: Number(form.guest_count),
        venue_type: resolveVenueType({
          venue_type: form.venue_type,
          venue_type_other: form.venue_type_other,
        }),
        indoor_outdoor: form.indoor_outdoor || undefined,
        province: form.province || BATANGAS_PROVINCE,
        municipality: form.municipality || undefined,
        barangay: form.barangay || undefined,
        street: form.street || undefined,
        landmark: form.landmark || undefined,
        zip_code: cleanZip,
        delivery_method: isOffer
          ? form.delivery_method || "setup"
          : isFoodOnly
            ? form.delivery_method
            : "setup",
        pickup_location: form.pickup_location || undefined,
        contact_first_name: form.contact_first_name,
        contact_last_name: form.contact_last_name,
        contact_email: form.contact_email,
        contact_phone: cleanPhone(form.contact_phone) || form.contact_phone,
        contact_alt_phone: cleanPhone(form.contact_alt_phone),
        contact_method: form.contact_method && form.contact_method.toLowerCase() !== "email" ? form.contact_method : "Walk-in",
        selected_menu: form.selected_menu?.map((m) => m._id || m) || [],
        offer_food_snapshot: isOffer && offerContext
          ? offerContext.foodItems.map((f) => ({ menu_category: f.category, item_name: f.name }))
          : form.offer_food_snapshot || [],
        dietary_restrictions: form.dietary_restrictions || undefined,
        allergies: form.allergies || undefined,
        special_requests:
          [form.special_requests, quotationNotes].filter(Boolean).join(" | ") || undefined,
        service_items: chargeableAddOns.map((a) => ({
          name: a.name,
          quantity: Number(a.quantity || 1),
          price: Number(a.price || 0),
          note: a.note || "",
        })),
        inventory_items: form.inventory_items || [],
        selected_scaffold_option_id: selectedScaffoldId !== "custom" && selectedScaffoldId ? selectedScaffoldId : undefined,
        scaffold_width: scaffoldWidth ? Number(scaffoldWidth) : undefined,
        scaffold_length: scaffoldLength ? Number(scaffoldLength) : undefined,
        scaffold_base_area: (scaffoldWidth && scaffoldLength) ? Number(scaffoldWidth) * Number(scaffoldLength) : undefined,
        scaffold_size: form.scaffold_size || (scaffoldWidth && scaffoldLength ? `${scaffoldWidth}×${scaffoldLength}` : undefined),
      };

      const inqRes = await AdminAPI.createInquiry(inquiryPayload);
      const newInquiry = inqRes.data;
      if (!newInquiry?._id) {
        throw new Error("Failed to create walk-in inquiry record.");
      }

      // Step 2: Create the Quotation record matching QuotationBuilderModal
      const quotationSubmitPayload = {
        inquiry_id: newInquiry._id,
        package_id: packageDetails?._id || newInquiry.package_id || undefined,
        package_name: quotationPackageName || packageDetails?.name || "Custom Package",
        booking_type: isOffer ? "special" : "regular",
        is_special_offer: isOffer,
        offer_price_per_guest: isOffer ? offerContext?.perPax : undefined,
        offer_food_snapshot: isOffer && offerContext
          ? offerContext.foodItems.map((f) => ({ menu_category: f.category, item_name: f.name }))
          : undefined,
        event_space_label: eventSpace || undefined,
        package_starting_price: quotationTotals.startingPrice,
        package_price: quotationTotals.packagePrice,
        package_inclusions: keptInclusions,
        removed_inclusions: removedInclusions.filter((entry) => entry.name),
        inclusion_adjustments: inclusionAdjustments.map((entry) => ({
          ...entry,
          amount: inclusionAdjustmentAmount(entry),
        })),
        guest_count: quotationTotals.guestCount,
        menu_items: isOffer
          ? (offerContext?.foodItems || []).map((item) => ({
            name: String(item.name || "").trim(),
            category: String(item.category || "").trim(),
            note: "Included in combo package",
            pricing_type: "per_guest",
            quantity: 1,
            unit: "Included",
            price: 0,
          }))
          : chargeableMenuItems.map((item) => ({
            name: String(item.name || "").trim(),
            category: String(item.category || "").trim(),
            note: String(item.note || "").trim(),
            pricing_type: MENU_PRICING.QUANTITY,
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit: String(item.unit || "").trim() || "Pax",
            price: money(item.price),
          })),
        add_ons: chargeableAddOns.map((item) => ({
          name: String(item.name || "").trim(),
          price: money(item.price),
          quantity: Math.max(1, Number(item.quantity) || 1),
          note: String(item.note || "").trim(),
          pricing_type: "quantity",
        })),
        transportation_fee: money(transportationFee),
        additional_fees: additionalFees
          .filter((fee) => String(fee.name || "").trim() || numberOf(fee.amount))
          .map((fee) => ({ name: String(fee.name || "").trim(), amount: money(fee.amount) })),
        taxes: 0,
        discounts: 0,
        subtotal: quotationTotals.subtotal,
        total_cost: quotationTotals.totalCost,
        deposit_amount: quotationTotals.depositAmount,
        remaining_balance: quotationTotals.remainingBalance,
        payment_method: paymentMethod || "cash",
        balance_payment_preference: balancePreference || "in_person",
        expiration_date: toDateInput(new Date(Date.now() + 7 * 86400000)),
        admin_notes: quotationNotes,
      };

      await AdminAPI.createQuotation(quotationSubmitPayload);

      // Step 3: Handle Status Routing Based on Deposit Payment
      if (depositPaidImmediately) {
        // Customer paid deposit right now: convert inquiry into confirmed reservation
        const convertRes = await AdminAPI.createBookingFromInquiry(newInquiry._id, {
          bypass_deposit: true,
          mark_deposit_as_paid: true,
          deposit_paid_immediately: true,
          payment_method: paymentMethod || "cash",
          deposit_amount: quotationTotals.depositAmount,
        });
        const createdBooking = convertRes.data?.booking;
        notify(
          "Walk-in booking created and confirmed into Reservations (deposit recorded)!",
          "success"
        );
        onCreated?.(createdBooking);
        onClose();
        if (createdBooking?._id) {
          navigate(`/admin/bookings/reservations?bookingId=${createdBooking._id}`);
        } else {
          navigate("/admin/bookings/reservations");
        }
        return;
      } else {
        // Unpaid deposit: stays under Quotations as "Quotation Sent"
        notify(
          "Walk-in inquiry & quotation created! Placed in Quotations pending deposit payment.",
          "success"
        );
        onCreated?.();
        onClose();
      }
    } catch (err) {
      notify(
        err.response?.data?.message || err.message || "Could not create the walk-in booking. Please check details.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const currentStepObj = wizardSteps[step] || wizardSteps[0];
  const isReviewStep = currentStepObj.id === "ReviewAndQuotation";
  const progressPct = Math.round(((step + 1) / wizardSteps.length) * 100);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      style={{ animation: "wibm-fade 0.15s ease" }}
    >
      <div
        className="relative flex h-[94dvh] w-[96vw] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        style={{ animation: "wibm-up 0.18s ease" }}
      >
        {/* ── Modal Header ── */}
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 pt-4 pb-3 sm:px-8">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Add New Booking
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-normal">
                Create a reservation for an existing or walk-in customer
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ── Step-by-Step Progress Indicator (Matching customer booking stepper) ── */}
          {wizardSteps.length > 0 && (
            <div className="pt-2.5 border-t border-slate-100">
              <BookingStepper
                currentStepIndex={step + 1}
                steps={wizardSteps}
                onStepClick={handleStepClick}
                isEditing={isEditing}
                maxStepReached={
                  isEditing || step === wizardSteps.length - 1
                    ? wizardSteps.length
                    : Math.max(maxStepReached + 1, step + 1)
                }
                showAiAssistant={false}
              />
            </div>
          )}
        </div>

        {/* ── Modal Body Content ── */}
        <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
          {loadingCatalogs ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium text-slate-500">Loading booking packages & menu...</p>
            </div>
          ) : (
            <>
              {/* Prominent Editing Mode Banner */}
              {isEditing && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50/70 p-2.5 sm:px-3.5 text-[13px] shadow-2xs">
                  <div className="flex items-center gap-2 text-blue-900 font-medium min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#4C81E0]">
                      <Pencil size={11} />
                    </span>
                    <span className="truncate">
                      Editing: <strong className="font-semibold text-slate-900">{currentStepObj?.label}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const { valid, errors: errs, message } = validateStep(currentStepId);
                      if (!valid) {
                        setStepErrors(errs);
                        if (message) notify(message, "warning");
                        return;
                      }
                      setIsEditing(false);
                      const reviewIdx = wizardSteps.findIndex((e) => e.id === "ReviewAndQuotation");
                      setStep(reviewIdx >= 0 ? reviewIdx : wizardSteps.length - 1);
                    }}
                    className="rounded-md bg-[#4C81E0] px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#3b6ecc] transition-colors cursor-pointer"
                  >
                    Return to Review
                  </button>
                </div>
              )}

              {/* Step 0: Booking Setup */}
              {currentStepId === "BookingSetup" && (
                <StageBookingSetup
                  form={form}
                  setForm={setForm}
                  packages={packages}
                  errors={stepErrors}
                />
              )}

              {/* Step: Date & Time */}
              {currentStepId === "DateTime" && (
                <StepDateTime
                  form={form}
                  setForm={setForm}
                  minDate={new Date().toISOString().split("T")[0]}
                  availability={availability}
                  suggestedDates={suggestedDates}
                  requireAvailabilityCheck={requireAvailabilityCheck}
                  onRetryAvailability={() => setAvailabilityNonce((n) => n + 1)}
                  leadTimeDays={0}
                />
              )}

              {/* Step: Event Details */}
              {currentStepId === "EventDetails" && (
                <StepEventDetails
                  form={form}
                  setForm={setForm}
                  initialEventType={form.event_type}
                  municipalities={municipalities}
                  barangays={barangays}
                  isCustomBooking={isCustomBooking}
                  selectedPackageName={packageDetails?.name || ""}
                  packageDetails={packageDetails}
                  guestMin={guestMin}
                  guestMax={guestMax}
                  errors={stepErrors}
                  setupCapacity={setupCapacity}
                  offer={isOffer ? packageDetails : null}
                  pickupAddress={
                    businessInfo?.pickup_address ||
                    businessInfo?.address ||
                    businessInfo?.kitchen_address
                  }
                />
              )}

              {/* Step: Delivery Details (Food Only & Combo Packs) */}
              {currentStepId === "DeliveryDetails" && (
                <StepDeliveryDetails
                  form={form}
                  setForm={setForm}
                  municipalities={municipalities}
                  barangays={barangays}
                  pickupAddress={
                    businessInfo?.pickup_address ||
                    businessInfo?.address ||
                    businessInfo?.kitchen_address
                  }
                  guestMin={guestMin}
                  guestMax={guestMax}
                  errors={stepErrors}
                  offer={isOffer ? activePackage : null}
                  selectedPackageName={activePackage?.name || ""}
                />
              )}

              {/* Step: Package Selection (Custom Setup Theme) */}
              {currentStepId === "PackageSelection" && (
                <StepPackageSelection
                  form={form}
                  setForm={setForm}
                  packages={packages}
                  packageDetails={packageDetails}
                  selectedPackageId={form.package_id === "none" ? "" : form.package_id}
                  estimate={estimate}
                  errors={stepErrors}
                  setupCapacity={setupCapacity}
                  onSelectPackage={(packageId) => {
                    if (form.package_id === packageId) {
                      setForm((prev) => ({
                        ...prev,
                        package_id: "none",
                        selected_scaffold_option_id: "",
                        scaffold_width: undefined,
                        scaffold_length: undefined,
                        scaffold_base_area: undefined,
                        scaffold_price: undefined,
                        selected_package_addons: [],
                      }));
                      return;
                    }
                    const pkg = packages.find((entry) => entry._id === packageId) || packageDetails;
                    if (!pkg) return;
                    setForm((prev) => ({
                      ...prev,
                      package_id: pkg._id,
                      selected_scaffold_option_id: pkg.scaffold_size_options?.[0]?._id || "",
                      scaffold_width: pkg.scaffold_size_options?.[0]?.width_ft,
                      scaffold_length: pkg.scaffold_size_options?.[0]?.length_ft,
                      scaffold_base_area: pkg.scaffold_size_options?.[0]?.area_ft2,
                      scaffold_price: pkg.scaffold_size_options?.[0]?.price,
                    }));
                  }}
                />
              )}

              {/* Step: Menu Selection */}
              {currentStepId === "MenuSelection" && (
                <StepMenuSelection
                  form={form}
                  setForm={setForm}
                  menuItems={menuItems}
                  estimate={estimate}
                  isFullService={form.service_type !== SERVICE_TYPES.FOOD_ONLY}
                  offer={isOffer ? packageDetails : null}
                  onRegisterMenuNav={setMenuNav}
                  onRemoveDish={removeDish}
                  onClearDishes={clearAllDishes}
                />
              )}

              {/* Step: Dietary Needs */}
              {currentStepId === "DietaryNeeds" && (
                <StepDietaryNeeds form={form} setForm={setForm} />
              )}

              {/* Step: Package Add-ons */}
              {currentStepId === "PackageAddOns" && (
                <StepPackageAddOns
                  form={form}
                  setForm={setForm}
                  packageDetails={packageDetails}
                  addons={addons}
                  estimate={estimate}
                />
              )}

              {/* Step: Client Contact Information */}
              {currentStepId === "ContactInfo" && (
                <WalkInContactStep
                  form={form}
                  setForm={setForm}
                  customers={customers}
                  errors={stepErrors}
                />
              )}

              {/* Step: Quotation & Pricing (Full Admin Quotation Builder) */}
              {currentStepId === "Quotation" && (
                <WalkInQuotationStep
                  packageName={quotationPackageName || packageDetails?.name || "Custom Package"}
                  startingPrice={startingPrice}
                  setStartingPrice={(val) => {
                    setIsQuotationDirty(true);
                    setStartingPrice(val);
                  }}
                  inclusions={inclusions}
                  setInclusions={(val) => {
                    setIsQuotationDirty(true);
                    setInclusions(val);
                  }}
                  handleInclusionQuantity={handleInclusionQuantity}
                  handleInclusionUnitPrice={handleInclusionUnitPrice}
                  handleInclusionDeduction={handleInclusionDeduction}
                  toggleInclusionRemoved={toggleInclusionRemoved}
                  scaffoldOptions={scaffoldOptions}
                  selectedScaffoldId={selectedScaffoldId}
                  handleScaffoldOptionChange={handleScaffoldOptionChange}
                  isCustomScaffold={isCustomScaffold}
                  scaffoldWidth={scaffoldWidth}
                  scaffoldLength={scaffoldLength}
                  handleCustomScaffoldChange={handleCustomScaffoldChange}
                  isFoodOnly={isFoodOnly}
                  isSetupOnly={isSetupOnly}
                  cateringIncluded={cateringIncluded}
                  isSpecialOffer={isOffer}
                  offerContext={offerContext}
                  packageRecord={packageDetails}
                  inquiry={inquiryContext}
                  menuItems={quotationMenuItems}
                  handleMenuChange={handleMenuChange}
                  toggleMenuRemoved={toggleMenuRemoved}
                  handleDeleteMenu={handleDeleteMenu}
                  onReplaceSpecialOfferDish={handleSpecialOfferDishReplace}
                  onRemoveSpecialOfferDish={handleSpecialOfferDishRemove}
                  onSelectSpecialOfferDish={handleSpecialOfferDishSelect}
                  onResetSpecialOfferFood={handleResetSpecialOfferFood}
                  catalogMenuItems={menuItems}
                  onAddCatalogDish={handleAddCatalogDish}
                  onAddCustomDish={handleAddCustomDish}
                  addOns={quotationAddOns}
                  handleAddOnChange={handleAddOnChange}
                  toggleAddOnRemoved={toggleAddOnRemoved}
                  handleDeleteAddOn={handleDeleteAddOn}
                  catalogAddons={addons}
                  onAddCatalogAddon={handleAddCatalogAddon}
                  onAddCustomAddon={handleAddCustomAddon}
                  transportationFee={transportationFee}
                  setTransportationFee={(val) => {
                    setIsQuotationDirty(true);
                    setTransportationFee(val);
                  }}
                  additionalFees={additionalFees}
                  handleFeeChange={handleFeeChange}
                  handleRemoveFee={handleRemoveFee}
                  handleAddFee={handleAddFee}
                  errors={stepErrors}
                  onProceedToReview={handleNext}
                  customerNotes={form.special_requests}
                  dietaryNotes={form.dietary_restrictions}
                  allergiesNotes={form.allergies}
                  customNotes={form.custom_setup_notes}
                  deliveryNotes={form.delivery_instructions}
                  totals={quotationTotals}
                  eventSpace={eventSpace}
                  chargeableMenuItemsCount={chargeableMenuItems.length}
                  chargeableAddOnsCount={chargeableAddOns.length}
                  depositPercent={depositPercent}
                  setDepositPercent={setDepositPercent}
                  customDeposit={customDeposit}
                  setCustomDeposit={setCustomDeposit}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  depositPaidImmediately={depositPaidImmediately}
                  setDepositPaidImmediately={setDepositPaidImmediately}
                  balancePreference={balancePreference}
                  setBalancePreference={setBalancePreference}
                  notes={quotationNotes}
                  setNotes={setQuotationNotes}
                  onResetToDefault={handleResetQuotationToDefaults}
                />
              )}

              {/* Step: Review & Final Confirmation */}
              {currentStepId === "ReviewAndQuotation" && (
                <WalkInReviewAndQuotation
                  form={form}
                  packageDetails={packageDetails}
                  estimate={estimate}
                  quotationItems={reviewQuotationItems}
                  quotationSubtotal={quotationTotals.subtotal}
                  quotationGrandTotal={quotationTotals.totalCost}
                  depositAmount={quotationTotals.depositAmount}
                  depositPercentage={depositPercent}
                  remainingBalance={quotationTotals.remainingBalance}
                  paymentMethod={paymentMethod}
                  depositPaidImmediately={depositPaidImmediately}
                  balancePreference={balancePreference}
                  quotationNotes={quotationNotes}
                  onEditStep={handleJumpToStep}
                  editTargets={editTargets}
                />
              )}
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>

          {/* Center subtitle matching customer wizard */}
          <p className="hidden min-w-0 flex-1 truncate text-center text-xs text-[#64748B] sm:block">
            {isEditing
              ? `Editing ${wizardSteps[step]?.label} · Saving returns to review.`
              : isReviewStep
                ? "Review booking and quotation summary before submitting."
                : wizardSteps[step + 1]?.label
                  ? `Next: ${wizardSteps[step + 1].label}`
                  : ""}
          </p>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}

            {!isReviewStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-[#4C81E0] hover:bg-[#3b6ecc] px-5 py-2 text-sm font-semibold text-white shadow-xs transition cursor-pointer"
              >
                {isEditing ? (
                  <>
                    Save &amp; Return to Review <ChevronRight size={16} />
                  </>
                ) : (
                  <>
                    Continue <ChevronRight size={16} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-[#4C81E0] hover:bg-[#3b6ecc] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirm &amp; Create Booking
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
