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
  addOnQuantityOf,
  addOnLineTotal,
  money,
} from "../../../utils/quotationPricing";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../../lib/eventTypes";
import { SERVICE_TYPES } from "../../../pages/customer/booking/lib/bookingRules";
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

function SectionCard({ step, title, description, icon: Icon, aside, children, id }) {
  return (
    <section
      id={id}
      className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <header className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {Icon ? <Icon size={15} /> : null}
          </span>
          <div className="min-w-0">
            {/* font-sans explicitly: this modal is rendered into a body portal,
                outside the .admin-layout wrapper whose rule opts admin headings
                out of Playfair. Without it a 14px section label renders in the
                display serif, which is what that face is least suited to. */}
            <h3 className="flex items-baseline gap-2 font-sans text-sm font-bold text-slate-900">
              {step != null && (
                <span className="text-[11px] font-semibold tabular-nums text-slate-500">
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
      // The booking flow only clears include_food through its own catering
      // toggle, so a false here is an explicit "no catering", never a default.
      wantedFood: inquiry?.service_type !== SERVICE_TYPES.SETUP_ONLY && inquiry?.include_food !== false,
      serviceType: inquiry?.service_type || "",
    };
  }, [inquiry?.selected_menu, inquiry?.include_food, inquiry?.service_type]);

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
          service_type:
            inquiry?.service_type ||
            (inquiry?.include_food === false ? SERVICE_TYPES.SETUP_ONLY : SERVICE_TYPES.FULL_SERVICE),
          include_food: inquiry?.include_food !== false,
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
          }));
          setPackageName(latest.package_name || packageRecord?.name || "Custom Package");
          // Quotations saved before the starting price existed only recorded the
          // adjusted package price, which was the starting price back then.
          setStartingPrice(
            String(latest.package_starting_price ?? latest.package_price ?? 0)
          );
          setInclusions([
            ...(Array.isArray(latest.package_inclusions) ? latest.package_inclusions : []).map(
              (entry) => ({ name: inclusionText(entry), removed: false, deduction: "", fromPackage: true })
            ),
            ...(Array.isArray(latest.removed_inclusions) ? latest.removed_inclusions : []).map(
              (entry) => ({
                name: inclusionText(entry),
                removed: true,
                deduction: entry?.deduction ? String(entry.deduction) : "",
                fromPackage: true,
              })
            ),
          ]);
          setMenuItems(Array.isArray(latest.menu_items) ? latest.menu_items.map((m) => ({
            name: m?.name || "",
            note: m?.note || "",
            price: m?.price ? String(m.price) : "",
          })) : []);
          setAddOns(Array.isArray(latest.add_ons) ? latest.add_ons.map((a) => ({
            name: a?.name || "",
            price: a?.price ? String(a.price) : "",
            quantity: a?.quantity || 1,
            pricing_type: a?.pricing_type || "fixed",
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
          setExpirationDate(toDateInput(latest.expiration_date) || addDays(7));
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
              (scope) => ({ name: inclusionText(scope), removed: false, deduction: "", fromPackage: true })
            )
          );
          // A bespoke setup has no catalog price to start from: the admin
          // prices the design, so the baseline is left for them to enter.
          setStartingPrice("");
        } else {
          setPackageName(packageRecord?.name || "Custom Package");
          setInclusions(
            (Array.isArray(packageRecord?.inclusions) ? packageRecord.inclusions : []).map(
              (entry) => ({ name: inclusionText(entry), removed: false, deduction: "", fromPackage: true })
            )
          );
          const derived = derivePackageStartingPrice(inquiry, guests);
          setStartingPrice(derived ? String(derived) : "");
        }

        // The dishes the customer actually chose, seeded with the catalog rate
        // so the admin adjusts a real number rather than typing one from
        // nothing. A customer who declined catering gets no food lines at all,
        // so no food charge can reach a booking that did not ask for it.
        setMenuItems(
          detailsFromInquiry.include_food === false ||
            detailsFromInquiry.service_type === SERVICE_TYPES.SETUP_ONLY
            ? []
            : (Array.isArray(inquiry?.selected_menu) ? inquiry.selected_menu : []).map((item) => {
                if (item && typeof item === "object") {
                  return {
                    name: item.name || "",
                    note: item.category || item.note || "",
                    price: item.price ? String(item.price) : "",
                  };
                }
                return { name: String(item || ""), note: "", price: "" };
              })
        );

        setAddOns(
          (Array.isArray(inquiry?.service_items) ? inquiry.service_items : []).map((item) => {
            if (item && typeof item === "object") {
              return {
                name: item.name || "",
                price: item.price ? String(item.price) : "",
                quantity: item.quantity || 1,
                pricing_type: item.pricing_type || (Number(item.quantity) > 1 ? "quantity" : "fixed"),
              };
            }
            return { name: String(item || ""), price: "", quantity: 1, pricing_type: "fixed" };
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

  // Food lines only count when this quotation actually carries catering, so
  // toggling catering off cannot leave a priced dish in the total.
  const chargeableMenuItems = useMemo(
    () => (cateringIncluded ? menuItems : []),
    [cateringIncluded, menuItems]
  );

  // Add-ons the admin has parked stay on screen but never reach a total or the
  // saved quotation, so restoring one costs nothing and changes nothing.
  const chargeableAddOns = useMemo(() => addOns.filter((item) => !item.removed), [addOns]);

  const pricingInput = useMemo(
    () => ({
      package_starting_price: startingPrice,
      removed_inclusions: removedInclusions,
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

  const quotationPayload = useMemo(
    () => ({
      inquiry_id: inquiry?._id,
      package_id: packageRecord?._id || inquiry?.package_id || undefined,
      package_name: packageName || "Custom Package",
      package_starting_price: totals.startingPrice,
      package_price: totals.packagePrice,
      package_inclusions: keptInclusions,
      removed_inclusions: removedInclusions.filter((entry) => entry.name),
      guest_count: totals.guestCount,
      menu_items: chargeableMenuItems.map((item) => ({
        name: String(item.name || "").trim(),
        note: String(item.note || "").trim(),
        price: money(item.price),
      })),
      add_ons: chargeableAddOns.map((item) => ({
        name: String(item.name || "").trim(),
        price: money(item.price),
        quantity: addOnQuantityOf(item),
        pricing_type: item.pricing_type || "fixed",
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
    if (cateringIncluded && menuItems.length === 0) {
      notes.push(
        customerSelection.dishes.length > 0
          ? `The customer picked ${customerSelection.dishes.length} dish${
              customerSelection.dishes.length === 1 ? "" : "es"
            }, but none are on this quotation. Add them back or confirm the catering is being dropped.`
          : "This booking includes catering, but no dishes are quoted yet."
      );
    }
    if (unresolvedDishes > 0) {
      notes.push(
        `${unresolvedDishes} of the customer's chosen dishes could not be loaded from the menu catalog, most likely because they were deleted. Check the booking before quoting.`
      );
    }
    const capacityMax = Number(packageRecord?.guest_max) || 0;
    const capacityMin = Number(packageRecord?.guest_min) || 0;
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
    menuItems.length,
    customerSelection.dishes.length,
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
      found.guest_count = "Enter the number of guests. Menu pricing is calculated per guest.";
    if (!details.municipality) found.municipality = "Choose the municipality of the venue.";
    if (!details.barangay) found.barangay = "Choose the barangay of the venue.";

    if (!String(packageName || "").trim())
      found.package_name = "This quotation has no package name.";

    inclusions.forEach((entry, index) => {
      if (!String(entry.name || "").trim())
        found[`inclusions.${index}.name`] = "Name this inclusion or delete the line.";
      if (entry.removed && isBlankAmount(entry.deduction))
        found[`inclusions.${index}.deduction`] =
          "Enter how much removing this takes off the starting price. Enter 0 if it does not change the price.";
    });

    if (totals.inclusionDeductions > totals.startingPrice) {
      found.removed_inclusions = `Deductions of ${formatCurrency(
        totals.inclusionDeductions
      )} are more than the starting price of ${formatCurrency(
        totals.startingPrice
      )}. Lower the deductions or raise the starting price.`;
    }

    // Only the dishes actually being quoted. With catering switched off the
    // menu section is hidden, so validating rows behind it would block the
    // send on fields the admin cannot see or fix.
    chargeableMenuItems.forEach((item, index) => {
      if (!String(item.name || "").trim())
        found[`menu_items.${index}.name`] = "Name this dish or remove the line.";
      // A blank price here is multiplied by the guest count, so it is the most
      // expensive field in the form to leave unanswered.
      if (isBlankAmount(item.price))
        found[`menu_items.${index}.price`] =
          "Set the per guest price for this dish. Enter 0 to include it at no charge.";
    });

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

  /* --- Inclusion handlers ------------------------------------------------- */

  const handleAddInclusion = () => {
    const name = String(newInclusion || "").trim();
    if (!name) return;
    setInclusions((prev) => [...prev, { name, removed: false, deduction: "", fromPackage: false }]);
    setNewInclusion("");
  };

  const handleInclusionName = (index, name) => {
    setInclusions((prev) => prev.map((entry, i) => (i === index ? { ...entry, name } : entry)));
    clearError(`inclusions.${index}.name`);
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
    setMenuItems((prev) => [
      ...prev,
      { name: found.name, price: found.price ? String(found.price) : "", note: found.category || "" },
    ]);
    setSelectedCatalogDish("");
  };

  const handleMenuChange = (index, field, value) => {
    setMenuItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === "price" ? nonNegative(value) : value } : item
      )
    );
    clearError(`menu_items.${index}.${field}`);
  };

  const handleRemoveMenuItem = (index) =>
    setMenuItems((prev) => prev.filter((_, i) => i !== index));

  /* --- Add-on handlers ---------------------------------------------------- */

  const handleAddCatalogAddon = () => {
    const found = catalogAddons.find((addon) => addon._id === selectedCatalogAddon);
    if (!found) return;
    // The catalog carries the name and how the add-on is charged. The price is
    // quoted per event, so the admin sets it on this line.
    setAddOns((prev) => [
      ...prev,
      { name: found.name, price: "", quantity: 1, pricing_type: found.pricing_type || "fixed" },
    ]);
    setSelectedCatalogAddon("");
  };

  const handleAddOnChange = (index, field, value) => {
    setAddOns((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "price") return { ...item, price: nonNegative(value) };
        if (field === "quantity") return { ...item, quantity: Math.max(1, Number(nonNegative(value)) || 1) };
        if (field === "pricing_type")
          return { ...item, pricing_type: value, quantity: value === "fixed" ? 1 : item.quantity || 1 };
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
      className="max-w-7xl w-[96vw] h-[90vh]"
    >
      <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4 overflow-hidden lg:flex-row lg:gap-6">
        {/* ------------------------------------------------------------------
            Left column: the quotation, in the order it is built
        ------------------------------------------------------------------ */}
        <div ref={formRef} className="flex-1 space-y-4 overflow-y-auto pb-10 pr-1 lg:pr-3">
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
                    onChange={(e) => setDetail("service_type", e.target.value)}
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
                  hint="Menu pricing is charged per guest."
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
            inquiry.event_theme ||
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {inquiry.event_theme && (
                    <div>
                      <span className={LABEL_CLASS}>Theme</span>
                      <span className="font-semibold text-slate-900">{inquiry.event_theme}</span>
                    </div>
                  )}
                  {Array.isArray(inquiry.event_palette) && inquiry.event_palette.length > 0 && (
                    <div>
                      <span className={LABEL_CLASS}>Palette</span>
                      <span className="font-semibold text-slate-900">
                        {inquiry.event_palette.join(", ")}
                      </span>
                    </div>
                  )}
                  {inquiry.budget_range && (
                    <div>
                      <span className={LABEL_CLASS}>Customer budget</span>
                      <span className="font-semibold text-slate-900">{inquiry.budget_range}</span>
                    </div>
                  )}
                </div>

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
          <SectionCard
            step={2}
            icon={Package}
            title="Package and starting price"
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
                label="Starting price"
                required
                error={errors.package_starting_price}
                hint={
                  totals.startingPrice > 0
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
                <span className="font-semibold text-slate-900">
                  Adjusted package price
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
            icon={Check}
            title="Package inclusions"
            description="Remove what the customer is not getting and state what each removal takes off the starting price."
            aside={
              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                {keptInclusions.length} kept, {removedInclusions.length} removed
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
              <ul className="space-y-2">
                {inclusions.map((entry, index) => (
                  <li
                    key={index}
                    className={`rounded-lg border p-2.5 transition-colors ${
                      entry.removed
                        ? "border-emerald-200 bg-emerald-50/50"
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
                          id={`qb-inclusions.${index}.name`}
                          type="text"
                          value={entry.name}
                          onChange={(e) => handleInclusionName(index, e.target.value)}
                          placeholder="Inclusion description"
                          className={`${inputClass(errors[`inclusions.${index}.name`])} py-1.5 text-xs ${
                            entry.removed ? "line-through decoration-slate-400" : ""
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">
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

                    {(errors[`inclusions.${index}.name`] || errors[`inclusions.${index}.deduction`]) && (
                      <p className="mt-1.5 flex items-start gap-1 pl-3.5 text-[11.5px] font-medium leading-snug text-red-700">
                        <AlertCircle size={12} className="mt-[2px] shrink-0" />
                        {errors[`inclusions.${index}.name`] || errors[`inclusions.${index}.deduction`]}
                      </p>
                    )}

                    {entry.removed && !errors[`inclusions.${index}.deduction`] && (
                      <p className="mt-1.5 pl-3.5 text-[11.5px] text-emerald-700">
                        Removed from the package. {formatCurrency(numberOf(entry.deduction))} comes off the
                        starting price.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
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
              icon={cateringIncluded ? Utensils : UtensilsCrossed}
              title="Menu"
              description={
                cateringIncluded
                  ? "Dishes are priced per guest and multiplied by the guest count above."
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
                className={`mb-3 flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${
                  cateringIncluded
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
                  {customerSelection.wantedFood ? (
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
                  onClick={() => setMenuItems((prev) => [...prev, { name: "", price: "", note: "" }])}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus size={13} /> Custom dish
                </button>
              </div>

              {menuItems.length === 0 ? (
                <p className="py-3 text-center text-xs italic text-slate-500">
                  No dishes on this quotation yet. Add the ones this event covers so they can be
                  priced per guest.
                </p>
              ) : (
                <ul className="space-y-2">
                  {menuItems.map((item, index) => (
                    <li key={index} className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            id={`qb-menu_items.${index}.name`}
                            type="text"
                            value={item.name}
                            onChange={(e) => handleMenuChange(index, "name", e.target.value)}
                            placeholder="Dish name"
                            className={`${inputClass(errors[`menu_items.${index}.name`])} py-1.5 text-xs font-semibold`}
                          />
                          <input
                            type="text"
                            value={item.note || ""}
                            onChange={(e) => handleMenuChange(index, "note", e.target.value)}
                            placeholder="Note or category (optional)"
                            className={`${inputClass(false)} py-1.5 text-xs`}
                          />
                        </div>

                        <div className="flex items-center gap-3 lg:shrink-0">
                          <div className="w-32">
                            <MoneyInput
                              id={`qb-menu_items.${index}.price`}
                              value={item.price}
                              placeholder="Per pax"
                              error={errors[`menu_items.${index}.price`]}
                              onChange={(value) => handleMenuChange(index, "price", value)}
                              className="py-1.5 text-xs"
                            />
                          </div>
                          <div className="min-w-[104px] text-right">
                            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              {totals.guestCount} pax
                            </span>
                            <span className="text-xs font-bold tabular-nums text-slate-800">
                              {formatCurrency(money(item.price) * totals.guestCount)}
                            </span>
                          </div>
                          <RowAction
                            onClick={() => handleRemoveMenuItem(index)}
                            icon={Trash2}
                            label="Remove"
                            title="Remove this dish from the quotation"
                          />
                        </div>
                      </div>
                      {(errors[`menu_items.${index}.name`] || errors[`menu_items.${index}.price`]) && (
                        <p className="mt-1.5 flex items-start gap-1 text-[11.5px] font-medium text-red-700">
                          <AlertCircle size={12} className="mt-[2px] shrink-0" />
                          {errors[`menu_items.${index}.name`] || errors[`menu_items.${index}.price`]}
                        </p>
                      )}
                    </li>
                  ))}
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
              icon={Sparkles}
              title="Add-ons and services"
              description="The catalog holds the add-on names. The price is what you quote for this event."
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
                      {addon.name} ({addon.pricing_type === "quantity" ? "Quantity based" : "Fixed"})
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
                    setAddOns((prev) => [...prev, { name: "", price: "", quantity: 1, pricing_type: "fixed" }])
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
                    const isFixed = item.pricing_type === "fixed";
                    const rowError =
                      errors[`add_ons.${index}.name`] ||
                      errors[`add_ons.${index}.price`] ||
                      errors[`add_ons.${index}.quantity`];
                    return (
                      <li
                        key={index}
                        className={`rounded-lg border p-2.5 transition-colors ${
                          item.removed ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                              id={`qb-add_ons.${index}.name`}
                              type="text"
                              value={item.name}
                              disabled={item.removed}
                              onChange={(e) => handleAddOnChange(index, "name", e.target.value)}
                              placeholder="Add-on or service name"
                              className={`${inputClass(errors[`add_ons.${index}.name`])} py-1.5 text-xs font-semibold ${
                                item.removed ? "line-through decoration-slate-400" : ""
                              }`}
                            />
                            <select
                              value={item.pricing_type || "fixed"}
                              disabled={item.removed}
                              onChange={(e) => handleAddOnChange(index, "pricing_type", e.target.value)}
                              className={`${inputClass(false)} py-1.5 text-xs`}
                            >
                              <option value="fixed">Fixed, charged once</option>
                              <option value="quantity">Quantity based, price per unit</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-3 lg:shrink-0">
                            {isFixed ? (
                              <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">
                                1x
                              </span>
                            ) : (
                              <input
                                id={`qb-add_ons.${index}.quantity`}
                                type="number"
                                min="1"
                                disabled={item.removed}
                                value={item.quantity}
                                onChange={(e) => handleAddOnChange(index, "quantity", e.target.value)}
                                className={`${inputClass(errors[`add_ons.${index}.quantity`])} w-20 py-1.5 text-xs font-semibold tabular-nums`}
                              />
                            )}

                            <div className="w-32">
                              <MoneyInput
                                id={`qb-add_ons.${index}.price`}
                                value={item.price}
                                disabled={item.removed}
                                placeholder={isFixed ? "Quoted price" : "Unit price"}
                                error={errors[`add_ons.${index}.price`]}
                                onChange={(value) => handleAddOnChange(index, "price", value)}
                                className="py-1.5 text-xs"
                              />
                            </div>

                            <div className="min-w-[104px] text-right">
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Line total
                              </span>
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  item.removed ? "text-slate-400 line-through" : "text-slate-800"
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
                hint="After this date the customer can no longer accept it."
                htmlFor="qb-expiration_date"
              >
                <input
                  id="qb-expiration_date"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => {
                    setExpirationDate(e.target.value);
                    clearError("expiration_date");
                  }}
                  className={inputClass(errors.expiration_date)}
                />
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
                  detail={`(${chargeableMenuItems.length} at ${totals.guestCount} pax)`}
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
                            className={`ml-1.5 ${
                              change.kind === "removed" ? "text-emerald-300" : "text-slate-200"
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
