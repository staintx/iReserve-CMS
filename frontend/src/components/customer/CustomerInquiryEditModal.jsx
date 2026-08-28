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
  UtensilsCrossed,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Card,
  Field,
  TInput,
  TSelect,
  TTextarea,
  GuestCounter,
  SectionTitle,
  FieldStatusPill,
} from "../../pages/customer/booking/components/BookingSharedUI";
import ThemePicker, { ColorPalettePicker } from "../../pages/customer/booking/components/ThemePicker";
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

/** One read-only fact in the submitted-request snapshot. */
function SnapshotRow({ label, value, wide = false }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={wide ? "sm:col-span-2 min-w-0" : "min-w-0"}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

/** Marks a snapshot card as part of the original submission */
function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200/60">
      <Lock className="h-3 w-3" /> As submitted
    </span>
  );
}

/** Marks a card the customer can change */
function EditableBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4C81E0] border border-blue-200/60">
      {children}
    </span>
  );
}

/** A dish or add-on the customer has chosen, removable from the summary row. */
function PickChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 py-0.5 pl-2 pr-1 text-xs font-semibold text-blue-900 shadow-2xs">
      <span className="truncate max-w-[130px]">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-3.5 w-3.5 items-center justify-center rounded text-blue-700 hover:bg-blue-200 hover:text-blue-900 cursor-pointer transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/** −/+ stepper for an add-on's quantity. */
function QuantityStepper({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-md border border-slate-200">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
        aria-label="Decrease quantity"
        className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-6 text-center text-xs font-bold tabular-nums text-slate-800">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The "Other" sentinel is a booking-flow presentation concept — the Inquiry
// schema stores whatever was typed as a plain string in `event_type`/
// `venue_type` directly. Reconstructing the sentinel + free-text split here
// mirrors StepEventDetails so an inquiry saved with a custom value edits the
// same way it was entered.
function formFromInquiry(inquiry) {
  const rawEventType = inquiry?.event_type || "";
  const eventTypeIsOther = isOtherEventType(rawEventType);
  const rawVenueType = inquiry?.venue_type || "";
  const venueTypeIsOther = isCustomVenueType({ venue_type: rawVenueType });

  return {
    event_type: eventTypeIsOther ? OTHER_EVENT_TYPE : matchEventType(rawEventType) || rawEventType,
    event_type_other: eventTypeIsOther ? rawEventType : "",
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

    // Selections. Held as the request stores them so what the customer sees is
    // what they submitted; the server re-derives all of it on save.
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

/**
 * Lets a customer change their own request while it is still pre-quotation
 * (see CUSTOMER_EDITABLE_STATUSES on the backend).
 *
 * A focused edit surface rather than the booking wizard again: the customer
 * already answered every question once, so this shows the whole request on one
 * screen and lets them revise the parts that are still theirs to revise —
 * their dishes, their add-ons, and the setup size their package offers,
 * choosing freely from the same catalogues the wizard offered rather than only
 * from what they happened to pick the first time.
 *
 * What stays locked is what was never theirs to set: the package the request
 * was made against, the equipment its setup reserves, every price, and a
 * combo's guest count and service type. The backend re-derives all of it
 * regardless of what this form sends (see utils/requestSelections.js), so the
 * validation here is for a good experience, not the actual guardrail.
 */
export default function CustomerInquiryEditModal({ open, inquiry, onClose, onSaved }) {
  const { notify } = useToast();
  const [form, setForm] = useState(() => formFromInquiry(inquiry));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  // The catalogues the customer chooses from. Loaded here rather than passed
  // in, because the list this modal opens from carries only a summary of each
  // request — it has never needed the menu or the add-on catalogue before.
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [addonCatalog, setAddonCatalog] = useState([]);
  const [packageRecord, setPackageRecord] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [dishQuery, setDishQuery] = useState("");
  const [activeCourseTab, setActiveCourseTab] = useState("all");

  useEffect(() => {
    if (open) {
      setForm(formFromInquiry(inquiry));
      setErrors({});
      setTouched({});
      setDishQuery("");
      setActiveCourseTab("all");
    }
  }, [open, inquiry]);

  /**
   * What the customer may choose from.
   *
   * The package is re-fetched rather than read off the inquiry's populated
   * relation because the edit needs its full configuration — the sizes it
   * offers and the add-ons sold with it — and the inquiry carries only what
   * was selected. A failure here is not fatal: the selection cards fall back
   * to what the request already holds, so the rest of the form still saves.
   */
  useEffect(() => {
    if (!open || !inquiry) return;
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
  }, [open, inquiry]);

  const isOffer = inquiry?.booking_type === "special";
  const isCustomBooking = inquiry?.booking_type === "custom";
  // Delivery method only means something for a custom, Food Only request — a
  // package always includes on-site setup, so there is nothing to choose.
  const showDelivery = isCustomBooking && form.service_type === SERVICE_TYPES.FOOD_ONLY;
  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(() => getBatangasBarangays(form.municipality), [form.municipality]);

  // --- What was submitted. The package the request was made against, the
  // equipment its setup reserves, and every price stay locked (see
  // CUSTOMER_EDITABLE_FIELDS on the backend), so those are read straight from
  // `inquiry`. The selections below read from `form`, because they are the
  // parts this modal can change.
  const submittedPackage =
    inquiry?.package_id && typeof inquiry.package_id === "object" ? inquiry.package_id : null;
  // The freshly fetched package where it loaded, because only that carries the
  // sizes and add-ons the customer chooses between; the relation stored on the
  // request is the fallback.
  const activePackage = packageRecord || submittedPackage;
  const packageName = activePackage?.name || inquiry?.package_name_snapshot || "";
  const eventSpace = inquiry ? eventSpaceLabel(inquiry, activePackage) : "";
  const inventoryItems = Array.isArray(inquiry?.inventory_items) ? inquiry.inventory_items : [];
  const addOnLabel = (item) =>
    Number(item.quantity) > 1 ? `${item.name} × ${item.quantity}` : item.name;
  const includesFood = inquiry?.include_food !== false;

  // ---------------------------------------------------------------------------
  // Selections the customer can change
  // ---------------------------------------------------------------------------

  /** Dishes, grouped by course categories, filtered by course tab and search box. */
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

  /**
   * Every add-on that can be on this request: the package's own, the general
   * catalogue, and anything already on the request that is neither — a service
   * agreed outside the catalogue stays visible and removable rather than
   * disappearing the moment the customer opens this form.
   */
  const addOnChoices = useMemo(() => {
    const seen = new Set();
    const choices = [];
    const push = (name, description, price, source) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      choices.push({ name, description: description || "", price: Number(price) || 0, source });
    };

    (Array.isArray(activePackage?.add_ons) ? activePackage.add_ons : []).forEach((addOn) =>
      // A package add-on carries a name and a quantity but no price: it is
      // quoted per event, so it sits at ₱0 until the quotation prices it.
      push(addOn?.name, addOn?.qty ? `Package add-on (${addOn.qty})` : "Package add-on", 0, "package"),
    );
    (Array.isArray(addonCatalog) ? addonCatalog : [])
      .filter((addOn) => addOn?.available !== false)
      .forEach((addOn) => push(addOn?.name, addOn?.description, addOn?.price, "catalog"));
    (form.service_items || []).forEach((item) =>
      push(item?.name, item?.description, item?.price, "existing"),
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

  /** A combo's courses, with what this request has chosen for each. */
  const offerCourses = useMemo(
    () => (isOffer ? offerFoodByCategory(activePackage) : []),
    [isOffer, activePackage],
  );

  const chosenForCourse = (category) =>
    (form.offer_food_snapshot || []).filter(
      (entry) => (entry.menu_category || "Included") === category,
    );

  /**
   * Choosing a dish for a course. A course asking for one dish swaps; a course
   * asking for several fills up to its limit and then replaces the oldest
   * pick, so the control never simply stops responding.
   */
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

  /** The sizes this package sells, when it sells more than one. */
  const scaffoldOptions = Array.isArray(activePackage?.scaffold_size_options)
    ? activePackage.scaffold_size_options
    : [];
  const hasCustomSetupDetails =
    Boolean(inquiry?.is_custom_setup) &&
    (Boolean(inquiry?.custom_setup_notes) ||
      (inquiry?.custom_setup_scope || []).length > 0 ||
      Boolean(inquiry?.budget_range) ||
      (inquiry?.inspiration_images || []).length > 0);

  const isVenueTypeOther = form.venue_type === OTHER_VENUE_TYPE;
  const isPickup = showDelivery && form.delivery_method === "pickup";

  const errorFor = (field) => errors[field] || (touched[field] ? contactFieldError(field, form[field]) : "");
  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));
  const handlePhoneChange = (field, raw) => setForm((prev) => ({ ...prev, [field]: sanitizePhone(raw) }));
  const primaryPhoneFilled = !!form.contact_phone?.trim();

  const validate = () => {
    const next = {};
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

    // A food order with no food. The wizard refuses to submit one, so an edit
    // must not be the way to arrive at one.
    if (
      !isOffer &&
      form.service_type === SERVICE_TYPES.FOOD_ONLY &&
      (form.selected_menu || []).length === 0
    ) {
      next.selected_menu = "Choose at least one dish, or message us to cancel this request.";
    }

    // Every course a combo asks the customer to choose from needs an answer.
    // The server settles a course left blank to the combo's own default, so
    // this is about the customer getting what they meant rather than about
    // protecting the record.
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
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setTouched((prev) => ({
      ...prev,
      contact_first_name: true,
      contact_last_name: true,
      contact_email: true,
      contact_phone: true,
    }));
    if (!validate()) {
      notify("Please fix the highlighted fields.", "error");
      return;
    }

    const payload = {
      event_type: form.event_type === OTHER_EVENT_TYPE ? form.event_type_other.trim() : form.event_type,
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

    /**
     * Selections. Sent as *what* was chosen — ids and names — and never as
     * what they cost: the server prices every one of them from the catalogue
     * and recomputes the estimate, so a price sent from here would be ignored
     * anyway (see utils/requestSelections.js).
     */
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
      notify(err.response?.data?.message || "Failed to update your request.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!inquiry) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="w-full max-w-3xl max-h-[88vh] rounded-xl border border-slate-200 shadow-2xl p-0 overflow-hidden flex flex-col bg-white">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100 bg-white shrink-0">
          <DialogTitle className="font-sans font-bold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
            <span>Edit Request Details</span>
            {inquiry.reference && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#4C81E0] border border-blue-200/60">
                {inquiry.reference}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Sections marked "As submitted" cannot be changed. Update any of the editable selections below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 overflow-y-auto flex-1">
          {/* --- Read-only snapshot: everything originally submitted that this
              form cannot change. Shown first so a customer sees the whole
              request before touching anything, distinguished from the
              editable cards below by the dashed border and "As submitted"
              badge. */}
          <div className="space-y-3">
            {(packageName || eventSpace || hasCustomSetupDetails) && (
              <Card className="border-dashed p-4">
                <SectionTitle icon={PackageIcon} right={<LockedBadge />}>
                  Service &amp; package
                </SectionTitle>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {packageName && <SnapshotRow label={isOffer ? "Combo" : "Package"} value={packageName} />}
                  {eventSpace && <SnapshotRow label="Event space / scaffold size" value={eventSpace} />}
                  {inquiry.is_custom_setup && (
                    <SnapshotRow label="Setup concept" value="100% Bespoke Custom Setup" wide />
                  )}
                  {(inquiry.custom_setup_scope || []).length > 0 && (
                    <SnapshotRow label="Setup scope" value={inquiry.custom_setup_scope.join(", ")} wide />
                  )}
                  {inquiry.budget_range && <SnapshotRow label="Target budget" value={inquiry.budget_range} />}
                </dl>
                {inquiry.custom_setup_notes && (
                  <div className="mt-3">
                    <SnapshotRow label="Custom setup notes" value={inquiry.custom_setup_notes} wide />
                  </div>
                )}
                {(inquiry.inspiration_images || []).length > 0 && (
                  <div className="mt-3">
                    <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Inspiration photos
                    </dt>
                    <div className="flex flex-wrap gap-2">
                      {inquiry.inspiration_images.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Inspiration ${idx + 1}`}
                          className="h-14 w-14 rounded-lg border border-border object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* --- Equipment and the estimate: derived, never chosen. The
                equipment a setup reserves follows from the package and the
                size, and the estimate follows from the selections — so both
                are shown as the consequences they are, and change only when
                the choices above them change. */}
            {inventoryItems.length > 0 && (
              <Card className="border-dashed p-4">
                <SectionTitle icon={Boxes} right={<LockedBadge />}>
                  Reserved equipment
                </SectionTitle>
                <SnapshotRow
                  label="Included with your setup"
                  value={inventoryItems.map(addOnLabel).join(", ")}
                  wide
                />
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Reserved for you based on the package and size above. It updates on its own if you change them.
                </p>
              </Card>
            )}

            {Number(inquiry.estimated_total) > 0 && (
              <Card className="border-dashed p-4">
                <SectionTitle icon={DollarSign} right={<LockedBadge />}>
                  Current estimate
                </SectionTitle>
                <SnapshotRow label="Estimated total" value={formatCurrency(inquiry.estimated_total)} />
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Recalculated when you save. Your official quotation is the final price.
                </p>
              </Card>
            )}
          </div>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Editable details
          </p>

          {/* --- Selections. Add or remove freely: the customer is not held to
              what they happened to pick the first time, only to what the
              package or combo actually offers. */}
          {isOffer ? (
            <Card className="p-4">
              <SectionTitle
                icon={Utensils}
                right={<EditableBadge>Choose your dishes</EditableBadge>}
              >
                Combo meal
              </SectionTitle>

              {offerPricePerPax(activePackage) > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {formatCurrency(offerPricePerPax(activePackage))} / pax ·{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(offerBaseFoodPrice(activePackage, inquiry.guest_count))}
                  </span>{" "}
                  for {inquiry.guest_count} {inquiry.guest_count === 1 ? "guest" : "guests"} — fixed by the combo.
                </p>
              )}

              {loadingCatalog && offerCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading your combo…</p>
              ) : offerCourses.length === 0 ? (
                <SnapshotRow
                  label="Your dishes"
                  value={offerFoodForDisplay(inquiry, activePackage)
                    .map((entry) => entry.item_name)
                    .join(", ")}
                  wide
                />
              ) : (
                <div className="space-y-3">
                  {errors.offer_food_snapshot && (
                    <p className="text-xs font-medium text-destructive">{errors.offer_food_snapshot}</p>
                  )}
                  {offerCourses.map((course) => {
                    const required = offerCourseRequirement(course.category);
                    const chosen = chosenForCourse(course.category);
                    const single = course.items.length === 1;
                    return (
                      <div key={course.category}>
                        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {course.category}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {single ? "Included" : `Choose ${required} (${chosen.length}/${required})`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {course.items.map((dish) => {
                            const active = single || chosen.some((entry) => entry.item_name === dish);
                            return (
                              <button
                                key={dish}
                                type="button"
                                disabled={single}
                                onClick={() => toggleCourseDish(course.category, dish, required)}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                                  active
                                    ? "border-primary bg-primary/5 font-semibold text-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                                } ${single ? "cursor-default" : "cursor-pointer"}`}
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
                    <div className="border-t border-border pt-3">
                      <SnapshotRow
                        label="Also included"
                        value={offerInclusions(activePackage).join(", ")}
                        wide
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : (
            includesFood && (
              <Card className="p-4">
                <SectionTitle
                  icon={Utensils}
                  right={<EditableBadge>{(form.selected_menu || []).length} selected</EditableBadge>}
                >
                  Food &amp; menu
                </SectionTitle>

                {/* Selected Dishes Tray */}
                {(form.selected_menu || []).length > 0 && (
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/40 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                        Selected Dishes ({(form.selected_menu || []).length})
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
                        <PickChip key={item._id} label={item.name} onRemove={() => toggleDish(item)} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={dishQuery}
                      onChange={(e) => setDishQuery(e.target.value)}
                      placeholder="Search dishes by name or category (e.g. Sisig, Lumpia, Pork)..."
                      aria-label="Search dishes"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]"
                    />
                    {dishQuery && (
                      <button
                        type="button"
                        onClick={() => setDishQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Course Filter Pills */}
                  <CourseFilterBar
                    activeGroup={activeCourseTab}
                    onSelectGroup={setActiveCourseTab}
                    totalDishCount={menuCatalog?.length || 0}
                    groups={groupedDishes}
                    selectedCountsByGroup={selectedCountsByGroup}
                  />

                  {/* Dishes Grid */}
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-3">
                    {loadingCatalog ? (
                      <p className="p-4 text-center text-xs text-slate-400">Loading dishes...</p>
                    ) : filteredDishes.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                        <p>{dishQuery ? `No dishes match "${dishQuery}"` : "No dishes available."}</p>
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
                            Reset search &amp; filters
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
                                      ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]/50 shadow-2xs"
                                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt=""
                                        className="h-8 w-8 shrink-0 rounded object-cover border border-slate-200/70"
                                      />
                                    ) : (
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                                        <Utensils size={12} />
                                      </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                                        {item.name}
                                      </p>
                                      {item.description && (
                                        <p className="truncate text-[10px] text-slate-500 leading-tight">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    className={cn(
                                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ml-1",
                                      isChosen
                                        ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
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
              </Card>
            )
          )}

          {addOnChoices.length > 0 && (
            <Card className="p-4">
              <SectionTitle icon={Boxes} right={<EditableBadge>Add or remove</EditableBadge>}>
                Add-ons &amp; extra services
              </SectionTitle>
              <div className="divide-y divide-border">
                {addOnChoices.map((choice) => (
                  <div key={choice.name} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{choice.name}</p>
                      {choice.description && (
                        <p className="truncate text-[11px] text-muted-foreground">{choice.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {choice.price > 0 ? formatCurrency(choice.price) : "Quoted"}
                      </span>
                      <QuantityStepper
                        value={addOnQuantity(choice.name)}
                        onChange={(next) => setAddOnQuantity(choice, next)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {scaffoldOptions.length > 1 && (
            <Card className="p-4">
              <SectionTitle icon={Ruler} right={<EditableBadge>Choose a size</EditableBadge>}>
                Event space size
              </SectionTitle>
              <Field
                label="Setup size"
                hint="The equipment reserved for your event follows the size you pick."
              >
                <TSelect
                  value={form.selected_scaffold_option_id}
                  onChange={(val) => setForm((prev) => ({ ...prev, selected_scaffold_option_id: val }))}
                  options={scaffoldOptions.map((option) => ({
                    value: String(option._id),
                    label:
                      eventSpaceLabel({ selected_scaffold_option_id: option._id }, activePackage) ||
                      option.label ||
                      "Setup size",
                  }))}
                  placeholder="Select a size"
                />
              </Field>
            </Card>
          )}

          {inquiry.is_custom_setup && (
            <Card className="p-4">
              <SectionTitle icon={Palette} right={<EditableBadge>Editable</EditableBadge>}>
                Custom setup brief
              </SectionTitle>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Target budget" hint="Optional.">
                  <TInput
                    placeholder="e.g. 50,000 - 80,000"
                    value={form.budget_range}
                    onChange={(val) => setForm((prev) => ({ ...prev, budget_range: val }))}
                  />
                </Field>
                <Field label="Setup notes" hint="Tell our stylists what you have in mind.">
                  <TTextarea
                    rows={3}
                    value={form.custom_setup_notes}
                    onChange={(val) => setForm((prev) => ({ ...prev, custom_setup_notes: val }))}
                  />
                </Field>
              </div>
            </Card>
          )}


          <Card className="p-4">
            <SectionTitle icon={CalendarDays}>Event</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Event type" required error={errors.event_type}>
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
                  placeholder="Select event type"
                  hasError={!!errors.event_type}
                />
              </Field>

              {form.event_type === OTHER_EVENT_TYPE && (
                <Field label="Which kind of event?" required>
                  <TInput
                    placeholder="e.g. Reunion"
                    value={form.event_type_other}
                    onChange={(val) => setForm((prev) => ({ ...prev, event_type_other: val }))}
                  />
                </Field>
              )}

              <Field label="Event date" required error={errors.event_date}>
                <TInput
                  type="date"
                  min={toDateInputValue(new Date())}
                  value={form.event_date}
                  onChange={(val) => setForm((prev) => ({ ...prev, event_date: val }))}
                  hasError={!!errors.event_date}
                />
              </Field>

              <Field label="Start time" required error={errors.start_time}>
                <TInput
                  type="time"
                  value={form.start_time}
                  onChange={(val) => setForm((prev) => ({ ...prev, start_time: val }))}
                  hasError={!!errors.start_time}
                />
              </Field>

              <Field label="Duration (hours)" hint="Optional.">
                <TInput
                  type="number"
                  min="1"
                  value={form.duration_hours}
                  onChange={(val) => setForm((prev) => ({ ...prev, duration_hours: val }))}
                />
              </Field>

              <Field
                label="Guest count"
                required={!isOffer}
                error={errors.guest_count}
                hint={isOffer ? "Fixed by your Special Offer combo." : undefined}
              >
                {isOffer ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <strong className="text-sm">{inquiry.guest_count} guests</strong>
                  </div>
                ) : (
                  <GuestCounter
                    value={Number(form.guest_count) || 1}
                    onChange={(val) => setForm((prev) => ({ ...prev, guest_count: val }))}
                    min={1}
                    max={1000}
                  />
                )}
              </Field>

              {!isOffer && (
                <Field label="Service type" hint="What you'd like included.">
                  <TSelect
                    value={form.service_type}
                    onChange={(val) => setForm((prev) => ({ ...prev, service_type: val }))}
                    options={[SERVICE_TYPES.FOOD_ONLY, SERVICE_TYPES.SETUP_ONLY, SERVICE_TYPES.FULL_SERVICE]}
                  />
                </Field>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle icon={MapPin}>Venue</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Municipality" required={!isPickup} error={errors.municipality}>
                  <TSelect
                    value={form.municipality}
                    onChange={(val) => setForm((prev) => ({ ...prev, municipality: val, barangay: "" }))}
                    options={municipalities}
                    placeholder="Select municipality"
                    hasError={!!errors.municipality}
                  />
                </Field>
                <Field
                  label="Barangay"
                  required={!isPickup}
                  hint={!form.municipality ? "Select a municipality first" : undefined}
                  error={errors.barangay}
                >
                  <TSelect
                    value={form.barangay}
                    onChange={(val) => setForm((prev) => ({ ...prev, barangay: val }))}
                    options={barangays}
                    placeholder="Select barangay"
                    disabled={!form.municipality}
                    hasError={!!errors.barangay}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Street and building" className="sm:col-span-2">
                  <TInput
                    value={form.street}
                    onChange={(val) => setForm((prev) => ({ ...prev, street: val }))}
                    placeholder="e.g. Purok 4, Lopez Building"
                  />
                </Field>
                <Field label="ZIP code" hint="Optional.">
                  <TInput
                    value={form.zip_code}
                    onChange={(val) => setForm((prev) => ({ ...prev, zip_code: val }))}
                    placeholder="e.g. 4200"
                  />
                </Field>
              </div>

              <Field label="Venue type" hint="Optional.">
                <TSelect
                  value={form.venue_type}
                  onChange={(val) => setForm((prev) => ({ ...prev, venue_type: val }))}
                  options={VENUE_TYPES}
                  placeholder="Select venue type"
                />
              </Field>

              {isVenueTypeOther && (
                <Field label="Please specify your venue type">
                  <TInput
                    value={form.venue_type_other}
                    onChange={(val) => setForm((prev) => ({ ...prev, venue_type_other: val }))}
                    placeholder="e.g. Rooftop terrace"
                  />
                </Field>
              )}

              <Field label="Landmark" hint="Optional.">
                <TInput
                  value={form.landmark}
                  onChange={(val) => setForm((prev) => ({ ...prev, landmark: val }))}
                  placeholder="e.g. Across the municipal hall"
                />
              </Field>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle icon={Palette}>Theme and colour palette</SectionTitle>
            <p className="mb-3 text-[13px] text-muted-foreground">
              Two independent, optional choices — change either one without affecting the other.
            </p>

            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h4 className="text-[12px] font-semibold text-foreground">Theme</h4>
              <FieldStatusPill value={form.event_theme} />
            </div>
            <ThemePicker
              value={form.event_theme}
              onChange={(theme) => setForm((prev) => ({ ...prev, event_theme: theme }))}
            />

            <div className="mt-4 mb-1.5 flex items-center justify-between gap-3 border-t border-border pt-4">
              <h4 className="text-[12px] font-semibold text-foreground">Color palette</h4>
              <FieldStatusPill
                value={
                  Array.isArray(form.event_palette) && form.event_palette.length > 0
                    ? form.event_palette.join(", ")
                    : ""
                }
              />
            </div>
            <ColorPalettePicker
              value={form.event_palette}
              onChange={(palette) => setForm((prev) => ({ ...prev, event_palette: palette }))}
            />
          </Card>

          <Card className="p-4">
            <SectionTitle icon={Utensils}>Requests and dietary needs</SectionTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Special requests" hint="Optional.">
                <TTextarea
                  value={form.special_requests}
                  onChange={(val) => setForm((prev) => ({ ...prev, special_requests: val }))}
                  rows={3}
                />
              </Field>
              <Field label="Allergies" hint="Optional.">
                <TTextarea
                  value={form.allergies}
                  onChange={(val) => setForm((prev) => ({ ...prev, allergies: val }))}
                  rows={3}
                />
              </Field>
              <Field label="Dietary restrictions" hint="Optional." className="md:col-span-2">
                <TTextarea
                  value={form.dietary_restrictions}
                  onChange={(val) => setForm((prev) => ({ ...prev, dietary_restrictions: val }))}
                  rows={3}
                />
              </Field>
            </div>
          </Card>

          {showDelivery && (
            <Card className="p-4">
              <SectionTitle icon={Truck}>Delivery</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Method">
                  <TSelect
                    value={form.delivery_method}
                    onChange={(val) => setForm((prev) => ({ ...prev, delivery_method: val }))}
                    options={[
                      { value: "delivery", label: "Deliver to my address" },
                      { value: "pickup", label: "I'll pick it up" },
                    ]}
                  />
                </Field>
                {!isPickup && (
                  <Field label="Delivery instructions" hint="Optional.">
                    <TTextarea
                      value={form.delivery_instructions}
                      onChange={(val) => setForm((prev) => ({ ...prev, delivery_instructions: val }))}
                      rows={2}
                    />
                  </Field>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <SectionTitle icon={User}>Contact</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name" required error={errorFor("contact_first_name")}>
                <TInput
                  value={form.contact_first_name}
                  onChange={(val) => setForm((prev) => ({ ...prev, contact_first_name: val }))}
                  onBlur={() => handleBlur("contact_first_name")}
                  hasError={!!errorFor("contact_first_name")}
                />
              </Field>
              <Field label="Last name" required error={errorFor("contact_last_name")}>
                <TInput
                  value={form.contact_last_name}
                  onChange={(val) => setForm((prev) => ({ ...prev, contact_last_name: val }))}
                  onBlur={() => handleBlur("contact_last_name")}
                  hasError={!!errorFor("contact_last_name")}
                />
              </Field>
              <Field label="Email address" required error={errorFor("contact_email")}>
                <TInput
                  type="email"
                  value={form.contact_email}
                  onChange={(val) => setForm((prev) => ({ ...prev, contact_email: val }))}
                  onBlur={() => handleBlur("contact_email")}
                  hasError={!!errorFor("contact_email")}
                />
              </Field>
              <Field label="Mobile number" required error={errorFor("contact_phone")}>
                <TInput
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.contact_phone}
                  onChange={(val) => handlePhoneChange("contact_phone", val)}
                  onBlur={() => handleBlur("contact_phone")}
                  hasError={!!errorFor("contact_phone")}
                />
              </Field>
              <Field
                label="Backup number"
                error={errorFor("contact_alt_phone")}
                hint={!primaryPhoneFilled ? "Enter primary mobile number first" : "Optional."}
              >
                <TInput
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.contact_alt_phone}
                  onChange={(val) => handlePhoneChange("contact_alt_phone", val)}
                  onBlur={() => handleBlur("contact_alt_phone")}
                  disabled={!primaryPhoneFilled}
                  hasError={!!errorFor("contact_alt_phone")}
                />
              </Field>
            </div>
          </Card>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving} className="rounded-lg h-9 px-4 text-xs font-semibold cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="rounded-lg h-9 px-5 text-xs font-semibold bg-[#4C81E0] hover:bg-[#3b6ec6] text-white shadow-2xs cursor-pointer">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
