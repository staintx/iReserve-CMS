import React, { useState, useEffect, useMemo, useRef } from "react";
import Modal from "../../common/Modal";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import {
  Calculator,
  Send,
  Save,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Undo2,
  Package,
  Utensils,
  UtensilsCrossed,
  Sparkles,
  Percent,
  CreditCard,
  User,
  Heart,
  Truck,
  Check,
  Lock,
  MapPin,
  CalendarDays,
  FileText,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Pencil,
  Sliders,
  Phone,
  Mail,
  Search,
  Ruler,
  X,
  Layers,
} from "lucide-react";
import {
  computeQuotationTotals,
  derivePackageStartingPrice,
  addOnLineTotal,
  inclusionAdjustmentAmount,
  MENU_PRICING,
  menuLineTotal,
  money,
} from "../../../utils/quotationPricing";
import {
  eventSpaceLabel,
  inclusionDisplayName,
  parseInclusion,
  parseInclusionQuantity,
  withInclusionName,
  withInclusionQuantity,
  groupInclusions,
} from "../../../lib/packageDisplay";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../../lib/eventTypes";
import {
  SERVICE_TYPES,
  VENUE_TYPES,
  OTHER_VENUE_TYPE,
  isCustomVenueType,
} from "../../../pages/customer/booking/lib/bookingRules";
import { resolveServiceType } from "../../customer/portal/statusMeta";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../../utils/batangas";
import { formatCurrency, formatShortDate } from "../../../utils/format";
import FeedbackDialog from "../../feedback/FeedbackDialog";
import InlineMessage from "../../feedback/InlineMessage";

/* ---------------------------------------------------------------------------
   Presentation primitives
--------------------------------------------------------------------------- */

const INPUT_BASE =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const inputClass = (hasError) =>
  `${INPUT_BASE} ${hasError ? "border-red-400 bg-red-50/40" : "border-slate-300"}`;

const LABEL_CLASS =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-1.5";

const ROW_ACTION_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer";
const ROW_ACTION_TONES = {
  danger: "border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50 focus:ring-red-400",
  success:
    "border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 focus:ring-emerald-400",
  neutral: "border-slate-300 text-slate-600 hover:bg-slate-50 focus:ring-slate-400",
};

function RowAction({ onClick, icon: Icon, label, tone = "danger", title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${ROW_ACTION_BASE} ${ROW_ACTION_TONES[tone] || ROW_ACTION_TONES.neutral}`}
    >
      {Icon ? <Icon size={12} /> : null} {label}
    </button>
  );
}

function Field({ label, required, hint, error, htmlFor, children, className = "" }) {
  return (
    <div className={className}>
      {label && (
        <label className={LABEL_CLASS} htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 flex items-start gap-1 text-[11.5px] font-medium leading-snug text-red-700">
          <AlertCircle size={12} className="mt-[2px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11.5px] leading-snug text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function MoneyInput({ id, value, onChange, error, disabled, placeholder, className = "" }) {
  const block = (e) => {
    if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") e.preventDefault();
  };
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
        ₱
      </span>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        onKeyDown={block}
        onWheel={(e) => e.target.blur()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(error)} pl-7 font-semibold tabular-nums ${className}`}
      />
    </div>
  );
}

const SECTION_ACCENTS = {
  slate: { chip: "bg-slate-100 text-slate-600", step: "text-slate-400" },
  primary: { chip: "bg-primary/10 text-primary", step: "text-primary/70" },
  emerald: { chip: "bg-emerald-50 text-emerald-700", step: "text-emerald-600/70" },
  amber: { chip: "bg-amber-50 text-amber-700", step: "text-amber-600/70" },
  violet: { chip: "bg-violet-50 text-violet-700", step: "text-violet-600/70" },
  sky: { chip: "bg-sky-50 text-sky-700", step: "text-sky-600/70" },
  indigo: { chip: "bg-indigo-50 text-indigo-700", step: "text-indigo-600/70" },
};

function SectionCard({ step, title, description, icon: Icon, aside, children, id, accent = "primary" }) {
  const tone = SECTION_ACCENTS[accent] || SECTION_ACCENTS.primary;
  return (
    <section
      id={id}
      className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <header className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone.chip}`}>
            {Icon ? <Icon size={15} /> : null}
          </span>
          <div className="min-w-0">
            <h3 className="flex items-baseline gap-2 font-sans text-sm font-bold text-slate-900">
              {step != null && (
                <span className={`text-[11px] font-semibold tabular-nums ${tone.step}`}>
                  {String(step).padStart(2, "0")}
                </span>
              )}
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs leading-snug text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {aside && <div className="shrink-0 sm:pl-4">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

function SummaryRow({ label, value, detail, tone = "default", strong, indent }) {
  const toneClass =
    tone === "deduct"
      ? "text-emerald-300"
      : tone === "muted"
        ? "text-slate-300"
        : strong
          ? "text-white"
          : "text-slate-200";
  return (
    <div className={`flex items-baseline justify-between gap-3 ${indent ? "pl-3" : ""}`}>
      <span className={`min-w-0 text-xs ${strong ? "font-semibold text-white" : "text-slate-300"}`}>
        {label}
        {detail && <span className="ml-1 text-[11px] text-slate-500">{detail}</span>}
      </span>
      <span className={`shrink-0 text-xs font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const nonNegative = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) return "";
  return String(value);
};

const STANDARD_UNITS = ["Bilao", "Piece", "Kilo", "Gallon", "Tray", "Plate", "Pax", "Set"];

const findStandardUnit = (unit) => {
  if (!unit) return null;
  const lower = String(unit).trim().toLowerCase();
  return STANDARD_UNITS.find((u) => u.toLowerCase() === lower) || null;
};

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

function formatScaffoldOption(option, index) {
  const parts = [];
  if (option.label) parts.push(option.label);
  if (option.width_ft && option.length_ft) {
    parts.push(`(${option.width_ft} × ${option.length_ft} ft)`);
  }
  if (option.guest_min || option.guest_max) {
    parts.push(
      option.guest_min && option.guest_max
        ? `[${option.guest_min}–${option.guest_max} guests]`
        : `[${option.guest_max || option.guest_min} guests]`
    );
  }
  if (option.price && Number(option.price) > 0) {
    parts.push(`— ${formatCurrency(option.price)}`);
  }
  return parts.length > 0 ? parts.join(" ") : `Option ${index + 1}`;
}

/* ---------------------------------------------------------------------------
   Admin Booking Edit Modal
--------------------------------------------------------------------------- */

export default function AdminBookingEditModal({
  open,
  onClose,
  booking,
  totalPaid = 0,
  onSaved,
}) {
  const { notify } = useToast();
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Catalogs
  const [packagesList, setPackagesList] = useState([]);
  const [catalogMenuItems, setCatalogMenuItems] = useState([]);
  const [catalogAddons, setCatalogAddons] = useState([]);

  // Catalog selectors
  const [selectedCatalogDish, setSelectedCatalogDish] = useState("");
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const catalogDropdownRef = useRef(null);

  const [selectedCatalogAddon, setSelectedCatalogAddon] = useState("");
  const [isAddonDropdownOpen, setIsAddonDropdownOpen] = useState(false);
  const [addonSearch, setAddonSearch] = useState("");
  const addonDropdownRef = useRef(null);

  // Section 1: Customer & Event Specifications
  const [details, setDetails] = useState({
    booking_for: "myself",
    celebrant_name: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_alt_phone: "",
    event_type: "",
    event_type_other: "",
    event_date: "",
    start_time: "12:00",
    duration_hours: 4,
    guest_count: 1,
    service_type: SERVICE_TYPES.FULL_SERVICE,
    delivery_method: "setup",
    event_theme: "",
    event_palette: "",
    venue_type: "",
    venue_type_other: "",
    province: BATANGAS_PROVINCE,
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    special_requests: "",
    dietary_restrictions: "",
    allergies: "",
    include_food: true,
  });

  const [showFullCustomerForm, setShowFullCustomerForm] = useState(false);

  // Section 2: Selected Package & Scaffold
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageName, setPackageName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");

  const [selectedScaffoldId, setSelectedScaffoldId] = useState("");
  const [scaffoldWidth, setScaffoldWidth] = useState("");
  const [scaffoldLength, setScaffoldLength] = useState("");
  const [scaffoldPrice, setScaffoldPrice] = useState("");
  const [isCustomScaffold, setIsCustomScaffold] = useState(false);

  // Section 3: Inclusions
  const [inclusions, setInclusions] = useState([]);

  // Section 4: Food Menu
  const [menuItems, setMenuItems] = useState([]);

  // Section 5: Add-ons
  const [addOns, setAddOns] = useState([]);

  // Section 6: Adjustments & Overtime
  const [transportationFee, setTransportationFee] = useState("");
  const [additionalFees, setAdditionalFees] = useState([]);
  const [taxes, setTaxes] = useState("");
  const [discounts, setDiscounts] = useState("");

  const [includeOvertime, setIncludeOvertime] = useState(false);
  const [overtimeMode, setOvertimeMode] = useState("per_crew"); // "per_crew" | "flat"
  const [overtimeHours, setOvertimeHours] = useState(2);
  const [crewCount, setCrewCount] = useState(3);
  const [hourlyRatePerCrew, setHourlyRatePerCrew] = useState(200);
  const [flatOvertimeFee, setFlatOvertimeFee] = useState(1500);
  const [overtimeCustomTitle, setOvertimeCustomTitle] = useState("");
  const [overtimeCustomAmount, setOvertimeCustomAmount] = useState("");

  // Section 7: Revision & Admin Notes
  const [revisionNote, setRevisionNote] = useState("");

  // UI State
  const [errors, setErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const formRef = useRef(null);

  // Load catalogs on open
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoadingCatalogs(true);

    Promise.allSettled([
      AdminAPI.getPackages(),
      AdminAPI.getMenu(),
      AdminAPI.getAddons(),
    ])
      .then(([pkgRes, menuRes, addonRes]) => {
        if (!alive) return;
        setPackagesList(pkgRes.status === "fulfilled" ? pkgRes.value?.data || [] : []);
        setCatalogMenuItems(menuRes.status === "fulfilled" ? menuRes.value?.data || [] : []);
        setCatalogAddons(addonRes.status === "fulfilled" ? addonRes.value?.data || [] : []);
      })
      .finally(() => {
        if (alive) setLoadingCatalogs(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  // Click outside catalog dish dropdown listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (catalogDropdownRef.current && !catalogDropdownRef.current.contains(event.target)) {
        setIsCatalogDropdownOpen(false);
      }
      if (addonDropdownRef.current && !addonDropdownRef.current.contains(event.target)) {
        setIsAddonDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize booking values into form state
  useEffect(() => {
    if (!open || !booking) return;

    const rawEventType = booking.event_type || "";
    const eventTypeIsOther = isOtherEventType(rawEventType);
    const rawVenueType = booking.venue_type || "";
    const venueTypeIsOther = isCustomVenueType({ venue_type: rawVenueType });
    const pkgId = booking.package_id?._id || booking.package_id || "";

    const isFood = booking.include_food !== false && booking.service_type !== SERVICE_TYPES.SETUP_ONLY;

    setDetails({
      booking_for: booking.booking_for || "myself",
      celebrant_name: booking.celebrant_name || "",
      contact_first_name: booking.contact_first_name || "",
      contact_last_name: booking.contact_last_name || "",
      contact_email: booking.contact_email || "",
      contact_phone: booking.contact_phone || "",
      contact_alt_phone: booking.contact_alt_phone || "",
      event_type: eventTypeIsOther ? OTHER_EVENT_TYPE : matchEventType(rawEventType) || rawEventType,
      event_type_other: eventTypeIsOther ? rawEventType : "",
      event_date: toDateInput(booking.event_date),
      start_time: booking.start_time || "12:00",
      duration_hours: Number(booking.duration_hours) || 4,
      guest_count: Number(booking.guest_count) || 1,
      service_type: booking.service_type || SERVICE_TYPES.FULL_SERVICE,
      delivery_method: booking.delivery_method || "setup",
      event_theme: booking.event_theme || "",
      event_palette: Array.isArray(booking.event_palette) ? booking.event_palette.join(", ") : booking.event_palette || "",
      venue_type: venueTypeIsOther ? OTHER_VENUE_TYPE : rawVenueType,
      venue_type_other: venueTypeIsOther ? rawVenueType : "",
      province: booking.province || BATANGAS_PROVINCE,
      municipality: booking.municipality || "",
      barangay: booking.barangay || "",
      street: booking.street || "",
      landmark: booking.landmark || "",
      zip_code: booking.zip_code || "",
      special_requests: booking.special_requests || "",
      dietary_restrictions: booking.dietary_restrictions || "",
      allergies: booking.allergies || "",
      include_food: isFood,
    });

    // Package & starting price
    setSelectedPackageId(pkgId);
    setPackageName(
      booking.package_id?.name ||
      booking.package_name_snapshot ||
      (booking.service_type === SERVICE_TYPES.FOOD_ONLY
        ? "Custom Food Order"
        : booking.service_type === SERVICE_TYPES.SETUP_ONLY
          ? "Custom Event Setup"
          : "Custom Package")
    );

    const initialStartingPrice =
      booking.package_starting_price != null && Number(booking.package_starting_price) > 0
        ? Number(booking.package_starting_price)
        : booking.package_price != null && Number(booking.package_price) > 0
          ? Number(booking.package_price)
          : booking.quotation_id?.package_starting_price != null
            ? Number(booking.quotation_id.package_starting_price)
            : derivePackageStartingPrice(booking, booking.guest_count);
    setStartingPrice(initialStartingPrice ? String(initialStartingPrice) : "");

    // Scaffold / space size
    const isCustom = Boolean(!booking.selected_scaffold_option_id && (booking.scaffold_width || booking.scaffold_length));
    setIsCustomScaffold(isCustom);
    setSelectedScaffoldId(booking.selected_scaffold_option_id || "");
    setScaffoldWidth(booking.scaffold_width ? String(booking.scaffold_width) : "");
    setScaffoldLength(booking.scaffold_length ? String(booking.scaffold_length) : "");
    setScaffoldPrice(booking.scaffold_price ? String(booking.scaffold_price) : "");

    // Inclusions
    let rawInclusions = [];
    if (Array.isArray(booking.package_inclusions) && booking.package_inclusions.length > 0) {
      const savedAdjustments = new Map(
        (Array.isArray(booking.inclusion_adjustments) ? booking.inclusion_adjustments : [])
          .filter((entry) => entry?.name)
          .map((entry) => [String(entry.name), entry])
      );
      rawInclusions = [
        ...booking.package_inclusions.map((entry) => {
          const text = inclusionText(entry);
          const adjustment = savedAdjustments.get(text);
          const row = inclusionRow(text);
          if (!adjustment) return row;
          return {
            ...row,
            baseQuantity: Number(adjustment.base_quantity) || row.baseQuantity,
            quantity: Number(adjustment.quantity) || row.quantity,
            unitPrice: adjustment.unit_price ? String(adjustment.unit_price) : "",
          };
        }),
        ...(Array.isArray(booking.removed_inclusions) ? booking.removed_inclusions : []).map(
          (entry) =>
            inclusionRow(inclusionText(entry), {
              removed: true,
              deduction: entry?.deduction ? String(entry.deduction) : "",
            })
        ),
      ];
    } else if (booking.quotation_id && Array.isArray(booking.quotation_id.package_inclusions)) {
      const savedAdjustments = new Map(
        (Array.isArray(booking.quotation_id.inclusion_adjustments) ? booking.quotation_id.inclusion_adjustments : [])
          .filter((entry) => entry?.name)
          .map((entry) => [String(entry.name), entry])
      );
      rawInclusions = [
        ...booking.quotation_id.package_inclusions.map((entry) => {
          const text = inclusionText(entry);
          const adjustment = savedAdjustments.get(text);
          const row = inclusionRow(text);
          if (!adjustment) return row;
          return {
            ...row,
            baseQuantity: Number(adjustment.base_quantity) || row.baseQuantity,
            quantity: Number(adjustment.quantity) || row.quantity,
            unitPrice: adjustment.unit_price ? String(adjustment.unit_price) : "",
          };
        }),
        ...(Array.isArray(booking.quotation_id.removed_inclusions) ? booking.quotation_id.removed_inclusions : []).map(
          (entry) =>
            inclusionRow(inclusionText(entry), {
              removed: true,
              deduction: entry?.deduction ? String(entry.deduction) : "",
            })
        ),
      ];
    } else if (Array.isArray(booking.package_id?.inclusions) && booking.package_id.inclusions.length > 0) {
      rawInclusions = booking.package_id.inclusions.map((inc) => inclusionRow(inc));
    }
    setInclusions(rawInclusions);

    // Menu Items
    const rawMenu = Array.isArray(booking.menu_items) ? booking.menu_items : [];
    const guests = Number(booking.guest_count) || 1;
    setMenuItems(
      rawMenu.map((m) => {
        const perGuest = m?.pricing_type === MENU_PRICING.PER_GUEST;
        const rawUnit = perGuest ? "pax" : m?.unit || "";
        const isStd = Boolean(findStandardUnit(rawUnit));
        return menuRow({
          name: m?.name || "",
          category: m?.category || "Main Course",
          note: m?.note || "",
          quantity: perGuest ? guests : Number(m?.quantity) > 0 ? Number(m.quantity) : 1,
          unit: rawUnit,
          isCustomUnit: !isStd && Boolean(String(rawUnit).trim()),
          pricing_type: m?.pricing_type || MENU_PRICING.PER_GUEST,
          price: m?.price ? String(m.price) : "",
          image_url: m?.image_url || "",
          removed: false,
        });
      })
    );

    // Add-ons / Service Items
    const rawServices = Array.isArray(booking.service_items) ? booking.service_items : [];
    setAddOns(
      rawServices.map((a) => ({
        name: a?.name || "",
        price: a?.price ? String(a.price) : "",
        quantity: Number(a?.quantity) || 1,
        note: a?.note || "",
        pricing_type: a?.pricing_type || "quantity",
        removed: false,
      }))
    );

    // Additional Charges, Transportation & Overtime
    let transpo = "";
    let otActive = false;
    let otTitle = "";
    let otAmount = "";
    const otherFees = [];

    const rawCharges = Array.isArray(booking.additional_charges) ? booking.additional_charges : [];
    rawCharges.forEach((c) => {
      const amt = Number(c?.amount) || 0;
      const cName = String(c?.name || "");
      if (/transport/i.test(cName)) {
        transpo = String(amt);
      } else if (/overtime/i.test(cName)) {
        otActive = true;
        otTitle = cName;
        otAmount = String(amt);
        if (/flat/i.test(cName)) {
          setOvertimeMode("flat");
          setFlatOvertimeFee(amt);
        } else {
          setOvertimeMode("per_crew");
          const m = cName.match(/(\d+(?:\.\d+)?)\s*hrs?.*?(\d+)\s*crew.*?(\d+)/i);
          if (m) {
            setOvertimeHours(Number(m[1]) || 2);
            setCrewCount(Number(m[2]) || 3);
            setHourlyRatePerCrew(Number(m[3]) || 200);
          }
        }
      } else {
        otherFees.push({ name: cName, amount: String(amt), isOvertime: false });
      }
    });

    setTransportationFee(transpo);
    setIncludeOvertime(otActive);
    setOvertimeCustomTitle(otTitle);
    setOvertimeCustomAmount(otAmount);
    setAdditionalFees(otherFees);

    // Taxes & Discounts
    setTaxes(booking.tax_amount ? String(booking.tax_amount) : "");
    setDiscounts(booking.discount_amount ? String(booking.discount_amount) : "");

    // Reset revision note
    setRevisionNote("");
    setErrors({});
    setShowConfirmDialog(false);
  }, [open, booking]);

  // Selected package object
  const selectedPackage = useMemo(() => {
    if (!selectedPackageId) return null;
    return (
      packagesList.find((p) => String(p._id) === String(selectedPackageId)) ||
      (booking?.package_id && typeof booking.package_id === "object" ? booking.package_id : null)
    );
  }, [selectedPackageId, packagesList, booking]);

  // Scaffold options for chosen package
  const scaffoldOptions = useMemo(() => {
    return Array.isArray(selectedPackage?.scaffold_size_options)
      ? selectedPackage.scaffold_size_options
      : [];
  }, [selectedPackage]);

  const selectedScaffoldPrice = useMemo(() => {
    if (isCustomScaffold || !selectedScaffoldId) return null;
    const opt = scaffoldOptions.find(
      (o, idx) => String(o._id) === String(selectedScaffoldId) || String(idx) === String(selectedScaffoldId)
    );
    return opt?.price ? Number(opt.price) : null;
  }, [isCustomScaffold, selectedScaffoldId, scaffoldOptions]);

  const handleScaffoldOptionChange = (optionId) => {
    if (optionId === "custom") {
      setIsCustomScaffold(true);
      setSelectedScaffoldId("");
      return;
    }
    setIsCustomScaffold(false);
    setSelectedScaffoldId(optionId);
    const opt = scaffoldOptions.find(
      (o, idx) => String(o._id) === String(optionId) || String(idx) === String(optionId)
    );
    if (opt) {
      setScaffoldWidth(opt.width_ft ? String(opt.width_ft) : "");
      setScaffoldLength(opt.length_ft ? String(opt.length_ft) : "");
      if (opt.price != null && Number(opt.price) > 0) {
        setStartingPrice(String(opt.price));
      }
    }
  };

  const handleCustomScaffoldChange = (w, l) => {
    setScaffoldWidth(w);
    setScaffoldLength(l);
  };

  const eventSpace = useMemo(() => {
    if (scaffoldWidth && scaffoldLength) {
      return `${scaffoldWidth}×${scaffoldLength} ft`;
    }
    return eventSpaceLabel(
      {
        selected_scaffold_option_id: selectedScaffoldId,
        scaffold_width: scaffoldWidth,
        scaffold_length: scaffoldLength,
      },
      selectedPackage
    );
  }, [scaffoldWidth, scaffoldLength, selectedScaffoldId, selectedPackage]);

  // Batangas municipalities & barangays
  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(details.municipality),
    [details.municipality]
  );

  // Set field detail helper
  const setDetail = (field, value) => {
    setDetails((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "municipality" && value !== prev.municipality) {
        next.barangay = "";
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Overtime calculations
  const computedOvertimeAmount = useMemo(() => {
    if (!includeOvertime) return 0;
    if (overtimeMode === "flat") {
      return Math.max(0, Number(flatOvertimeFee) || 0);
    }
    const hrs = Math.max(0, Number(overtimeHours) || 0);
    const crew = Math.max(1, Number(crewCount) || 1);
    const rate = Math.max(0, Number(hourlyRatePerCrew) || 0);
    return Math.round(hrs * crew * rate);
  }, [includeOvertime, overtimeMode, overtimeHours, crewCount, hourlyRatePerCrew, flatOvertimeFee]);

  const finalOvertimeAmount = useMemo(() => {
    if (!includeOvertime) return 0;
    if (overtimeCustomAmount !== "" && !isNaN(Number(overtimeCustomAmount))) {
      return Math.max(0, Number(overtimeCustomAmount));
    }
    return computedOvertimeAmount;
  }, [includeOvertime, overtimeCustomAmount, computedOvertimeAmount]);

  const defaultOvertimeTitle = useMemo(() => {
    const hrs = Number(overtimeHours) || 0;
    const hrsLabel = `${hrs} hr${hrs === 1 ? "" : "s"}`;
    if (overtimeMode === "flat") {
      return `Event Overtime Fee (${hrsLabel} flat extension)`;
    }
    const crew = Number(crewCount) || 1;
    const rate = Number(hourlyRatePerCrew) || 0;
    return `Crew Overtime (${hrsLabel} × ${crew} crew @ ₱${rate}/hr)`;
  }, [overtimeMode, overtimeHours, crewCount, hourlyRatePerCrew]);

  // Synchronize Crew Overtime item with additionalFees
  useEffect(() => {
    const title = overtimeCustomTitle.trim() || defaultOvertimeTitle;
    const amountStr = String(finalOvertimeAmount);

    setAdditionalFees((prev) => {
      const filtered = prev.filter((f) => !f.isOvertime && !/overtime/i.test(f.name || ""));
      if (!includeOvertime || finalOvertimeAmount <= 0) {
        return filtered;
      }
      return [...filtered, { name: title, amount: amountStr, isOvertime: true }];
    });
  }, [includeOvertime, finalOvertimeAmount, overtimeCustomTitle, defaultOvertimeTitle]);

  // Active (non-removed) item filters
  const keptInclusions = useMemo(() => inclusions.filter((i) => !i.removed), [inclusions]);
  const removedInclusions = useMemo(() => inclusions.filter((i) => i.removed), [inclusions]);
  const adjustedInclusions = useMemo(
    () =>
      keptInclusions.filter(
        (i) =>
          i.baseQuantity !== null &&
          i.baseQuantity !== undefined &&
          Number(i.quantity) !== Number(i.baseQuantity)
      ),
    [keptInclusions]
  );

  const activeMenuItems = useMemo(() => menuItems.filter((i) => !i.removed), [menuItems]);
  const activeAddOns = useMemo(() => addOns.filter((i) => !i.removed), [addOns]);

  // Compute live totals matching QuotationBuilderModal
  const totals = useMemo(() => {
    const guestCount = Math.max(1, Number(details.guest_count) || 1);
    return computeQuotationTotals({
      guest_count: guestCount,
      package_starting_price: startingPrice,
      removed_inclusions: removedInclusions.map((i) => ({
        name: i.name,
        deduction: i.deduction,
      })),
      inclusion_adjustments: adjustedInclusions.map((i) => ({
        name: i.name,
        base_quantity: i.baseQuantity,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
      menu_items: activeMenuItems,
      add_ons: activeAddOns,
      transportation_fee: transportationFee,
      additional_fees: additionalFees,
      taxes,
      discounts,
      deposit_amount: 0,
    });
  }, [
    details.guest_count,
    startingPrice,
    removedInclusions,
    adjustedInclusions,
    activeMenuItems,
    activeAddOns,
    transportationFee,
    additionalFees,
    taxes,
    discounts,
  ]);

  // Price difference vs original booking
  const originalTotalPrice = Number(booking?.total_price) || 0;
  const priceDifference = money(totals.totalCost - originalTotalPrice);
  const remainingBalanceAfterPaid = money(Math.max(0, totals.totalCost - (Number(totalPaid) || 0)));

  // Scroll to section helper for jump navigation
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /* --- Inclusions Handlers --- */
  const toggleInclusionRemoved = (index) => {
    setInclusions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
  };

  const handleInclusionName = (index, name) => {
    setInclusions((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, name: withInclusionName(item.name, name) } : item
      )
    );
  };

  const handleInclusionQuantity = (index, qty) => {
    setInclusions((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const clean = nonNegative(qty);
        return {
          ...item,
          quantity: clean === "" ? "" : Number(clean),
          name: withInclusionQuantity(item.name, clean === "" ? 0 : Number(clean)),
        };
      })
    );
  };

  const handleInclusionUnitPrice = (index, price) => {
    setInclusions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: nonNegative(price) } : item))
    );
  };

  const handleResetInclusionQuantity = (index) => {
    setInclusions((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          quantity: item.baseQuantity,
          unitPrice: "",
          name: withInclusionQuantity(item.name, item.baseQuantity),
        };
      })
    );
  };

  const handleInclusionDeduction = (index, deduction) => {
    setInclusions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, deduction: nonNegative(deduction) } : item))
    );
  };

  const handleAddInclusion = () => {
    setInclusions((prev) => [...prev, inclusionRow("New custom inclusion", { fromPackage: false })]);
  };

  const handleDeleteInclusion = (index) => {
    setInclusions((prev) => prev.filter((_, i) => i !== index));
  };

  const inclusionGroups = useMemo(() => {
    const byCategory = new Map();
    inclusions.forEach((entry, index) => {
      const parsed = parseInclusion(entry.name);
      const category = parsed?.category || "General Inclusions";
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push({ entry, index });
    });
    return Array.from(byCategory.entries()).map(([category, rows]) => ({ category, rows }));
  }, [inclusions]);

  /* --- Menu Handlers --- */
  const catalogDishMap = useMemo(() => {
    const map = new Map();
    for (const item of catalogMenuItems) {
      if (item?.name) map.set(item.name.toLowerCase().trim(), item);
      if (item?._id) map.set(String(item._id), item);
    }
    return map;
  }, [catalogMenuItems]);

  const getDishImage = (item) => {
    if (item?.image_url) return item.image_url;
    const byName = item?.name ? catalogDishMap.get(item.name.toLowerCase().trim()) : null;
    return byName?.image_url || "";
  };

  const getDishCategory = (item) => {
    const directCat = String(item?.category || "").trim();
    if (directCat) return directCat;
    const byName = item?.name ? catalogDishMap.get(item.name.toLowerCase().trim()) : null;
    return byName?.category || "Main Course";
  };

  const selectedCatalogDishObj = useMemo(() => {
    if (!selectedCatalogDish) return null;
    return catalogMenuItems.find((item) => String(item._id) === String(selectedCatalogDish)) || null;
  }, [selectedCatalogDish, catalogMenuItems]);

  const filteredCatalogDishes = useMemo(() => {
    if (!catalogSearch.trim()) return catalogMenuItems;
    const q = catalogSearch.toLowerCase().trim();
    return catalogMenuItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q)
    );
  }, [catalogMenuItems, catalogSearch]);

  const handleAddCatalogDish = () => {
    if (!selectedCatalogDishObj) return;
    const existing = menuItems.find(
      (m) => m.name.toLowerCase().trim() === selectedCatalogDishObj.name.toLowerCase().trim()
    );
    if (existing) {
      notify(`"${selectedCatalogDishObj.name}" is already in the menu list.`, "info");
      return;
    }
    setMenuItems((prev) => [
      ...prev,
      menuRow({
        name: selectedCatalogDishObj.name,
        category: selectedCatalogDishObj.category || "Main Course",
        note: selectedCatalogDishObj.description || "",
        quantity: 1,
        unit: selectedCatalogDishObj.unit || "Pax",
        pricing_type: selectedCatalogDishObj.pricing_type || MENU_PRICING.QUANTITY,
        price: selectedCatalogDishObj.price ? String(selectedCatalogDishObj.price) : "",
        image_url: selectedCatalogDishObj.image_url || "",
      }),
    ]);
    setSelectedCatalogDish("");
    setIsCatalogDropdownOpen(false);
  };

  const handleAddCustomDish = () => {
    setMenuItems((prev) => [
      ...prev,
      menuRow({
        name: "Custom Dish",
        category: "Main Course",
        quantity: 1,
        unit: "Pax",
        pricing_type: MENU_PRICING.QUANTITY,
        price: "",
      }),
    ]);
  };

  const handleMenuChange = (index, field, value) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleUnitSelectChange = (index, val) => {
    setMenuItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (val === "Others") {
          return { ...item, isCustomUnit: true, unit: "" };
        }
        return { ...item, isCustomUnit: false, unit: val };
      })
    );
  };

  const handleDeleteMenu = (index) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const groupedMenuItems = useMemo(() => {
    const byCategory = new Map();
    menuItems.forEach((item, originalIndex) => {
      const cat = getDishCategory(item);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push({ item, originalIndex });
    });
    return Array.from(byCategory.entries()).map(([categoryName, items]) => ({
      categoryKey: categoryName.toLowerCase(),
      categoryName,
      items,
    }));
  }, [menuItems, catalogDishMap]);

  /* --- Add-ons Handlers --- */
  const selectedCatalogAddonObj = useMemo(() => {
    if (!selectedCatalogAddon) return null;
    return catalogAddons.find((item) => String(item._id) === String(selectedCatalogAddon)) || null;
  }, [selectedCatalogAddon, catalogAddons]);

  const filteredCatalogAddons = useMemo(() => {
    if (!addonSearch.trim()) return catalogAddons;
    const q = addonSearch.toLowerCase().trim();
    return catalogAddons.filter(
      (item) => item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    );
  }, [catalogAddons, addonSearch]);

  const handleAddCatalogAddon = () => {
    if (!selectedCatalogAddonObj) return;
    const existing = addOns.find(
      (a) => a.name.toLowerCase().trim() === selectedCatalogAddonObj.name.toLowerCase().trim()
    );
    if (existing) {
      setAddOns((prev) =>
        prev.map((a) =>
          a.name.toLowerCase().trim() === selectedCatalogAddonObj.name.toLowerCase().trim()
            ? { ...a, quantity: (Number(a.quantity) || 1) + 1 }
            : a
        )
      );
    } else {
      setAddOns((prev) => [
        ...prev,
        {
          name: selectedCatalogAddonObj.name,
          price: selectedCatalogAddonObj.price ? String(selectedCatalogAddonObj.price) : "",
          quantity: 1,
          note: selectedCatalogAddonObj.description || "",
          pricing_type: selectedCatalogAddonObj.pricing_type || "quantity",
          removed: false,
        },
      ]);
    }
    setSelectedCatalogAddon("");
    setIsAddonDropdownOpen(false);
  };

  const handleAddCustomAddon = () => {
    setAddOns((prev) => [
      ...prev,
      {
        name: "Custom Service / Add-on",
        price: "",
        quantity: 1,
        note: "",
        pricing_type: "quantity",
        removed: false,
      },
    ]);
  };

  const handleAddOnChange = (index, field, value) => {
    setAddOns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteAddOn = (index) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  /* --- Additional Fees Handlers --- */
  const handleFeeChange = (index, field, value) => {
    setAdditionalFees((prev) =>
      prev.map((fee, i) =>
        i === index ? { ...fee, [field]: field === "amount" ? nonNegative(value) : value } : fee
      )
    );
  };

  const handleAddFee = () => {
    setAdditionalFees((prev) => [...prev, { name: "", amount: "", isOvertime: false }]);
  };

  const handleRemoveFee = (index) => {
    setAdditionalFees((prev) => prev.filter((_, i) => i !== index));
  };

  /* --- Validation & Submit --- */
  const handleInitiateSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const newErrors = {};
    if (!details.guest_count || Number(details.guest_count) <= 0) {
      newErrors.guest_count = "Guest count must be at least 1";
    }
    if (!details.event_date) {
      newErrors.event_date = "Event date is required";
    }
    if (!details.start_time) {
      newErrors.start_time = "Start time is required";
    }
    if (!details.event_type) {
      newErrors.event_type = "Event type is required";
    }
    if (details.event_type === OTHER_EVENT_TYPE && !details.event_type_other.trim()) {
      newErrors.event_type_other = "Please specify the custom event type";
    }
    if (!details.contact_first_name.trim()) {
      newErrors.contact_first_name = "First name is required";
    }
    if (!details.contact_last_name.trim()) {
      newErrors.contact_last_name = "Last name is required";
    }
    if (details.booking_for === "someone_else" && !details.celebrant_name.trim()) {
      newErrors.celebrant_name = "Honoree / celebrant name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notify("Please resolve the required fields before saving.", "error");
      scrollToSection("qb-section-details");
      return;
    }

    // Open confirm dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setSubmitting(true);
    try {
      const resolvedEventType =
        details.event_type === OTHER_EVENT_TYPE
          ? String(details.event_type_other || "").trim()
          : details.event_type;

      const resolvedVenueType =
        details.venue_type === OTHER_VENUE_TYPE
          ? String(details.venue_type_other || "").trim()
          : details.venue_type;

      // Compile clean additional charges array
      const allCharges = [];
      if (money(transportationFee) > 0) {
        allCharges.push({ name: "Transportation & Logistics Fee", amount: money(transportationFee) });
      }
      additionalFees.forEach((fee) => {
        if (fee.name && money(fee.amount) > 0) {
          allCharges.push({ name: fee.name.trim(), amount: money(fee.amount) });
        }
      });

      const payload = {
        event_type: resolvedEventType || "Catering Event",
        booking_for: details.booking_for || "myself",
        celebrant_name: details.celebrant_name || "",
        event_date: details.event_date,
        start_time: details.start_time,
        duration_hours: Number(details.duration_hours) || 4,
        guest_count: Number(details.guest_count),
        service_type: details.service_type,
        delivery_method: details.delivery_method,
        include_food: cateringIncluded,
        venue_type: resolvedVenueType || "Venue",
        province: details.province || BATANGAS_PROVINCE,
        municipality: details.municipality || "",
        barangay: details.barangay || "",
        street: details.street || "",
        landmark: details.landmark || "",
        zip_code: details.zip_code || "",
        event_theme: details.event_theme || "",
        event_palette: details.event_palette || "",
        special_requests: details.special_requests || "",
        dietary_restrictions: details.dietary_restrictions || "",
        allergies: details.allergies || "",
        contact_first_name: details.contact_first_name,
        contact_last_name: details.contact_last_name,
        contact_email: details.contact_email,
        contact_phone: details.contact_phone,
        contact_alt_phone: details.contact_alt_phone,
        package_id: selectedPackageId || undefined,
        package_name_snapshot: selectedPackage?.name || booking.package_name_snapshot || "",
        package_starting_price: totals.startingPrice,
        package_price: totals.packagePrice,
        package_inclusions: keptInclusions.map((i) => i.name),
        removed_inclusions: removedInclusions.map((i) => ({
          name: i.name,
          deduction: money(i.deduction),
        })),
        inclusion_adjustments: adjustedInclusions.map((i) => ({
          name: i.name,
          base_quantity: i.baseQuantity,
          quantity: i.quantity,
          unit_price: money(i.unitPrice),
          amount: inclusionAdjustmentAmount({
            base_quantity: i.baseQuantity,
            quantity: i.quantity,
            unit_price: i.unitPrice,
          }),
        })),
        selected_scaffold_option_id:
          isCustomScaffold || !selectedScaffoldId ? undefined : selectedScaffoldId,
        scaffold_width: scaffoldWidth ? Number(scaffoldWidth) : undefined,
        scaffold_length: scaffoldLength ? Number(scaffoldLength) : undefined,
        scaffold_price:
          selectedScaffoldPrice != null
            ? selectedScaffoldPrice
            : scaffoldPrice
              ? Number(scaffoldPrice)
              : undefined,
        menu_items: activeMenuItems.map((item) => ({
          name: item.name,
          category: item.category,
          note: item.note,
          quantity: Number(item.quantity) || 1,
          unit: item.unit,
          pricing_type: item.pricing_type,
          price: Number(item.price) || 0,
        })),
        service_items: activeAddOns.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          note: item.note,
          pricing_type: item.pricing_type || "quantity",
        })),
        additional_charges: allCharges,
        subtotal: totals.subtotal,
        discount_amount: totals.discounts,
        tax_amount: totals.taxes,
        total_price: totals.totalCost,
        revision_note:
          revisionNote.trim() || "Admin updated booking specifications and pricing via Quotation Builder interface",
      };

      await AdminAPI.updateBooking(booking._id, payload);
      notify("Booking specifications and pricing updated successfully!", "success");
      setShowConfirmDialog(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update booking.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !booking) return null;

  const isFoodOnly = details.service_type === SERVICE_TYPES.FOOD_ONLY;
  const isSetupOnly = details.service_type === SERVICE_TYPES.SETUP_ONLY;
  const cateringIncluded = !isSetupOnly && details.include_food !== false;

  const modalTitle = (
    <div className="flex flex-wrap items-center gap-2">
      <FileText className="w-5 h-5 text-primary shrink-0" />
      <span className="font-bold">Edit Booking Specifications</span>
      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-blue-800 border border-blue-200">
        {booking.reference || `BK-${String(booking._id).slice(-6).toUpperCase()}`}
      </span>
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 capitalize">
        {booking.status}
      </span>
    </div>
  );

  return (
    <>
      <Modal
        title={modalTitle}
        onClose={onClose}
        bodyClassName="overflow-hidden"
        className="max-w-7xl w-[96vw] h-[90vh]"
      >
        <form
          onSubmit={handleInitiateSubmit}
          className="flex h-full flex-col gap-4 overflow-hidden lg:flex-row lg:gap-6"
        >
          {/* ------------------------------------------------------------------
              Left Column: Continuous Scrollable Quotation-Style Form
          ------------------------------------------------------------------ */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Fixed Jump Navigation Toolbar (Never overlaps scrolling content) */}
            <div className="shrink-0 mb-3 bg-slate-100/80 border border-slate-200/90 rounded-xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 ml-1.5 mr-0.5 hidden sm:inline">
                Jump to:
              </span>
              <button
                type="button"
                onClick={() => scrollToSection("qb-section-details")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11.5px] shrink-0 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <User size={12} className="text-slate-500" />
                <span>1. Specs</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("qb-section-package")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11.5px] shrink-0 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Package size={12} className="text-slate-500" />
                <span>2. Package</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("qb-section-inclusions")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11.5px] shrink-0 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check size={12} className="text-slate-500" />
                <span>3. Inclusions ({keptInclusions.length})</span>
              </button>
              {cateringIncluded && (
                <button
                  type="button"
                  onClick={() => scrollToSection("qb-section-menu")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11.5px] shrink-0 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Utensils size={12} className="text-slate-500" />
                  <span>4. Menu ({activeMenuItems.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollToSection("qb-section-addons")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11.5px] shrink-0 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={12} className="text-slate-500" />
                <span>5. Add-ons ({activeAddOns.length})</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("qb-section-adjustments")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11.5px] shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  includeOvertime
                    ? "bg-sky-100 text-sky-900 border border-sky-300 font-bold"
                    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80"
                }`}
              >
                <Clock size={12} className={includeOvertime ? "text-sky-600" : "text-slate-500"} />
                <span>6. Overtime &amp; Fees {includeOvertime && `(Active)`}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("qb-section-notes")}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11.5px] shrink-0 border border-slate-200/80 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText size={12} className="text-slate-500" />
                <span>7. Revision Note</span>
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div ref={formRef} className="flex-1 space-y-4 overflow-y-auto pb-10 pr-1 lg:pr-3">
              {/* --- 1. Customer and Event Specifications ------------------------- */}
              <SectionCard
                step={1}
                id="qb-section-details"
                accent="slate"
                icon={User}
                title={
                  isFoodOnly
                    ? "Event Specifications & Order Details"
                    : isSetupOnly
                      ? "Event Specifications & Setup Location"
                      : "Event Specifications & Customer Details"
                }
                description="Key parameters driving package pricing, headcount, and event scheduling."
                aside={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFullCustomerForm(!showFullCustomerForm)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Pencil size={11} className="text-slate-500" />
                      <span>{showFullCustomerForm ? "Collapse Full Form" : "Edit Contact & Address"}</span>
                      {showFullCustomerForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                  {/* Primary Event Drivers Grid */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                    {/* Headcount / Pax */}
                    <div className="lg:col-span-1">
                      <Field
                        label={isFoodOnly ? "Headcount / Pax" : "Guest count (Pax)"}
                        required
                        error={errors.guest_count}
                        htmlFor="qb-guest_count"
                      >
                        <div className="relative">
                          <input
                            id="qb-guest_count"
                            type="number"
                            min="1"
                            value={details.guest_count}
                            onWheel={(e) => e.target.blur()}
                            onChange={(e) => setDetail("guest_count", nonNegative(e.target.value))}
                            className={`${inputClass(errors.guest_count)} font-bold text-base tabular-nums py-1.5`}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          {[50, 100, 150].map((pax) => (
                            <button
                              key={pax}
                              type="button"
                              onClick={() => setDetail("guest_count", pax)}
                              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                                Number(details.guest_count) === pax
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {pax}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>

                    {/* Service Type */}
                    <div className="lg:col-span-1">
                      <Field label="Service type" htmlFor="qb-service_type">
                        <select
                          id="qb-service_type"
                          value={details.service_type}
                          onChange={(e) => setDetail("service_type", e.target.value)}
                          className={`${inputClass(false)} py-2 text-xs font-semibold`}
                        >
                          {Object.values(SERVICE_TYPES).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Determines setup &amp; food options
                        </span>
                      </Field>
                    </div>

                    {/* Event Date */}
                    <div className="lg:col-span-1">
                      <Field label="Event date" required error={errors.event_date} htmlFor="qb-event_date">
                        <input
                          id="qb-event_date"
                          type="date"
                          value={details.event_date}
                          onChange={(e) => setDetail("event_date", e.target.value)}
                          className={`${inputClass(errors.event_date)} py-1.5 text-xs`}
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Scheduled date</span>
                      </Field>
                    </div>

                    {/* Start Time */}
                    <div className="lg:col-span-1">
                      <Field label="Start time" required error={errors.start_time} htmlFor="qb-start_time">
                        <input
                          id="qb-start_time"
                          type="time"
                          value={details.start_time}
                          onChange={(e) => setDetail("start_time", e.target.value)}
                          className={`${inputClass(errors.start_time)} py-1.5 text-xs`}
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Duration: {details.duration_hours || 4}h
                        </span>
                      </Field>
                    </div>

                    {/* Event Type */}
                    <div className="lg:col-span-1">
                      <Field label="Event type" required error={errors.event_type} htmlFor="qb-event_type">
                        <select
                          id="qb-event_type"
                          value={details.event_type}
                          onChange={(e) => setDetail("event_type", e.target.value)}
                          className={`${inputClass(errors.event_type)} py-2 text-xs`}
                        >
                          <option value="">Select event type</option>
                          {EVENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                          <option value={OTHER_EVENT_TYPE}>Other (Custom)</option>
                        </select>
                        {details.event_type === OTHER_EVENT_TYPE && (
                          <input
                            id="qb-event_type_other"
                            type="text"
                            placeholder="Specify event type..."
                            value={details.event_type_other}
                            onChange={(e) => setDetail("event_type_other", e.target.value)}
                            className={`${inputClass(errors.event_type_other)} py-1 text-xs mt-1`}
                          />
                        )}
                      </Field>
                    </div>
                  </div>

                  {/* Summary Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">
                          {details.contact_first_name} {details.contact_last_name}
                        </span>
                        {details.celebrant_name && (
                          <span className="rounded bg-rose-50 border border-rose-200/80 px-1.5 py-0.2 text-[10px] text-rose-700 font-medium">
                            for {details.celebrant_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span className="font-mono">{details.contact_phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[200px]">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{details.contact_email || "No email"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[240px]">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {[details.street, details.barangay, details.municipality].filter(Boolean).join(", ") ||
                            details.venue_type ||
                            "Venue address pending"}
                        </span>
                      </div>
                      {eventSpace && !isFoodOnly && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                          <Ruler size={12} className="text-primary shrink-0" />
                          <span>
                            Space: <strong className="font-mono text-slate-900 font-bold">{eventSpace}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFullCustomerForm(!showFullCustomerForm)}
                      className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>{showFullCustomerForm ? "Hide Form" : "Edit All Fields"}</span>
                      {showFullCustomerForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Collapsible Full Contact, Honoree & Venue Location Editor */}
                  {showFullCustomerForm && (
                    <div className="space-y-3.5 pt-2 animate-in fade-in-50 duration-150">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Field
                          label="First name"
                          required
                          error={errors.contact_first_name}
                          htmlFor="qb-contact_first_name"
                        >
                          <input
                            id="qb-contact_first_name"
                            type="text"
                            value={details.contact_first_name}
                            onChange={(e) => setDetail("contact_first_name", e.target.value)}
                            className={inputClass(errors.contact_first_name)}
                          />
                        </Field>
                        <Field
                          label="Last name"
                          required
                          error={errors.contact_last_name}
                          htmlFor="qb-contact_last_name"
                        >
                          <input
                            id="qb-contact_last_name"
                            type="text"
                            value={details.contact_last_name}
                            onChange={(e) => setDetail("contact_last_name", e.target.value)}
                            className={inputClass(errors.contact_last_name)}
                          />
                        </Field>
                        <Field label="Contact email" htmlFor="qb-contact_email">
                          <input
                            id="qb-contact_email"
                            type="email"
                            value={details.contact_email}
                            onChange={(e) => setDetail("contact_email", e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>
                        <Field label="Phone number" htmlFor="qb-contact_phone">
                          <input
                            id="qb-contact_phone"
                            type="tel"
                            value={details.contact_phone}
                            onChange={(e) => setDetail("contact_phone", e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>
                      </div>

                      {/* Honoree / Booking For */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Booking for">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setDetail("booking_for", "myself")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                                  details.booking_for === "myself"
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <User size={13} /> The customer themselves
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetail("booking_for", "someone_else")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                                  details.booking_for === "someone_else"
                                    ? "bg-rose-600 text-white border-rose-600"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <Heart size={13} /> Someone else
                              </button>
                            </div>
                          </Field>
                          {details.booking_for === "someone_else" ? (
                            <Field
                              label="Celebrant / Honoree Name"
                              required
                              error={errors.celebrant_name}
                              hint="Name of the person or couple celebrating (e.g. Sarah Jane, Baby Liam, John & Maria)."
                              htmlFor="qb-celebrant_name"
                            >
                              <input
                                id="qb-celebrant_name"
                                type="text"
                                placeholder="e.g. Sarah Jane"
                                value={details.celebrant_name}
                                onChange={(e) => setDetail("celebrant_name", e.target.value)}
                                className={inputClass(errors.celebrant_name)}
                              />
                            </Field>
                          ) : (
                            <div className="flex items-center text-xs text-slate-500 pt-5">
                              <span>
                                Booking under the customer's own name ({details.contact_first_name || "Customer"}).
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Theme & Palette */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Theme / Styling Motif" htmlFor="qb-event_theme">
                          <input
                            id="qb-event_theme"
                            type="text"
                            placeholder="e.g. Rustic Garden, Royal Blue Elegance"
                            value={details.event_theme}
                            onChange={(e) => setDetail("event_theme", e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>

                        <Field label="Color Palette" htmlFor="qb-event_palette">
                          <input
                            id="qb-event_palette"
                            type="text"
                            placeholder="e.g. Navy Blue, Gold, Ivory"
                            value={details.event_palette}
                            onChange={(e) => setDetail("event_palette", e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>
                      </div>

                      {/* Venue & Location */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Venue &amp; Location Details
                        </span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label="Venue type" htmlFor="qb-venue_type">
                            <input
                              id="qb-venue_type"
                              type="text"
                              placeholder="e.g. Function Hall, Residential Garden"
                              value={details.venue_type}
                              onChange={(e) => setDetail("venue_type", e.target.value)}
                              className={inputClass(false)}
                            />
                          </Field>
                          <Field label="Municipality (Batangas)" htmlFor="qb-municipality">
                            <select
                              id="qb-municipality"
                              value={details.municipality}
                              onChange={(e) => setDetail("municipality", e.target.value)}
                              className={`${inputClass(false)} py-1.5 text-xs`}
                            >
                              <option value="">Select municipality</option>
                              {municipalities.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field
                            label="Barangay"
                            hint={!details.municipality ? "Select municipality first" : undefined}
                            htmlFor="qb-barangay"
                          >
                            <select
                              id="qb-barangay"
                              value={details.barangay}
                              disabled={!details.municipality}
                              onChange={(e) => setDetail("barangay", e.target.value)}
                              className={`${inputClass(false)} py-1.5 text-xs`}
                            >
                              <option value="">Select barangay</option>
                              {barangays.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Street / House No." htmlFor="qb-street">
                            <input
                              id="qb-street"
                              type="text"
                              value={details.street}
                              onChange={(e) => setDetail("street", e.target.value)}
                              className={inputClass(false)}
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Landmark / Directions" htmlFor="qb-landmark">
                            <input
                              id="qb-landmark"
                              type="text"
                              placeholder="e.g. Beside Barangay Hall, Near Church"
                              value={details.landmark}
                              onChange={(e) => setDetail("landmark", e.target.value)}
                              className={inputClass(false)}
                            />
                          </Field>
                          <Field label="Delivery / Logistics Method">
                            <select
                              value={details.delivery_method}
                              onChange={(e) => setDetail("delivery_method", e.target.value)}
                              className={`${inputClass(false)} py-1.5 text-xs font-semibold`}
                            >
                              <option value="setup">Catering / Event Setup at Venue</option>
                              <option value="delivery">Delivery Drop-off Only</option>
                              <option value="pickup">Customer Pickup</option>
                            </select>
                          </Field>
                        </div>
                      </div>

                      {/* Dietary & Special Requests */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Dietary Restrictions / Allergies" htmlFor="qb-dietary">
                          <input
                            id="qb-dietary"
                            type="text"
                            placeholder="e.g. No pork, peanut allergies"
                            value={details.dietary_restrictions}
                            onChange={(e) => setDetail("dietary_restrictions", e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>
                        <Field label="Special Requests / Client Notes" htmlFor="qb-special_requests">
                          <input
                            id="qb-special_requests"
                            type="text"
                            placeholder="e.g. Early ingress needed by 9:00 AM"
                            value={details.special_requests}
                            onChange={(e) => setDetail("special_requests", e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* --- 2. Package and Starting Price ------------------------------- */}
              <SectionCard
                step={2}
                id="qb-section-package"
                accent="primary"
                icon={Package}
                title={
                  isFoodOnly
                    ? "Catering Package / Food Baseline"
                    : isSetupOnly
                      ? "Event Setup Package & Starting Price"
                      : "Package & Starting Price"
                }
                description="The baseline package rate and scaffold dimensions before inclusion deductions or add-ons."
              >
                <div
                  className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                    !isFoodOnly ? "lg:grid-cols-3" : ""
                  }`}
                >
                  <Field
                    label="Package"
                    hint="Switch package to re-seed inclusions and baseline price."
                  >
                    <select
                      value={selectedPackageId}
                      onChange={(e) => {
                        const newPkgId = e.target.value;
                        setSelectedPackageId(newPkgId);
                        const matched = packagesList.find((p) => String(p._id) === String(newPkgId));
                        if (matched) {
                          setPackageName(matched.name);
                          const newPrice = derivePackageStartingPrice(
                            { package_id: matched, service_type: details.service_type },
                            details.guest_count
                          );
                          if (newPrice > 0) setStartingPrice(String(newPrice));
                          if (Array.isArray(matched.inclusions) && matched.inclusions.length > 0) {
                            setInclusions(matched.inclusions.map((i) => inclusionRow(i)));
                          }
                          if (Array.isArray(matched.scaffold_size_options) && matched.scaffold_size_options.length > 0) {
                            const def = matched.scaffold_size_options[0];
                            setSelectedScaffoldId(String(def._id || 0));
                            setScaffoldWidth(def.width_ft ? String(def.width_ft) : "");
                            setScaffoldLength(def.length_ft ? String(def.length_ft) : "");
                            setIsCustomScaffold(false);
                          }
                        }
                      }}
                      className={`${inputClass(false)} py-2 text-xs font-semibold`}
                    >
                      <option value="">Custom Package / Custom Booking</option>
                      {packagesList.map((pkg) => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name} ({pkg.package_type || "Package"})
                        </option>
                      ))}
                    </select>
                  </Field>

                  {!isFoodOnly && (
                    <Field
                      label="Event space / scaffold size"
                      hint={
                        scaffoldOptions.length > 0
                          ? "Select size option or customize dimensions."
                          : "Space dimension in feet."
                      }
                      htmlFor="qb-scaffold-option"
                    >
                      {scaffoldOptions.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            id="qb-scaffold-option"
                            value={isCustomScaffold ? "custom" : selectedScaffoldId}
                            onChange={(e) => handleScaffoldOptionChange(e.target.value)}
                            className={`${inputClass(false)} py-2 text-xs font-semibold`}
                          >
                            {scaffoldOptions.map((opt, idx) => (
                              <option key={String(opt._id || idx)} value={String(opt._id || idx)}>
                                {formatScaffoldOption(opt, idx)}
                              </option>
                            ))}
                            <option value="custom">Custom dimensions...</option>
                          </select>
                          {isCustomScaffold && (
                            <div className="flex items-center gap-2 pt-1 animate-in fade-in-50 duration-150">
                              <div className="flex-1">
                                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                                  Width (ft)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Width"
                                  value={scaffoldWidth}
                                  onChange={(e) =>
                                    handleCustomScaffoldChange(e.target.value, scaffoldLength)
                                  }
                                  className={`${inputClass(false)} py-1.5 text-xs font-mono`}
                                />
                              </div>
                              <span className="text-slate-400 font-bold self-end pb-2">×</span>
                              <div className="flex-1">
                                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                                  Length (ft)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Length"
                                  value={scaffoldLength}
                                  onChange={(e) =>
                                    handleCustomScaffoldChange(scaffoldWidth, e.target.value)
                                  }
                                  className={`${inputClass(false)} py-1.5 text-xs font-mono`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                              Width (ft)
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Width"
                              value={scaffoldWidth}
                              onChange={(e) =>
                                handleCustomScaffoldChange(e.target.value, scaffoldLength)
                              }
                              className={`${inputClass(false)} py-1.5 text-xs font-mono`}
                            />
                          </div>
                          <span className="text-slate-400 font-bold self-end pb-2">×</span>
                          <div className="flex-1">
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                              Length (ft)
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Length"
                              value={scaffoldLength}
                              onChange={(e) =>
                                handleCustomScaffoldChange(scaffoldWidth, e.target.value)
                              }
                              className={`${inputClass(false)} py-1.5 text-xs font-mono`}
                            />
                          </div>
                        </div>
                      )}
                    </Field>
                  )}

                  <Field
                    label={isFoodOnly ? "Food baseline price" : "Package Starting Price"}
                    required
                    error={errors.package_starting_price}
                    hint="Baseline rate before inclusion removals or add-ons."
                    htmlFor="qb-package_starting_price"
                  >
                    <MoneyInput
                      id="qb-package_starting_price"
                      value={startingPrice}
                      error={errors.package_starting_price}
                      onChange={(value) => setStartingPrice(nonNegative(value))}
                    />
                  </Field>
                </div>

                {/* Live Package Calculation Banner */}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
                    <span className="text-slate-500">
                      Starting price
                      <strong className="ml-2 tabular-nums text-slate-800">
                        {formatCurrency(totals.startingPrice)}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      Removed inclusions
                      <strong
                        className={`ml-2 tabular-nums ${
                          totals.inclusionDeductions > 0 ? "text-emerald-700" : "text-slate-800"
                        }`}
                      >
                        {totals.inclusionDeductions > 0
                          ? `- ${formatCurrency(totals.inclusionDeductions)}`
                          : formatCurrency(0)}
                      </strong>
                    </span>
                    {totals.inclusionAdjustments !== 0 && (
                      <span className="text-slate-500">
                        Quantity changes
                        <strong
                          className={`ml-2 tabular-nums ${
                            totals.inclusionAdjustments < 0 ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {totals.inclusionAdjustments < 0
                            ? `- ${formatCurrency(Math.abs(totals.inclusionAdjustments))}`
                            : `+ ${formatCurrency(totals.inclusionAdjustments)}`}
                        </strong>
                      </span>
                    )}
                    <span className="font-semibold text-slate-900">
                      Adjusted package price
                      <strong className="ml-2 tabular-nums text-primary font-bold">
                        {formatCurrency(totals.packagePrice)}
                      </strong>
                    </span>
                  </div>
                </div>
              </SectionCard>

              {/* --- 3. Package Inclusions --------------------------------------- */}
              <SectionCard
                step={3}
                id="qb-section-inclusions"
                accent="emerald"
                icon={Check}
                title={
                  isFoodOnly
                    ? "Catering Inclusions"
                    : isSetupOnly
                      ? "Event Setup Inclusions"
                      : "Package Inclusions"
                }
                description="Remove what the customer is not getting (with deduction), or adjust quantities with live price impact."
                aside={
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      {keptInclusions.length} kept, {removedInclusions.length} removed
                    </span>
                    <button
                      type="button"
                      onClick={handleAddInclusion}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus size={11} /> Add inclusion
                    </button>
                  </div>
                }
              >
                {inclusions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    No preset inclusions on record. Click &ldquo;+ Add inclusion&rdquo; to add items to this booking.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inclusionGroups.map((group) => (
                      <div key={group.category}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {group.category}
                          </span>
                          <span className="h-px flex-1 bg-slate-200" />
                          <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                            {group.rows.length}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {group.rows.map(({ entry, index }) => {
                            const hasQuantity =
                              entry.baseQuantity !== null && entry.baseQuantity !== undefined;
                            const quantityMoved =
                              hasQuantity && Number(entry.quantity) !== Number(entry.baseQuantity);
                            return (
                              <li
                                key={index}
                                className={`rounded-lg border p-2.5 transition-colors ${
                                  entry.removed
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : quantityMoved
                                      ? "border-amber-200 bg-amber-50/40"
                                      : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                        entry.removed ? "bg-emerald-500" : "bg-primary"
                                      }`}
                                    />
                                    <input
                                      type="text"
                                      value={inclusionDisplayName(entry.name)}
                                      onChange={(e) => handleInclusionName(index, e.target.value)}
                                      placeholder="Inclusion description"
                                      className={`${inputClass(false)} py-1.5 text-xs ${
                                        entry.removed ? "line-through decoration-slate-400" : ""
                                      }`}
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                    {!entry.removed && hasQuantity && (
                                      <>
                                        <div
                                          className={`flex shrink-0 items-center gap-1.5 rounded-md border p-1 ${
                                            quantityMoved
                                              ? "border-amber-300 bg-amber-50 text-amber-800"
                                              : "border-slate-200 bg-slate-50 text-slate-600"
                                          }`}
                                        >
                                          <label className="pl-1 text-[10px] font-semibold uppercase tracking-wider">
                                            Qty
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={entry.quantity ?? ""}
                                            onWheel={(e) => e.target.blur()}
                                            onChange={(e) =>
                                              handleInclusionQuantity(index, e.target.value)
                                            }
                                            className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                          />
                                          <span className="pr-1 text-[10px] font-medium tabular-nums opacity-70">
                                            of {entry.baseQuantity}
                                          </span>
                                        </div>

                                        {quantityMoved && (
                                          <div className="w-32">
                                            <MoneyInput
                                              value={entry.unitPrice}
                                              placeholder="Unit price"
                                              onChange={(val) => handleInclusionUnitPrice(index, val)}
                                              className="py-1.5 text-xs"
                                            />
                                          </div>
                                        )}

                                        {quantityMoved && (
                                          <RowAction
                                            onClick={() => handleResetInclusionQuantity(index)}
                                            icon={Undo2}
                                            label="Reset"
                                            tone="neutral"
                                            title="Reset quantity to package default"
                                          />
                                        )}
                                      </>
                                    )}

                                    {entry.removed && (
                                      <div className="w-36">
                                        <MoneyInput
                                          value={entry.deduction}
                                          placeholder="Deduction (₱)"
                                          onChange={(val) => handleInclusionDeduction(index, val)}
                                          className="py-1.5 text-xs"
                                        />
                                      </div>
                                    )}

                                    {entry.removed ? (
                                      <RowAction
                                        onClick={() => toggleInclusionRemoved(index)}
                                        icon={Undo2}
                                        label="Restore"
                                        tone="neutral"
                                        title="Restore this inclusion"
                                      />
                                    ) : (
                                      <RowAction
                                        onClick={() =>
                                          entry.fromPackage
                                            ? toggleInclusionRemoved(index)
                                            : handleDeleteInclusion(index)
                                        }
                                        icon={Trash2}
                                        label="Remove"
                                        tone="danger"
                                        title="Remove this inclusion"
                                      />
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* --- 4. Food Menu Dishes ----------------------------------------- */}
              <SectionCard
                step={4}
                id="qb-section-menu"
                accent="violet"
                icon={Utensils}
                title="Food Menu Dishes"
                description="Itemized food dishes for catering. Each row carries its unit, pricing mode, and live line total."
                aside={
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      {activeMenuItems.length} dishes
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomDish}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus size={11} /> Custom dish
                    </button>
                  </div>
                }
              >
                {/* Catering Toggle */}
                <label className="mb-3 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cateringIncluded}
                    onChange={(e) => setDetail("include_food", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/40 cursor-pointer"
                  />
                  <span>Include catering menu on this booking</span>
                </label>

                {cateringIncluded && (
                  <div className="space-y-4">
                    {/* Catalog Dish Selector Dropdown */}
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:flex-row sm:items-center">
                      <div ref={catalogDropdownRef} className="relative flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => setIsCatalogDropdownOpen((prev) => !prev)}
                          className={`${inputClass(false)} flex items-center justify-between gap-2 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                            selectedCatalogDishObj
                              ? "border-primary/60 bg-primary/5 text-slate-900"
                              : "text-slate-700"
                          }`}
                        >
                          {selectedCatalogDishObj ? (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {selectedCatalogDishObj.image_url ? (
                                <img
                                  src={selectedCatalogDishObj.image_url}
                                  alt={selectedCatalogDishObj.name}
                                  className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0 bg-white"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-blue-100 text-[#2C4B8A] flex items-center justify-center shrink-0">
                                  <Utensils size={10} />
                                </div>
                              )}
                              <span className="truncate font-semibold">{selectedCatalogDishObj.name}</span>
                              {selectedCatalogDishObj.category && (
                                <span className="text-[9.5px] font-medium text-slate-500 uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                  {selectedCatalogDishObj.category}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-normal">Pick a dish from the menu catalog</span>
                          )}
                          <ChevronDown size={13} className="text-slate-400 shrink-0" />
                        </button>

                        {/* Dropdown Menu */}
                        {isCatalogDropdownOpen && (
                          <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl py-1 text-xs">
                            <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                              <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search dish by name or category..."
                                  value={catalogSearch}
                                  onChange={(e) => setCatalogSearch(e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            {filteredCatalogDishes.length === 0 ? (
                              <p className="p-3 text-center text-slate-400 text-xs italic">No matching dishes</p>
                            ) : (
                              filteredCatalogDishes.map((dish) => (
                                <button
                                  key={dish._id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCatalogDish(String(dish._id));
                                    setIsCatalogDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between p-2 hover:bg-slate-50 text-left cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {dish.image_url ? (
                                      <img
                                        src={dish.image_url}
                                        alt={dish.name}
                                        className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                                        <Utensils size={11} />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-800 truncate">{dish.name}</p>
                                      <p className="text-[10px] text-slate-400">{dish.category || "General"}</p>
                                    </div>
                                  </div>
                                  <span className="font-mono text-xs font-semibold text-slate-600 shrink-0 ml-2">
                                    {dish.price ? formatCurrency(dish.price) : "—"}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!selectedCatalogDish}
                        onClick={handleAddCatalogDish}
                        className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        <Plus size={13} /> Add to menu
                      </button>
                    </div>

                    {/* Grouped Menu Dish List */}
                    {activeMenuItems.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 italic py-4">
                        No dishes added yet. Pick a dish from the catalog above or click &ldquo;+ Custom dish&rdquo;.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {groupedMenuItems.map((group) => (
                          <div key={group.categoryKey} className="space-y-2">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                {group.categoryName} ({group.items.length})
                              </span>
                            </div>

                            <ul className="space-y-2">
                              {group.items.map(({ item, originalIndex }) => {
                                const standard = findStandardUnit(item.unit);
                                const isOthers = Boolean(
                                  item.isCustomUnit || (!standard && String(item.unit || "").trim())
                                );
                                const selectedDropdownValue = standard || (isOthers ? "Others" : "Pax");
                                const lineTotal = menuLineTotal(item, details.guest_count);

                                return (
                                  <li
                                    key={originalIndex}
                                    className={`rounded-lg border p-2.5 transition-colors ${
                                      item.removed
                                        ? "border-slate-300 bg-slate-50"
                                        : "border-violet-200 bg-white"
                                    }`}
                                  >
                                    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                                      <div className="flex min-w-0 flex-1 items-start gap-2.5 lg:min-w-[170px]">
                                        {getDishImage(item) ? (
                                          <img
                                            src={getDishImage(item)}
                                            alt={item.name || "Dish"}
                                            className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0 mt-0.5 bg-slate-100"
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded-md bg-blue-50 text-[#2C4B8A] border border-blue-100/60 flex items-center justify-center shrink-0 mt-0.5">
                                            <Utensils size={15} />
                                          </div>
                                        )}

                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                          <input
                                            type="text"
                                            value={item.name}
                                            disabled={item.removed}
                                            onChange={(e) =>
                                              handleMenuChange(originalIndex, "name", e.target.value)
                                            }
                                            placeholder="Dish name"
                                            className={`${inputClass(false)} min-w-0 py-1.5 text-xs font-semibold ${
                                              item.removed ? "line-through decoration-slate-400" : ""
                                            }`}
                                          />
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                                        {/* Qty & Unit */}
                                        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50/50 p-1 text-violet-800">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            disabled={item.removed}
                                            value={item.quantity === 0 ? "0" : item.quantity ?? ""}
                                            placeholder="1"
                                            onWheel={(e) => e.target.blur()}
                                            onChange={(e) =>
                                              handleMenuChange(originalIndex, "quantity", e.target.value)
                                            }
                                            className="w-12 rounded border border-violet-200 bg-white px-2 py-1 text-center text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                          />
                                          <div className="relative inline-flex items-center">
                                            <select
                                              disabled={item.removed}
                                              value={selectedDropdownValue}
                                              onChange={(e) =>
                                                handleUnitSelectChange(originalIndex, e.target.value)
                                              }
                                              className="appearance-none rounded border border-violet-200 bg-white py-1 pl-2 pr-5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                                            >
                                              {STANDARD_UNITS.map((u) => (
                                                <option key={u} value={u}>
                                                  {u}
                                                </option>
                                              ))}
                                              <option value="Others">Others</option>
                                            </select>
                                            <ChevronDown
                                              size={11}
                                              className="pointer-events-none absolute right-1 text-slate-400"
                                            />
                                          </div>
                                        </div>

                                        {/* Pricing Mode Toggle */}
                                        <button
                                          type="button"
                                          disabled={item.removed}
                                          onClick={() =>
                                            handleMenuChange(
                                              originalIndex,
                                              "pricing_type",
                                              item.pricing_type === MENU_PRICING.PER_GUEST
                                                ? MENU_PRICING.QUANTITY
                                                : MENU_PRICING.PER_GUEST
                                            )
                                          }
                                          className={`px-2 py-1.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer shrink-0 ${
                                            item.pricing_type === MENU_PRICING.PER_GUEST
                                              ? "bg-violet-600 text-white border-violet-600"
                                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                          }`}
                                          title="Click to toggle between Per Guest and Quantity/Flat pricing"
                                        >
                                          {item.pricing_type === MENU_PRICING.PER_GUEST ? "Per guest" : "Fixed / Qty"}
                                        </button>

                                        {/* Unit Price */}
                                        <div className="w-28">
                                          <MoneyInput
                                            value={item.price}
                                            disabled={item.removed}
                                            placeholder="Price"
                                            onChange={(val) =>
                                              handleMenuChange(originalIndex, "price", val)
                                            }
                                            className="py-1.5 text-xs"
                                          />
                                        </div>

                                        {/* Line Total */}
                                        <div className="min-w-[90px] text-right">
                                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                            Line total
                                          </span>
                                          <span className="text-xs font-bold tabular-nums text-slate-800">
                                            {formatCurrency(lineTotal)}
                                          </span>
                                        </div>

                                        <RowAction
                                          onClick={() => handleDeleteMenu(originalIndex)}
                                          icon={Trash2}
                                          label="Delete"
                                          tone="danger"
                                          title="Delete dish from menu"
                                        />
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* --- 5. Add-ons & Extra Services --------------------------------- */}
              <SectionCard
                step={5}
                id="qb-section-addons"
                accent="amber"
                icon={Sparkles}
                title="Add-ons &amp; Extra Services"
                description="Additional service rentals, extra equipment, lechon stations, or styling add-ons."
                aside={
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      {activeAddOns.length} items
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomAddon}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                    >
                      <Plus size={11} /> Custom add-on
                    </button>
                  </div>
                }
              >
                {/* Catalog Add-on Dropdown */}
                <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:flex-row sm:items-center">
                  <div ref={addonDropdownRef} className="relative flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setIsAddonDropdownOpen((prev) => !prev)}
                      className={`${inputClass(false)} flex items-center justify-between gap-2 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        selectedCatalogAddonObj
                          ? "border-primary/60 bg-primary/5 text-slate-900"
                          : "text-slate-700"
                      }`}
                    >
                      {selectedCatalogAddonObj ? (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="truncate font-semibold">{selectedCatalogAddonObj.name}</span>
                          <span className="text-slate-500 font-mono">
                            {formatCurrency(selectedCatalogAddonObj.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-normal">Pick an add-on from catalog</span>
                      )}
                      <ChevronDown size={13} className="text-slate-400 shrink-0" />
                    </button>

                    {isAddonDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl py-1 text-xs">
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                          <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search add-on..."
                              value={addonSearch}
                              onChange={(e) => setAddonSearch(e.target.value)}
                              className="w-full pl-7 pr-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                        {filteredCatalogAddons.length === 0 ? (
                          <p className="p-3 text-center text-slate-400 text-xs italic">No matching add-ons</p>
                        ) : (
                          filteredCatalogAddons.map((item) => (
                            <button
                              key={item._id}
                              type="button"
                              onClick={() => {
                                setSelectedCatalogAddon(String(item._id));
                                setIsAddonDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2 hover:bg-slate-50 text-left cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                            >
                              <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                              <span className="font-mono text-xs font-semibold text-slate-600 shrink-0 ml-2">
                                {item.price ? formatCurrency(item.price) : "—"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedCatalogAddon}
                    onClick={handleAddCatalogAddon}
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    <Plus size={13} /> Add item
                  </button>
                </div>

                {/* Add-ons List */}
                {activeAddOns.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 italic py-4">
                    No add-ons or extra services added to this booking.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {addOns.map((item, index) => {
                      if (item.removed) return null;
                      return (
                        <li key={index} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleAddOnChange(index, "name", e.target.value)}
                              placeholder="Add-on name"
                              className={`${inputClass(false)} flex-1 py-1.5 text-xs font-semibold`}
                            />
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <label className="text-[10px] font-semibold uppercase text-slate-500">
                                  Qty
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onWheel={(e) => e.target.blur()}
                                  onChange={(e) => handleAddOnChange(index, "quantity", e.target.value)}
                                  className="w-14 rounded border border-slate-200 px-2 py-1 text-xs font-semibold tabular-nums"
                                />
                              </div>

                              <div className="w-28">
                                <MoneyInput
                                  value={item.price}
                                  placeholder="Price"
                                  onChange={(val) => handleAddOnChange(index, "price", val)}
                                  className="py-1.5 text-xs"
                                />
                              </div>

                              <div className="min-w-[90px] text-right">
                                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  Line total
                                </span>
                                <span className="text-xs font-bold tabular-nums text-slate-800">
                                  {formatCurrency(addOnLineTotal(item))}
                                </span>
                              </div>

                              <RowAction
                                onClick={() => handleDeleteAddOn(index)}
                                icon={Trash2}
                                label="Delete"
                                tone="danger"
                                title="Remove add-on"
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>

              {/* --- 6. Adjustments, Overtime & Logistics ------------------------- */}
              <SectionCard
                step={6}
                id="qb-section-adjustments"
                accent="sky"
                icon={Percent}
                title="Adjustments, Overtime &amp; Logistics"
                description="Transportation, delivery, crew overtime calculator, custom fees, taxes, and discounts."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field
                      label="Transportation & Logistics"
                      hint="Hauling, fuel, and crew transport fee."
                      htmlFor="qb-transpo"
                    >
                      <MoneyInput
                        id="qb-transpo"
                        value={transportationFee}
                        onChange={(val) => setTransportationFee(nonNegative(val))}
                      />
                    </Field>
                    <Field label="Taxes" hint="Added to subtotal." htmlFor="qb-taxes">
                      <MoneyInput id="qb-taxes" value={taxes} onChange={(val) => setTaxes(nonNegative(val))} />
                    </Field>
                    <Field label="Discounts" hint="Deducted from subtotal." htmlFor="qb-discounts">
                      <MoneyInput
                        id="qb-discounts"
                        value={discounts}
                        onChange={(val) => setDiscounts(nonNegative(val))}
                      />
                    </Field>
                  </div>

                  {/* Overtime Calculator */}
                  <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                            Crew &amp; Event Overtime Calculator
                          </span>
                          <span className="text-[10.5px] text-slate-500">
                            Automatic formula calculation for extended event hours.
                          </span>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-bold text-sky-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeOvertime}
                          onChange={(e) => setIncludeOvertime(e.target.checked)}
                          className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span>Enable Overtime Fee</span>
                      </label>
                    </div>

                    {includeOvertime && (
                      <div className="space-y-3 pt-1 animate-in fade-in-50 duration-150">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setOvertimeMode("per_crew")}
                            className={`px-3 py-1.5 rounded-md font-semibold border transition-colors cursor-pointer ${
                              overtimeMode === "per_crew"
                                ? "bg-sky-600 text-white border-sky-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            Per Crew per Hour
                          </button>
                          <button
                            type="button"
                            onClick={() => setOvertimeMode("flat")}
                            className={`px-3 py-1.5 rounded-md font-semibold border transition-colors cursor-pointer ${
                              overtimeMode === "flat"
                                ? "bg-sky-600 text-white border-sky-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            Flat Event Extension Fee
                          </button>
                        </div>

                        {overtimeMode === "per_crew" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Field label="Overtime Hours">
                              <input
                                type="number"
                                min="1"
                                step="0.5"
                                value={overtimeHours}
                                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                                className={`${inputClass(false)} py-1.5 text-xs font-semibold`}
                              />
                            </Field>
                            <Field label="Crew Members Count">
                              <input
                                type="number"
                                min="1"
                                value={crewCount}
                                onChange={(e) => setCrewCount(Number(e.target.value))}
                                className={`${inputClass(false)} py-1.5 text-xs font-semibold`}
                              />
                            </Field>
                            <Field label="Hourly Rate per Crew (₱)">
                              <input
                                type="number"
                                min="0"
                                value={hourlyRatePerCrew}
                                onChange={(e) => setHourlyRatePerCrew(Number(e.target.value))}
                                className={`${inputClass(false)} py-1.5 text-xs font-semibold`}
                              />
                            </Field>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Overtime Extension (Hours)">
                              <input
                                type="number"
                                min="1"
                                value={overtimeHours}
                                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                                className={`${inputClass(false)} py-1.5 text-xs font-semibold`}
                              />
                            </Field>
                            <Field label="Flat Overtime Fee (₱)">
                              <input
                                type="number"
                                min="0"
                                value={flatOvertimeFee}
                                onChange={(e) => setFlatOvertimeFee(Number(e.target.value))}
                                className={`${inputClass(false)} py-1.5 text-xs font-semibold`}
                              />
                            </Field>
                          </div>
                        )}

                        {/* Formula Summary & Live Overtime Total */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-sky-100/70 border border-sky-200">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">
                              Formula Calculation
                            </span>
                            <p className="text-xs font-semibold text-sky-950 mt-0.5">
                              {overtimeMode === "per_crew" ? (
                                <>
                                  {overtimeHours} hrs &times; {crewCount} crew &times;{" "}
                                  {formatCurrency(hourlyRatePerCrew)}/hr
                                </>
                              ) : (
                                <>{overtimeHours} hrs flat event extension</>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block sm:inline mr-2">
                              Total Fee:
                            </span>
                            <span className="text-base font-extrabold text-sky-950 tabular-nums">
                              {formatCurrency(finalOvertimeAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Additional Fees */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 block">
                          Other Custom Additional Fees
                        </span>
                        <span className="text-[10.5px] text-slate-400">
                          One-off charges such as venue corkage, power generators, or security bond.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddFee}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs shrink-0"
                      >
                        <Plus size={12} /> Add custom fee
                      </button>
                    </div>

                    {additionalFees.filter((f) => !f.isOvertime).length === 0 ? (
                      <p className="text-[11.5px] text-slate-400 italic py-1">
                        No custom additional fees added yet.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {additionalFees.map((fee, index) => {
                          if (fee.isOvertime) return null;
                          return (
                            <li key={index} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={fee.name}
                                onChange={(e) => handleFeeChange(index, "name", e.target.value)}
                                placeholder="Fee description (e.g. Corkage, Generator)"
                                className={`${inputClass(false)} flex-1 py-1.5 text-xs`}
                              />
                              <div className="w-36 shrink-0">
                                <MoneyInput
                                  value={fee.amount}
                                  placeholder="Amount"
                                  onChange={(val) => handleFeeChange(index, "amount", val)}
                                  className="py-1.5 text-xs"
                                />
                              </div>
                              <RowAction
                                onClick={() => handleRemoveFee(index)}
                                icon={Trash2}
                                label="Remove"
                                tone="danger"
                                title="Remove fee"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* --- 7. Revision Note & Admin Notes ------------------------------ */}
              <SectionCard
                step={7}
                id="qb-section-notes"
                accent="indigo"
                icon={FileText}
                title="Revision Notes &amp; Audit Log"
                description="Enter the reason for modifying this booking. This will be preserved in the booking revision history."
              >
                <div className="space-y-3">
                  <Field
                    label="Revision Note (Logged in History)"
                    hint="Explain what was changed (e.g. 'Customer added 25 guests and requested extra lechon station')."
                    htmlFor="qb-revision-note"
                  >
                    <textarea
                      id="qb-revision-note"
                      rows="2"
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="e.g. Client requested 20 additional guests and adjusted dessert inclusions"
                      className={`${inputClass(false)} resize-y text-xs`}
                    />
                  </Field>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Right Column: Sticky Running Quotation Summary Sidebar
          ------------------------------------------------------------------ */}
          <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-xl bg-[#16264A] text-white lg:w-[360px]">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4 shrink-0">
              <Calculator size={17} className="text-primary" />
              <span className="text-sm font-bold">Booking summary</span>
              <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                {booking.reference || `BK-${String(booking._id).slice(-6).toUpperCase()}`}
              </span>
            </div>

            {/* Running Breakdown */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Package Baseline */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isFoodOnly ? "Food Baseline" : isSetupOnly ? "Setup Package" : "Package Baseline"}
                </p>
                {eventSpace && !isFoodOnly && (
                  <div className="flex items-center justify-between text-xs py-1 text-slate-300 border-b border-white/5">
                    <span className="flex items-center gap-1.5 text-slate-400 text-[11.5px]">
                      <Ruler size={12} className="text-primary" /> Event space
                    </span>
                    <span className="font-semibold text-white font-mono">{eventSpace}</span>
                  </div>
                )}
                <SummaryRow
                  label={isFoodOnly ? "Food baseline" : "Starting price"}
                  value={formatCurrency(totals.startingPrice)}
                />
                {totals.inclusionDeductions > 0 && (
                  <SummaryRow
                    label="Removed inclusions"
                    detail={`(${removedInclusions.length})`}
                    value={`- ${formatCurrency(totals.inclusionDeductions)}`}
                    tone="deduct"
                  />
                )}
                {totals.inclusionAdjustments !== 0 && (
                  <SummaryRow
                    label="Quantity changes"
                    value={
                      totals.inclusionAdjustments < 0
                        ? `- ${formatCurrency(Math.abs(totals.inclusionAdjustments))}`
                        : `+ ${formatCurrency(totals.inclusionAdjustments)}`
                    }
                  />
                )}
                <SummaryRow
                  label={isFoodOnly ? "Adjusted food baseline" : "Adjusted package price"}
                  value={formatCurrency(totals.packagePrice)}
                  strong
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Line Items
                </p>
                <SummaryRow
                  label="Menu dishes"
                  detail={`(${activeMenuItems.length})`}
                  value={formatCurrency(totals.menuSubtotal)}
                />
                <SummaryRow
                  label="Add-ons &amp; services"
                  detail={`(${activeAddOns.length})`}
                  value={formatCurrency(totals.addOnsSubtotal)}
                />
              </div>

              {/* Adjustments & Logistics */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Adjustments &amp; Logistics
                </p>
                {money(transportationFee) > 0 && (
                  <SummaryRow label="Transportation" value={formatCurrency(transportationFee)} />
                )}
                {includeOvertime && finalOvertimeAmount > 0 && (
                  <SummaryRow label="Crew overtime fee" value={formatCurrency(finalOvertimeAmount)} />
                )}
                {additionalFees
                  .filter((f) => !f.isOvertime && money(f.amount) > 0)
                  .map((f, idx) => (
                    <SummaryRow key={idx} label={f.name || "Custom fee"} value={formatCurrency(f.amount)} />
                  ))}
                {money(taxes) > 0 && <SummaryRow label="Taxes" value={`+ ${formatCurrency(taxes)}`} />}
                {money(discounts) > 0 && (
                  <SummaryRow
                    label="Discounts"
                    value={`- ${formatCurrency(discounts)}`}
                    tone="deduct"
                  />
                )}
              </div>

              {/* Subtotal and Total Cost */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-sm font-bold text-white">Updated Total Cost</span>
                  <span className="text-xl font-extrabold tabular-nums text-white">
                    {formatCurrency(totals.totalCost)}
                  </span>
                </div>
              </div>

              {/* Total Paid & Remaining Balance */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Total Paid so far:</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Remaining Balance:</span>
                  <span className="font-bold text-white font-mono text-sm">
                    {formatCurrency(remainingBalanceAfterPaid)}
                  </span>
                </div>
              </div>

              {/* Price Difference Indicator */}
              <div
                className={`p-2.5 rounded-lg border text-xs leading-snug ${
                  priceDifference > 0
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                    : priceDifference < 0
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Price Change:</span>
                  <span className="font-mono">
                    {priceDifference > 0
                      ? `+ ${formatCurrency(priceDifference)}`
                      : priceDifference < 0
                        ? `- ${formatCurrency(Math.abs(priceDifference))}`
                        : "No change"}
                  </span>
                </div>
                <span className="text-[10.5px] opacity-80 mt-0.5 block">
                  {priceDifference > 0
                    ? "Updated specs increase the total cost."
                    : priceDifference < 0
                      ? "Updated specs reduce the total cost."
                      : "Total cost is unchanged from original booking."}
                </span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="border-t border-white/10 bg-[#16264A] p-4 flex flex-col gap-2 shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Updated Booking
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-full flex items-center justify-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </aside>
        </form>
      </Modal>

      {/* Pre-save confirmation dialog */}
      {showConfirmDialog && (
        <FeedbackDialog
          tone="warning"
          title="Confirm Booking Update"
          description="Are you sure you want to apply these updates to this booking? A revision entry will be created."
          confirmLabel={submitting ? "Saving..." : "Yes, Update Booking"}
          cancelLabel="Review Changes"
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirmDialog(false)}
        >
          <div className="space-y-2.5 text-xs text-slate-700 py-1">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Original Total:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(originalTotalPrice)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>New Total Price:</span>
              <span className="font-bold text-slate-900">{formatCurrency(totals.totalCost)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Price Difference:</span>
              <span
                className={`font-bold ${
                  priceDifference > 0 ? "text-amber-700" : priceDifference < 0 ? "text-emerald-700" : "text-slate-700"
                }`}
              >
                {priceDifference > 0
                  ? `+ ${formatCurrency(priceDifference)}`
                  : priceDifference < 0
                    ? `- ${formatCurrency(Math.abs(priceDifference))}`
                    : "No change"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>New Remaining Balance:</span>
              <span className="font-bold text-slate-900">{formatCurrency(remainingBalanceAfterPaid)}</span>
            </div>
            {revisionNote && (
              <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Revision Note</span>
                <p className="text-slate-800 italic mt-0.5">{revisionNote}</p>
              </div>
            )}
          </div>
        </FeedbackDialog>
      )}
    </>
  );
}
