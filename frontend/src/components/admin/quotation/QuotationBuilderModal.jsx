import React, { useState, useEffect, useMemo, useRef } from "react";
import Modal from "../../common/Modal";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import ZelleQuoteDraft from "../ui/ZelleQuoteDraft";
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
  Check,
  Lock,
  MapPin,
  CalendarDays,
  FileText,
} from "lucide-react";
import { diffQuotationVersions } from "../../../utils/quotationDiff";
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
} from "../../../lib/packageDisplay";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../../lib/eventTypes";
import {
  SERVICE_TYPES,
  cateringRequested,
} from "../../../pages/customer/booking/lib/bookingRules";
import {
  isSpecialOffer,
  offerBaseFoodPrice,
  offerFoodItems,
  offerGuestCount,
  offerInclusions,
  offerPricePerPax,
} from "../../../lib/specialOffers";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../../utils/batangas";
import { formatCurrency } from "../../../utils/format";
import FeedbackDialog from "../../feedback/FeedbackDialog";
import InlineMessage from "../../feedback/InlineMessage";
import { useConfirm } from "../../feedback/confirmContext";

/* ---------------------------------------------------------------------------
   Presentation primitives
   Royal Blue carries action and structure, slate carries everything else.
   Emerald marks money coming off the quote, red marks a blocking error, and
   amber marks something the admin should look at but may deliberately keep.
--------------------------------------------------------------------------- */

const INPUT_BASE =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500";
const inputClass = (hasError) =>
  `${INPUT_BASE} ${hasError ? "border-red-400 bg-red-50/40" : "border-slate-300"}`;

const LABEL_CLASS =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-1.5";

// One labelled control for every removable row in the builder. An icon on its
// own read as a second, different action next to the inclusions list's "Remove"
// button; saying what it does keeps every section consistent.
//
// The tone carries the meaning: taking something out is destructive and reads
// red, putting it back is a recovery and reads emerald. When the two sat in the
// same neutral slate they were indistinguishable at a glance, which is exactly
// the moment an admin is deciding between them. Both stay outline-only so a
// long list of rows does not turn into a wall of colour.
const ROW_ACTION_BASE =
  "inline-flex shrink-0 items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
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

/** A peso input. Keyboard rules block the characters that produce a negative. */
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass(error)} pl-7 font-semibold tabular-nums ${className}`}
      />
    </div>
  );
}

/**
 * Section accents.
 *
 * Seven near-identical white cards made the builder one long undifferentiated
 * scroll: the only way to tell where you were was to read the heading. Each
 * section now carries a hue on its icon chip and step number, so scrolling
 * past one is enough to know which part of the quote you are in.
 *
 * Deliberately confined to a 28px chip and a two-character number. The hue
 * marks a place, it is not a status — statuses (error red, deduction emerald,
 * warning amber) have to stay louder than this or they stop reading as
 * statuses at all.
 */
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
            {/* font-sans explicitly: this modal is rendered into a body portal,
                outside the .admin-layout wrapper whose rule opts admin headings
                out of Playfair. Without it a 14px section label renders in the
                display serif, which is what that face is least suited to. */}
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

/** One line in the right-hand summary. */
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

/** "today at 2:15 PM" for a draft's save time, so it reads as recent work. */
const formatSavedAt = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) return `today at ${time}`;
  return `${date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} at ${time}`;
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

/**
 * Today, as the date input's own yyyy-mm-dd string.
 *
 * Compared as strings rather than Dates so the check means "the calendar day
 * the admin is sitting in", with no timezone shift turning this morning's event
 * into yesterday's.
 */
const todayInput = () => toDateInput(new Date());

const nonNegative = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  return cleaned;
};

const numberOf = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/**
 * Whether an amount was left untouched.
 *
 * Kept separate from "is zero" on purpose: an add-on offered at no charge and
 * an add-on nobody priced are different states, and only the second one is an
 * error. A blank field is unanswered, a typed 0 is an answer.
 */
const isBlankAmount = (value) => String(value ?? "").trim() === "";

const inclusionText = (inclusion) =>
  typeof inclusion === "string" ? inclusion : String(inclusion?.name || inclusion || "");

/**
 * Units the kitchen actually quotes in, offered as suggestions only.
 *
 * The field is a free-text input with this list behind a datalist, so the
 * common cases are one keystroke away and an unusual one is still just
 * typed. Nothing branches on the value — a unit is a label on a number —
 * so adding to this list is a convenience, never a requirement.
 *
 * "pax" is deliberately not among them. A dish sold by the head is a quantity
 * of guests like any other quantity, and offering it as a suggestion is how a
 * per-person default creeps back into a form whose whole point is that food is
 * priced by the kilo, the tray or the bilao as often as by the person.
 */
const UNIT_SUGGESTIONS = [
  "unit",
  "serving",
  "kilo",
  "tray",
  "bilao",
  "pan",
  "platter",
  "bottle",
  "gallon",
  "piece",
  "set",
];

/**
 * A dish row as the builder holds it, whatever it was seeded from.
 *
 * Every row is priced per unit: a quantity of the dish's own units at a unit
 * rate. Per-guest catering is expressed the same way — so many pax at so much
 * a head — rather than through a second pricing mode with its own arithmetic.
 */
const menuRow = (partial = {}) => ({
  name: "",
  // What the dish is — its course in the menu catalog. Read-only here and
  // deliberately its own field: it used to be seeded into `note`, which turned
  // every dish's note into the word "Main Course" and left nowhere to write an
  // actual note.
  category: "",
  note: "",
  quantity: 1,
  unit: "",
  pricing_type: MENU_PRICING.QUANTITY,
  price: "",
  ...partial,
});

/**
 * An inclusion row as the builder holds it.
 *
 * `baseQuantity` is the amount the package's own wording stated, read out of
 * the line's text — the figure a change is measured against. It is null for a
 * line that never named a quantity ("Professional crew"), which is how the
 * row knows it has nothing to adjust.
 */
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

/** Where an inclusion with no category of its own is listed. */
const OTHER_INCLUSION_CATEGORY = "Other";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------------------------------------------------------------------
   Quotation Builder
--------------------------------------------------------------------------- */

export default function QuotationBuilderModal({ inquiry, onClose, onSuccess }) {
  const { notify } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  // `quotation` is the newest version the customer has actually been sent. It
  // drives the version banner and the change list, and is deliberately separate
  // from `savedDraft`, which is unfinished work nobody outside this modal sees.
  const [quotation, setQuotation] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);

  // Reference catalogs
  const [catalogMenuItems, setCatalogMenuItems] = useState([]);
  const [catalogAddons, setCatalogAddons] = useState([]);
  const [selectedCatalogDish, setSelectedCatalogDish] = useState("");
  const [selectedCatalogAddon, setSelectedCatalogAddon] = useState("");
  const [depositPercentage, setDepositPercentage] = useState(20);

  // Section 1: what the customer submitted, editable so the admin can correct it
  const [details, setDetails] = useState({
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    event_type: "",
    event_type_other: "",
    event_date: "",
    start_time: "",
    guest_count: 1,
    service_type: SERVICE_TYPES.FULL_SERVICE,
    // The design brief, editable here like every other event detail. The
    // palette is held as the comma-separated text the admin types and split
    // back into the array the Inquiry stores only on the way out.
    event_theme: "",
    event_palette: "",
    venue_type: "",
    province: BATANGAS_PROVINCE,
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    // The customer's own yes or no to catering, kept as its own answer rather
    // than inferred from the service type. On a "Food and Event Setup" booking
    // a customer can still choose "Skip Catering", and reading that decision
    // off the service type alone would silently reinstate the food they
    // declined. See StepMenuSelection's catering toggle.
    include_food: true,
  });

  // Section 2 and 3: package baseline and its inclusions
  const [packageName, setPackageName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  // One list holds both states. `removed` decides which side of the quote a row
  // lands on at save time, so restoring an inclusion is a toggle, not a retype.
  const [inclusions, setInclusions] = useState([]);
  const [newInclusion, setNewInclusion] = useState("");

  // Sections 4 and 5: line items
  const [menuItems, setMenuItems] = useState([]);
  const [addOns, setAddOns] = useState([]);

  // Section 6: adjustments
  const [transportationFee, setTransportationFee] = useState("");
  const [additionalFees, setAdditionalFees] = useState([]);
  const [taxes, setTaxes] = useState("");
  const [discounts, setDiscounts] = useState("");

  // Section 7: payment terms
  const [depositAmount, setDepositAmount] = useState("");
  const [expirationDate, setExpirationDate] = useState(addDays(7));
  const [adminNotes, setAdminNotes] = useState("");

  const [errors, setErrors] = useState({});
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const formRef = useRef(null);

  // What the form looked like at the last point it was safe to walk away from:
  // freshly loaded, or freshly saved. Anything different from this is progress
  // that closing would throw away.
  const savedBaseline = useRef(null);
  // Which close the admin asked for, so the right confirmation is shown:
  // "leave" for the X and the backdrop, "cancel" for the explicit Cancel.
  const [closeIntent, setCloseIntent] = useState(null);

  const isFoodOnly = details.service_type === SERVICE_TYPES.FOOD_ONLY;
  const isSetupOnly = details.service_type === SERVICE_TYPES.SETUP_ONLY;
  // Whether this quotation carries catering at all. Setup Only never does; on
  // every other service type it is the customer's own answer, which they can
  // set to no without changing the service type.
  const cateringIncluded = !isSetupOnly && details.include_food !== false;
  const packageRecord =
    inquiry?.package_id && typeof inquiry.package_id === "object" ? inquiry.package_id : null;

  /**
   * When the booking came from a Special Offer, what that combo promised.
   *
   * Read straight from the combo's stored configuration and the size the
   * customer chose, so the builder states the same terms the customer was sold
   * rather than the admin having to remember them. Nothing here is priced: the
   * base is the combo's own figure, and everything else is this builder's job.
   *
   * The food comes from the snapshot the request stored where there is one, so
   * a combo re-plated since it was booked still reads as what was actually
   * sold; only an older request falls back to the combo as it stands today.
   */
  const offerContext = useMemo(() => {
    if (!isSpecialOffer(packageRecord)) return null;

    const perPax = offerPricePerPax(packageRecord);
    const snapshot = Array.isArray(inquiry?.offer_food_snapshot)
      ? inquiry.offer_food_snapshot
      : [];
    const food = snapshot.length > 0 ? snapshot : offerFoodItems(packageRecord);

    return {
      name: packageRecord.name,
      guests: Number(inquiry?.guest_count) || offerGuestCount(packageRecord) || 0,
      perPax,
      basePrice:
        Number(inquiry?.offer_base_price) ||
        offerBaseFoodPrice(packageRecord, Number(inquiry?.guest_count) || offerGuestCount(packageRecord)),
      // The dishes alone. These become the quotation's food lines, at ₱0.
      // `food` is the display list; `foodItems` keeps the name and the course
      // apart, because a menu row needs them in separate fields and a string
      // reading "Kare-Kare (Main Course)" is a dish nobody can name.
      food: food.map((item) =>
        item.menu_category
          ? `${item.item_name} (${item.menu_category})`
          : item.item_name,
      ),
      foodItems: food.map((item) => ({
        name: item.item_name,
        category: item.menu_category || "",
      })),
      // Everything the price per pax buys, in the combo's own words — the
      // dishes and what comes with them. Displayed, not priced: the inclusions
      // are seeded into the quotation's own inclusion list, not charged again
      // as food.
      included: [
        ...food.map((item) =>
          item.menu_category
            ? `${item.item_name} (${item.menu_category})`
            : item.item_name,
        ),
        ...offerInclusions(packageRecord),
      ],
    };
  }, [
    packageRecord,
    inquiry?.guest_count,
    inquiry?.offer_base_price,
    inquiry?.offer_food_snapshot,
  ]);

  /**
   * What the customer actually submitted, read straight off the inquiry.
   *
   * Held separately from the editable working copy so the admin can always see
   * the original answer next to whatever they have changed it to. `getInquiryById`
   * populates selected_menu, so these are real MenuItem records, not ids.
   */
  const customerSelection = useMemo(() => {
    const dishes = (Array.isArray(inquiry?.selected_menu) ? inquiry.selected_menu : [])
      .filter(Boolean)
      .map((item) =>
        item && typeof item === "object"
          ? { id: String(item._id || ""), name: item.name || "", category: item.category || "", price: Number(item.price) || 0 }
          : { id: String(item), name: "", category: "", price: 0 }
      );
    return {
      dishes,
      // The customer's own answer, read from `include_food`. Their service type
      // is not consulted: a setup package is labelled "Event Setup Only" from
      // the moment it is opened, long before anyone is asked about food, and
      // treating that label as the answer marked customers who had chosen
      // catering — and picked dishes — as having skipped it.
      wantedFood: cateringRequested(inquiry),
      serviceType: inquiry?.service_type || "",
    };
  }, [inquiry]);

  // A dish whose name never resolved means selected_menu came back unpopulated
  // or points at a deleted MenuItem. Silently rendering an id as a dish name
  // would look like a real selection, so it is called out instead.
  const unresolvedDishes = customerSelection.dishes.filter((dish) => !dish.name).length;

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(details.municipality),
    [details.municipality]
  );

  /* --- Load catalogs, business defaults and any existing quotation --------- */
  useEffect(() => {
    if (!inquiry?._id) return;
    let active = true;

    Promise.all([
      AdminAPI.getMenu().catch(() => ({ data: [] })),
      AdminAPI.getAddons().catch(() => ({ data: [] })),
      AdminAPI.getQuotationsByInquiry(inquiry._id).catch(() => ({ data: [] })),
      AdminAPI.getBusinessInfo().catch(() => ({ data: {} })),
    ])
      .then(([menuRes, addonRes, quoteRes, businessRes]) => {
        if (!active) return;
        setCatalogMenuItems(menuRes.data || []);
        setCatalogAddons(addonRes.data || []);
        const standardDeposit = Number(businessRes.data?.deposit_percentage);
        if (Number.isFinite(standardDeposit) && standardDeposit > 0) {
          setDepositPercentage(standardDeposit);
        }

        const storedEventType = inquiry?.event_type || "";
        // The inquiry is the source of truth for what the event is. Every field
        // below starts from it, and only an unfinished draft's own saved edits
        // (applied further down) are allowed to override that starting point.
        const detailsFromInquiry = {
          contact_first_name: inquiry?.contact_first_name || inquiry?.customer_id?.first_name || "",
          contact_last_name: inquiry?.contact_last_name || inquiry?.customer_id?.last_name || "",
          contact_email: inquiry?.contact_email || inquiry?.customer_id?.email || "",
          contact_phone: inquiry?.contact_phone || inquiry?.customer_id?.phone || "",
          event_type: matchEventType(storedEventType) || (storedEventType ? OTHER_EVENT_TYPE : ""),
          event_type_other: isOtherEventType(storedEventType) ? storedEventType : "",
          event_date: toDateInput(inquiry?.event_date),
          start_time: inquiry?.start_time || "",
          guest_count: Number(inquiry?.guest_count) || 1,
          // Derived from the catering answer rather than copied across, so a
          // booking made on a setup package with food added opens as "Food and
          // Event Setup" with the customer's menu in front of the admin. It
          // used to open as setup only, hiding the menu behind a service type
          // the admin had to change by hand before they could see it.
          service_type:
            inquiry?.service_type === SERVICE_TYPES.FOOD_ONLY
              ? SERVICE_TYPES.FOOD_ONLY
              : customerSelection.wantedFood
                ? SERVICE_TYPES.FULL_SERVICE
                : SERVICE_TYPES.SETUP_ONLY,
          include_food: customerSelection.wantedFood,
          event_theme: inquiry?.event_theme || "",
          event_palette: Array.isArray(inquiry?.event_palette)
            ? inquiry.event_palette.join(", ")
            : String(inquiry?.event_palette || ""),
          venue_type: inquiry?.venue_type || "",
          province: inquiry?.province || BATANGAS_PROVINCE,
          municipality: inquiry?.municipality || "",
          barangay: inquiry?.barangay || "",
          street: inquiry?.street || "",
          landmark: inquiry?.landmark || "",
          zip_code: inquiry?.zip_code || "",
        };
        setDetails(detailsFromInquiry);

        const quotes = Array.isArray(quoteRes.data) ? quoteRes.data : [];
        // At most one draft per inquiry, and it is what the admin was last
        // working on. The newest issued version is tracked separately: that is
        // what the customer has seen and what the change list compares against.
        const pendingDraft = quotes.find((quote) => quote.status === "Draft") || null;
        const latestIssued = quotes.find((quote) => quote.status !== "Draft") || null;
        setQuotation(latestIssued);
        setSavedDraft(pendingDraft);
        if (pendingDraft) setDraftSavedAt(pendingDraft.updatedAt || pendingDraft.createdAt || null);

        const latest = pendingDraft || latestIssued;

        if (latest) {
          setDetails((prev) => ({
            ...prev,
            guest_count: Number(latest.guest_count) || prev.guest_count,
            // Unapplied edits from a draft, field by field, so a draft saved
            // before a field existed still picks up the inquiry's value for it.
            ...(pendingDraft?.draft_details
              ? Object.fromEntries(
                Object.entries(pendingDraft.draft_details).filter(
                  ([key, value]) =>
                    key !== "_id" && value !== undefined && value !== null && value !== ""
                )
              )
              : {}),
            ...(pendingDraft?.draft_details?.event_type
              ? {
                event_type:
                  matchEventType(pendingDraft.draft_details.event_type) || OTHER_EVENT_TYPE,
                event_type_other: isOtherEventType(pendingDraft.draft_details.event_type)
                  ? pendingDraft.draft_details.event_type
                  : "",
              }
              : {}),
            ...(pendingDraft?.draft_details &&
              typeof pendingDraft.draft_details.include_food === "boolean"
              ? { include_food: pendingDraft.draft_details.include_food }
              : {}),
            // Stored as an array, edited as text.
            ...(Array.isArray(pendingDraft?.draft_details?.event_palette)
              ? { event_palette: pendingDraft.draft_details.event_palette.join(", ") }
              : {}),
          }));
          setPackageName(latest.package_name || packageRecord?.name || "Custom Package");
          // Quotations saved before the starting price existed only recorded the
          // adjusted package price, which was the starting price back then.
          setStartingPrice(
            String(latest.package_starting_price ?? latest.package_price ?? 0)
          );
          // A saved quantity adjustment is looked up by the line's name, which
          // already carries the adjusted number, so a reopened quotation shows
          // the same three figures the admin left: what the package stated,
          // what this quotation covers, and what one unit is worth.
          const savedAdjustments = new Map(
            (Array.isArray(latest.inclusion_adjustments) ? latest.inclusion_adjustments : [])
              .filter((entry) => entry?.name)
              .map((entry) => [String(entry.name), entry])
          );
          setInclusions([
            ...(Array.isArray(latest.package_inclusions) ? latest.package_inclusions : []).map(
              (entry) => {
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
              }
            ),
            ...(Array.isArray(latest.removed_inclusions) ? latest.removed_inclusions : []).map(
              (entry) =>
                inclusionRow(inclusionText(entry), {
                  removed: true,
                  deduction: entry?.deduction ? String(entry.deduction) : "",
                })
            ),
          ]);
          // Legacy only: a dish stored per guest is reopened as what it always
          // meant — the guest count, at that per-head rate, as its own quantity
          // and unit. The line total is identical either way, so a quotation
          // issued before per-unit pricing reopens showing the money it was
          // sent with. Nothing new is ever created in this shape: see
          // handleAddCatalogDish, where a fresh dish starts at a quantity of
          // one and an empty unit for the admin to state.
          const restoredGuests = Number(latest.guest_count) || Number(inquiry?.guest_count) || 1;
          // Legacy only: quotations built before a dish had a category field
          // were seeded with the course written into the note, so a reopened
          // one would show "Main Course" as the admin's own note about the
          // dish. A note is moved back to the category only when it matches a
          // course the catalog actually has — anything an admin really typed
          // will not, and stays exactly where they put it.
          const catalogCategories = new Set(
            (menuRes.data || [])
              .map((item) => String(item?.category || "").trim().toLowerCase())
              .filter(Boolean)
          );
          const splitLegacyNote = (dish) => {
            const category = String(dish?.category || "").trim();
            const note = String(dish?.note || "").trim();
            if (category) return { category, note };
            if (note && catalogCategories.has(note.toLowerCase())) {
              return { category: note, note: "" };
            }
            return { category: "", note };
          };
          setMenuItems(
            Array.isArray(latest.menu_items)
              ? latest.menu_items.map((m) => {
                  const perGuest = m?.pricing_type !== MENU_PRICING.QUANTITY;
                  const { category, note } = splitLegacyNote(m);
                  return menuRow({
                    name: m?.name || "",
                    category,
                    note,
                    quantity: perGuest
                      ? restoredGuests
                      : Number(m?.quantity) > 0
                        ? Number(m.quantity)
                        : 1,
                    unit: perGuest ? "pax" : m?.unit || "",
                    price: m?.price ? String(m.price) : "",
                  });
                })
              : []
          );
          // An add-on stored as "fixed" was charged once, which is a quantity
          // of one. Reopened that way it prices identically.
          setAddOns(Array.isArray(latest.add_ons) ? latest.add_ons.map((a) => ({
            name: a?.name || "",
            price: a?.price ? String(a.price) : "",
            quantity: a?.pricing_type === "quantity" ? Number(a?.quantity) || 1 : 1,
            note: a?.note || "",
            pricing_type: "quantity",
          })) : []);
          setTransportationFee(latest.transportation_fee ? String(latest.transportation_fee) : "");
          setAdditionalFees(
            (Array.isArray(latest.additional_fees) ? latest.additional_fees : []).map((fee) => ({
              name: fee?.name || "",
              amount: fee?.amount ? String(fee.amount) : "",
            }))
          );
          setTaxes(latest.taxes ? String(latest.taxes) : "");
          setDiscounts(latest.discounts ? String(latest.discounts) : "");
          setDepositAmount(latest.deposit_amount ? String(latest.deposit_amount) : "");
          // A revision of a quotation whose validity has already run out gets
          // a fresh window rather than opening pre-filled with a date the
          // form will refuse to send.
          const storedExpiry = toDateInput(latest.expiration_date);
          setExpirationDate(
            storedExpiry && storedExpiry >= todayInput() ? storedExpiry : addDays(7)
          );
          setAdminNotes(latest.admin_notes || "");
          return;
        }

        /* --- First quotation for this inquiry: start from the booking ------ */
        const guests = Number(inquiry?.guest_count) || 1;

        if (inquiry?.is_custom_setup) {
          setPackageName(
            inquiry.event_theme
              ? `Custom ${inquiry.event_theme} Event Setup`
              : "Bespoke Custom Event Setup"
          );
          setInclusions(
            (Array.isArray(inquiry.custom_setup_scope) ? inquiry.custom_setup_scope : []).map(
              (scope) => inclusionRow(scope)
            )
          );
          // A bespoke setup has no catalog price to start from: the admin
          // prices the design, so the baseline is left for them to enter.
          setStartingPrice("");
        } else {
          setPackageName(packageRecord?.name || "Custom Package");
          const isFoodOnlyInquiry = inquiry?.service_type === SERVICE_TYPES.FOOD_ONLY;
          const rawInclusions = Array.isArray(packageRecord?.inclusions) ? packageRecord.inclusions : [];
          setInclusions(
            rawInclusions
              .filter((entry) => {
                if (!isFoodOnlyInquiry) return true;
                const lower = String(entry || "").toLowerCase();
                return (
                  !lower.includes("backdrop") &&
                  !lower.includes("stage setup") &&
                  !lower.includes("scaffold") &&
                  !lower.includes("tent") &&
                  !lower.includes("couch") &&
                  !lower.includes("grass carpet") &&
                  !lower.includes("chandelier") &&
                  !lower.includes("dove") &&
                  !lower.includes("red carpet") &&
                  !lower.includes("monoblock chairs") &&
                  !lower.includes("tiffany chairs") &&
                  !lower.includes("round tables") &&
                  !lower.includes("industrial fan") &&
                  !lower.includes("[event setup & furniture]")
                );
              })
              .map((entry) => inclusionRow(entry))
          );
          const derived = derivePackageStartingPrice(inquiry, guests);
          setStartingPrice(derived ? String(derived) : "");
        }

        // A combo's starting price above is its price — the food the rate per
        // pax buys, and the only figure the combo decides. Nothing else is
        // seeded for one: a combo is food, so there is no set-up line, no
        // equipment and no package add-ons to carry over. Anything further on
        // this quotation is a charge the admin is adding, deliberately.

        // The dishes the customer actually chose, seeded with the catalog rate
        // so the admin adjusts a real number rather than typing one from
        // nothing. A customer who declined catering gets no food lines at all,
        // so no food charge can reach a booking that did not ask for it.
        //
        // A combo chose no dishes — it *is* its dishes, and they are already
        // paid for by the base price above. Its food is listed at zero so the
        // admin sees exactly what is being served without the combo's food
        // being charged twice.
        if (offerContext) {
          setMenuItems(
            offerContext.foodItems.map(({ name, category }) =>
              menuRow({ name, category, note: "Covered by the combo price", price: "" })
            )
          );
        } else {
          // Seeded with the dish the customer chose and the catalog's figure,
          // at a quantity of one and no unit yet. What a dish is actually sold
          // by — a kilo, a tray, a bilao, a head — is the admin's call on this
          // quotation, and guessing "the guest count in pax" is how every dish
          // ended up priced per person whether or not it is sold that way.
          setMenuItems(
            !customerSelection.wantedFood
              ? []
              : (Array.isArray(inquiry?.selected_menu) ? inquiry.selected_menu : []).map((item) => {
                  if (item && typeof item === "object") {
                    return menuRow({
                      name: item.name || "",
                      category: item.category || "",
                      note: item.note || "",
                      price: !item.price ? "" : String(item.price),
                    });
                  }
                  return menuRow({ name: String(item || "") });
                })
          );
        }

        setAddOns(
          (Array.isArray(inquiry?.service_items) ? inquiry.service_items : []).map((item) => {
            if (item && typeof item === "object") {
              return {
                name: item.name || "",
                price: item.price ? String(item.price) : "",
                quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
                note: "",
                pricing_type: "quantity",
              };
            }
            return { name: String(item || ""), price: "", quantity: 1, note: "", pricing_type: "quantity" };
          })
        );
      })
      .catch(() => {
        if (active) notify("Failed to load quotation details", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry?._id]);

  /* --- Derived pricing ---------------------------------------------------- */

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

  /**
   * The inclusion list grouped by the category each line already carries.
   *
   * A presentation of `inclusions`, never a copy of it: every row keeps the
   * index it has in that array, because the index is what every handler,
   * every error key and every input id is addressed by. Grouping that
   * renumbered the rows would silently point the quantity box on one line at
   * the pricing of another.
   *
   * Categories appear in the order they first occur and rows keep their order
   * within a category, so a package the admin has seen before reads the same
   * way. A line with no category falls under "Other" rather than vanishing.
   */
  const inclusionGroups = useMemo(() => {
    const groups = [];
    const byCategory = new Map();

    inclusions.forEach((entry, index) => {
      const category = parseInclusion(entry.name)?.category || OTHER_INCLUSION_CATEGORY;
      let group = byCategory.get(category);
      if (!group) {
        group = { category, rows: [] };
        byCategory.set(category, group);
        groups.push(group);
      }
      group.rows.push({ entry, index });
    });

    return groups;
  }, [inclusions]);

  /**
   * The inclusions whose quantity this quotation changes.
   *
   * Only lines that are still on the quotation, that stated a quantity to
   * begin with, and whose quantity actually differs from it. A removed line is
   * priced by its deduction instead, and a line quoted at the amount the
   * package promised is not an adjustment at all — leaving those out is what
   * keeps the package breakdown a list of real changes.
   */
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

  // Food lines only count when this quotation actually carries catering, so
  // toggling catering off cannot leave a priced dish in the total. Parked
  // dishes are excluded for the same reason add-ons are: they are on screen
  // so they can be restored, not so they can be charged.
  const chargeableMenuItems = useMemo(
    () => (cateringIncluded ? menuItems.filter((item) => !item.removed) : []),
    [cateringIncluded, menuItems]
  );

  // Add-ons the admin has parked stay on screen but never reach a total or the
  // saved quotation, so restoring one costs nothing and changes nothing.
  const chargeableAddOns = useMemo(() => addOns.filter((item) => !item.removed), [addOns]);

  const pricingInput = useMemo(
    () => ({
      package_starting_price: startingPrice,
      removed_inclusions: removedInclusions,
      inclusion_adjustments: inclusionAdjustments,
      guest_count: details.guest_count,
      menu_items: chargeableMenuItems,
      add_ons: chargeableAddOns,
      transportation_fee: transportationFee,
      additional_fees: additionalFees,
      taxes,
      discounts,
      deposit_amount: depositAmount,
    }),
    [
      startingPrice,
      removedInclusions,
      inclusionAdjustments,
      details.guest_count,
      chargeableMenuItems,
      chargeableAddOns,
      transportationFee,
      additionalFees,
      taxes,
      discounts,
      depositAmount,
    ]
  );

  const totals = useMemo(() => computeQuotationTotals(pricingInput), [pricingInput]);

  const resolvedEventType =
    details.event_type === OTHER_EVENT_TYPE
      ? String(details.event_type_other || "").trim()
      : details.event_type;

  /**
   * The palette as the Inquiry stores it: colour names, one per entry.
   *
   * Typed as a single comma-separated line because that is how a palette is
   * said out loud ("Navy, Ivory, Gold"), and split here so the stored shape
   * stays the array every other reader expects.
   */
  /**
   * The event space this booking is for, as one label.
   *
   * Read from the request the customer submitted, which is where the size was
   * decided and priced. It is shown rather than edited: the footprint is what
   * the starting price above was derived from, so changing it here would leave
   * a size and a price that disagree — the same reason the package itself is
   * locked. A booking with no event space (a combo pack is food) gets nothing.
   */
  const eventSpace = useMemo(
    () => eventSpaceLabel(inquiry, packageRecord),
    [inquiry, packageRecord]
  );

  const resolvedPalette = useMemo(
    () =>
      String(details.event_palette || "")
        .split(",")
        .map((colour) => colour.trim())
        .filter(Boolean),
    [details.event_palette]
  );

  const quotationPayload = useMemo(
    () => ({
      inquiry_id: inquiry?._id,
      package_id: packageRecord?._id || inquiry?.package_id || undefined,
      package_name: packageName || "Custom Package",
      package_starting_price: totals.startingPrice,
      package_price: totals.packagePrice,
      package_inclusions: keptInclusions,
      removed_inclusions: removedInclusions.filter((entry) => entry.name),
      inclusion_adjustments: inclusionAdjustments.map((entry) => ({
        ...entry,
        // Mirrors what the server recomputes, so the summary the admin
        // approves and the figure that gets stored are the same number.
        amount: inclusionAdjustmentAmount(entry),
      })),
      guest_count: totals.guestCount,
      menu_items: chargeableMenuItems.map((item) => ({
        name: String(item.name || "").trim(),
        category: String(item.category || "").trim(),
        note: String(item.note || "").trim(),
        pricing_type: MENU_PRICING.QUANTITY,
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit: String(item.unit || "").trim(),
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
      taxes: totals.taxes,
      discounts: totals.discounts,
      subtotal: totals.subtotal,
      total_cost: totals.totalCost,
      deposit_amount: totals.depositAmount,
      remaining_balance: totals.remainingBalance,
      expiration_date: expirationDate || undefined,
      admin_notes: adminNotes,
    }),
    [
      inquiry?._id,
      inquiry?.package_id,
      packageRecord?._id,
      packageName,
      totals,
      keptInclusions,
      removedInclusions,
      inclusionAdjustments,
      chargeableMenuItems,
      chargeableAddOns,
      transportationFee,
      additionalFees,
      expirationDate,
      adminNotes,
    ]
  );

  // Compared against the newest version the customer has been sent, never
  // against a draft: a draft is not something they have seen change.
  const pendingChanges = quotation ? diffQuotationVersions(quotation, quotationPayload) : [];

  /* --- Unsaved work ------------------------------------------------------- */

  // Everything the admin can change, in one comparable string. The pricing
  // payload already carries the whole quotation; `details` carries section one.
  const formFingerprint = useMemo(
    () => JSON.stringify({ quotation: quotationPayload, details, catering: cateringIncluded }),
    [quotationPayload, details, cateringIncluded]
  );

  // The baseline is taken once the form has finished loading, and reset on
  // every successful save, so "unsaved" always means "different from the last
  // version that is safely stored somewhere".
  useEffect(() => {
    if (loading) return;
    if (savedBaseline.current === null) savedBaseline.current = formFingerprint;
  }, [loading, formFingerprint]);

  const isDirty =
    !loading && savedBaseline.current !== null && savedBaseline.current !== formFingerprint;

  // Recomputed per render rather than memoised: a builder left open overnight
  // should not still be offering yesterday as a valid date.
  const today = todayInput();

  // How long the quotation stands, said in days rather than left for the
  // admin to count off a calendar.
  const validityWindow = (() => {
    if (!expirationDate || expirationDate < today) return "";
    const days = Math.round(
      (new Date(`${expirationDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000
    );
    if (days === 0) return "It expires at the end of today.";
    return `The customer has ${days} day${days === 1 ? "" : "s"} to accept.`;
  })();

  /* --- Warnings: worth a look, never blocking ----------------------------- */
  const warnings = useMemo(() => {
    const notes = [];
    const depositShare = totals.totalCost > 0 ? (totals.depositAmount / totals.totalCost) * 100 : 0;

    if (!totals.startingPrice && !inquiry?.is_custom_setup && packageRecord) {
      notes.push(
        `${packageRecord.name || "This package"} has no price on record, so the starting price begins at zero. Enter the baseline this quotation should start from.`
      );
    }
    if (totals.startingPrice > 0 && totals.inclusionDeductions > totals.startingPrice * 0.5) {
      notes.push(
        `Removed inclusions take off ${formatCurrency(totals.inclusionDeductions)}, more than half the starting price. Check that the package is still worth quoting as itself.`
      );
    }
    if (totals.discounts > 0 && totals.discounts > totals.subtotal * 0.3) {
      notes.push(
        `The discount of ${formatCurrency(totals.discounts)} is over 30 percent of the subtotal. Confirm this is intended before sending.`
      );
    }
    if (totals.depositAmount > 0 && depositShare < 10) {
      notes.push(
        `The deposit is only ${depositShare.toFixed(0)} percent of the total. The standard is ${depositPercentage} percent.`
      );
    }
    if (totals.depositAmount > 0 && depositShare > 80) {
      notes.push(
        `The deposit covers ${depositShare.toFixed(0)} percent of the total, leaving little on the balance.`
      );
    }
    if (cateringIncluded && chargeableMenuItems.length === 0 && !offerContext) {
      notes.push(
        customerSelection.dishes.length > 0
          ? `The customer picked ${customerSelection.dishes.length} dish${
              customerSelection.dishes.length === 1 ? "" : "es"
            }, but none are on this quotation. Restore them or confirm the catering is being dropped.`
          : "This booking includes catering, but no dishes are quoted yet."
      );
    }
    if (unresolvedDishes > 0) {
      notes.push(
        `${unresolvedDishes} of the customer's chosen dishes could not be loaded from the menu catalog, most likely because they were deleted. Check the booking before quoting.`
      );
    }
    const capacityMax = offerContext ? 0 : Number(packageRecord?.guest_max) || 0;
    const capacityMin = offerContext ? 0 : Number(packageRecord?.guest_min) || 0;
    if (capacityMax && totals.guestCount > capacityMax) {
      notes.push(
        `${totals.guestCount} guests is above this package's capacity of ${capacityMax}. Price the extra coverage or move to a larger package.`
      );
    } else if (capacityMin && totals.guestCount < capacityMin) {
      notes.push(
        `${totals.guestCount} guests is below this package's minimum of ${capacityMin}.`
      );
    }
    return notes;
  }, [
    totals,
    inquiry?.is_custom_setup,
    packageRecord,
    depositPercentage,
    cateringIncluded,
    chargeableMenuItems.length,
    customerSelection.dishes.length,
    offerContext,
    unresolvedDishes,
  ]);

  /* --- Validation --------------------------------------------------------- */

  const validate = () => {
    const found = {};

    if (!String(details.contact_first_name || "").trim())
      found.contact_first_name = "Enter the customer's first name.";
    if (!String(details.contact_last_name || "").trim())
      found.contact_last_name = "Enter the customer's last name.";
    if (!String(details.contact_email || "").trim())
      found.contact_email = "Enter an email address so the quotation can reach the customer.";
    else if (!EMAIL_PATTERN.test(String(details.contact_email).trim()))
      found.contact_email = "This email address is not in a valid format.";
    if (!String(details.contact_phone || "").trim())
      found.contact_phone = "Enter a contact number for this booking.";

    if (!details.event_type) found.event_type = "Choose the event type this quotation is for.";
    else if (details.event_type === OTHER_EVENT_TYPE && !resolvedEventType)
      found.event_type_other = "Describe the event type.";

    if (!details.event_date) found.event_date = "Set the event date this quotation covers.";
    else if (details.event_date < today)
      found.event_date =
        "This event date has already passed. Set the date the event will actually take place before sending.";
    if (!details.start_time) found.start_time = "Set the start time.";
    if (!Number(details.guest_count) || Number(details.guest_count) < 1)
      found.guest_count = "Enter the number of guests this quotation covers.";
    if (!details.municipality) found.municipality = "Choose the municipality of the venue.";
    if (!details.barangay) found.barangay = "Choose the barangay of the venue.";

    if (!String(packageName || "").trim())
      found.package_name = "This quotation has no package name.";

    inclusions.forEach((entry, index) => {
      // Checked against the visible name, not the stored line: `[Crew] (2)`
      // is a non-empty string with an empty name, and the admin looking at a
      // blank field needs to be told so.
      if (!inclusionDisplayName(entry.name).trim())
        found[`inclusions.${index}.name`] = "Name this inclusion or delete the line.";
      if (entry.removed && isBlankAmount(entry.deduction))
        found[`inclusions.${index}.deduction`] =
          "Enter how much removing this takes off the starting price. Enter 0 if it does not change the price.";
      // A changed quantity with no rate behind it is a promise the quotation
      // cannot price: the customer is getting a different amount and nothing
      // on the total says so.
      const quantityMoved =
        !entry.removed &&
        entry.baseQuantity !== null &&
        entry.baseQuantity !== undefined &&
        Number(entry.quantity) !== Number(entry.baseQuantity);
      if (quantityMoved && isBlankAmount(entry.unitPrice))
        found[`inclusions.${index}.unitPrice`] =
          "This quantity has changed. Enter what one costs so the difference can be priced, or 0 if it does not change the price.";
      if (quantityMoved && (entry.quantity === "" || Number(entry.quantity) < 0))
        found[`inclusions.${index}.quantity`] = "Enter how many of this the quotation covers.";
    });

    if (
      totals.startingPrice - totals.inclusionDeductions + totals.inclusionAdjustments <
      0
    ) {
      found.removed_inclusions = `Removals and quantity reductions take ${formatCurrency(
        totals.inclusionDeductions - totals.inclusionAdjustments
      )} off a starting price of ${formatCurrency(
        totals.startingPrice
      )}. Lower the deductions or raise the starting price.`;
    }

    // Only the dishes actually being quoted. With catering switched off the
    // menu section is hidden, so validating rows behind it would block the
    // send on fields the admin cannot see or fix — and a parked row is not
    // going to be sent, so it must not block sending either. Indices are
    // taken from `menuItems`, the array the rows are rendered from, so the
    // errors land on the row the admin is looking at.
    if (cateringIncluded) {
      menuItems.forEach((item, index) => {
        if (item.removed) return;
        if (!String(item.name || "").trim())
          found[`menu_items.${index}.name`] = "Name this dish or remove the line.";
        // A blank price here is multiplied by the stated quantity, so it is
        // the most expensive field in the form to leave unanswered.
        if (isBlankAmount(item.price))
          found[`menu_items.${index}.price`] =
            `Set the price for one ${String(item.unit || "").trim() || "unit"} of this dish. Enter 0 to include it at no charge.`;
        if (!Number(item.quantity) || Number(item.quantity) < 1)
          found[`menu_items.${index}.quantity`] =
            "Enter how many of this dish the quotation covers.";
      });
    }

    // Parked rows are excluded: they are not going to be sent, so they must
    // not block sending. Indices still line up because errors are keyed off
    // the same array the rows are rendered from.
    addOns.forEach((item, index) => {
      if (item.removed) return;
      if (!String(item.name || "").trim())
        found[`add_ons.${index}.name`] = "Name this add-on or remove the line.";
      if (isBlankAmount(item.price))
        found[`add_ons.${index}.price`] =
          "Set the price quoted for this add-on. Add-on prices are set per quotation, not in the catalog. Enter 0 to include it at no charge.";
    });

    additionalFees.forEach((fee, index) => {
      const named = String(fee.name || "").trim();
      if (!named)
        found[`additional_fees.${index}.name`] =
          "Name this fee so the customer knows what it covers.";
      if (!numberOf(fee.amount))
        found[`additional_fees.${index}.amount`] =
          "Enter an amount above zero, or remove this fee from the quotation.";
    });

    if (totals.totalCost <= 0)
      found.total_cost =
        "This quotation totals zero. Add the pricing before sending it to the customer.";

    if (!numberOf(depositAmount))
      found.deposit_amount =
        "A deposit is required. The customer cannot confirm a booking without one.";
    else if (money(depositAmount) > totals.totalCost)
      found.deposit_amount = `The deposit cannot be more than the total of ${formatCurrency(
        totals.totalCost
      )}.`;

    if (!expirationDate) found.expiration_date = "Set the date this quotation stops being valid.";
    // The picker greys out earlier days, but a date can still be typed into
    // it, and a quotation that expired before it was sent gives the customer
    // nothing they can accept.
    else if (expirationDate < today)
      found.expiration_date =
        "This quotation would already have expired. Choose today or a later date.";

    return found;
  };

  /** Clears one field's error as soon as the admin edits it. */
  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setDetail = (key, value) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  /**
   * Moving to or away from Event Setup Only carries the catering answer with it.
   *
   * The two are one decision on this form: setup only has no food, and either
   * of the other two does. Left unlinked, switching to Food and Event Setup
   * revealed a menu section whose own catering checkbox was still off, which
   * is what made a quotation announce that catering had been skipped while the
   * admin was looking at the dishes.
   */
  const handleServiceTypeChange = (value) => {
    setDetails((prev) => ({
      ...prev,
      service_type: value,
      include_food: value !== SERVICE_TYPES.SETUP_ONLY,
    }));
    clearError("service_type");
  };

  /* --- Inclusion handlers ------------------------------------------------- */

  const handleAddInclusion = () => {
    const name = String(newInclusion || "").trim();
    if (!name) return;
    // A line the admin types here was never in the package, so it has no
    // baseline to be adjusted against — whatever quantity its wording states
    // is simply what this quotation covers.
    setInclusions((prev) => [...prev, inclusionRow(name, { fromPackage: false })]);
    setNewInclusion("");
  };

  /**
   * Renaming a line rewrites only its name, then re-reads its quantity.
   *
   * The field shows the name alone, so what comes back here is the name alone
   * and is spliced into the stored line between the category the group heading
   * was built from and the quantity the price is calculated against — losing
   * either to a rename is how a row ends up in the wrong group or priced
   * against a baseline that no longer appears anywhere on screen.
   *
   * The quantity is still re-read afterwards, because a line with no category
   * keeps its quantity inside its own wording ("6 Round Tables") and retyping
   * that has to mean the same thing as typing 6 into the quantity box. The
   * baseline is left alone: what the package promised does not change because
   * the admin reworded the line.
   */
  const handleInclusionName = (index, displayName) => {
    setInclusions((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const name = withInclusionName(entry.name, displayName);
        const parsed = parseInclusionQuantity(name);
        return {
          ...entry,
          name,
          quantity: parsed ? parsed.quantity : null,
          // A line that never stated a quantity has no baseline to measure a
          // change against until its wording gives it one.
          baseQuantity:
            entry.baseQuantity === null || entry.baseQuantity === undefined
              ? parsed
                ? parsed.quantity
                : null
              : entry.baseQuantity,
        };
      })
    );
    clearError(`inclusions.${index}.name`);
    clearError(`inclusions.${index}.quantity`);
  };

  /**
   * Changing how many of an inclusion the customer gets.
   *
   * The new number is written back into the line's own text as well as held on
   * the row, so what the quotation promises and what it charges for can never
   * drift apart: the customer's copy reads "Round Tables (3)" the moment the
   * builder starts pricing three.
   */
  const handleInclusionQuantity = (index, value) => {
    setInclusions((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const cleaned = String(value).replace(/[^0-9]/g, "");
        if (cleaned === "") return { ...entry, quantity: "" };
        const quantity = Math.max(0, Number(cleaned) || 0);
        return { ...entry, quantity, name: withInclusionQuantity(entry.name, quantity) };
      })
    );
    clearError(`inclusions.${index}.quantity`);
    clearError(`inclusions.${index}.unitPrice`);
    clearError("removed_inclusions");
  };

  const handleInclusionUnitPrice = (index, value) => {
    setInclusions((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, unitPrice: nonNegative(value) } : entry))
    );
    clearError(`inclusions.${index}.unitPrice`);
    clearError("removed_inclusions");
  };

  /** Puts a line's quantity back to the amount the package stated. */
  const handleResetInclusionQuantity = (index) => {
    setInclusions((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              quantity: entry.baseQuantity,
              name: withInclusionQuantity(entry.name, entry.baseQuantity),
              unitPrice: "",
            }
          : entry
      )
    );
    clearError(`inclusions.${index}.quantity`);
    clearError(`inclusions.${index}.unitPrice`);
    clearError("removed_inclusions");
  };

  const handleInclusionDeduction = (index, value) => {
    setInclusions((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, deduction: nonNegative(value) } : entry))
    );
    clearError(`inclusions.${index}.deduction`);
    clearError("removed_inclusions");
  };

  const toggleInclusionRemoved = (index) => {
    setInclusions((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, removed: !entry.removed, deduction: entry.removed ? "" : entry.deduction } : entry
      )
    );
    clearError(`inclusions.${index}.deduction`);
    clearError("removed_inclusions");
  };

  const handleDeleteInclusion = (index) => {
    setInclusions((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith("inclusions.")) next[key] = value;
      });
      return next;
    });
  };

  /* --- Menu handlers ------------------------------------------------------ */

  const handleAddCatalogDish = () => {
    const found = catalogMenuItems.find((item) => item._id === selectedCatalogDish);
    if (!found) return;
    // One of it, at the catalog's figure, with the unit left for the admin.
    // The catalog quotes a per-head rate, but what this quotation sells the
    // dish by is a decision for this event — a kilo, a tray, a bilao — so the
    // row states a quantity of one rather than assuming the guest list.
    setMenuItems((prev) => [
      ...prev,
      menuRow({
        name: found.name,
        category: found.category || "",
        price: found.price ? String(found.price) : "",
      }),
    ]);
    setSelectedCatalogDish("");
  };

  const handleMenuChange = (index, field, value) => {
    setMenuItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "price") return { ...item, price: nonNegative(value) };
        if (field === "quantity")
          return { ...item, quantity: Math.max(1, Number(nonNegative(value)) || 1) };
        return { ...item, [field]: value };
      })
    );
    clearError(`menu_items.${index}.${field}`);
  };

  /**
   * Removing a dish parks it rather than deleting it.
   *
   * Same interaction as the add-ons list directly below, for the same
   * reason: the row stays on screen struck through and out of every total,
   * so an accidental removal costs one click to undo instead of finding
   * the dish in the catalog again and retyping its price, quantity and
   * notes. Parked rows are dropped when the quotation is saved, so nothing
   * about what is stored or sent changes.
   */
  const toggleMenuItemRemoved = (index) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
    // A parked row cannot be fixed, so its errors are no longer actionable.
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`menu_items.${index}.name`];
      delete next[`menu_items.${index}.price`];
      delete next[`menu_items.${index}.quantity`];
      return next;
    });
  };

  /** Deletes outright. Used for a blank row the admin just added by mistake. */
  const handleDeleteMenuItem = (index) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith("menu_items.")) next[key] = value;
      });
      return next;
    });
  };

  /* --- Add-on handlers ---------------------------------------------------- */

  const handleAddCatalogAddon = () => {
    const found = catalogAddons.find((addon) => addon._id === selectedCatalogAddon);
    if (!found) return;
    // The catalog carries the name. How many, at what price and why are all
    // quoted per event, so the admin sets them on this line.
    setAddOns((prev) => [
      ...prev,
      { name: found.name, price: "", quantity: 1, note: "", pricing_type: "quantity" },
    ]);
    setSelectedCatalogAddon("");
  };

  const handleAddOnChange = (index, field, value) => {
    setAddOns((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "price") return { ...item, price: nonNegative(value) };
        if (field === "quantity") return { ...item, quantity: Math.max(1, Number(nonNegative(value)) || 1) };
        return { ...item, [field]: value };
      })
    );
    clearError(`add_ons.${index}.${field}`);
  };

  /**
   * Removing an add-on parks it rather than deleting it.
   *
   * The row stays on screen, struck through and out of every total, so a
   * misclick costs one click to undo instead of retyping the service and its
   * quoted price. Parked rows are dropped when the quotation is saved, so
   * nothing about what gets stored or sent changes. This mirrors the
   * Remove/Restore an admin already knows from package inclusions, except
   * inclusions carry a deduction because they came out of the package price,
   * and an add-on simply stops being charged.
   */
  const toggleAddOnRemoved = (index) => {
    setAddOns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
    // A parked row cannot be fixed, so its errors are no longer actionable.
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`add_ons.${index}.name`];
      delete next[`add_ons.${index}.price`];
      delete next[`add_ons.${index}.quantity`];
      return next;
    });
  };

  /** Deletes outright. Used for a blank row the admin just added by mistake. */
  const handleDeleteAddOn = (index) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith("add_ons.")) next[key] = value;
      });
      return next;
    });
  };

  /* --- Additional fee handlers -------------------------------------------- */

  const handleFeeChange = (index, field, value) => {
    setAdditionalFees((prev) =>
      prev.map((fee, i) =>
        i === index ? { ...fee, [field]: field === "amount" ? nonNegative(value) : value } : fee
      )
    );
    clearError(`additional_fees.${index}.${field}`);
  };

  const handleRemoveFee = (index) =>
    setAdditionalFees((prev) => prev.filter((_, i) => i !== index));

  /* --- Submit ------------------------------------------------------------- */

  const focusFirstError = (found) => {
    const firstKey = Object.keys(found)[0];
    if (!firstKey) return;
    const element = document.getElementById(`qb-${firstKey}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof element.focus === "function") element.focus({ preventScroll: true });
      return;
    }
    formRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  /**
   * The admin's unapplied edits to the event details.
   *
   * Saved on the draft rather than written to the inquiry, so stopping halfway
   * never rewrites the customer's booking with a half-finished correction. The
   * inquiry is only updated when the quotation is actually sent.
   */
  const draftDetails = () => ({
    contact_first_name: details.contact_first_name,
    contact_last_name: details.contact_last_name,
    contact_email: details.contact_email,
    contact_phone: details.contact_phone,
    event_type: resolvedEventType,
    event_date: details.event_date,
    start_time: details.start_time,
    guest_count: String(details.guest_count || ""),
    service_type: details.service_type,
    include_food: cateringIncluded,
    event_theme: String(details.event_theme || "").trim(),
    event_palette: resolvedPalette,
    venue_type: details.venue_type,
    province: details.province,
    municipality: details.municipality,
    barangay: details.barangay,
    street: details.street,
    landmark: details.landmark,
    zip_code: details.zip_code,
  });

  /**
   * Saves the draft, or throws with the server's message.
   *
   * It throws rather than returning a flag so the leave-confirmation can
   * report the failure inside itself and stay open. A toast there would
   * announce the problem on the way out of the very dialog the admin opened
   * to avoid losing this work.
   */
  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const { data } = await AdminAPI.saveQuotationDraft({
        ...quotationPayload,
        draft_details: draftDetails(),
      });
      setSavedDraft(data);
      setDraftSavedAt(data?.updatedAt || new Date().toISOString());
      // This state is now stored, so leaving costs nothing.
      savedBaseline.current = formFingerprint;
      // Errors from an earlier send attempt are stale once the work is parked.
      setErrors({});
      setShowErrorSummary(false);
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Could not save the draft. Try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  /** The toolbar's own "Save draft" — the admin stays in the builder, so a
      toast is the right weight for the result. */
  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      notify("Draft saved", "success", {
        description: "You can close this and pick it up later.",
      });
    } catch (err) {
      notify(err.message, "error");
    }
  };

  /* --- Closing ------------------------------------------------------------ */

  // The X, the backdrop and Escape all arrive here through the dialog's own
  // close handler, so they cannot bypass the check the Cancel button gets.
  const requestClose = (intent) => {
    if (!isDirty) {
      onClose();
      return;
    }
    setCloseIntent(intent);
  };

  // A throw here is caught by the confirmation, which stays open and shows
  // the reason — closing on failure would lose exactly what the admin just
  // asked to keep.
  const handleSaveDraftAndClose = async () => {
    await saveDraft();
    setCloseIntent(null);
    notify("Draft saved", "success", { description: "Pick it up from this inquiry when you are ready." });
    onSuccess();
  };

  const handleDiscardDraft = async () => {
    if (!savedDraft) return;
    await confirm({
      tone: "destructive",
      title: "Discard this saved draft?",
      description:
        "The draft and everything in it is deleted. The customer has not been sent anything, so nothing they can see changes.",
      confirmLabel: "Discard draft",
      cancelLabel: "Keep draft",
      onConfirm: async () => {
        await AdminAPI.discardQuotationDraft(inquiry._id);
        setSavedDraft(null);
        setDraftSavedAt(null);
        notify("Draft discarded", "info");
        onSuccess();
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setShowErrorSummary(true);
      focusFirstError(found);
      notify("This quotation cannot be sent yet. Fix the highlighted fields.", "error");
      return;
    }
    setShowErrorSummary(false);

    setSubmitting(true);
    try {
      // The inquiry stays the record of the event itself, and the booking is
      // built from it at conversion time. Corrections made here are saved there
      // first so the quotation is never issued against details it contradicts.
      await AdminAPI.updateInquiry(inquiry._id, {
        contact_first_name: details.contact_first_name.trim(),
        contact_last_name: details.contact_last_name.trim(),
        contact_email: details.contact_email.trim(),
        contact_phone: details.contact_phone.trim(),
        event_type: resolvedEventType,
        event_date: details.event_date,
        start_time: details.start_time,
        guest_count: totals.guestCount,
        service_type: details.service_type,
        // The customer's catering answer, not an assumption from the service
        // type. A "Food and Event Setup" booking where they chose to skip
        // catering must stay skipped.
        include_food: cateringIncluded,
        event_theme: String(details.event_theme || "").trim(),
        event_palette: resolvedPalette,
        venue_type: details.venue_type.trim(),
        province: details.province,
        municipality: details.municipality,
        barangay: details.barangay,
        street: details.street.trim(),
        landmark: details.landmark.trim(),
        zip_code: details.zip_code.trim(),
      });
    } catch (err) {
      setSubmitting(false);
      notify(
        err.response?.data?.message ||
        "The event details could not be saved, so the quotation was not sent. Try again.",
        "error"
      );
      return;
    }

    try {
      await AdminAPI.createQuotation(quotationPayload);
      // The admin goes straight back to the queue, so the toast has to carry
      // the state change with it: which version went out, and that the
      // inquiry has moved on and is now waiting on the customer.
      notify(
        quotation
          ? `Version ${(Number(quotation.version_number) || 1) + 1}.0 sent to ${details.contact_first_name || "the customer"}`
          : `Quotation sent to ${details.contact_first_name || "the customer"}`,
        "success",
        { description: "This inquiry is now waiting for their response." },
      );
      onSuccess();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setErrors(serverErrors);
        setShowErrorSummary(true);
        focusFirstError(serverErrors);
      }
      notify(err.response?.data?.message || "Failed to generate quotation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!inquiry) return null;

  if (loading) {
    return (
      <Modal
        title="Quotation Builder"
        onClose={onClose}
        bodyClassName="overflow-hidden"
        className="max-w-4xl h-[80vh] flex items-center justify-center"
      >
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        </div>
      </Modal>
    );
  }

  const errorCount = Object.keys(errors).length;
  const menuHeading = cateringIncluded ? "Menu" : null;

  // Section numbers count only the sections this service type actually shows,
  // so a setup-only quotation never jumps from 03 to 05.
  const stepNumbers = (() => {
    let step = 3;
    const menu = isSetupOnly ? null : ++step;
    const addOns = isFoodOnly ? null : ++step;
    return { menu, addOns, adjustments: ++step, payment: ++step };
  })();

  return (
    <Modal
      title="Quotation Builder"
      onClose={() => requestClose("leave")}
      bodyClassName="overflow-hidden"
      className="max-w-7xl w-[96vw] h-[90vh]"
    >
      <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4 overflow-hidden lg:flex-row lg:gap-6">
        {/* ------------------------------------------------------------------
            Left column: the quotation, in the order it is built
        ------------------------------------------------------------------ */}
        <div ref={formRef} className="flex-1 space-y-4 overflow-y-auto pb-10 pr-1 lg:pr-3">
          {/* AI Quotation Recommendation Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-500/30 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                <Sparkles size={15} />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-foreground block truncate">Zelle AI Quotation Assistant</span>
                <p className="text-[11px] text-muted-foreground truncate">Analyze requirements to generate a complete quotation draft</p>
              </div>
            </div>
            <ZelleQuoteDraft
              inquiryId={inquiry?._id}
              currentPackageName={packageName}
              guestCount={details.guest_count}
              onApplyRecommendation={(rec) => {
                if (rec.recommended_package) setPackageName(rec.recommended_package);
                if (rec.starting_price || rec.estimated_package_cost) {
                  setStartingPrice(String(rec.starting_price || rec.estimated_package_cost));
                }
                if (Array.isArray(rec.inclusions) && rec.inclusions.length > 0) {
                  setInclusions(rec.inclusions.map((name) => inclusionRow(name)));
                }
                if (Array.isArray(rec.recommended_addons) && rec.recommended_addons.length > 0) {
                  setAddOns(
                    rec.recommended_addons.map((a) => ({
                      name: typeof a === "object" ? a.name : a,
                      price: typeof a === "object" && a.price ? String(a.price) : "2500",
                      quantity: 1,
                      note: "",
                      pricing_type: "quantity",
                    }))
                  );
                }
                if (rec.deposit_amount) {
                  setDepositAmount(String(rec.deposit_amount));
                }
                if (rec.admin_notes) {
                  setAdminNotes((prev) => (prev ? prev + "\n" + rec.admin_notes : rec.admin_notes));
                }
              }}
            />
          </div>

          {savedDraft && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-start gap-2.5">
                <FileText size={15} className="mt-0.5 shrink-0 text-amber-700" />
                <span>
                  <strong className="font-semibold text-amber-950">Draft in progress.</strong> The
                  customer has not seen any of this.
                  {draftSavedAt && (
                    <span className="ml-1 tabular-nums text-amber-800">
                      Last saved {formatSavedAt(draftSavedAt)}.
                    </span>
                  )}
                </span>
              </span>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className={`${ROW_ACTION_BASE} ${ROW_ACTION_TONES.danger} self-start sm:self-auto`}
              >
                <Trash2 size={12} /> Discard draft
              </button>
            </div>
          )}

          {quotation?.status === "Revision Requested" && (
            <div className="flex flex-col gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs leading-relaxed text-orange-900">
              <span className="flex items-start gap-2.5">
                <RefreshCw size={15} className="mt-0.5 shrink-0 text-orange-600" />
                <span>
                  <strong className="font-semibold text-orange-950">Customer Revision Request</strong>
                  {quotation.revision_requested_at && (
                    <span className="ml-1 tabular-nums text-orange-700">
                      &middot; {formatSavedAt(quotation.revision_requested_at)}
                    </span>
                  )}
                </span>
              </span>
              {quotation.customer_response ? (
                <blockquote className="rounded-lg border border-orange-200/80 bg-white/80 px-3 py-2 text-slate-800">
                  “{quotation.customer_response}”
                </blockquote>
              ) : (
                <p className="italic text-orange-700">
                  The customer did not include a written message with this request.
                </p>
              )}
            </div>
          )}

          {quotation && (
            <div className="flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-slate-700">
              <RefreshCw size={15} className="mt-0.5 shrink-0 text-primary" />
              <span>
                You are revising an issued quotation. Sending publishes{" "}
                <strong className="font-semibold text-slate-900">
                  Version {(Number(quotation.version_number) || 1) + 1}.0
                </strong>{" "}
                to the customer and replaces what they are looking at now.
              </span>
            </div>
          )}

          {/* Validation belongs on the page next to the fields it names, not
              in a dialog and not in a toast that expires while the admin is
              still reading the list. */}
          {showErrorSummary && errorCount > 0 && (
            <InlineMessage
              tone="error"
              assertive
              title={
                errorCount === 1
                  ? "One field needs your attention before this can be sent."
                  : `${errorCount} fields need your attention before this can be sent.`
              }
            >
              <ul>
                {Object.entries(errors)
                  .slice(0, 5)
                  .map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                {errorCount > 5 && <li>and {errorCount - 5} more below.</li>}
              </ul>
            </InlineMessage>
          )}

          {/* --- 1. Customer and event information --------------------------- */}
          <SectionCard
            step={1}
            id="qb-section-details"
            accent="slate"
            icon={User}
            title="Customer and event information"
            description="What the customer submitted when they booked. Correct anything that is wrong before quoting."
            aside={
              inquiry.reference ? (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-600">
                  {inquiry.reference}
                </span>
              ) : null
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="First name" required error={errors.contact_first_name} htmlFor="qb-contact_first_name">
                  <input
                    id="qb-contact_first_name"
                    type="text"
                    value={details.contact_first_name}
                    onChange={(e) => setDetail("contact_first_name", e.target.value)}
                    className={inputClass(errors.contact_first_name)}
                  />
                </Field>
                <Field label="Last name" required error={errors.contact_last_name} htmlFor="qb-contact_last_name">
                  <input
                    id="qb-contact_last_name"
                    type="text"
                    value={details.contact_last_name}
                    onChange={(e) => setDetail("contact_last_name", e.target.value)}
                    className={inputClass(errors.contact_last_name)}
                  />
                </Field>
                <Field label="Email" required error={errors.contact_email} htmlFor="qb-contact_email">
                  <input
                    id="qb-contact_email"
                    type="email"
                    value={details.contact_email}
                    onChange={(e) => setDetail("contact_email", e.target.value)}
                    className={inputClass(errors.contact_email)}
                  />
                </Field>
                <Field label="Phone" required error={errors.contact_phone} htmlFor="qb-contact_phone">
                  <input
                    id="qb-contact_phone"
                    type="tel"
                    value={details.contact_phone}
                    onChange={(e) => setDetail("contact_phone", e.target.value)}
                    className={inputClass(errors.contact_phone)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Event type" required error={errors.event_type} htmlFor="qb-event_type">
                  <select
                    id="qb-event_type"
                    value={details.event_type}
                    onChange={(e) => setDetail("event_type", e.target.value)}
                    className={inputClass(errors.event_type)}
                  >
                    <option value="">Select event type</option>
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Service type"
                  hint="Decides which sections this quotation needs."
                  htmlFor="qb-service_type"
                >
                  <select
                    id="qb-service_type"
                    value={details.service_type}
                    onChange={(e) => handleServiceTypeChange(e.target.value)}
                    className={inputClass(false)}
                  >
                    {Object.values(SERVICE_TYPES).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Event date"
                  required
                  error={errors.event_date}
                  hint="An event cannot be quoted for a date that has already passed."
                  htmlFor="qb-event_date"
                >
                  <input
                    id="qb-event_date"
                    type="date"
                    min={today}
                    value={details.event_date}
                    onChange={(e) => setDetail("event_date", e.target.value)}
                    className={inputClass(errors.event_date)}
                  />
                </Field>

                <Field label="Start time" required error={errors.start_time} htmlFor="qb-start_time">
                  <input
                    id="qb-start_time"
                    type="time"
                    value={details.start_time}
                    onChange={(e) => setDetail("start_time", e.target.value)}
                    className={inputClass(errors.start_time)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Appears in place rather than swapping with another field, so
                    choosing "Other" never rearranges the row above it. */}
                {details.event_type === OTHER_EVENT_TYPE && (
                  <Field
                    label="Which kind of event"
                    required
                    error={errors.event_type_other}
                    htmlFor="qb-event_type_other"
                  >
                    <input
                      id="qb-event_type_other"
                      type="text"
                      placeholder="e.g. Reunion"
                      value={details.event_type_other}
                      onChange={(e) => setDetail("event_type_other", e.target.value)}
                      className={inputClass(errors.event_type_other)}
                    />
                  </Field>
                )}

                <Field
                  label="Guest count"
                  required
                  error={errors.guest_count}
                  hint="How many people the event is catered and set up for."
                  htmlFor="qb-guest_count"
                >
                  <input
                    id="qb-guest_count"
                    type="number"
                    min="1"
                    value={details.guest_count}
                    onChange={(e) => setDetail("guest_count", nonNegative(e.target.value))}
                    className={`${inputClass(errors.guest_count)} font-semibold tabular-nums`}
                  />
                </Field>

                <Field label="Venue type" htmlFor="qb-venue_type">
                  <input
                    id="qb-venue_type"
                    type="text"
                    placeholder="e.g. Function Hall"
                    value={details.venue_type}
                    onChange={(e) => setDetail("venue_type", e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>

                {/* The footprint the customer picked, stated once. "Event
                    space" and "scaffold size" are the same measurement, so
                    there is deliberately one field rather than two that could
                    drift apart. Locked for the same reason the package is: the
                    starting price was derived from this size. */}
                {eventSpace && (
                  <Field
                    label="Event space / scaffold size"
                    hint="Set when the customer booked. Rebooking is what changes it."
                  >
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <Lock size={13} className="shrink-0 text-slate-500" />
                      <span
                        className="truncate text-sm font-semibold tabular-nums text-slate-800"
                        title={eventSpace}
                      >
                        {eventSpace}
                      </span>
                    </div>
                  </Field>
                )}
              </div>

              {/* The look of the event, editable here rather than quoted back
                  as a fixed brief. What a customer picked from a theme card at
                  booking time is a starting point, and the colours in
                  particular are usually settled in conversation afterwards —
                  which is this form. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Theme"
                  hint="What the customer chose, or what you have since agreed with them."
                  htmlFor="qb-event_theme"
                >
                  <input
                    id="qb-event_theme"
                    type="text"
                    placeholder="e.g. Rustic Garden"
                    value={details.event_theme}
                    onChange={(e) => setDetail("event_theme", e.target.value)}
                    className={inputClass(false)}
                  />
                </Field>

                <Field
                  label="Colour palette"
                  hint="Colour names separated by commas."
                  htmlFor="qb-event_palette"
                >
                  <input
                    id="qb-event_palette"
                    type="text"
                    placeholder="e.g. Navy, Ivory, Gold"
                    value={details.event_palette}
                    onChange={(e) => setDetail("event_palette", e.target.value)}
                    className={inputClass(false)}
                  />
                  {resolvedPalette.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {resolvedPalette.map((colour, index) => (
                        <span
                          key={`${colour}-${index}`}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {colour}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <MapPin size={12} /> Venue location
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Municipality" required error={errors.municipality} htmlFor="qb-municipality">
                    <select
                      id="qb-municipality"
                      value={details.municipality}
                      onChange={(e) => {
                        setDetail("municipality", e.target.value);
                        setDetail("barangay", "");
                      }}
                      className={inputClass(errors.municipality)}
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
                    required
                    error={errors.barangay}
                    hint={!details.municipality ? "Choose a municipality first." : undefined}
                    htmlFor="qb-barangay"
                  >
                    <select
                      id="qb-barangay"
                      value={details.barangay}
                      disabled={!details.municipality}
                      onChange={(e) => setDetail("barangay", e.target.value)}
                      className={inputClass(errors.barangay)}
                    >
                      <option value="">Select barangay</option>
                      {barangays.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Street and building" htmlFor="qb-street">
                    <input
                      id="qb-street"
                      type="text"
                      value={details.street}
                      onChange={(e) => setDetail("street", e.target.value)}
                      className={inputClass(false)}
                    />
                  </Field>
                  <Field label="Landmark" htmlFor="qb-landmark">
                    <input
                      id="qb-landmark"
                      type="text"
                      value={details.landmark}
                      onChange={(e) => setDetail("landmark", e.target.value)}
                      className={inputClass(false)}
                    />
                  </Field>
                </div>
              </div>

              {/* Read-only context the admin should see but never edit here. */}
              {(inquiry.allergies ||
                inquiry.dietary_restrictions ||
                inquiry.dietary_requirements ||
                inquiry.special_requests) && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-900">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                      From the customer
                    </p>
                    {(inquiry.allergies || inquiry.dietary_restrictions || inquiry.dietary_requirements) && (
                      <p>
                        <span className="font-semibold text-amber-950">Dietary and allergies: </span>
                        {[inquiry.allergies, inquiry.dietary_restrictions || inquiry.dietary_requirements]
                          .filter(Boolean)
                          .join(". ")}
                      </p>
                    )}
                    {inquiry.special_requests && (
                      <p className="mt-1 whitespace-pre-line">
                        <span className="font-semibold text-amber-950">Special requests: </span>
                        {inquiry.special_requests}
                      </p>
                    )}
                  </div>
                )}
            </div>
          </SectionCard>

          {/* --- Bespoke setup brief (unchanged source of truth) ------------- */}
          {(inquiry.is_custom_setup ||
            inquiry.budget_range ||
            inquiry.custom_setup_notes ||
            (inquiry.custom_setup_scope && inquiry.custom_setup_scope.length > 0) ||
            (inquiry.inspiration_images && inquiry.inspiration_images.length > 0)) && (
              <SectionCard
                icon={Sparkles}
                title="Bespoke event setup brief"
                description="The design request as the customer described it. Reference only."
                aside={
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {inquiry.is_custom_setup ? "Fully custom request" : "Custom preferences"}
                  </span>
                }
              >
                <div className="space-y-3 text-xs text-slate-700">
                  {/* Theme and palette are not repeated here: they are editable
                      fields in the event details above, and a second read-only
                      copy of a value the admin can change is the copy that
                      goes stale. */}
                  {inquiry.budget_range && (
                    <div>
                      <span className={LABEL_CLASS}>Customer budget</span>
                      <span className="font-semibold text-slate-900">{inquiry.budget_range}</span>
                    </div>
                  )}

                  {Array.isArray(inquiry.custom_setup_scope) && inquiry.custom_setup_scope.length > 0 && (
                    <div>
                      <span className={LABEL_CLASS}>Requested scope</span>
                      <div className="flex flex-wrap gap-1.5">
                        {inquiry.custom_setup_scope.map((scope, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                          >
                            <Check size={11} className="text-primary" /> {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {inquiry.custom_setup_notes && (
                    <p className="whitespace-pre-line rounded-md border border-slate-200 bg-slate-50 p-2.5 leading-relaxed">
                      {inquiry.custom_setup_notes}
                    </p>
                  )}

                  {Array.isArray(inquiry.inspiration_images) && inquiry.inspiration_images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {inquiry.inspiration_images.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-16 w-16 overflow-hidden rounded-md border border-slate-200 transition-colors hover:border-primary"
                          title="Open full image in a new tab"
                        >
                          <img src={url} alt={`Inspiration ${idx + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

          {/* --- 2. Package and starting price ------------------------------- */}
          {/* A combo arrives with one figure already settled and a list of
              things the customer was told are covered. Stating both here,
              before the pricing fields, is what stops food that the combo paid
              for being charged again further down. */}
          {offerContext && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  <Sparkles size={11} /> Combo Pack
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {offerContext.name}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-amber-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Combo food price
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                    {formatCurrency(offerContext.basePrice)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {offerContext.guests} guests ×{" "}
                    {formatCurrency(offerContext.perPax)} per pax — seeded
                    as the starting price below.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Event set-up
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Not part of this combo
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    A combo is food. If this customer also needs their venue set
                    up, price it below as an additional charge.
                  </p>
                </div>
              </div>

              {offerContext.included.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Included in the combo — already paid for by the combo price
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {offerContext.included.map((entry) => (
                      <span
                        key={entry}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      >
                        <Check size={11} /> {entry}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    The customer&apos;s dishes are listed below at {formatCurrency(0)}
                    for the record. Leave them there — pricing them again would
                    charge for food this combo already covers.
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-600">
                Equipment, crew, add-ons and any additional requests are not part
                of the combo. Add them below; this quotation is what settles them.
              </p>
            </div>
          )}

          <SectionCard
            step={2}
            accent="primary"
            icon={Package}
            title={offerContext ? "Combo and food price" : "Package and starting price"}
            description="The baseline this quotation is built from, before anything is added or removed."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Package"
                hint="The package cannot be changed here. Ask the customer to rebook to move to a different package."
              >
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <Lock size={13} className="shrink-0 text-slate-500" />
                  <span className="truncate text-sm font-semibold text-slate-800" title={packageName}>
                    {packageName || "Custom Package"}
                  </span>
                </div>
              </Field>

              <Field
                label={offerContext ? "Combo food price" : "Starting price"}
                required
                error={errors.package_starting_price}
                hint={
                  offerContext
                    ? `${offerContext.guests} guests × ${formatCurrency(offerContext.perPax)} per pax. Adjust only if the combo changed.`
                    : totals.startingPrice > 0
                      ? "Taken from the package the customer booked. Adjust only if the baseline itself is wrong."
                      : "This package has no price on record. Enter the baseline for this quotation."
                }
                htmlFor="qb-package_starting_price"
              >
                <MoneyInput
                  id="qb-package_starting_price"
                  value={startingPrice}
                  error={errors.package_starting_price}
                  onChange={(value) => {
                    setStartingPrice(nonNegative(value));
                    clearError("package_starting_price");
                    clearError("removed_inclusions");
                  }}
                />
              </Field>
            </div>

            {/* The whole package calculation, in one line the admin can read. */}
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
                <span className="text-slate-500">
                  {offerContext ? "Combo food price" : "Starting price"}
                  <strong className="ml-2 tabular-nums text-slate-800">
                    {formatCurrency(totals.startingPrice)}
                  </strong>
                </span>
                <span className="text-slate-500">
                  Removed inclusions
                  <strong
                    className={`ml-2 tabular-nums ${totals.inclusionDeductions > 0 ? "text-emerald-700" : "text-slate-800"
                      }`}
                  >
                    {totals.inclusionDeductions > 0
                      ? `- ${formatCurrency(totals.inclusionDeductions)}`
                      : formatCurrency(0)}
                  </strong>
                </span>
                {/* Only shown once a quantity has actually moved: an untouched
                    package should not carry a line reading "zero". */}
                {totals.inclusionAdjustments !== 0 && (
                  <span className="text-slate-500">
                    Quantity changes
                    <strong
                      className={`ml-2 tabular-nums ${totals.inclusionAdjustments < 0 ? "text-emerald-700" : "text-amber-700"
                        }`}
                    >
                      {totals.inclusionAdjustments < 0
                        ? `- ${formatCurrency(Math.abs(totals.inclusionAdjustments))}`
                        : `+ ${formatCurrency(totals.inclusionAdjustments)}`}
                    </strong>
                  </span>
                )}
                <span className="font-semibold text-slate-900">
                  {offerContext ? "Adjusted base price" : "Adjusted package price"}
                  <strong className="ml-2 tabular-nums text-primary">
                    {formatCurrency(totals.packagePrice)}
                  </strong>
                </span>
              </div>
            </div>
          </SectionCard>

          {/* --- 3. Package inclusions --------------------------------------- */}
          <SectionCard
            step={3}
            accent="emerald"
            icon={Check}
            title="Package inclusions"
            description="Remove what the customer is not getting, or change how many of something they get, and state what that is worth."
            aside={
              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                {keptInclusions.length} kept, {removedInclusions.length} removed
                {inclusionAdjustments.length > 0 &&
                  `, ${inclusionAdjustments.length} adjusted`}
              </span>
            }
          >
            {errors.removed_inclusions && (
              <p
                id="qb-removed_inclusions"
                className="mb-3 flex items-start gap-1.5 rounded-md border border-red-300 bg-red-50 p-2.5 text-[11.5px] font-medium leading-snug text-red-700"
              >
                <AlertCircle size={13} className="mt-[1px] shrink-0" />
                {errors.removed_inclusions}
              </p>
            )}

            {inclusions.length === 0 ? (
              <p className="py-2 text-xs italic text-slate-500">
                This package has no inclusions on record. Add the ones this quotation covers.
              </p>
            ) : (
              <div className="space-y-4">
                {inclusionGroups.map((group) => (
                  <div key={group.category}>
                    {/* The category, said once at the top of its own list
                        instead of repeated on every line inside it. A package
                        with forty inclusions is read by finding the heading
                        you want and stopping there. */}
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
                      // A line only offers quantity pricing if its own wording
                      // stated an amount to begin with. "Professional crew" has
                      // nothing to count, so it gets no quantity controls rather
                      // than an empty box the admin has to ignore.
                      const hasQuantity =
                        entry.baseQuantity !== null && entry.baseQuantity !== undefined;
                      const quantityMoved =
                        hasQuantity && Number(entry.quantity) !== Number(entry.baseQuantity);
                      const adjustment = quantityMoved
                        ? inclusionAdjustmentAmount({
                            base_quantity: entry.baseQuantity,
                            quantity: entry.quantity,
                            unit_price: entry.unitPrice,
                          })
                        : 0;
                      return (
                      <li
                        key={index}
                        className={`rounded-lg border p-2.5 transition-colors ${entry.removed
                            ? "border-emerald-200 bg-emerald-50/50"
                            : quantityMoved
                              ? "border-amber-200 bg-amber-50/40"
                              : "border-slate-200 bg-white"
                          }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.removed ? "bg-emerald-500" : "bg-primary"
                                }`}
                            />
                            <input
                              id={`qb-inclusions.${index}.name`}
                              type="text"
                              value={inclusionDisplayName(entry.name)}
                              onChange={(e) => handleInclusionName(index, e.target.value)}
                              placeholder="Inclusion description"
                              className={`${inputClass(errors[`inclusions.${index}.name`])} py-1.5 text-xs ${entry.removed ? "line-through decoration-slate-400" : ""
                                }`}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                            {/* How many, and what one is worth. The two sit
                                together because neither means anything alone: a
                                changed count with no rate cannot be priced, and a
                                rate with an unchanged count changes nothing. */}
                            {!entry.removed && hasQuantity && (
                              <>
                                <div
                                  className={`flex shrink-0 items-center gap-1.5 rounded-md border p-1 ${quantityMoved
                                      ? "border-amber-300 bg-amber-50 text-amber-800"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                    }`}
                                >
                                  <label
                                    htmlFor={`qb-inclusions.${index}.quantity`}
                                    className="pl-1 text-[10px] font-semibold uppercase tracking-wider"
                                  >
                                    Qty
                                  </label>
                                  <input
                                    id={`qb-inclusions.${index}.quantity`}
                                    type="number"
                                    min="0"
                                    value={entry.quantity ?? ""}
                                    onChange={(e) => handleInclusionQuantity(index, e.target.value)}
                                    className={`w-14 rounded border bg-white px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors[`inclusions.${index}.quantity`]
                                        ? "border-red-400"
                                        : "border-slate-200"
                                      }`}
                                  />
                                  <span className="pr-1 text-[10px] font-medium tabular-nums opacity-70">
                                    of {entry.baseQuantity}
                                  </span>
                                </div>

                                {quantityMoved && (
                                  <div className="w-32">
                                    <MoneyInput
                                      id={`qb-inclusions.${index}.unitPrice`}
                                      value={entry.unitPrice}
                                      error={errors[`inclusions.${index}.unitPrice`]}
                                      placeholder="Per unit"
                                      onChange={(value) => handleInclusionUnitPrice(index, value)}
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
                                    title={`Put this back to the ${entry.baseQuantity} the package includes`}
                                  />
                                )}
                              </>
                            )}

                            {entry.removed && (
                              <div className="w-36">
                                <MoneyInput
                                  id={`qb-inclusions.${index}.deduction`}
                                  value={entry.deduction}
                                  error={errors[`inclusions.${index}.deduction`]}
                                  placeholder="Deduction"
                                  onChange={(value) => handleInclusionDeduction(index, value)}
                                  className="py-1.5 text-xs"
                                />
                              </div>
                            )}

                            {/* One control per row. A line that came with the
                                package is removed by deducting it from the starting
                                price; a line the admin typed in here was never in
                                the package, so there is nothing to deduct and
                                Remove simply takes it back off the list. */}
                            {entry.removed ? (
                              <RowAction
                                onClick={() => toggleInclusionRemoved(index)}
                                icon={Undo2}
                                label="Restore"
                                tone="neutral"
                                title="Put this inclusion back into the package"
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
                                title={
                                  entry.fromPackage
                                    ? "Remove this inclusion and deduct it from the starting price"
                                    : "Remove this inclusion from the list"
                                }
                              />
                            )}
                          </div>
                        </div>

                        {(errors[`inclusions.${index}.name`] ||
                          errors[`inclusions.${index}.deduction`] ||
                          errors[`inclusions.${index}.quantity`] ||
                          errors[`inclusions.${index}.unitPrice`]) && (
                          <p className="mt-1.5 flex items-start gap-1 pl-3.5 text-[11.5px] font-medium leading-snug text-red-700">
                            <AlertCircle size={12} className="mt-[2px] shrink-0" />
                            {errors[`inclusions.${index}.name`] ||
                              errors[`inclusions.${index}.quantity`] ||
                              errors[`inclusions.${index}.unitPrice`] ||
                              errors[`inclusions.${index}.deduction`]}
                          </p>
                        )}

                        {entry.removed && !errors[`inclusions.${index}.deduction`] && (
                          <p className="mt-1.5 pl-3.5 text-[11.5px] text-emerald-700">
                            Removed from the package. {formatCurrency(numberOf(entry.deduction))} comes off the
                            starting price.
                          </p>
                        )}

                        {/* Where the money came from, in the admin's own numbers.
                            The arithmetic is stated rather than just its result,
                            because the figure has to be explainable to the
                            customer who asks why their quote moved. */}
                        {quantityMoved && !errors[`inclusions.${index}.unitPrice`] && (
                          <p
                            className={`mt-1.5 pl-3.5 text-[11.5px] ${adjustment < 0 ? "text-emerald-700" : "text-amber-800"
                              }`}
                          >
                            {Number(entry.quantity) < Number(entry.baseQuantity)
                              ? `Down ${Number(entry.baseQuantity) - Number(entry.quantity)} from the ${entry.baseQuantity} the package includes`
                              : `Up ${Number(entry.quantity) - Number(entry.baseQuantity)} from the ${entry.baseQuantity} the package includes`}
                            {" · "}
                            {Math.abs(Number(entry.quantity) - Number(entry.baseQuantity))} ×{" "}
                            {formatCurrency(numberOf(entry.unitPrice))} ={" "}
                            <strong className="tabular-nums">
                              {adjustment < 0
                                ? `${formatCurrency(Math.abs(adjustment))} off`
                                : `${formatCurrency(adjustment)} added`}
                            </strong>
                          </p>
                        )}
                      </li>
                      );
                    })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInclusion();
                  }
                }}
                placeholder="Add an inclusion this quotation covers"
                className={`${inputClass(false)} text-xs`}
              />
              <button
                type="button"
                onClick={handleAddInclusion}
                disabled={!newInclusion.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus size={13} /> Add inclusion
              </button>
            </div>
          </SectionCard>

          {/* --- 4. Menu ----------------------------------------------------- */}
          {!isSetupOnly && (
            <SectionCard
              step={stepNumbers.menu}
              accent="amber"
              icon={cateringIncluded ? Utensils : UtensilsCrossed}
              title="Menu"
              description={
                cateringIncluded
                  ? "Every dish is quantity times unit price. State what the quantity is in — a kilo, a tray, a bilao, a head — and what one of them costs."
                  : "The customer's answer to catering on this booking."
              }
              aside={
                cateringIncluded ? (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-600">
                    {totals.guestCount} pax
                  </span>
                ) : null
              }
            >
              {/* What the customer chose, stated plainly. An empty dish list and
                  a declined catering request look identical otherwise, and one
                  of them means the admin has lost the customer's selection. */}
              <div
                className={`mb-3 flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${cateringIncluded
                    ? "border-primary/25 bg-primary/5 text-slate-700"
                    : "border-slate-300 bg-slate-50 text-slate-700"
                  }`}
              >
                {cateringIncluded ? (
                  <Utensils size={15} className="mt-0.5 shrink-0 text-primary" />
                ) : (
                  <UtensilsCrossed size={15} className="mt-0.5 shrink-0 text-slate-500" />
                )}
                <div className="min-w-0">
                  {/* A combo customer chose a meal, not dishes. Saying they
                      "did not pick specific dishes" would read as an open menu
                      the admin still has to agree — the opposite of what a
                      combo is. */}
                  {offerContext ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        The customer booked the {offerContext.name} combo, which
                        decides the food.
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {offerContext.food.map((name, index) => (
                          <li
                            key={`${name}-${index}`}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                          >
                            <Check size={11} className="text-amber-500" />
                            {name}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5">
                        Already paid for by the combo price above — do not charge
                        for it again.
                      </p>
                    </>
                  ) : customerSelection.wantedFood ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        The customer asked for catering and chose{" "}
                        {customerSelection.dishes.length}{" "}
                        {customerSelection.dishes.length === 1 ? "dish" : "dishes"}.
                      </p>
                      {customerSelection.dishes.length > 0 ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {customerSelection.dishes.map((dish, index) => (
                            <li
                              key={dish.id || index}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                            >
                              <Check size={11} className="text-primary" />
                              {dish.name || "Dish no longer in the catalog"}
                              {dish.category && (
                                <span className="text-slate-500">({dish.category})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1">
                          They did not pick specific dishes, so the menu is still open. Agree it with
                          them before quoting a per guest rate.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">
                        The customer chose to skip catering on this booking.
                      </p>
                      <p className="mt-1">
                        No food is being quoted and no food charges are included in the total. Only add
                        dishes here if the customer has since asked for catering.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Catering can still be turned on or off here, because customers
                  change their minds after booking and the quotation is where
                  that gets settled. */}
              <label className="mb-3 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={cateringIncluded}
                  onChange={(e) => setDetail("include_food", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/40"
                />
                <span>
                  Include catering on this quotation
                  {customerSelection.wantedFood !== cateringIncluded && (
                    <span className="ml-1.5 font-semibold text-amber-700">
                      (changed from what the customer submitted)
                    </span>
                  )}
                </span>
              </label>

              {cateringIncluded && (
              <>
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:flex-row">
                <select
                  value={selectedCatalogDish}
                  onChange={(e) => setSelectedCatalogDish(e.target.value)}
                  className={`${inputClass(false)} text-xs`}
                >
                  <option value="">Pick a dish from the menu catalog</option>
                  {catalogMenuItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} ({item.category || "Dish"}) {formatCurrency(item.price)} per pax
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCatalogDish}
                  disabled={!selectedCatalogDish}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
                >
                  <Plus size={13} /> Add dish
                </button>
                <button
                  type="button"
                  onClick={() => setMenuItems((prev) => [...prev, menuRow()])}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus size={13} /> Custom dish
                </button>
              </div>

              {/* Units are suggestions shared by every row, so the list is
                  rendered once rather than per dish. */}
              <datalist id="qb-menu-units">
                {UNIT_SUGGESTIONS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>

              {menuItems.length === 0 ? (
                <p className="py-3 text-center text-xs italic text-slate-500">
                  No dishes on this quotation yet. Add the ones this event covers so they can be
                  priced.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {menuItems.map((item, index) => {
                    const unitLabel = String(item.unit || "").trim();
                    const rowError =
                      errors[`menu_items.${index}.name`] ||
                      errors[`menu_items.${index}.price`] ||
                      errors[`menu_items.${index}.quantity`];
                    // One pricing form, so one colour: violet is "a counted
                    // number of units", the same language the add-ons below
                    // use for the same idea.
                    const modeTint = "border-violet-300 bg-violet-50 text-violet-800";
                    return (
                      <li
                        key={index}
                        className={`rounded-lg border p-2.5 transition-colors ${
                          item.removed ? "border-slate-300 bg-slate-50" : "border-violet-200 bg-white"
                        }`}
                      >
                        {/* Explicit column widths, not an implicit grid: the
                            dish name gets a guaranteed minimum width it can
                            never be squeezed under, whatever the numbers
                            beside it grow to. */}
                        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                          {/* The dish, and what it is. The course comes from
                              the menu catalog and is not the admin's to quote,
                              so it sits beside the name as a label rather than
                              in a field — and, in particular, not in the note,
                              which is theirs to write. */}
                          <div className="flex min-w-0 flex-1 flex-col gap-1 lg:min-w-[150px]">
                            <input
                              id={`qb-menu_items.${index}.name`}
                              type="text"
                              value={item.name}
                              disabled={item.removed}
                              onChange={(e) => handleMenuChange(index, "name", e.target.value)}
                              placeholder="Dish name"
                              className={`${inputClass(errors[`menu_items.${index}.name`])} min-w-0 py-1.5 text-xs font-semibold ${
                                item.removed ? "line-through decoration-slate-400" : ""
                              }`}
                            />
                            {item.category && (
                              <span className="w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                {item.category}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                            {/* How many, and of what. The unit is the admin's
                                to state — a kilo, a tray, a bilao, a head —
                                because food is sold by all of them and forcing
                                one of them on every dish is what the per-person
                                default got wrong. */}
                            <div className={`flex shrink-0 items-center gap-1.5 rounded-md border p-1 ${modeTint}`}>
                              <input
                                id={`qb-menu_items.${index}.quantity`}
                                type="number"
                                min="1"
                                disabled={item.removed}
                                value={item.quantity}
                                onChange={(e) => handleMenuChange(index, "quantity", e.target.value)}
                                className={`w-14 rounded border border-violet-200 bg-white px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                                  errors[`menu_items.${index}.quantity`] ? "border-red-400" : ""
                                }`}
                              />
                              <input
                                type="text"
                                list="qb-menu-units"
                                disabled={item.removed}
                                value={item.unit}
                                onChange={(e) => handleMenuChange(index, "unit", e.target.value)}
                                placeholder="unit"
                                className="w-20 rounded border border-violet-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                              />
                            </div>

                            <div className="w-28">
                              <MoneyInput
                                id={`qb-menu_items.${index}.price`}
                                value={item.price}
                                disabled={item.removed}
                                placeholder={`Per ${unitLabel || "unit"}`}
                                error={errors[`menu_items.${index}.price`]}
                                onChange={(value) => handleMenuChange(index, "price", value)}
                                className="py-1.5 text-xs"
                              />
                            </div>

                            <div className="min-w-[96px] text-right">
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Line total
                              </span>
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  item.removed ? "text-slate-400 line-through" : "text-slate-800"
                                }`}
                              >
                                {formatCurrency(menuLineTotal(item, totals.guestCount))}
                              </span>
                            </div>

                            {/* Parked, not deleted: one click puts it back,
                                with its price, quantity and note intact. */}
                            {item.removed ? (
                              <RowAction
                                onClick={() => toggleMenuItemRemoved(index)}
                                icon={Undo2}
                                label="Restore"
                                tone="success"
                                title="Put this dish back on the quotation"
                              />
                            ) : (
                              <RowAction
                                onClick={() =>
                                  String(item.name || "").trim() || numberOf(item.price)
                                    ? toggleMenuItemRemoved(index)
                                    : handleDeleteMenuItem(index)
                                }
                                icon={Trash2}
                                label="Remove"
                                title="Take this dish off the quotation. You can restore it."
                              />
                            )}
                          </div>
                        </div>

                        {/* What this dish is, beyond its name and price: what a
                            kilo of it serves, how it is packed, how it is
                            prepared. It is the place for the detail that
                            explains the quantity — never for the quantity
                            itself, which has its own field above. Shown to the
                            customer, and never part of the total. */}
                        {!item.removed && (
                          <div className="mt-2">
                            <label
                              htmlFor={`qb-menu_items.${index}.note`}
                              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                            >
                              Notes
                            </label>
                            <input
                              id={`qb-menu_items.${index}.note`}
                              type="text"
                              value={item.note || ""}
                              onChange={(e) => handleMenuChange(index, "note", e.target.value)}
                              placeholder={`e.g. 1 ${unitLabel || "kilo"}, good for approximately 10 servings`}
                              title="Serving size, weight, packaging or preparation details for this dish."
                              className={`${inputClass(false)} py-1.5 text-xs`}
                            />
                          </div>
                        )}

                        {rowError && (
                          <p className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-red-700">
                            <AlertCircle size={12} className="mt-[2px] shrink-0" />
                            {rowError}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              </>
              )}
            </SectionCard>
          )}

          {/* --- 5. Add-ons and services ------------------------------------- */}
          {!isFoodOnly && (
            <SectionCard
              step={stepNumbers.addOns}
              accent="violet"
              icon={Sparkles}
              title="Add-ons and services"
              description="The catalog holds the add-on names. How many, at what price, and why are what you quote for this event."
            >
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:flex-row">
                <select
                  value={selectedCatalogAddon}
                  onChange={(e) => setSelectedCatalogAddon(e.target.value)}
                  className={`${inputClass(false)} text-xs`}
                >
                  <option value="">Pick an add-on from the global catalog</option>
                  {catalogAddons.map((addon) => (
                    <option key={addon._id} value={addon._id}>
                      {addon.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCatalogAddon}
                  disabled={!selectedCatalogAddon}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
                >
                  <Plus size={13} /> Add service
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAddOns((prev) => [
                      ...prev,
                      { name: "", price: "", quantity: 1, note: "", pricing_type: "quantity" },
                    ])
                  }
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus size={13} /> Custom service
                </button>
              </div>

              {addOns.length === 0 ? (
                <p className="py-3 text-center text-xs italic text-slate-500">
                  No add-ons on this quotation yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {addOns.map((item, index) => {
                    const rowError =
                      errors[`add_ons.${index}.name`] ||
                      errors[`add_ons.${index}.price`] ||
                      errors[`add_ons.${index}.quantity`];
                    // The same violet the Menu rows above use for "a counted
                    // number of units". An admin who has learned the language
                    // once in one section should not relearn it in the next.
                    const modeTint = "border-violet-300 bg-violet-50 text-violet-800";
                    return (
                      <li
                        key={index}
                        className={`rounded-lg border p-2.5 transition-colors ${
                          item.removed ? "border-slate-300 bg-slate-50" : "border-violet-200 bg-white"
                        }`}
                      >
                        {/* Explicit widths, matching the Menu rows: the name
                            keeps a guaranteed minimum so the numbers beside it
                            can never squeeze it out of the row. */}
                        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                          <input
                            id={`qb-add_ons.${index}.name`}
                            type="text"
                            value={item.name}
                            disabled={item.removed}
                            onChange={(e) => handleAddOnChange(index, "name", e.target.value)}
                            placeholder="Add-on or service name"
                            className={`${inputClass(errors[`add_ons.${index}.name`])} min-w-0 py-1.5 text-xs font-semibold lg:min-w-[150px] lg:flex-1 ${
                              item.removed ? "line-through decoration-slate-400" : ""
                            }`}
                          />

                          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                            {/* Quantity and price, the only two figures an
                                add-on is charged from. A service supplied once
                                is a quantity of one, so there is no second
                                pricing mode to choose between. */}
                            <div className={`flex shrink-0 items-center rounded-md border p-1 ${modeTint}`}>
                              <input
                                id={`qb-add_ons.${index}.quantity`}
                                type="number"
                                min="1"
                                disabled={item.removed}
                                value={item.quantity}
                                onChange={(e) => handleAddOnChange(index, "quantity", e.target.value)}
                                className={`w-14 rounded border border-violet-200 bg-white px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                                  errors[`add_ons.${index}.quantity`] ? "border-red-400" : ""
                                }`}
                              />
                            </div>

                            <div className="w-28">
                              <MoneyInput
                                id={`qb-add_ons.${index}.price`}
                                value={item.price}
                                disabled={item.removed}
                                placeholder="Unit price"
                                error={errors[`add_ons.${index}.price`]}
                                onChange={(value) => handleAddOnChange(index, "price", value)}
                                className="py-1.5 text-xs"
                              />
                            </div>

                            <div className="min-w-[96px] text-right">
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Line total
                              </span>
                              <span
                                className={`text-xs font-bold tabular-nums ${item.removed ? "text-slate-400 line-through" : "text-slate-800"
                                  }`}
                              >
                                {formatCurrency(addOnLineTotal(item))}
                              </span>
                            </div>

                            {/* Parked, not deleted: one click puts it back,
                                with its quoted price still filled in. */}
                            {item.removed ? (
                              <RowAction
                                onClick={() => toggleAddOnRemoved(index)}
                                icon={Undo2}
                                label="Restore"
                                tone="success"
                                title="Put this add-on back on the quotation"
                              />
                            ) : (
                              <RowAction
                                onClick={() =>
                                  String(item.name || "").trim() || numberOf(item.price)
                                    ? toggleAddOnRemoved(index)
                                    : handleDeleteAddOn(index)
                                }
                                icon={Trash2}
                                label="Remove"
                                title="Take this add-on off the quotation. You can restore it."
                              />
                            )}
                          </div>
                        </div>
                        {/* Why this add-on is on the quotation, in the
                            admin's words. Shown to the customer beside the
                            line, and never part of what it costs. */}
                        {!item.removed && (
                          <div className="mt-2">
                            <label
                              htmlFor={`qb-add_ons.${index}.note`}
                              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                            >
                              Notes
                            </label>
                            <input
                              id={`qb-add_ons.${index}.note`}
                              type="text"
                              value={item.note || ""}
                              onChange={(e) => handleAddOnChange(index, "note", e.target.value)}
                              placeholder="e.g. Set up an hour before the programme starts."
                              className={`${inputClass(false)} py-1.5 text-xs`}
                            />
                          </div>
                        )}

                        {rowError && (
                          <p className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-red-700">
                            <AlertCircle size={12} className="mt-[2px] shrink-0" />
                            {rowError}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          )}

          {/* --- 6. Adjustments ---------------------------------------------- */}
          <SectionCard
            step={stepNumbers.adjustments}
            accent="sky"
            icon={Percent}
            title="Adjustments"
            description="Transportation, any custom fees, then tax and discount applied to the subtotal."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field
                  label="Transportation"
                  hint="Logistics and delivery for this event."
                  htmlFor="qb-transportation_fee"
                >
                  <MoneyInput
                    id="qb-transportation_fee"
                    value={transportationFee}
                    onChange={(value) => setTransportationFee(nonNegative(value))}
                  />
                </Field>
                <Field label="Taxes" hint="Added to the subtotal." htmlFor="qb-taxes">
                  <MoneyInput id="qb-taxes" value={taxes} onChange={(value) => setTaxes(nonNegative(value))} />
                </Field>
                <Field label="Discount" hint="Taken off the subtotal." htmlFor="qb-discounts">
                  <MoneyInput
                    id="qb-discounts"
                    value={discounts}
                    onChange={(value) => setDiscounts(nonNegative(value))}
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Additional fees
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdditionalFees((prev) => [...prev, { name: "", amount: "" }])}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-white/60"
                  >
                    <Plus size={12} /> Add fee
                  </button>
                </div>

                {additionalFees.length === 0 ? (
                  <p className="text-[11.5px] leading-snug text-slate-500">
                    Add named one-off charges such as an overtime service or special equipment. Each one
                    appears on the customer's quotation and is added to the total.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {additionalFees.map((fee, index) => {
                      const rowError =
                        errors[`additional_fees.${index}.name`] ||
                        errors[`additional_fees.${index}.amount`];
                      return (
                        <li key={index}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              id={`qb-additional_fees.${index}.name`}
                              type="text"
                              value={fee.name}
                              onChange={(e) => handleFeeChange(index, "name", e.target.value)}
                              placeholder="Fee name, e.g. Overtime Service"
                              className={`${inputClass(errors[`additional_fees.${index}.name`])} py-1.5 text-xs`}
                            />
                            <div className="w-full sm:w-40 sm:shrink-0">
                              <MoneyInput
                                id={`qb-additional_fees.${index}.amount`}
                                value={fee.amount}
                                error={errors[`additional_fees.${index}.amount`]}
                                onChange={(value) => handleFeeChange(index, "amount", value)}
                                className="py-1.5 text-xs"
                              />
                            </div>
                            <RowAction
                              onClick={() => handleRemoveFee(index)}
                              icon={Trash2}
                              label="Remove"
                              title="Remove this fee from the quotation"
                            />
                          </div>
                          {rowError && (
                            <p className="mt-1 flex items-start gap-1 text-[11.5px] font-medium text-red-700">
                              <AlertCircle size={12} className="mt-[2px] shrink-0" />
                              {rowError}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </SectionCard>

          {/* --- 7. Payment terms -------------------------------------------- */}
          <SectionCard
            step={stepNumbers.payment}
            accent="indigo"
            icon={CreditCard}
            title="Payment terms"
            description="What the customer pays to confirm the date, and how long this quotation stands."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field
                label="Required deposit"
                required
                error={errors.deposit_amount}
                hint={`The standard deposit is ${depositPercentage} percent of the total.`}
                htmlFor="qb-deposit_amount"
              >
                <MoneyInput
                  id="qb-deposit_amount"
                  value={depositAmount}
                  error={errors.deposit_amount}
                  onChange={(value) => {
                    setDepositAmount(nonNegative(value));
                    clearError("deposit_amount");
                  }}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[...new Set([depositPercentage, 50, 100])].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      disabled={totals.totalCost <= 0}
                      onClick={() => {
                        setDepositAmount(String(money((totals.totalCost * percent) / 100)));
                        clearError("deposit_amount");
                      }}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                      {percent} percent
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="Quotation valid until"
                required
                error={errors.expiration_date}
                hint={
                  expirationDate && expirationDate >= today
                    ? `Selectable from today. ${validityWindow}`
                    : "Selectable from today onward — earlier dates are greyed out in the picker."
                }
                htmlFor="qb-expiration_date"
              >
                {/* `min` is what greys the past out in the native picker;
                    validate() re-checks it because the field can still be
                    typed into. */}
                <input
                  id="qb-expiration_date"
                  type="date"
                  min={today}
                  value={expirationDate}
                  onChange={(e) => {
                    setExpirationDate(e.target.value);
                    clearError("expiration_date");
                  }}
                  className={inputClass(errors.expiration_date)}
                />
                {/* The common validity windows, so the usual answer is one
                    click rather than a calendar navigation. */}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setExpirationDate(addDays(days));
                        clearError("expiration_date");
                      }}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary hover:text-primary"
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Balance after deposit
                </span>
                <span className="mt-1 block text-lg font-bold tabular-nums text-slate-900">
                  {formatCurrency(totals.remainingBalance)}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Payable before the event.
                </span>
              </div>
            </div>

            <Field label="Notes for the customer" className="mt-3" htmlFor="qb-admin_notes">
              <textarea
                id="qb-admin_notes"
                rows="3"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Payment terms, venue guidelines, or anything the customer should read before accepting."
                className={`${inputClass(false)} resize-y`}
              />
            </Field>
          </SectionCard>

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5">
              <p className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle size={15} className="shrink-0" />
                Worth checking before you send
              </p>
              <ul className="mt-2 space-y-1 pl-6 text-[11.5px] leading-snug text-amber-800">
                {warnings.map((warning, index) => (
                  <li key={index} className="list-disc">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------
            Right column: the running total, always visible
        ------------------------------------------------------------------ */}
        <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-xl bg-[#16264A] text-white lg:w-[360px]">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <Calculator size={17} className="text-primary" />
            <span className="text-sm font-bold">Quotation summary</span>
            {savedDraft ? (
              <span className="ml-auto rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                Draft
              </span>
            ) : quotation ? (
              <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                v{(Number(quotation.version_number) || 1) + 1}.0
              </span>
            ) : null}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Package
              </p>
              <SummaryRow label="Starting price" value={formatCurrency(totals.startingPrice)} />
              {totals.inclusionDeductions > 0 && (
                <SummaryRow
                  label="Removed inclusions"
                  detail={`(${removedInclusions.length})`}
                  value={`- ${formatCurrency(totals.inclusionDeductions)}`}
                  tone="deduct"
                />
              )}
              <SummaryRow
                label="Adjusted package price"
                value={formatCurrency(totals.packagePrice)}
                strong
              />
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Added to the quote
              </p>
              {menuHeading && (
                <SummaryRow
                  label={menuHeading}
                  detail={`(${chargeableMenuItems.length} ${
                    chargeableMenuItems.length === 1 ? "dish" : "dishes"
                  })`}
                  value={formatCurrency(totals.menuSubtotal)}
                />
              )}
              {!isFoodOnly && (
                <SummaryRow
                  label="Add-ons and services"
                  detail={`(${chargeableAddOns.length})`}
                  value={formatCurrency(totals.addOnsSubtotal)}
                />
              )}
              <SummaryRow
                label="Transportation"
                value={formatCurrency(money(transportationFee))}
              />
              {additionalFees.map((fee, index) => (
                <SummaryRow
                  key={index}
                  indent
                  label={String(fee.name || "").trim() || "Unnamed fee"}
                  value={formatCurrency(money(fee.amount))}
                />
              ))}
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} strong />
              <SummaryRow label="Taxes" value={`+ ${formatCurrency(totals.taxes)}`} />
              <SummaryRow
                label="Discount"
                value={totals.discounts > 0 ? `- ${formatCurrency(totals.discounts)}` : formatCurrency(0)}
                tone={totals.discounts > 0 ? "deduct" : "default"}
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">Total</span>
                <span className="text-xl font-bold tabular-nums text-white">
                  {formatCurrency(totals.totalCost)}
                </span>
              </div>
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                <SummaryRow
                  label="Deposit to confirm"
                  value={formatCurrency(totals.depositAmount)}
                  strong
                />
                <SummaryRow label="Balance before event" value={formatCurrency(totals.remainingBalance)} />
              </div>
              {!numberOf(depositAmount) && (
                <p className="mt-3 flex items-start gap-1.5 rounded-md bg-red-500/15 p-2 text-[11px] font-medium leading-snug text-red-200">
                  <AlertCircle size={12} className="mt-[2px] shrink-0" />
                  A deposit is required before this quotation can be sent.
                </p>
              )}
            </div>

            {quotation && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-white">
                  <RefreshCw size={12} className="shrink-0 text-primary" />
                  Changes in version {(Number(quotation.version_number) || 1) + 1}.0
                </p>
                {pendingChanges.length === 0 ? (
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Nothing has changed yet. Edit the quotation before publishing a new version.
                  </p>
                ) : (
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                    {pendingChanges.map((change, index) => (
                      <li key={index} className="text-[11px] leading-relaxed text-slate-300">
                        <span className="font-semibold text-white">
                          {change.name ? `${change.label}: ${change.name}` : change.label}
                        </span>
                        {change.detail ? (
                          <span
                            className={`ml-1.5 ${change.kind === "removed" ? "text-emerald-300" : "text-slate-200"
                              }`}
                          >
                            {change.detail}
                          </span>
                        ) : (
                          <span className="ml-1.5 inline-flex items-center gap-1 tabular-nums">
                            <span className="text-slate-500 line-through">{change.from}</span>
                            <ArrowRight size={10} className="shrink-0 text-slate-500" />
                            <span className="font-semibold text-white">{change.to}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-300">
              <CalendarDays size={12} className="mt-[2px] shrink-0" />
              Sending publishes this quotation to the customer straight away.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-white/10 px-5 py-4">
            <button
              type="submit"
              disabled={submitting || savingDraft}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={15} />
              )}
              {submitting
                ? "Sending"
                : quotation
                  ? "Send revised quotation"
                  : "Send quotation"}
            </button>
            {/* Parks the work as it stands. Required fields are checked when
                sending, not here, so an admin is never forced to invent a
                deposit just to step away from a half-built quotation. */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting || savingDraft}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {savingDraft ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Save size={14} />
              )}
              {savingDraft ? "Saving draft" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => requestClose("cancel")}
              className="rounded-md px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </aside>
      </form>

      {/* Closing with work in progress. The X, the backdrop, Escape and Cancel
          all land here rather than discarding silently. Leaving offers to keep
          the work; Cancel is a deliberate throw-away, so it just asks once.

          Two different questions, so two different shapes. "Leave" is a
          three-way: the safe, recommended action (save the draft) is the
          primary, "Keep editing" is the neutral escape, and discarding is a
          quiet destructive text button set apart on the left. The old footer
          gave all three the same weight in one row, which is why it read as a
          puzzle rather than a recommendation. "Cancel" is a plain destructive
          yes/no — there is nothing to offer to keep. */}
      {closeIntent === "leave" ? (
        <FeedbackDialog
          open
          onOpenChange={(open) => !open && setCloseIntent(null)}
          tone="warning"
          title="Save this quotation as a draft before leaving?"
          description="You have changes that have not been saved. Save them as a draft and you can pick this up later. Nothing has been sent to the customer either way."
          confirmLabel="Save as draft"
          confirmIcon={Save}
          cancelLabel="Keep editing"
          onConfirm={handleSaveDraftAndClose}
          tertiary={{
            label: "Discard changes",
            tone: "destructive",
            onClick: () => {
              setCloseIntent(null);
              onClose();
            },
          }}
        />
      ) : null}

      {closeIntent === "cancel" ? (
        <FeedbackDialog
          open
          onOpenChange={(open) => !open && setCloseIntent(null)}
          tone="destructive"
          title="Discard this quotation?"
          description="The changes you have made will be lost. The customer has not been sent anything."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => {
            setCloseIntent(null);
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}
