import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Palette,
  User,
  Utensils,
  Truck,
  Users,
  Loader2,
  Lock,
  Package as PackageIcon,
  Boxes,
  DollarSign,
  X,
  Minus,
  Plus,
  Ruler,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Phone,
  Mail,
  Clock,
  FileText,
  HeartHandshake,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  TInput,
  TSelect,
  TTextarea,
  GuestCounter,
} from "../../pages/customer/booking/components/BookingSharedUI";
import ThemePicker, { ColorPalettePicker } from "../../pages/customer/booking/components/ThemePicker";
import CourseFilterBar from "../../pages/customer/booking/components/CourseFilterBar";
import {
  VENUE_TYPES,
  OTHER_VENUE_TYPE,
  isCustomVenueType,
  contactFieldError,
  SERVICE_TYPES,
} from "../../pages/customer/booking/lib/bookingRules";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../lib/eventTypes";
import { getBatangasMunicipalities, getBatangasBarangays, BATANGAS_PROVINCE } from "../../utils/batangas";
import { eventSpaceLabel } from "../../lib/packageDisplay";
import {
  offerFoodByCategory,
  offerFoodForDisplay,
  offerCourseRequirement,
  offerInclusions,
  offerPricePerPax,
  offerBaseFoodPrice,
} from "../../lib/specialOffers";
import { resolveGroup, CATEGORY_GROUPS } from "../../lib/menuCategories";
import { formatCurrency } from "../../utils/format";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { cn } from "@/lib/utils";

// --- Section Definitions for Progressive Disclosure ---
const SECTIONS = [
  {
    id: "package-food",
    number: "01",
    label: "Package & Food",
    shortLabel: "Package & Food",
    icon: PackageIcon,
    description: "Package details, setup space, and dish selections.",
  },
  {
    id: "event",
    number: "02",
    label: "Event Details",
    shortLabel: "Event Details",
    icon: CalendarDays,
    description: "Schedule, guest count, celebrant, and venue location.",
  },
  {
    id: "extras",
    number: "03",
    label: "Extras & Requests",
    shortLabel: "Extras & Requests",
    icon: Sparkles,
    description: "Add-on services, event theme, palette, and special notes.",
  },
  {
    id: "contact",
    number: "04",
    label: "Contact Information",
    shortLabel: "Contact Info",
    icon: User,
    description: "Primary contact details for quotation and updates.",
  },
];

const SECTION_ERROR_FIELDS = {
  "package-food": ["selected_menu", "offer_food_snapshot"],
  event: [
    "celebrant_name",
    "event_type",
    "event_date",
    "start_time",
    "guest_count",
    "municipality",
    "barangay",
  ],
  extras: [],
  contact: [
    "contact_first_name",
    "contact_last_name",
    "contact_email",
    "contact_phone",
    "contact_alt_phone",
  ],
};

/** Subtle lock indicator for immutable booking attributes */
function LockedBadge({ label = "As submitted" }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
      <Lock className="h-3 w-3 text-slate-400" />
      <span>{label}</span>
    </span>
  );
}

/** Removable chip for chosen dish */
function PickChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/90 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-blue-900 shadow-2xs">
      <span className="truncate max-w-[140px]">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-4 w-4 items-center justify-center rounded text-blue-700 hover:bg-blue-200 hover:text-blue-900 cursor-pointer transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/** Quantity stepper for add-ons */
function QuantityStepper({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
        aria-label="Decrease quantity"
        className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-7 text-center text-xs font-bold tabular-nums text-slate-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

const CUSTOMER_SERVICE_OPTIONS = [
  {
    value: SERVICE_TYPES.FULL_SERVICE,
    label: "Food Catering & Event Setup (Full Service)",
  },
  {
    value: SERVICE_TYPES.FOOD_ONLY,
    label: "Food Catering Only (Buffet / Packed)",
  },
  {
    value: SERVICE_TYPES.SETUP_ONLY,
    label: "Event Setup & Styling Only (No Food Catering)",
  },
];

/**
 * Customer-friendly form field wrapper with high-contrast labels,
 * prominent required indicators, accessible helper text, and clear error states.
 */
function FormField({
  label,
  required = false,
  optional = false,
  hint,
  error,
  children,
  className = "",
  htmlFor,
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "transition-colors",
                required ? "font-bold text-slate-900" : "font-medium text-slate-700",
              )}
            >
              {label}
            </span>
            {required && (
              <span
                className="font-bold text-red-500 text-xs leading-none"
                title="Required field"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </span>
          {optional && (
            <span className="text-[11px] font-normal tracking-normal text-slate-500">
              (optional)
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 leading-normal mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "Not set";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formFromInquiry(inquiry) {
  const rawEventType = inquiry?.event_type || "";
  const eventTypeIsOther = isOtherEventType(rawEventType);
  const rawVenueType = inquiry?.venue_type || "";
  const venueTypeIsOther = isCustomVenueType({ venue_type: rawVenueType });

  return {
    event_type: eventTypeIsOther ? OTHER_EVENT_TYPE : matchEventType(rawEventType) || rawEventType,
    event_type_other: eventTypeIsOther ? rawEventType : "",
    booking_for: inquiry?.booking_for || "myself",
    celebrant_name: inquiry?.celebrant_name || "",
    event_date: toDateInputValue(inquiry?.event_date),
    start_time: inquiry?.start_time || "",
    duration_hours: inquiry?.duration_hours ?? "",
    guest_count: inquiry?.guest_count ?? "",
    service_type: inquiry?.service_type || SERVICE_TYPES.FULL_SERVICE,
    venue_type: venueTypeIsOther ? OTHER_VENUE_TYPE : rawVenueType,
    venue_type_other: venueTypeIsOther ? rawVenueType : "",
    province: inquiry?.province || BATANGAS_PROVINCE,
    municipality: inquiry?.municipality || "",
    barangay: inquiry?.barangay || "",
    street: inquiry?.street || "",
    landmark: inquiry?.landmark || "",
    zip_code: inquiry?.zip_code || "",
    event_theme: inquiry?.event_theme || "",
    event_palette: inquiry?.event_palette || [],
    special_requests: inquiry?.special_requests || "",
    allergies: inquiry?.allergies || "",
    dietary_restrictions: inquiry?.dietary_restrictions || "",
    delivery_method:
      inquiry?.delivery_method ||
      (inquiry?.service_type === SERVICE_TYPES.FOOD_ONLY ? "delivery" : "setup"),
    delivery_instructions: inquiry?.delivery_instructions || "",
    contact_first_name: inquiry?.contact_first_name || "",
    contact_last_name: inquiry?.contact_last_name || "",
    contact_email: inquiry?.contact_email || "",
    contact_phone: inquiry?.contact_phone || "",
    contact_alt_phone: inquiry?.contact_alt_phone || "",

    selected_menu: Array.isArray(inquiry?.selected_menu)
      ? inquiry.selected_menu.filter((item) => item && typeof item === "object")
      : [],
    service_items: Array.isArray(inquiry?.service_items)
      ? inquiry.service_items.map((item) => ({
          name: item?.name || "",
          description: item?.description || "",
          price: Number(item?.price) || 0,
          quantity: Math.max(1, Number(item?.quantity) || 1),
        }))
      : [],
    offer_food_snapshot: Array.isArray(inquiry?.offer_food_snapshot)
      ? inquiry.offer_food_snapshot.map((entry) => ({
          menu_category: entry?.menu_category || "",
          item_name: entry?.item_name || "",
        }))
      : [],
    selected_scaffold_option_id: inquiry?.selected_scaffold_option_id || "",
    custom_setup_scope: Array.isArray(inquiry?.custom_setup_scope)
      ? inquiry.custom_setup_scope
      : [],
    custom_setup_notes: inquiry?.custom_setup_notes || "",
    budget_range: inquiry?.budget_range || "",
  };
}

export default function CustomerInquiryEditModal({ open, isOpen, inquiry, onClose, onSaved }) {
  const showModal = Boolean(open ?? isOpen);
  const { notify } = useToast();

  const [activeSection, setActiveSection] = useState("package-food");
  const [form, setForm] = useState(() => formFromInquiry(inquiry));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  // Catalogues
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [addonCatalog, setAddonCatalog] = useState([]);
  const [packageRecord, setPackageRecord] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [dishQuery, setDishQuery] = useState("");
  const [activeCourseTab, setActiveCourseTab] = useState("all");
  const [addonCategoryFilter, setAddonCategoryFilter] = useState("all");
  const [addonSearchQuery, setAddonSearchQuery] = useState("");

  useEffect(() => {
    if (showModal) {
      setForm(formFromInquiry(inquiry));
      setErrors({});
      setTouched({});
      setDishQuery("");
      setActiveCourseTab("all");
      setActiveSection("package-food");
      setAddonCategoryFilter("all");
      setAddonSearchQuery("");
    }
  }, [showModal, inquiry]);

  useEffect(() => {
    if (!showModal || !inquiry) return;
    let alive = true;

    const packageId =
      inquiry.package_id && typeof inquiry.package_id === "object"
        ? inquiry.package_id._id
        : inquiry.package_id;

    setLoadingCatalog(true);
    Promise.allSettled([
      CustomerAPI.getMenu(),
      CustomerAPI.getAddons(),
      packageId ? CustomerAPI.getPackageById(packageId) : Promise.resolve(null),
    ])
      .then(([menuRes, addonRes, packageRes]) => {
        if (!alive) return;
        setMenuCatalog(menuRes.status === "fulfilled" ? menuRes.value?.data || [] : []);
        setAddonCatalog(addonRes.status === "fulfilled" ? addonRes.value?.data || [] : []);
        setPackageRecord(
          packageRes.status === "fulfilled" ? packageRes.value?.data || null : null,
        );
      })
      .finally(() => {
        if (alive) setLoadingCatalog(false);
      });

    return () => {
      alive = false;
    };
  }, [showModal, inquiry]);

  const isOffer = inquiry?.booking_type === "special";
  const isCustomBooking = inquiry?.booking_type === "custom";
  const showDelivery = isCustomBooking && form.service_type === SERVICE_TYPES.FOOD_ONLY;
  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(() => getBatangasBarangays(form.municipality), [form.municipality]);

  const submittedPackage =
    inquiry?.package_id && typeof inquiry.package_id === "object" ? inquiry.package_id : null;
  const activePackage = packageRecord || submittedPackage;
  const packageName = activePackage?.name || inquiry?.package_name_snapshot || "";
  const eventSpace = inquiry ? eventSpaceLabel(inquiry, activePackage) : "";
  const inventoryItems = Array.isArray(inquiry?.inventory_items) ? inquiry.inventory_items : [];
  const addOnLabel = (item) =>
    Number(item.quantity) > 1 ? `${item.name} × ${item.quantity}` : item.name;
  const includesFood = inquiry?.include_food !== false;

  // Dishes grouped & filtered
  const groupedDishes = useMemo(() => {
    const byId = new Map();
    (menuCatalog || []).forEach((item) => {
      const group = resolveGroup(item?.category);
      if (!byId.has(group.id)) byId.set(group.id, { ...group, items: [] });
      byId.get(group.id).items.push(item);
    });
    const order = CATEGORY_GROUPS.map((group) => group.id);
    return [...byId.values()].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [menuCatalog]);

  const selectedCountsByGroup = useMemo(() => {
    const counts = {};
    (form.selected_menu || []).forEach((dish) => {
      const group = resolveGroup(dish?.category);
      counts[group.id] = (counts[group.id] || 0) + 1;
    });
    return counts;
  }, [form.selected_menu]);

  const filteredDishes = useMemo(() => {
    const q = dishQuery.trim().toLowerCase();
    return groupedDishes
      .filter((group) => activeCourseTab === "all" || group.id === activeCourseTab)
      .map((group) => {
        const matchingItems = q
          ? group.items.filter(
              (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q),
            )
          : group.items;
        return { ...group, items: matchingItems };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedDishes, activeCourseTab, dishQuery]);

  const isDishChosen = (item) =>
    (form.selected_menu || []).some((chosen) => String(chosen._id) === String(item._id));

  const toggleDish = (item) =>
    setForm((prev) => {
      const current = prev.selected_menu || [];
      const already = current.some((chosen) => String(chosen._id) === String(item._id));
      return {
        ...prev,
        selected_menu: already
          ? current.filter((chosen) => String(chosen._id) !== String(item._id))
          : [...current, item],
      };
    });

  // Add-ons list
  /**
   * Every add-on that can be on this request: the package's own, the general
   * catalogue, and anything already on the request that is neither.
   */
  const addOnChoices = useMemo(() => {
    const seen = new Set();
    const choices = [];
    const push = (name, description, price, source, pricingType) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      choices.push({
        name,
        description: description || "",
        price: Number(price) || 0,
        source,
        pricing_type: pricingType || (Number(price) > 0 ? "fixed" : "quotation"),
      });
    };

    (Array.isArray(activePackage?.add_ons) ? activePackage.add_ons : []).forEach((addOn) =>
      push(
        addOn?.name,
        addOn?.qty ? `Package add-on (${addOn.qty})` : "Package add-on",
        addOn?.price || 0,
        "package",
        addOn?.pricing_type || (addOn?.qty ? "quantity" : "fixed"),
      ),
    );
    (Array.isArray(addonCatalog) ? addonCatalog : [])
      .filter((addOn) => addOn?.available !== false)
      .forEach((addOn) =>
        push(addOn?.name, addOn?.description, addOn?.price, "catalog", addOn?.pricing_type),
      );
    (form.service_items || []).forEach((item) =>
      push(item?.name, item?.description, item?.price, "existing", item?.pricing_type),
    );

    return choices;
  }, [activePackage, addonCatalog, form.service_items]);

  const addOnQuantity = (name) =>
    (form.service_items || []).find(
      (item) => String(item.name || "").toLowerCase() === String(name || "").toLowerCase(),
    )?.quantity || 0;

  const setAddOnQuantity = (choice, quantity) =>
    setForm((prev) => {
      const current = prev.service_items || [];
      const index = current.findIndex(
        (item) => String(item.name || "").toLowerCase() === String(choice.name || "").toLowerCase(),
      );
      const next = [...current];
      if (quantity <= 0) {
        if (index >= 0) next.splice(index, 1);
      } else if (index >= 0) {
        next[index] = { ...next[index], quantity };
      } else {
        next.push({
          name: choice.name,
          description: choice.description,
          price: choice.price,
          quantity,
        });
      }
      return { ...prev, service_items: next };
    });

  // Category resolver for grouping services into logical clusters
  const getAddonCategory = (choice) => {
    if (choice.source === "package") {
      return { id: "package", label: "Package Add-ons", icon: PackageIcon };
    }
    const text = `${choice.name || ""} ${choice.description || ""}`.toLowerCase();

    if (/videoke|sound|light|host|clown|dj|band|music|speaker|mic|entertainment|emcee|projector|audio|visual/i.test(text)) {
      return { id: "entertainment", label: "Entertainment & Sound", icon: Sparkles };
    }
    if (/standee|decor|backdrop|drape|arch|entourage|styling|carpet|flower|centerpiece|theme|balloon/i.test(text)) {
      return { id: "styling", label: "Event Styling & Décor", icon: Palette };
    }
    if (/candy|pica|cake|wine|station|grazing|dessert|coffee|food|drink|beverage|snack/i.test(text)) {
      return { id: "stations", label: "Stations & Treats", icon: Utensils };
    }
    if (/chair|table|tent|fan|cooler|generator|equipment|monoblock|tiffany|linens|furniture/i.test(text)) {
      return { id: "equipment", label: "Equipment & Rentals", icon: Boxes };
    }
    return { id: "specialty", label: "Specialty Services", icon: Sparkles };
  };

  // Helper to determine if an add-on has variable quantities or is a single service
  const isQuantityRelevant = (choice) => {
    if (choice.pricing_type === "quantity") return true;
    if (choice.pricing_type === "fixed") return false;
    if (choice.isQuantity) return true;
    if (Number(choice.quantity) > 1) return true;
    const name = (choice.name || "").toLowerCase();
    return /chair|table|fan|light|par|standee|tent|cooler|set|piece|unit|glass|plate|warmer|monoblock|tiffany/i.test(name);
  };

  const availableAddonCategories = useMemo(() => {
    const map = new Map();
    addOnChoices.forEach((choice) => {
      const cat = getAddonCategory(choice);
      if (!map.has(cat.id)) {
        map.set(cat.id, { ...cat, count: 0 });
      }
      map.get(cat.id).count += 1;
    });
    return [...map.values()];
  }, [addOnChoices]);

  const groupedFilteredAddons = useMemo(() => {
    const q = addonSearchQuery.trim().toLowerCase();
    const matchesQuery = (choice) =>
      !q ||
      choice.name?.toLowerCase().includes(q) ||
      choice.description?.toLowerCase().includes(q);

    const groups = new Map();
    addOnChoices.forEach((choice) => {
      if (!matchesQuery(choice)) return;
      const cat = getAddonCategory(choice);
      if (addonCategoryFilter !== "all" && cat.id !== addonCategoryFilter) return;

      if (!groups.has(cat.id)) {
        groups.set(cat.id, { ...cat, items: [] });
      }
      groups.get(cat.id).items.push(choice);
    });

    return [...groups.values()];
  }, [addOnChoices, addonCategoryFilter, addonSearchQuery]);

  const selectedAddonStats = useMemo(() => {
    let fixedCount = 0;
    let fixedTotal = 0;
    let quotationCount = 0;

    (form.service_items || []).forEach((item) => {
      const price = Number(item.price) || 0;
      const qty = Math.max(1, Number(item.quantity) || 1);
      if (price > 0) {
        fixedCount += 1;
        fixedTotal += price * qty;
      } else {
        quotationCount += 1;
      }
    });

    return {
      totalCount: (form.service_items || []).length,
      fixedCount,
      fixedTotal,
      quotationCount,
    };
  }, [form.service_items]);

  // Special Offer combo courses
  const offerCourses = useMemo(
    () => (isOffer ? offerFoodByCategory(activePackage) : []),
    [isOffer, activePackage],
  );

  const chosenForCourse = (category) =>
    (form.offer_food_snapshot || []).filter(
      (entry) => (entry.menu_category || "Included") === category,
    );

  const toggleCourseDish = (category, itemName, required) =>
    setForm((prev) => {
      const current = prev.offer_food_snapshot || [];
      const inCourse = current.filter(
        (entry) => (entry.menu_category || "Included") === category,
      );
      const others = current.filter(
        (entry) => (entry.menu_category || "Included") !== category,
      );
      const already = inCourse.some((entry) => entry.item_name === itemName);

      let nextInCourse;
      if (already) {
        nextInCourse = inCourse.filter((entry) => entry.item_name !== itemName);
      } else if (required === 1) {
        nextInCourse = [{ menu_category: category, item_name: itemName }];
      } else if (inCourse.length < required) {
        nextInCourse = [...inCourse, { menu_category: category, item_name: itemName }];
      } else {
        nextInCourse = [...inCourse.slice(1), { menu_category: category, item_name: itemName }];
      }

      return { ...prev, offer_food_snapshot: [...others, ...nextInCourse] };
    });

  const scaffoldOptions = Array.isArray(activePackage?.scaffold_size_options)
    ? activePackage.scaffold_size_options
    : [];
  const isVenueTypeOther = form.venue_type === OTHER_VENUE_TYPE;
  const isPickup = showDelivery && form.delivery_method === "pickup";

  const errorFor = (field) => errors[field] || (touched[field] ? contactFieldError(field, form[field]) : "");
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const handlePhoneChange = (field, raw) => setForm((prev) => ({ ...prev, [field]: sanitizePhone(raw) }));
  const primaryPhoneFilled = !!form.contact_phone?.trim();

  // Validate form
  const validate = () => {
    const next = {};
    if (form.booking_for === "someone_else" && !form.celebrant_name?.trim()) {
      next.celebrant_name = "Enter the celebrant or honoree's name.";
    }
    if (!form.event_type || (form.event_type === OTHER_EVENT_TYPE && !form.event_type_other.trim())) {
      next.event_type = "Select or describe your event type.";
    }
    if (!form.event_date) next.event_date = "Pick your event date.";
    if (!form.start_time) next.start_time = "Pick a start time.";
    if (!isOffer && (!form.guest_count || Number(form.guest_count) <= 0)) {
      next.guest_count = "Enter your guest count.";
    }
    if (!isPickup) {
      if (!form.municipality) next.municipality = "Choose the municipality of the venue.";
      if (!form.barangay) next.barangay = "Choose the barangay of the venue.";
    }

    if (
      !isOffer &&
      form.service_type === SERVICE_TYPES.FOOD_ONLY &&
      (form.selected_menu || []).length === 0
    ) {
      next.selected_menu = "Choose at least one dish, or message us to cancel this request.";
    }

    if (isOffer) {
      const unanswered = offerCourses
        .filter(
          (course) =>
            course.items.length > 1 &&
            chosenForCourse(course.category).length < offerCourseRequirement(course.category),
        )
        .map((course) => course.category);
      if (unanswered.length > 0) {
        next.offer_food_snapshot = `Choose your dish for: ${unanswered.join(", ")}.`;
      }
    }

    ["contact_first_name", "contact_last_name", "contact_email", "contact_phone"].forEach((field) => {
      const err = contactFieldError(field, form[field]);
      if (err) next[field] = err;
    });

    setErrors(next);
    return next;
  };

  const hasSectionError = (sectionId, currentErrors = errors) => {
    const fields = SECTION_ERROR_FIELDS[sectionId] || [];
    return fields.some((field) => Boolean(currentErrors[field]));
  };

  const handleSubmit = async () => {
    setTouched((prev) => ({
      ...prev,
      contact_first_name: true,
      contact_last_name: true,
      contact_email: true,
      contact_phone: true,
    }));

    const validationErrors = validate();
    const hasErrors = Object.keys(validationErrors).length > 0;

    if (hasErrors) {
      // Find the first section with an error and jump to it
      const firstFaulty = SECTIONS.find((s) => hasSectionError(s.id, validationErrors));
      if (firstFaulty) {
        setActiveSection(firstFaulty.id);
        notify(`Please fix the highlighted fields in ${firstFaulty.shortLabel}.`, "error");
      } else {
        notify("Please fix the highlighted fields.", "error");
      }
      return;
    }

    const payload = {
      event_type: form.event_type === OTHER_EVENT_TYPE ? form.event_type_other.trim() : form.event_type,
      booking_for: form.booking_for || "myself",
      celebrant_name: form.booking_for === "someone_else" ? form.celebrant_name.trim() : "",
      event_date: form.event_date,
      start_time: form.start_time,
      venue_type: form.venue_type === OTHER_VENUE_TYPE ? form.venue_type_other.trim() : form.venue_type,
      province: form.province,
      municipality: isPickup ? "" : form.municipality,
      barangay: isPickup ? "" : form.barangay,
      street: form.street,
      landmark: form.landmark,
      zip_code: form.zip_code,
      event_theme: form.event_theme,
      event_palette: form.event_palette,
      special_requests: form.special_requests,
      allergies: form.allergies,
      dietary_restrictions: form.dietary_restrictions,
      contact_first_name: form.contact_first_name.trim(),
      contact_last_name: form.contact_last_name.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone,
      contact_alt_phone: form.contact_alt_phone,
    };

    if (form.duration_hours !== "") payload.duration_hours = Number(form.duration_hours);
    if (!isOffer) {
      payload.guest_count = Number(form.guest_count);
      payload.service_type = form.service_type;
    }
    if (showDelivery) {
      payload.delivery_method = form.delivery_method;
      payload.delivery_instructions = form.delivery_instructions;
    }

    if (isOffer) {
      payload.offer_food_snapshot = form.offer_food_snapshot || [];
    } else {
      payload.selected_menu = (form.selected_menu || []).map((item) => item._id || item);
    }

    payload.service_items = (form.service_items || []).map((item) => ({
      name: item.name,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));

    if (scaffoldOptions.length > 0) {
      payload.selected_scaffold_option_id = form.selected_scaffold_option_id || "";
    }

    if (inquiry.is_custom_setup) {
      payload.custom_setup_scope = form.custom_setup_scope || [];
      payload.custom_setup_notes = form.custom_setup_notes || "";
      payload.budget_range = form.budget_range || "";
    }

    try {
      setSaving(true);
      await CustomerAPI.updateInquiry(inquiry._id, payload);
      notify("Your request has been updated.", "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      const resData = err?.response?.data;
      const apiErrors = Array.isArray(resData?.errors) ? resData.errors.filter(Boolean) : [];
      let friendlyMsg = null;
      if (apiErrors.length > 0) {
        friendlyMsg = apiErrors.join(". ");
      } else if (resData?.message && !/validation\s*error/i.test(resData.message)) {
        friendlyMsg = resData.message;
      }
      notify(friendlyMsg || "Please check your changes and make sure all required fields are valid.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Section Index & Navigation
  const activeSectionIndex = SECTIONS.findIndex((s) => s.id === activeSection);
  const currentSection = SECTIONS[activeSectionIndex] || SECTIONS[0];

  // Micro-summaries for the sidebar / tab bar
  const sectionSummaries = useMemo(() => {
    let s1 = "";
    if (isOffer) {
      s1 = `${inquiry?.guest_count || 0} pax Combo`;
    } else if (includesFood) {
      const dishCount = (form.selected_menu || []).length;
      s1 = dishCount === 1 ? "1 dish chosen" : `${dishCount} dishes chosen`;
    } else {
      s1 = "Setup Only";
    }

    const s2 = form.event_date
      ? `${formatDateDisplay(form.event_date)} · ${isOffer ? inquiry?.guest_count : form.guest_count || 0} pax`
      : "Date & Location";

    const totalAddons = (form.service_items || []).reduce(
      (acc, item) => acc + (Number(item.quantity) || 1),
      0,
    );
    const s3 = totalAddons > 0 ? `${totalAddons} add-ons` : form.event_theme || "Add-ons & Notes";

    const s4 = form.contact_first_name
      ? `${form.contact_first_name} ${form.contact_last_name}`.trim()
      : "Contact info";

    return {
      "package-food": s1,
      event: s2,
      extras: s3,
      contact: s4,
    };
  }, [
    isOffer,
    includesFood,
    form.selected_menu,
    form.event_date,
    form.guest_count,
    form.service_items,
    form.event_theme,
    form.contact_first_name,
    form.contact_last_name,
    inquiry?.guest_count,
  ]);

  if (!inquiry) return null;

  return (
    <Dialog open={showModal} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent hideClose className="font-sans antialiased text-slate-800 w-full max-w-4xl h-[92vh] sm:h-[88vh] max-h-[840px] rounded-2xl border border-slate-200 shadow-2xl p-0 overflow-hidden flex flex-col bg-white">
        {/* --- Top Header --- */}
        <DialogHeader className="px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-white shrink-0 flex flex-row items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="font-sans font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                Edit Inquiry Request
              </DialogTitle>
              {inquiry.reference && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {inquiry.reference}
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate">
              Update specific parts of your request. Any changes you make will be saved together.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </DialogHeader>

        {/* --- Mobile Horizontal Navigation (Visible < md) --- */}
        <div className="md:hidden border-b border-slate-200 bg-slate-50/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            const hasError = hasSectionError(sec.id);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-[#4C81E0] text-white shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100",
                  hasError && !isActive && "border-red-300 text-red-600 bg-red-50/40",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-slate-500")} />
                <span>{sec.shortLabel}</span>
                {hasError && (
                  <span
                    className={cn(
                      "flex h-2 w-2 rounded-full",
                      isActive ? "bg-white" : "bg-red-500",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* --- Main Workspace (Sidebar + Focused Section Area) --- */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Desktop Left Sidebar (Visible >= md) */}
          <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-100 bg-slate-50/60 p-3.5 justify-between">
            <div className="space-y-1.5">
              <div className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sections ({activeSectionIndex + 1} of {SECTIONS.length})
              </div>

              {SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                const hasError = hasSectionError(sec.id);
                const summaryText = sectionSummaries[sec.id];

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={cn(
                      "w-full text-left rounded-xl p-2.5 transition-all cursor-pointer flex items-center justify-between group",
                      isActive
                        ? "bg-white border border-slate-200 shadow-2xs ring-1 ring-[#4C81E0]/30"
                        : "hover:bg-slate-100/80 border border-transparent",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-[#4C81E0] text-white"
                            : "bg-slate-200/70 text-slate-600 group-hover:bg-slate-200",
                          hasError && !isActive && "bg-red-100 text-red-600",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={cn(
                              "text-xs font-bold leading-tight truncate",
                              isActive ? "text-[#4C81E0]" : "text-slate-800",
                            )}
                          >
                            {sec.label}
                          </p>
                          {hasError && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                          {summaryText}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={14}
                      className={cn(
                        "shrink-0 transition-transform",
                        isActive ? "text-[#4C81E0] translate-x-0.5" : "text-slate-300 opacity-60",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {/* Request Snapshot Card at Sidebar Bottom */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Reference</span>
                <span className="font-mono font-bold text-slate-800">{inquiry.reference || "INQ-CURRENT"}</span>
              </div>
              {Number(inquiry.estimated_total) > 0 && (
                <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Current estimate</span>
                  <span className="font-bold text-slate-900">{formatCurrency(inquiry.estimated_total)}</span>
                </div>
              )}
            </div>
          </aside>

          {/* Active Section Content Workspace */}
          <main className="flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6 bg-white space-y-6">
            {/* Section Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4C81E0]">
                  Section {currentSection.number}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-500">
                  {currentSection.shortLabel}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {currentSection.label}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                {currentSection.description}
              </p>
            </div>

            {/* ========================================================
                SECTION 1: PACKAGE & FOOD
            ======================================================== */}
            {activeSection === "package-food" && (
              <div className="space-y-6">
                {/* Section Summary Banner */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <PackageIcon className="h-3.5 w-3.5 text-[#4C81E0]" />
                      Package &amp; Food Snapshot
                    </span>
                    <LockedBadge label="Package as submitted" />
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Package / Combo</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {packageName || "Custom Request"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Event Space</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {eventSpace || "Standard Setup"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Food Selection</dt>
                      <dd className="text-xs sm:text-sm font-bold text-[#4C81E0] truncate mt-0.5">
                        {isOffer
                          ? `${inquiry?.guest_count} pax meal`
                          : includesFood
                          ? `${(form.selected_menu || []).length} dishes chosen`
                          : "No food included"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Estimate Total</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {Number(inquiry.estimated_total) > 0
                          ? formatCurrency(inquiry.estimated_total)
                          : "Quoted"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Scaffold Size Selection if multiple options */}
                {scaffoldOptions.length > 1 && (
                  <div className="rounded-xl border border-slate-200 p-4 bg-white">
                    <FormField
                      label="Event setup size"
                      optional
                      hint="The equipment reserved for your event adapts to the size chosen."
                    >
                      <TSelect
                        value={form.selected_scaffold_option_id}
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, selected_scaffold_option_id: val }))
                        }
                        options={scaffoldOptions.map((option) => ({
                          value: String(option._id),
                          label:
                            eventSpaceLabel(
                              { selected_scaffold_option_id: option._id },
                              activePackage,
                            ) ||
                            option.label ||
                            "Setup size",
                        }))}
                        placeholder="Select setup size"
                      />
                    </FormField>
                  </div>
                )}

                {/* Custom Setup Details if applicable */}
                {inquiry.is_custom_setup && (
                  <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Custom Setup Brief</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Bespoke styling specifications provided with this request.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField label="Target budget" optional hint="Estimated guide for bespoke styling.">
                        <TInput
                          placeholder="e.g. 50,000 - 80,000"
                          value={form.budget_range}
                          onChange={(val) => setForm((prev) => ({ ...prev, budget_range: val }))}
                        />
                      </FormField>
                      {(inquiry.custom_setup_scope || []).length > 0 && (
                        <FormField label="Setup scope">
                          <p className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                            {inquiry.custom_setup_scope.join(", ")}
                          </p>
                        </FormField>
                      )}
                    </div>
                    <FormField label="Stylist notes" optional hint="Specific design notes for our event stylists.">
                      <TTextarea
                        rows={2}
                        placeholder="e.g. Prefer fairy lights, white drapery, and low floral centerpieces."
                        value={form.custom_setup_notes}
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, custom_setup_notes: val }))
                        }
                      />
                    </FormField>
                    {(inquiry.inspiration_images || []).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-800 block">Uploaded Inspiration Photos</span>
                        <div className="flex flex-wrap gap-2">
                          {inquiry.inspiration_images.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Inspiration ${idx + 1}`}
                              className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reserved Equipment Snapshot */}
                {inventoryItems.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-slate-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Reserved Equipment ({inventoryItems.length} items)
                        </h3>
                      </div>
                      <LockedBadge label="Allocated" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {inventoryItems.map(addOnLabel).join(" · ")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Equipment automatically reserved based on your package and venue space.
                    </p>
                  </div>
                )}

                {/* Food Selection Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-[#4C81E0]" />
                        <span>Food &amp; Catering Choices</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isOffer
                          ? "Select your preferred dishes for each course included in this special combo."
                          : includesFood
                          ? "Choose the dishes for your catering service from our available menu."
                          : "Catering is not included with this setup-only booking."}
                      </p>
                    </div>
                    {includesFood && !isOffer && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#4C81E0] border border-blue-200/60">
                        {(form.selected_menu || []).length} selected
                      </span>
                    )}
                  </div>

                  {errors.selected_menu && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errors.selected_menu}</span>
                    </div>
                  )}

                  {isOffer ? (
                    /* Special Offer Combo meal choices */
                    <div className="space-y-4">
                      {offerPricePerPax(activePackage) > 0 && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {formatCurrency(offerPricePerPax(activePackage))} / pax ·{" "}
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(offerBaseFoodPrice(activePackage, inquiry.guest_count))}
                          </span>{" "}
                          for {inquiry.guest_count} guests (fixed by combo offer).
                        </div>
                      )}

                      {loadingCatalog && offerCourses.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3">Loading combo menu options…</p>
                      ) : offerCourses.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                          {offerFoodForDisplay(inquiry, activePackage)
                            .map((e) => e.item_name)
                            .join(", ")}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {errors.offer_food_snapshot && (
                            <p className="text-xs font-medium text-red-600">
                              {errors.offer_food_snapshot}
                            </p>
                          )}
                          {offerCourses.map((course) => {
                            const required = offerCourseRequirement(course.category);
                            const chosen = chosenForCourse(course.category);
                            const single = course.items.length === 1;

                            return (
                              <div
                                key={course.category}
                                className="rounded-xl border border-slate-200 p-3 bg-white space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800 uppercase tracking-wide">
                                    {course.category}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {single
                                      ? "Included automatically"
                                      : `Choose ${required} (${chosen.length}/${required})`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {course.items.map((dish) => {
                                    const active =
                                      single || chosen.some((entry) => entry.item_name === dish);
                                    return (
                                      <button
                                        key={dish}
                                        type="button"
                                        disabled={single}
                                        onClick={() =>
                                          toggleCourseDish(course.category, dish, required)
                                        }
                                        className={cn(
                                          "rounded-lg border px-3 py-1.5 text-xs transition-all",
                                          active
                                            ? "border-[#4C81E0] bg-blue-50/80 font-bold text-blue-900 ring-1 ring-[#4C81E0]/40"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                                          single ? "cursor-default" : "cursor-pointer active:scale-95",
                                        )}
                                      >
                                        {dish}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {offerInclusions(activePackage).length > 0 && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-600">
                              <span className="font-bold text-slate-700">Also included: </span>
                              {offerInclusions(activePackage).join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : includesFood ? (
                    /* Standard Buffet Menu Selection */
                    <div className="space-y-3">
                      {/* Selected Dishes Tray */}
                      {(form.selected_menu || []).length > 0 ? (
                        <div className="rounded-xl border border-blue-200/90 bg-blue-50/40 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                              Chosen Dishes ({(form.selected_menu || []).length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, selected_menu: [] }))}
                              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {form.selected_menu.map((item) => (
                              <PickChip
                                key={item._id}
                                label={item.name}
                                onRemove={() => toggleDish(item)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                          No dishes chosen yet. Browse and pick dishes from the menu below.
                        </div>
                      )}

                      {/* Search Bar */}
                      <div className="relative">
                        <Search
                          size={14}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="search"
                          value={dishQuery}
                          onChange={(e) => setDishQuery(e.target.value)}
                          placeholder="Search dishes by name (e.g. Sisig, Pork, Lumpia)..."
                          aria-label="Search dishes"
                          className="h-9.5 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]"
                        />
                        {dishQuery && (
                          <button
                            type="button"
                            onClick={() => setDishQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Course Filter Tabs */}
                      <CourseFilterBar
                        activeGroup={activeCourseTab}
                        onSelectGroup={setActiveCourseTab}
                        totalDishCount={menuCatalog?.length || 0}
                        groups={groupedDishes}
                        selectedCountsByGroup={selectedCountsByGroup}
                        showAll={true}
                      />

                      {/* Dishes Grid */}
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-2.5 space-y-3 bg-slate-50/20">
                        {loadingCatalog ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            Loading dishes catalogue...
                          </div>
                        ) : filteredDishes.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                            <p>
                              {dishQuery
                                ? `No dishes match "${dishQuery}"`
                                : "No dishes available in this category."}
                            </p>
                            {dishQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDishQuery("");
                                  setActiveCourseTab("all");
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer"
                              >
                                <RotateCcw size={12} />
                                Reset search
                              </button>
                            )}
                          </div>
                        ) : (
                          filteredDishes.map((group) => (
                            <div key={group.id}>
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {group.label} ({group.items.length})
                              </p>
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {group.items.map((item) => {
                                  const isChosen = isDishChosen(item);
                                  return (
                                    <button
                                      key={item._id}
                                      type="button"
                                      onClick={() => toggleDish(item)}
                                      className={cn(
                                        "group flex items-center justify-between gap-2 rounded-lg border p-1.5 text-left transition-all cursor-pointer select-none",
                                        isChosen
                                          ? "border-[#4C81E0] bg-blue-50/60 ring-1 ring-[#4C81E0]/50 shadow-2xs"
                                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                      )}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        {item.image_url ? (
                                          <img
                                            src={item.image_url}
                                            alt=""
                                            className="h-8 w-8 shrink-0 rounded object-cover border border-slate-200"
                                          />
                                        ) : (
                                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                                            <Utensils size={13} />
                                          </span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                                            {item.name}
                                          </p>
                                          {item.description && (
                                            <p className="truncate text-[10px] text-slate-500 leading-tight mt-0.5">
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <span
                                        className={cn(
                                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ml-1",
                                          isChosen
                                            ? "border-[#4C81E0] bg-[#4C81E0] text-white"
                                            : "border-slate-300 bg-white text-transparent group-hover:border-slate-400",
                                        )}
                                      >
                                        <Check size={10} strokeWidth={3} />
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500">
                      Food catering is not included in this request. If you wish to add food catering,
                      please submit a new booking or inquire via messages.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 2: EVENT DETAILS
            ======================================================== */}
            {activeSection === "event" && (
              <div className="space-y-6">
                {/* Section Summary Banner */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-[#4C81E0]" />
                      Current Event Schedule &amp; Location
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Date &amp; Time</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.event_date ? formatDateDisplay(form.event_date) : "Not set"}
                        {form.start_time ? ` at ${form.start_time}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Guest Count</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {isOffer ? `${inquiry.guest_count} (fixed)` : `${form.guest_count || 0} guests`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Event Type</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.event_type === OTHER_EVENT_TYPE
                          ? form.event_type_other || "Custom"
                          : form.event_type || "General"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Venue</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {isPickup
                          ? "Self-pickup"
                          : [form.municipality, form.barangay].filter(Boolean).join(", ") ||
                            "Not selected"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Sub-section 1: About the Event */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-6 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#4C81E0] ring-1 ring-blue-500/10 shrink-0">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">About the Event</h3>
                        <p className="text-xs text-slate-500">Key details about your celebration, schedule, and guest count.</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 self-start sm:self-center">
                      <span className="text-red-500 font-bold mr-0.5">*</span>Required fields
                    </span>
                  </div>

                  {/* Who is this celebration for? */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Who is this celebration for?
                      <span className="font-bold text-red-500 text-xs ml-1" title="Required field">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:max-w-md">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, booking_for: "myself", celebrant_name: "" }))
                        }
                        className={cn(
                          "flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                          form.booking_for !== "someone_else"
                            ? "border-[#4C81E0] bg-blue-50/70 text-[#4C81E0] ring-1 ring-[#4C81E0]/30 shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300",
                        )}
                      >
                        <User className="w-4 h-4 shrink-0" />
                        <span>For myself</span>
                        {form.booking_for !== "someone_else" && (
                          <Check className="w-3.5 h-3.5 ml-auto text-[#4C81E0] shrink-0" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, booking_for: "someone_else" }))}
                        className={cn(
                          "flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                          form.booking_for === "someone_else"
                            ? "border-[#4C81E0] bg-blue-50/70 text-[#4C81E0] ring-1 ring-[#4C81E0]/30 shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300",
                        )}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>For someone else</span>
                        {form.booking_for === "someone_else" && (
                          <Check className="w-3.5 h-3.5 ml-auto text-[#4C81E0] shrink-0" />
                        )}
                      </button>
                    </div>

                    {form.booking_for === "someone_else" && (
                      <div className="pt-2">
                        <FormField
                          label="Celebrant or honoree name"
                          required
                          hint="Name of the person, couple, or organization being celebrated."
                          error={errors.celebrant_name}
                        >
                          <TInput
                            placeholder="e.g. Maria Santos, Carlos & Ana, Baby Liam"
                            value={form.celebrant_name || ""}
                            onChange={(val) => setForm((prev) => ({ ...prev, celebrant_name: val }))}
                            hasError={!!errors.celebrant_name}
                          />
                        </FormField>
                      </div>
                    )}
                  </div>

                  {/* Core Event Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1">
                    <FormField
                      label="Celebration type"
                      required
                      error={errors.event_type}
                    >
                      <TSelect
                        value={form.event_type}
                        onChange={(val) =>
                          setForm((prev) => ({
                            ...prev,
                            event_type: val,
                            event_type_other: val === OTHER_EVENT_TYPE ? prev.event_type_other : "",
                          }))
                        }
                        options={EVENT_TYPES}
                        placeholder="Select celebration type"
                        hasError={!!errors.event_type}
                      />
                    </FormField>

                    {form.event_type === OTHER_EVENT_TYPE && (
                      <FormField
                        label="Specify celebration type"
                        required
                        hint="Describe what you are celebrating."
                      >
                        <TInput
                          placeholder="e.g. Family Reunion, Christening, 50th Golden Anniversary"
                          value={form.event_type_other}
                          onChange={(val) =>
                            setForm((prev) => ({ ...prev, event_type_other: val }))
                          }
                        />
                      </FormField>
                    )}

                    <FormField
                      label="Celebration date"
                      required
                      error={errors.event_date}
                      hint="Date when your celebration takes place."
                    >
                      <TInput
                        type="date"
                        min={toDateInputValue(new Date())}
                        value={form.event_date}
                        onChange={(val) => setForm((prev) => ({ ...prev, event_date: val }))}
                        hasError={!!errors.event_date}
                      />
                    </FormField>

                    <FormField
                      label="Event start time"
                      required
                      error={errors.start_time}
                      hint="When guests arrive or the program begins."
                    >
                      <TInput
                        type="time"
                        value={form.start_time}
                        onChange={(val) => setForm((prev) => ({ ...prev, start_time: val }))}
                        hasError={!!errors.start_time}
                      />
                    </FormField>

                    <FormField
                      label="Number of guests"
                      required={!isOffer}
                      error={errors.guest_count}
                      hint={
                        isOffer
                          ? "Guest count is preset by your Special Offer combo."
                          : "Total expected attendees (minimum 1)."
                      }
                      className={isOffer ? "sm:col-span-2" : "sm:col-span-1"}
                    >
                      {isOffer ? (
                        <div className="flex min-h-[40px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-800">
                            <Users className="h-4 w-4 text-[#4C81E0]" />
                            <strong className="font-bold text-slate-900">{inquiry.guest_count} guests</strong>
                          </div>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-100">
                            Combo Preset
                          </span>
                        </div>
                      ) : (
                        <GuestCounter
                          value={Number(form.guest_count) || 1}
                          onChange={(val) => setForm((prev) => ({ ...prev, guest_count: val }))}
                          min={1}
                        />
                      )}
                    </FormField>

                    {!isOffer && (
                      <FormField
                        label="Catering &amp; setup service"
                        optional
                        hint="Choose the service tier that matches your event."
                        className="sm:col-span-1"
                      >
                        <TSelect
                          value={form.service_type}
                          onChange={(val) => setForm((prev) => ({ ...prev, service_type: val }))}
                          options={CUSTOMER_SERVICE_OPTIONS}
                        />
                      </FormField>
                    )}
                  </div>
                </div>

                {/* Sub-section 2: Venue */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-6 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#4C81E0] ring-1 ring-blue-500/10 shrink-0">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Venue &amp; Location</h3>
                        <p className="text-xs text-slate-500">Where our team will deliver, setup, or celebrate.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs text-slate-500 font-medium">
                        Batangas Province
                      </span>
                    </div>
                  </div>

                  {showDelivery && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-900">
                        How will you receive your order?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:max-w-md">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, delivery_method: "delivery" }))}
                          className={cn(
                            "flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all",
                            !isPickup
                              ? "border-[#4C81E0] bg-blue-50/70 text-[#4C81E0] font-semibold ring-1 ring-[#4C81E0]/30 shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                          )}
                        >
                          <Truck className="h-4 w-4 shrink-0" />
                          <span>Deliver to event venue</span>
                          {!isPickup && <Check className="w-3.5 h-3.5 ml-auto text-[#4C81E0] shrink-0" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, delivery_method: "pickup" }))}
                          className={cn(
                            "flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all",
                            isPickup
                              ? "border-[#4C81E0] bg-blue-50/70 text-[#4C81E0] font-semibold ring-1 ring-[#4C81E0]/30 shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                          )}
                        >
                          <PackageIcon className="h-4 w-4 shrink-0" />
                          <span>Pick up at our store</span>
                          {isPickup && <Check className="w-3.5 h-3.5 ml-auto text-[#4C81E0] shrink-0" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {isPickup ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-xs text-blue-900 flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#4C81E0] shrink-0 mt-0.5">
                        <PackageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Store Pickup Selected</h4>
                        <p className="mt-0.5 text-slate-600 text-xs leading-relaxed">
                          Our team will prepare and safely package your food for self-pickup at our commissary. Venue address and delivery details are not required.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <FormField
                        label="City / Municipality"
                        required
                        error={errors.municipality}
                      >
                        <TSelect
                          value={form.municipality}
                          onChange={(val) =>
                            setForm((prev) => ({ ...prev, municipality: val, barangay: "" }))
                          }
                          options={municipalities}
                          placeholder="Select city or municipality"
                          hasError={!!errors.municipality}
                        />
                      </FormField>

                      <FormField
                        label="Barangay / Village"
                        required
                        hint={!form.municipality ? "Select city or municipality first" : undefined}
                        error={errors.barangay}
                      >
                        <TSelect
                          value={form.barangay}
                          onChange={(val) => setForm((prev) => ({ ...prev, barangay: val }))}
                          options={barangays}
                          placeholder={form.municipality ? "Select barangay" : "Choose municipality first"}
                          disabled={!form.municipality}
                          hasError={!!errors.barangay}
                        />
                      </FormField>

                      <FormField
                        label="Street address or venue name"
                        optional
                        hint="House/building number, street, subdivision, or facility name."
                        className="sm:col-span-2"
                      >
                        <TInput
                          value={form.street}
                          onChange={(val) => setForm((prev) => ({ ...prev, street: val }))}
                          placeholder="e.g. Unit 4B Sunshine Bldg, Phase 2 Block 5, Villa San Jose"
                        />
                      </FormField>

                      <FormField
                        label="Nearby landmark or directions"
                        optional
                        hint="Helps our delivery and styling team navigate to your venue."
                        className="sm:col-span-2"
                      >
                        <TInput
                          value={form.landmark}
                          onChange={(val) => setForm((prev) => ({ ...prev, landmark: val }))}
                          placeholder="e.g. Across town plaza, near San Sebastian Cathedral, yellow gate"
                        />
                      </FormField>

                      <FormField
                        label="Venue setting"
                        optional
                        hint="General setting or environment of your celebration."
                      >
                        <TSelect
                          value={form.venue_type}
                          onChange={(val) => setForm((prev) => ({ ...prev, venue_type: val }))}
                          options={VENUE_TYPES}
                          placeholder="Select venue setting (e.g. Private Resort, Garden)"
                        />
                      </FormField>

                      {isVenueTypeOther && (
                        <FormField
                          label="Specify venue setting"
                          required
                          hint="Describe your venue location."
                        >
                          <TInput
                            value={form.venue_type_other}
                            onChange={(val) =>
                              setForm((prev) => ({ ...prev, venue_type_other: val }))
                            }
                            placeholder="e.g. Beachfront Resort, Rooftop Terrace, Private Farm"
                          />
                        </FormField>
                      )}

                      <FormField
                        label="Postal code (ZIP)"
                        optional
                        hint="4-digit postal code (if known)."
                      >
                        <TInput
                          value={form.zip_code}
                          onChange={(val) => setForm((prev) => ({ ...prev, zip_code: val }))}
                          placeholder="e.g. 4217"
                        />
                      </FormField>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 3: EXTRAS & REQUESTS
            ======================================================== */}
            {activeSection === "extras" && (
              <div className="space-y-6">
                {/* Section Summary Banner */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#4C81E0]" />
                      Extras, Theme &amp; Dietary Snapshot
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Add-ons</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {(form.service_items || []).length > 0
                          ? `${(form.service_items || []).length} extra services`
                          : "None"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Event Theme</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.event_theme || "Not selected"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Color Palette</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {(form.event_palette || []).length > 0
                          ? `${form.event_palette.length} colors`
                          : "Default"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Special Notes</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.special_requests || form.allergies ? "Provided" : "None"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 1. Add-on & Extra Services Block */}
                {addOnChoices.length > 0 && (
                  <div className="space-y-3.5">
                    {/* Header & Compact Count Summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#4C81E0]" />
                          Add-ons &amp; Extra Services
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Select optional rentals, entertainment, or decor additions for your event.
                        </p>
                      </div>

                      {/* Compact selected summary */}
                      <div className="flex items-center gap-2">
                        {selectedAddonStats.totalCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-[#4C81E0] border border-blue-200/60 text-xs font-bold shadow-2xs">
                              <Check className="h-3.5 w-3.5" />
                              {selectedAddonStats.totalCount}{" "}
                              {selectedAddonStats.totalCount === 1 ? "service" : "services"} added
                            </span>
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, service_items: [] }))}
                              className="text-[11px] font-semibold text-slate-400 hover:text-red-600 hover:underline cursor-pointer"
                            >
                              Clear all
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            0 selected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Selections Breakdown Bar when items are selected */}
                    {selectedAddonStats.totalCount > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-600">
                          {selectedAddonStats.fixedCount > 0 && (
                            <span>
                              <strong className="text-slate-800 font-bold">
                                {selectedAddonStats.fixedCount}
                              </strong>{" "}
                              fixed (
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(selectedAddonStats.fixedTotal)}
                              </span>
                              )
                            </span>
                          )}
                          {selectedAddonStats.fixedCount > 0 &&
                            selectedAddonStats.quotationCount > 0 && (
                              <span className="text-slate-300">·</span>
                            )}
                          {selectedAddonStats.quotationCount > 0 && (
                            <span>
                              <strong className="text-slate-800 font-bold">
                                {selectedAddonStats.quotationCount}
                              </strong>{" "}
                              priced in quotation
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Tap any item to adjust
                        </span>
                      </div>
                    )}

                    {/* Search & Category Tabs */}
                    <div className="space-y-2">
                      {addOnChoices.length > 5 && (
                        <div className="relative">
                          <Search
                            size={13}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="search"
                            value={addonSearchQuery}
                            onChange={(e) => setAddonSearchQuery(e.target.value)}
                            placeholder="Search add-ons by name or description..."
                            aria-label="Search add-on services"
                            className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]"
                          />
                          {addonSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setAddonSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Category Filter Pills */}
                      {availableAddonCategories.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => setAddonCategoryFilter("all")}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                              addonCategoryFilter === "all"
                                ? "bg-[#4C81E0] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                            )}
                          >
                            All ({addOnChoices.length})
                          </button>
                          {availableAddonCategories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setAddonCategoryFilter(cat.id)}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                                addonCategoryFilter === cat.id
                                  ? "bg-[#4C81E0] text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                              )}
                            >
                              <cat.icon className="h-3 w-3" />
                              <span>{cat.label}</span>
                              <span
                                className={cn(
                                  "text-[10px] ml-0.5",
                                  addonCategoryFilter === cat.id
                                    ? "text-blue-100"
                                    : "text-slate-400",
                                )}
                              >
                                ({cat.count})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Categorized Services List */}
                    {groupedFilteredAddons.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 space-y-1.5">
                        <p>
                          {addonSearchQuery
                            ? `No add-on services match "${addonSearchQuery}".`
                            : "No add-on services found in this category."}
                        </p>
                        {addonSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddonSearchQuery("");
                              setAddonCategoryFilter("all");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            Reset filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupedFilteredAddons.map((group) => (
                          <div key={group.id} className="space-y-1.5">
                            <div className="flex items-center gap-1.5 px-0.5 pt-1">
                              <group.icon className="h-3.5 w-3.5 text-slate-400" />
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {group.label} ({group.items.length})
                              </h4>
                            </div>

                            <div className="space-y-1.5">
                              {group.items.map((choice) => {
                                const qty = addOnQuantity(choice.name);
                                const isSelected = qty > 0;
                                const hasFixedPrice = Number(choice.price) > 0;
                                const quantityRelevant = isQuantityRelevant(choice);

                                return (
                                  <div
                                    key={choice.name}
                                    className={cn(
                                      "group rounded-xl border p-3 transition-all select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                                      isSelected
                                        ? "border-[#4C81E0] bg-blue-50/50 ring-1 ring-[#4C81E0]/40 shadow-2xs"
                                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                                    )}
                                  >
                                    {/* Clickable Card Body for Toggling */}
                                    <div
                                      onClick={() => {
                                        if (isSelected) {
                                          setAddOnQuantity(choice, 0);
                                        } else {
                                          setAddOnQuantity(choice, 1);
                                        }
                                      }}
                                      className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                                    >
                                      {/* Custom Checkbox */}
                                      <span
                                        className={cn(
                                          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors mt-0.5",
                                          isSelected
                                            ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
                                            : "border-slate-300 bg-white text-transparent group-hover:border-slate-400",
                                        )}
                                      >
                                        <Check size={11} strokeWidth={3} />
                                      </span>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={cn(
                                              "text-xs font-bold leading-tight",
                                              isSelected ? "text-blue-950" : "text-slate-800",
                                            )}
                                          >
                                            {choice.name}
                                          </span>
                                          {choice.source === "package" && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                              Package
                                            </span>
                                          )}
                                        </div>
                                        {choice.description && (
                                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                            {choice.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Pricing & Conditional Quantity Controls */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-7 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                                      {/* Clear Price Differentiation */}
                                      <div>
                                        {hasFixedPrice ? (
                                          <div className="text-right">
                                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                                              {formatCurrency(choice.price)}
                                            </span>
                                            {quantityRelevant && (
                                              <span className="text-[10px] text-slate-400 font-medium ml-1">
                                                / unit
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold tracking-wide">
                                            Priced in quotation
                                          </span>
                                        )}
                                      </div>

                                      {/* Quantity controls shown ONLY when selected */}
                                      {isSelected ? (
                                        quantityRelevant ? (
                                          <QuantityStepper
                                            value={qty}
                                            onChange={(next) => setAddOnQuantity(choice, next)}
                                          />
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setAddOnQuantity(choice, 0)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                            title="Remove this service"
                                          >
                                            <X size={12} />
                                            <span>Remove</span>
                                          </button>
                                        )
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setAddOnQuantity(choice, 1)}
                                          className="text-xs font-semibold text-[#4C81E0] hover:text-[#3b6ec6] hover:underline cursor-pointer px-2 py-1"
                                        >
                                          + Add
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Theme and Palette Block */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Event Theme &amp; Color Palette
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Styling preferences for table settings, floral accents, and backdrop concepts.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      label="Event styling theme"
                      optional
                      hint="Preferred aesthetic for table settings, florals, and backdrops."
                    >
                      <ThemePicker
                        value={form.event_theme}
                        onChange={(theme) => setForm((prev) => ({ ...prev, event_theme: theme }))}
                      />
                    </FormField>

                    <FormField
                      label="Color palette"
                      optional
                      hint="Choose an established color combination or type custom colors."
                    >
                      <ColorPalettePicker
                        value={form.event_palette}
                        onChange={(palette) =>
                          setForm((prev) => ({ ...prev, event_palette: palette }))
                        }
                      />
                    </FormField>
                  </div>
                </div>

                {/* 3. Special Requests & Dietary Requirements Block */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      Special Requests &amp; Dietary Requirements
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Separate notes for our catering crew regarding allergies or guest dietary preferences.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Special requests"
                      optional
                      hint="Specific instructions or notes for our setup and catering crew."
                    >
                      <TTextarea
                        value={form.special_requests}
                        maxLength={500}
                        placeholder="e.g. Please arrange the presidential table near the stage, prepare extra head table seating."
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, special_requests: val }))
                        }
                        rows={3}
                      />
                    </FormField>

                    <FormField
                      label="Food allergies"
                      optional
                      hint="List any known allergies among your guests (e.g. peanuts, shellfish)."
                    >
                      <TTextarea
                        value={form.allergies}
                        maxLength={300}
                        placeholder="e.g. 2 guests with severe peanut/shellfish allergy."
                        onChange={(val) => setForm((prev) => ({ ...prev, allergies: val }))}
                        rows={3}
                      />
                    </FormField>

                    <FormField
                      label="Dietary restrictions"
                      optional
                      hint="Dietary preferences for meals (e.g. Halal, Vegetarian, Pescatarian)."
                      className="sm:col-span-2"
                    >
                      <TTextarea
                        value={form.dietary_restrictions}
                        maxLength={300}
                        placeholder="e.g. 5 vegetarian meals, 2 Halal-friendly portions required."
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, dietary_restrictions: val }))
                        }
                        rows={2}
                      />
                    </FormField>

                    {showDelivery && !isPickup && (
                      <FormField
                        label="Delivery instructions"
                        optional
                        hint="Subdivision gate pass rules, unloading dock, or building instructions."
                        className="sm:col-span-2"
                      >
                        <TTextarea
                          value={form.delivery_instructions}
                          maxLength={250}
                          placeholder="e.g. Guard requires gate pass at entrance; drop-off via service driveway."
                          onChange={(val) =>
                            setForm((prev) => ({ ...prev, delivery_instructions: val }))
                          }
                          rows={2}
                        />
                      </FormField>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 4: CONTACT INFORMATION
            ======================================================== */}
            {activeSection === "contact" && (
              <div className="space-y-6">
                {/* Section Summary Banner */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#4C81E0]" />
                      Primary Contact Summary
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Full Name</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {`${form.contact_first_name} ${form.contact_last_name}`.trim() || "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Email Address</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.contact_email || "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Mobile Number</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.contact_phone || "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Backup Phone</dt>
                      <dd className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                        {form.contact_alt_phone || "None"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Sub-section: Contact Details */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-6 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#4C81E0]">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Contact Details</h3>
                        <p className="text-xs text-slate-500">Primary coordinator for this booking</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 self-start sm:self-center">
                      Required for quote &amp; coordination
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="First name"
                      required
                      error={errorFor("contact_first_name")}
                    >
                      <TInput
                        placeholder="e.g. Maria"
                        value={form.contact_first_name}
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, contact_first_name: val }))
                        }
                        onBlur={() => handleBlur("contact_first_name")}
                        hasError={!!errorFor("contact_first_name")}
                      />
                    </FormField>

                    <FormField
                      label="Last name"
                      required
                      error={errorFor("contact_last_name")}
                    >
                      <TInput
                        placeholder="e.g. Santos"
                        value={form.contact_last_name}
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, contact_last_name: val }))
                        }
                        onBlur={() => handleBlur("contact_last_name")}
                        hasError={!!errorFor("contact_last_name")}
                      />
                    </FormField>

                    <FormField
                      label="Email address"
                      required
                      error={errorFor("contact_email")}
                      hint="We'll send your formal quotation, invoice, and event updates here."
                      className="sm:col-span-2"
                    >
                      <TInput
                        type="email"
                        placeholder="e.g. maria.santos@gmail.com"
                        value={form.contact_email}
                        onChange={(val) =>
                          setForm((prev) => ({ ...prev, contact_email: val }))
                        }
                        onBlur={() => handleBlur("contact_email")}
                        hasError={!!errorFor("contact_email")}
                      />
                    </FormField>

                    <FormField
                      label="Mobile number"
                      required
                      error={errorFor("contact_phone")}
                      hint="11-digit Philippine mobile number (starts with 09)."
                    >
                      <TInput
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="09171234567"
                        value={form.contact_phone}
                        onChange={(val) => handlePhoneChange("contact_phone", val)}
                        onBlur={() => handleBlur("contact_phone")}
                        hasError={!!errorFor("contact_phone")}
                      />
                    </FormField>

                    <FormField
                      label="Backup phone number"
                      optional
                      error={errorFor("contact_alt_phone")}
                      hint={
                        !primaryPhoneFilled
                          ? "Enter primary mobile number first"
                          : "Optional secondary contact number."
                      }
                    >
                      <TInput
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="09181234567"
                        value={form.contact_alt_phone}
                        onChange={(val) => handlePhoneChange("contact_alt_phone", val)}
                        onBlur={() => handleBlur("contact_alt_phone")}
                        disabled={!primaryPhoneFilled}
                        hasError={!!errorFor("contact_alt_phone")}
                      />
                    </FormField>
                  </div>

                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
                    <HeartHandshake className="h-4 w-4 text-[#4C81E0] shrink-0 mt-0.5" />
                    <p>
                      We will use your contact details solely to coordinate event schedule, finalize your formal quotation, and provide live status updates.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* --- Persistent Accessible Bottom Action Footer --- */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/90 shrink-0 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg min-h-[38px] px-4 text-xs font-semibold cursor-pointer border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg min-h-[38px] px-5 text-xs font-semibold bg-[#4C81E0] hover:bg-[#3b6ec6] text-white shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving changes…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
