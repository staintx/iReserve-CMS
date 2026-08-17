import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, RotateCcw } from "lucide-react";

import CustomerLayout from "../../../components/layout/CustomerLayout";
import Modal from "../../../components/common/Modal";
import { TermsContent, PrivacyContent } from "../../../components/policy/PolicyDocs";
import { CustomerAPI } from "../../../api/customer";
import useAuth from "../../../hooks/useAuth";
import useToast from "../../../hooks/useToast";
import {
  BATANGAS_PROVINCE,
  getBatangasBarangays,
  getBatangasMunicipalities,
} from "../../../utils/batangas";
import { PrimaryBtn, InfoNote } from "./components/BookingSharedUI";

import BookingStepper from "./components/BookingStepper";
import StepServiceType from "./steps/StepServiceType";
import StepDateTime from "./steps/StepDateTime";
import StepEventDetails from "./steps/StepEventDetails";
import StepDeliveryDetails from "./steps/StepDeliveryDetails";
import StepMenuSelection from "./steps/StepMenuSelection";
import StepDietaryNeeds from "./steps/StepDietaryNeeds";
import StepContactInfo from "./steps/StepContactInfo";
import StepReviewBooking from "./steps/StepReviewBooking";
import StepAddonSelection from "./steps/StepAddonSelection";
import StepPackageSelection from "./steps/StepPackageSelection";
import StepPackageAddOns from "./steps/StepPackageAddOns";

import {
  SERVICE_TYPES,
  buildEstimate,
  contactFieldError,
} from "./lib/bookingRules";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const VALID_EVENT_TYPES = ["Birthday", "Wedding", "Corporate"];
const MIN_DATE_OFFSET_DAYS = 3;

// Drafts are namespaced per account so signing in as someone else in the same
// tab can never surface the previous customer's half-filled booking, and are
// discarded once they are older than a week (an event date chosen then is
// usually stale, and availability certainly is).
const DRAFT_KEY_PREFIX = "booking_wizard_draft";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const draftKey = (userId) => `${DRAFT_KEY_PREFIX}:${userId || "guest"}`;

// Step changes scroll back to the top, which is movement the customer did not
// ask for — honour the OS-level preference the same way the stylesheet does.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
};

const parseNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const readDraft = (userId) => {
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.form) return null;
    if (draft.savedAt && Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      sessionStorage.removeItem(draftKey(userId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);
const isValidPhone = (value) => {
  const digits = normalizePhone(value);
  return /^09\d{9}$/.test(digits);
};

const clearDraft = (userId) => {
  try {
    sessionStorage.removeItem(draftKey(userId));
  } catch {
    /* storage unavailable — the draft simply isn't kept */
  }
};

const determineEventTypeFromPackage = (pkg) => {
  if (!pkg) return "";
  if (pkg.event_type) return pkg.event_type;
  const name = String(pkg.name || "").toLowerCase();
  if (name.includes("wedding")) return "Wedding";
  if (name.includes("birthday") || name.includes("debut")) return "Birthday / Debut";
  if (name.includes("corporate")) return "Corporate Event";
  if (name.includes("fiesta") || name.includes("party")) return "Social Party / Fiesta";
  return "";
};

const parseName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};



// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function BookingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  // --- Entry context (package page, landing modal, or a bare "Book" link) ---
  const initialEventType = location.state?.eventType || "";
  const initialServiceType = location.state?.serviceType || "";
  const initialPackageId = location.state?.packageId || null;
  const initialPackagePrice = location.state?.packagePrice || 0;
  const initialPackageName = location.state?.packageName || "";
  const initialGuestMin = location.state?.guestMin || null;
  const initialGuestMax = location.state?.guestMax || null;

  const isCustomBooking = !initialPackageId;
  const matchedServiceType = Object.values(SERVICE_TYPES).find(
    (service) => service.toLowerCase() === initialServiceType.toLowerCase(),
  );
  const shouldSkipServiceType = Boolean(initialPackageId || matchedServiceType);

  const matchedType = VALID_EVENT_TYPES.find(
    (type) => type.toLowerCase() === initialEventType.toLowerCase(),
  );
  const isOtherEventType = initialEventType && !matchedType;

  const buildInitialForm = useCallback(
    () => ({
      customer_id: user?._id || "",
      event_type: matchedType || (isOtherEventType ? "Other" : ""),
      event_type_other: isOtherEventType ? initialEventType : "",
      event_theme: "",
      event_palette: [],
      is_custom_setup: false,
      custom_setup_scope: [],
      inspiration_images: [],
      custom_setup_notes: "",
      budget_range: "",
      event_date: "",
      start_time: "",
      duration_hours: "4",
      guest_count: initialGuestMin ? String(initialGuestMin) : "50",
      service_type: matchedServiceType || SERVICE_TYPES.FULL_SERVICE,
      include_food: matchedServiceType !== SERVICE_TYPES.SETUP_ONLY,
      package_id: initialPackageId || "",
      venue_type: "",
      indoor_outdoor: "Indoor",
      province: BATANGAS_PROVINCE,
      municipality: "",
      barangay: "",
      street: "",
      landmark: "",
      zip_code: "",
      delivery_method: "delivery",
      delivery_instructions: "",
      selected_menu: [],
      dietary_restrictions: "",
      allergies: "",
      special_requests: "",
      additional_services: [],
      selected_package_addons: [],
      contact_first_name: "",
      contact_last_name: "",
      contact_email: user?.email || "",
      contact_phone: "",
      contact_alt_phone: "",
      contact_method: "email",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?._id, user?.email],
  );

  // --- Draft-aware initial state -------------------------------------------
  // A draft is only restored when the customer did not explicitly ask for a
  // fresh start (`resetWizard`, which every "Book an event" CTA sends).
  const restoredDraft = useMemo(() => {
    if (location.state?.resetWizard) {
      clearDraft(user?._id);
      return null;
    }
    return readDraft(user?._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState(() => restoredDraft?.form || buildInitialForm());
  const [step, setStep] = useState(() => restoredDraft?.step ?? 0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [draftNoticeVisible, setDraftNoticeVisible] = useState(
    Boolean(restoredDraft),
  );

  // --- Remote data ---
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [packages, setPackages] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({});
  const [packageDetails, setPackageDetails] = useState(null);

  // --- Flow state ---
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [availability, setAvailability] = useState({ status: "idle", message: "" });
  const [availabilityNonce, setAvailabilityNonce] = useState(0);
  const [suggestedDates, setSuggestedDates] = useState([]);
  const [agreements, setAgreements] = useState({ terms: false, privacy: false });
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmitted = useRef(false);

  // Guest bounds come from real data wherever it exists: the scaffold size the
  // customer picked, then the package itself, then the router state a package
  // page passed in. Only with none of those does the flow fall back to an open
  // range. Previously a package chosen inside the wizard was ignored entirely,
  // so a 40-150 guest package silently accepted 1 or 900.
  const { guestMin, guestMax } = useMemo(() => {
    const positive = (candidate) => {
      const parsed = Number(candidate);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    // Deliberately not clamped to the chosen setup size. Guest count is how
    // many people the customer is actually expecting; setup capacity is a
    // separate constraint on the structure. Forcing them to be the same number
    // made a 45-guest event impossible to describe once a larger setup was
    // selected. The mismatch is surfaced as guidance instead (setupCapacity).
    const packageMin =
      positive(packageDetails?.guest_min) || positive(initialGuestMin);
    const packageMax =
      positive(packageDetails?.guest_max) || positive(initialGuestMax);
    if (packageMin || packageMax) {
      return { guestMin: packageMin || 1, guestMax: packageMax || 1000 };
    }

    return { guestMin: 1, guestMax: 1000 };
  }, [
    packageDetails?.guest_min,
    packageDetails?.guest_max,
    initialGuestMin,
    initialGuestMax,
  ]);

  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + MIN_DATE_OFFSET_DAYS);
    return date.toISOString().split("T")[0];
  }, []);

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(form.municipality),
    [form.municipality],
  );

  const isFoodOnly =
    isCustomBooking && form.service_type === SERVICE_TYPES.FOOD_ONLY;
  const isEventSetupOnly =
    isCustomBooking && form.service_type === SERVICE_TYPES.SETUP_ONLY;
  const isFoodAndEventSetup =
    isCustomBooking && form.service_type === SERVICE_TYPES.FULL_SERVICE;
  const selectedPackageId =
    form.package_id === "none"
      ? ""
      : form.package_id || initialPackageId || "";

  // Food Only never occupies the venue, so it is not subject to the
  // venue-conflict check that gates the other paths.
  const requireAvailabilityCheck = !isFoodOnly;

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------
  const wizardSteps = useMemo(() => {
    const steps = [];
    if (isCustomBooking && !shouldSkipServiceType) {
      steps.push({ id: "ServiceType", label: "Service", key: "service" });
    }
    steps.push({ id: "DateTime", label: "Date & time", key: "datetime" });

    if (isFoodOnly) {
      steps.push({ id: "DeliveryDetails", label: "Guests & delivery", key: "delivery" });
      steps.push({ id: "MenuSelection", label: "Dishes", key: "menu" });
      steps.push({ id: "DietaryNeeds", label: "Dietary needs", key: "dietary" });
    } else if (isEventSetupOnly) {
      steps.push({ id: "PackageSelection", label: "Package", key: "package" });
      steps.push({ id: "EventDetails", label: "Event details", key: "event" });
      steps.push({ id: "PackageAddOns", label: "Extras", key: "addons" });
    } else if (isFoodAndEventSetup) {
      steps.push({ id: "PackageSelection", label: "Package", key: "package" });
      steps.push({ id: "EventDetails", label: "Event details", key: "event" });
      steps.push({ id: "MenuSelection", label: "Menu", key: "menu" });
      if (form.include_food !== false) {
        steps.push({ id: "DietaryNeeds", label: "Dietary needs", key: "dietary" });
      }
      steps.push({ id: "AddonSelection", label: "Extras", key: "addons" });
    } else {
      // Started from Package page
      steps.push({ id: "EventDetails", label: "Event details", key: "event" });
      steps.push({ id: "MenuSelection", label: "Menu", key: "menu" });
      if (form.include_food !== false) {
        steps.push({ id: "DietaryNeeds", label: "Dietary needs", key: "dietary" });
      }
      steps.push({ id: "PackageAddOns", label: "Extras", key: "addons" });
    }

    steps.push({ id: "ContactInfo", label: "Contact", key: "contact" });
    steps.push({ id: "ReviewBooking", label: "Review", key: "review" });
    return steps;
  }, [
    isCustomBooking,
    shouldSkipServiceType,
    isFoodOnly,
    isEventSetupOnly,
    isFoodAndEventSetup,
    form.include_food,
  ]);

  const currentStepId = wizardSteps[step]?.id;

  useEffect(() => {
    if (step >= wizardSteps.length) {
      setStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, step]);

  // ---------------------------------------------------------------------------
  // Draft persistence
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (hasSubmitted.current) return;
    try {
      sessionStorage.setItem(
        draftKey(user?._id),
        JSON.stringify({ form, step, savedAt: Date.now() }),
      );
    } catch {
      /* storage full or unavailable — the flow still works, just not resumable */
    }
  }, [form, step, user?._id]);

  // A half-filled booking should not vanish to a stray Cmd-W or Back gesture.
  // The prompt is suppressed once the inquiry is on its way to the server.
  useEffect(() => {
    const hasProgress =
      Boolean(form.event_date) ||
      (form.selected_menu?.length || 0) > 0 ||
      Boolean(form.contact_first_name);

    if (!hasProgress || isSubmitting || hasSubmitted.current) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.event_date, form.selected_menu, form.contact_first_name, isSubmitting]);

  const startOver = () => {
    clearDraft(user?._id);
    setForm(buildInitialForm());
    setStep(0);
    setAgreements({ terms: false, privacy: false });
    setFieldErrors({});
    setError("");
    setIsEditing(false);
    setDraftNoticeVisible(false);
    scrollToTop();
  };

  // --- Keep the floating chat button clear of the sticky wizard footer ---
  useEffect(() => {
    document.body.classList.add("booking-flow");
    return () => document.body.classList.remove("booking-flow");
  }, []);

  // --- Auto-fill user data from profile ---
  useEffect(() => {
    if (!user) return;

    const applyProfileData = (profileData) => {
      const { firstName, lastName } = parseName(profileData.full_name || user.full_name || "");
      const email = profileData.email || user.email || "";
      const phone = normalizePhone(profileData.phone || user.phone || "");
      const altPhone = normalizePhone(profileData.alt_phone || user.alt_phone || "");

      setForm((prev) => ({
        ...prev,
        customer_id: prev.customer_id || profileData._id || user._id,
        contact_first_name: prev.contact_first_name || firstName,
        contact_last_name: prev.contact_last_name || lastName,
        contact_email: prev.contact_email || email,
        contact_phone: prev.contact_phone || phone,
        contact_alt_phone: prev.contact_alt_phone || altPhone,
      }));
    };

    CustomerAPI.getProfile()
      .then((res) => {
        if (res.data) {
          applyProfileData(res.data);
        } else {
          applyProfileData(user);
        }
      })
      .catch(() => {
        applyProfileData(user);
      });
  }, [user]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  useEffect(() => {
    CustomerAPI.getBusinessInfo()
      .then((res) => setBusinessInfo(res.data || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    CustomerAPI.getMenu()
      .then((res) =>
        setMenuItems(
          (Array.isArray(res.data) ? res.data : []).filter(
            (item) => item?.available !== false,
          ),
        ),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    CustomerAPI.getAddons()
      .then((res) =>
        setAddons(
          (Array.isArray(res.data) ? res.data : []).filter(
            (item) => item?.available !== false,
          ),
        ),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    CustomerAPI.getPackages()
      .then((res) =>
        setPackages(
          (Array.isArray(res.data) ? res.data : []).filter(
            (pkg) => pkg?.available !== false,
          ),
        ),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPackageId) {
      setPackageDetails(null);
      return;
    }
    CustomerAPI.getPackageById(selectedPackageId)
      .then((res) => setPackageDetails(res.data))
      .catch(() => setPackageDetails(null));
  }, [selectedPackageId]);

  // A setup package brings its own equipment; carry it onto the inquiry so the
  // team sees what has to be reserved.
  useEffect(() => {
    if (!packageDetails) return;
    if (form.service_type === SERVICE_TYPES.FOOD_ONLY) return;
    const equipment = packageDetails.setup_equipment;
    if (!Array.isArray(equipment) || equipment.length === 0) return;

    setForm((prev) => ({
      ...prev,
      inventory_items: equipment.map((item) => ({
        inventory_id: item.inventory_id,
        name: item.name || item.item_name || "Equipment item",
        quantity: Number(item.quantity || 1),
      })),
    }));
  }, [packageDetails, form.service_type]);

  // Seed the menu from the package the customer started from, matched against
  // the loaded catalog so prices and categories are available. They can still
  // swap dishes afterwards — the course rules are enforced either way.
  const seededPackageId = useRef(null);
  useEffect(() => {
    if (!packageDetails) return;
    if (form.service_type !== SERVICE_TYPES.FULL_SERVICE) return;
    if (!Array.isArray(packageDetails.menu_items)) return;
    if (menuItems.length === 0) return;
    if (seededPackageId.current === String(packageDetails._id)) return;

    seededPackageId.current = String(packageDetails._id);
    const packageMenuIds = packageDetails.menu_items.map((entry) =>
      String(entry?._id || entry),
    );
    setForm((prev) => ({
      ...prev,
      selected_menu: menuItems.filter((item) =>
        packageMenuIds.includes(String(item._id)),
      ),
    }));
  }, [packageDetails, form.service_type, menuItems]);

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------
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
      venue_type: form.venue_type,
      province: form.province,
      municipality: form.municipality,
      barangay: form.barangay,
      street: form.street,
      delivery_method: form.delivery_method,
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
            status: res.data?.blocked || res.data?.inventory_issue ? "blocked" : "unavailable",
            message:
              res.data?.reason ||
              res.data?.inventory_issue ||
              "We already have an event booked at this time.",
          });

          CustomerAPI.suggestDates({ ...params, range: 7 })
            .then((suggestion) =>
              setSuggestedDates(suggestion.data?.suggestions || []),
            )
            .catch(() => setSuggestedDates([]));
        })
        .catch(() => {
          // A failed check is not a free slot. It becomes its own state so the
          // step can explain it and offer a retry rather than silently blocking
          // the Continue button.
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
    form.province,
    form.municipality,
    form.barangay,
    form.street,
    form.delivery_method,
    form.service_type,
    availabilityNonce,
  ]);

  const isAvailabilityPending =
    requireAvailabilityCheck && availability.status === "checking";
  const isAvailabilityConfirmed =
    !requireAvailabilityCheck || availability.status === "available";
  const isAvailabilityBlocked =
    requireAvailabilityCheck && !isAvailabilityPending && !isAvailabilityConfirmed;

  // How the chosen setup size compares with the guest count. Both numbers come
  // from the data: guest_min/guest_max on the scaffold option the customer
  // picked. No capacity is inferred for options that do not declare one.
  const setupCapacity = useMemo(() => {
    if (form.service_type !== SERVICE_TYPES.SETUP_ONLY) return null;

    const min = Number(form.scaffold_guest_min) || null;
    const max = Number(form.scaffold_guest_max) || null;
    if (!min && !max) return null;

    const guests = parseNumber(form.guest_count) || 0;
    if (!guests) return null;

    const label =
      min && max ? `${min} to ${max} guests` : max ? `up to ${max} guests` : `${min} guests or more`;

    if (max && guests > max) {
      return {
        status: "over",
        message: `Your setup size fits ${label}, but you have entered ${guests}. Choose a larger size, or lower the guest count.`,
      };
    }
    if (min && guests < min) {
      return {
        status: "under",
        message: `Your setup size is built for ${label}. With ${guests} guests a smaller size may suit you better.`,
      };
    }
    return { status: "ok", message: `Your setup size fits ${label}.` };
  }, [
    form.service_type,
    form.scaffold_guest_min,
    form.scaffold_guest_max,
    form.guest_count,
  ]);

  // ---------------------------------------------------------------------------
  // Estimate — one calculation, rendered by every price surface
  // ---------------------------------------------------------------------------
  const estimate = useMemo(
    () =>
      buildEstimate({
        form,
        packageDetails,
        businessInfo,
        isCustomBooking,
        standardPackagePrice: initialPackagePrice,
      }),
    [form, packageDetails, businessInfo, isCustomBooking, initialPackagePrice],
  );

  // ---------------------------------------------------------------------------
  // Per-step validation
  // ---------------------------------------------------------------------------
  // Every rule names the field it is about, so the step can highlight it and the
  // action bar can state the problem in words the customer can act on.
  const validateStep = useCallback(
    (stepId) => {
      const errors = {};
      let message = "";

      switch (stepId) {
        case "DateTime": {
          if (!form.event_date) message = "Choose a date for your event.";
          else if (!form.start_time) message = "Choose a start time.";
          else if (isAvailabilityPending)
            message = "We are still checking that slot. One moment.";
          else if (availability.status === "error")
            message =
              "We couldn't check whether that slot is free. Try the check again before continuing.";
          else if (isAvailabilityBlocked)
            message =
              availability.message ||
              "That slot isn't available. Pick another date or time.";
          break;
        }

        case "PackageSelection": {
          if (!form.is_custom_setup && (!selectedPackageId || selectedPackageId === "none")) {
            errors.package_id = "Choose a setup package or switch to Design from Scratch.";
            message = "Choose a setup package or switch to Design from Scratch.";
          }
          if (form.is_custom_setup && !String(form.event_theme || "").trim()) {
            errors.event_theme = "Please choose or describe your event theme.";
            message = "Please choose or describe your event theme.";
          }
          break;
        }

        case "EventDetails": {
          const eventType =
            form.event_type === "Other"
              ? String(form.event_type_other || "").trim()
              : form.event_type;
          if (!eventType) {
            errors[form.event_type === "Other" ? "event_type_other" : "event_type"] =
              "Tell us what kind of event this is.";
          }
          if (!form.municipality)
            errors.municipality = "Select the municipality of your venue.";
          if (!form.barangay) errors.barangay = "Select the barangay.";

          const guests = parseNumber(form.guest_count) || 0;
          if (guests <= 0) {
            errors.guest_count = "Enter how many guests you're expecting.";
          } else if (guests < guestMin || guests > guestMax) {
            errors.guest_count = `Enter a guest count between ${guestMin} and ${guestMax}.`;
          } else if (setupCapacity?.status === "over") {
            errors.guest_count = setupCapacity.message;
          }
          break;
        }

        case "DeliveryDetails": {
          const guests = parseNumber(form.guest_count) || 0;
          if (guests <= 0)
            errors.guest_count = "Enter how many guests you're feeding.";
          if (form.delivery_method !== "pickup") {
            if (!form.municipality)
              errors.municipality = "Select the delivery municipality.";
            if (!form.barangay) errors.barangay = "Select the barangay.";
            if (!String(form.street || "").trim())
              errors.street = "Enter the street and building so we can find you.";
          }
          break;
        }

        // MenuSelection: no rule to enforce here — dishes are a free choice
        // with no required categories or cap, on every service path.

        case "ContactInfo": {
          [
            "contact_first_name",
            "contact_last_name",
            "contact_email",
            "contact_phone",
            "contact_alt_phone",
          ].forEach((field) => {
            const fieldError = contactFieldError(field, form[field]);
            if (fieldError) errors[field] = fieldError;
          });
          if (Object.keys(errors).length > 0)
            message = "Complete your contact details.";
          break;
        }

        case "ReviewBooking": {
          if (!agreements.terms) errors.terms = "Accept the terms.";
          if (!agreements.privacy) errors.privacy = "Accept the privacy policy.";
          if (Object.keys(errors).length > 0)
            message = "Read and agree to the policies before submitting.";
          break;
        }

        default:
          break;
      }

      const valid = !message && Object.keys(errors).length === 0;
      return { valid, errors, message };
    },
    [
      form,
      agreements,
      availability,
      isAvailabilityPending,
      isAvailabilityBlocked,
      selectedPackageId,
      guestMin,
      guestMax,
      setupCapacity,
    ],
  );

  // Once a customer has fixed something, the stale complaint should go away on
  // its own rather than sitting there until they press Continue again.
  useEffect(() => {
    if (!error && Object.keys(fieldErrors).length === 0) return;
    const { valid } = validateStep(currentStepId);
    if (valid) {
      setError("");
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, agreements, availability.status]);

  const goToStep = (nextStep) => {
    setStep(nextStep);
    setError("");
    setFieldErrors({});
    // The restore notice has served its purpose the moment the customer moves.
    // Left up, it repeated itself on every remaining step.
    setDraftNoticeVisible(false);
    scrollToTop();
  };

  const reviewIndex = wizardSteps.findIndex(
    (entry) => entry.id === "ReviewBooking",
  );

  // Which step owns each review section, resolved against the steps this
  // customer actually has. Paths differ (Food Only has no PackageSelection,
  // Event Setup Only uses PackageAddOns rather than AddonSelection), so a
  // hardcoded id would leave dead Edit buttons on some paths.
  const editTargets = useMemo(() => {
    const ids = new Set(wizardSteps.map((entry) => entry.id));
    const firstPresent = (...candidates) =>
      candidates.find((id) => ids.has(id)) || null;

    return {
      // The service type and the package/setup size live on different steps,
      // and the review card that lists a package and a setup size has to send
      // the customer to the step where those are actually changeable. Pointing
      // both at ServiceType meant "Edit" next to a setup size opened the
      // service chooser, which cannot change it.
      service: firstPresent("ServiceType"),
      packageSetup: firstPresent("PackageSelection"),
      schedule: firstPresent("DateTime"),
      details: firstPresent("DeliveryDetails", "EventDetails"),
      food: firstPresent("MenuSelection"),
      dietary: firstPresent("DietaryNeeds"),
      // Food Only has no add-ons step; its notes field lives on the menu step.
      extras: firstPresent("AddonSelection", "PackageAddOns", "MenuSelection"),
      contact: firstPresent("ContactInfo"),
    };
  }, [wizardSteps]);

  // Correcting one answer from the review page should cost one step out and one
  // step back, not a walk through every screen in between. While `isEditing` is
  // set, the primary action returns to review instead of advancing, and the
  // secondary action abandons the detour. The step's own validation still runs,
  // so a correction cannot leave the booking in a state the flow would reject.
  const [isEditing, setIsEditing] = useState(false);

  const returnToReview = () => {
    setIsEditing(false);
    goToStep(reviewIndex >= 0 ? reviewIndex : wizardSteps.length - 1);
  };

  const handleNext = () => {
    const { valid, errors, message } = validateStep(currentStepId);
    if (!valid) {
      setFieldErrors(errors);
      setError(message);
      return;
    }

    if (currentStepId === "ContactInfo") {
      const fullName = `${form.contact_first_name || ""} ${form.contact_last_name || ""}`.trim();
      CustomerAPI.updateProfile({
        full_name: fullName,
        email: form.contact_email,
        phone: form.contact_phone,
      }).catch(() => {});
    }

    if (isEditing) {
      returnToReview();
      return;
    }
    goToStep(Math.min(step + 1, wizardSteps.length - 1));
  };

  const handleBack = () => {
    if (isEditing) {
      // Values are already in `form`, so this discards nothing. It just drops
      // the detour and puts the customer back where they started.
      returnToReview();
      return;
    }
    if (step > 0) {
      goToStep(step - 1);
      return;
    }
    // Leaving from the first step keeps the draft in session storage, so coming
    // back through any booking CTA that isn't an explicit "start over" resumes.
    if (initialPackageId) navigate(`/packages/${initialPackageId}`);
    else navigate("/customer/packages");
  };

  const editStep = (stepId) => {
    const index = wizardSteps.findIndex((entry) => entry.id === stepId);
    if (index < 0) return;
    setIsEditing(true);
    goToStep(index);
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const scheduleDisplay = useMemo(() => {
    if (!form.event_date || !form.start_time) return { date: "", time: "" };

    const [year, month, day] = String(form.event_date).split("-").map(Number);
    const date =
      year && month && day
        ? new Date(year, month - 1, day).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : form.event_date;

    const [rawHours, minutes] = String(form.start_time).split(":");
    const hours24 = parseInt(rawHours, 10);
    const period = hours24 >= 12 ? "PM" : "AM";

    return {
      date,
      time: `${String(hours24 % 12 || 12).padStart(2, "0")}:${minutes} ${period}`,
    };
  }, [form.event_date, form.start_time]);

  const submitInquiry = async () => {
    if (isSubmitting || hasSubmitted.current) return;

    const { valid, errors, message } = validateStep("ReviewBooking");
    if (!valid) {
      setFieldErrors(errors);
      setError(message);
      // On mobile the agreements sit well below the fold while "Send request"
      // is pinned to the bottom bar, so the error named a control the customer
      // could not see. Bring it into view.
      document
        .getElementById("booking-agreements")
        ?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      return;
    }

    if (!user?._id) {
      setError(
        "Your session has expired. Sign in again. Your booking details are saved and will be here when you return.",
      );
      return;
    }

    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the security check.");
      document
        .getElementById("booking-agreements")
        ?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      return;
    }

    setError("");
    setIsSubmitting(true);

    const eventType =
      (form.event_type === "Other"
        ? String(form.event_type_other || "").trim()
        : String(form.event_type || "").trim()) ||
      (isFoodOnly ? "Food Delivery" : "");

    const payload = {
      ...form,
      "cf-turnstile-response": turnstileToken,
      // " " is the picker's "Something else" sentinel, not a real theme.
      event_theme: String(form.event_theme || "").trim(),
      event_palette: Array.isArray(form.event_palette) ? form.event_palette : [],
      customer_id: user._id,
      event_type: eventType,
      guest_count: parseNumber(form.guest_count),
      duration_hours: parseNumber(form.duration_hours) || 4,
      // What the customer was shown. The quotation the admin issues stays the
      // authoritative figure — this only records what was on screen.
      estimated_total: estimate.total,
      service_items: [
        ...(form.selected_package_addons || []),
        ...(form.additional_services || []),
      ],
      delivery_method: isFoodOnly ? form.delivery_method : "setup",
      selected_menu: (form.selected_menu || []).map((item) => item._id || item),
    };

    if (selectedPackageId) payload.package_id = selectedPackageId;
    else delete payload.package_id;

    delete payload.event_type_other;
    delete payload.additional_services;
    delete payload.selected_package_addons;
    if (!payload.contact_alt_phone) delete payload.contact_alt_phone;

    try {
      const { data } = await CustomerAPI.submitInquiry(payload);

      hasSubmitted.current = true;
      clearDraft(user._id);

      notify("Request sent. We'll reply with your quotation.", "success");
      navigate("/customer/inquiries", {
        state: { submittedReference: data?.reference || null },
      });
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 429
          ? "You just sent a request a moment ago. Wait a minute before sending another. Nothing you entered has been lost."
          : err.response?.data?.message ||
              "We couldn't send your request. Everything you entered is still here. Check your connection and try again.",
      );
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const renderStep = () => {
    switch (currentStepId) {
      case "ServiceType":
        return <StepServiceType form={form} setForm={setForm} />;

      case "DateTime":
        return (
          <StepDateTime
            form={form}
            setForm={setForm}
            minDate={minDate}
            availability={availability}
            suggestedDates={suggestedDates}
            requireAvailabilityCheck={requireAvailabilityCheck}
            onRetryAvailability={() => setAvailabilityNonce((n) => n + 1)}
            leadTimeDays={MIN_DATE_OFFSET_DAYS}
          />
        );

      case "PackageSelection":
        return (
          <StepPackageSelection
            packages={packages}
            form={form}
            setForm={setForm}
            packageDetails={packageDetails}
            selectedPackageId={selectedPackageId}
            estimate={estimate}
            errors={fieldErrors}
            setupCapacity={setupCapacity}
            onSelectPackage={(packageId) => {
              if (selectedPackageId === packageId) {
                // Unselect current package
                setForm((prev) => ({
                  ...prev,
                  package_id: "none",
                  selected_scaffold_option_id: "",
                  scaffold_width: undefined,
                  scaffold_length: undefined,
                  scaffold_base_area: undefined,
                  scaffold_price: undefined,
                  scaffold_guest_min: undefined,
                  scaffold_guest_max: undefined,
                  selected_package_addons: [],
                }));
                return;
              }

              const pkg =
                packages.find((entry) => entry._id === packageId) || packageDetails;
              const options = Array.isArray(pkg?.scaffold_size_options)
                ? pkg.scaffold_size_options
                : [];
              const option =
                options.find(
                  (entry) =>
                    String(entry._id) === String(pkg?.default_scaffold_option_id),
                ) || options[0];

              setForm((prev) => ({
                ...prev,
                package_id: packageId,
                selected_scaffold_option_id: option
                  ? String(option._id)
                  : prev.selected_scaffold_option_id,
                scaffold_width: option?.width_ft ?? prev.scaffold_width,
                scaffold_length: option?.length_ft ?? prev.scaffold_length,
                scaffold_base_area:
                  option?.area_ft2 ??
                  (option?.width_ft && option?.length_ft
                    ? option.width_ft * option.length_ft
                    : prev.scaffold_base_area),
                scaffold_price: option?.price ?? prev.scaffold_price,
                scaffold_guest_min: option?.guest_min ?? prev.scaffold_guest_min,
                scaffold_guest_max: option?.guest_max ?? prev.scaffold_guest_max,
              }));
            }}
          />
        );

      case "EventDetails":
        return (
          <StepEventDetails
            form={form}
            setForm={setForm}
            initialEventType={initialEventType}
            municipalities={municipalities}
            barangays={barangays}
            isCustomBooking={isCustomBooking}
            selectedPackageName={packageDetails?.name || initialPackageName}
            guestMin={guestMin}
            guestMax={guestMax}
            estimate={estimate}
            errors={fieldErrors}
            setupCapacity={setupCapacity}
          />
        );

      case "DeliveryDetails":
        return (
          <StepDeliveryDetails
            form={form}
            setForm={setForm}
            municipalities={municipalities}
            barangays={barangays}
            pickupAddress={businessInfo?.pickup_address || businessInfo?.address}
            estimate={estimate}
            errors={fieldErrors}
          />
        );

      case "MenuSelection":
        return (
          <StepMenuSelection
            form={form}
            setForm={setForm}
            menuItems={menuItems}
            estimate={estimate}
            isFullService={!isFoodOnly}
          />
        );

      case "DietaryNeeds":
        return <StepDietaryNeeds form={form} setForm={setForm} />;

      case "AddonSelection":
        return (
          <StepAddonSelection
            form={form}
            setForm={setForm}
            addons={addons}
            estimate={estimate}
          />
        );

      case "PackageAddOns":
        return (
          <StepPackageAddOns
            form={form}
            setForm={setForm}
            packageDetails={packageDetails}
            estimate={estimate}
          />
        );

      case "ContactInfo":
        return (
          <StepContactInfo form={form} setForm={setForm} errors={fieldErrors} />
        );

      case "ReviewBooking":
        return (
          <StepReviewBooking
            form={form}
            packageName={packageDetails?.name || initialPackageName}
            pickupAddress={businessInfo?.pickup_address || businessInfo?.address}
            estimate={estimate}
            agreements={agreements}
            setAgreements={setAgreements}
            onShowTerms={() => setShowTerms(true)}
            onShowPrivacy={() => setShowPrivacy(true)}
            onEditStep={editStep}
            editTargets={editTargets}
            errors={fieldErrors}
            setTurnstileToken={setTurnstileToken}
          />
        );

      default:
        return null;
    }
  };

  const isReview = currentStepId === "ReviewBooking";
  const nextStepLabel = wizardSteps[step + 1]?.label;

  return (
    <CustomerLayout
      marketing
      contentClassName="mx-auto flex min-h-[calc(100vh-var(--ls-header-h))] w-full max-w-6xl flex-col px-4 pb-0 pt-4 sm:px-6"
    >
      {/* Progress header — sticks under the site header so users never lose place */}
      <div className="sticky top-[var(--ls-header-h,73px)] z-20 -mx-4 mb-4 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <BookingStepper currentStepIndex={step + 1} steps={wizardSteps} />
      </div>

      {draftNoticeVisible && (
        <InfoNote tone="info" title="We picked up where you left off" className="mb-4">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Your earlier answers are still here.
            <button
              type="button"
              onClick={startOver}
              className="inline-flex items-center gap-1.5 font-semibold text-[#4C81E0] underline"
            >
              <RotateCcw size={13} />
              Start a new booking instead
            </button>
            <button
              type="button"
              onClick={() => setDraftNoticeVisible(false)}
              className="font-semibold text-[#64748B] underline"
            >
              Dismiss
            </button>
          </span>
        </InfoNote>
      )}

      {/* Extra bottom room on mobile so the last row of any grid can be
          scrolled clear of the floating chat button, which is a shared global
          widget and stays where it is on every other page. */}
      <div className="flex-1 pb-20 sm:pb-4">{renderStep()}</div>

      {/* Sticky action bar — the single primary action for every step */}
      <div className="sticky bottom-0 z-30 -mx-4 border-t border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <PrimaryBtn variant="ghost" onClick={handleBack} className="px-3 sm:px-4">
              <ArrowLeft size={16} />
              {isEditing ? "Cancel" : "Back"}
            </PrimaryBtn>

            <p className="hidden min-w-0 flex-1 truncate text-center text-xs text-[#94A3B8] sm:block">
              {isEditing
                ? "Editing one answer. We will take you straight back to your review."
                : isReview
                  ? "Sending this asks for a quotation. No payment is taken."
                  : nextStepLabel
                    ? `Next: ${nextStepLabel}`
                    : ""}
            </p>

            {isReview ? (
              <PrimaryBtn
                variant="primary"
                onClick={submitInquiry}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending
                  </>
                ) : (
                  "Send request"
                )}
              </PrimaryBtn>
            ) : currentStepId === "DateTime" ? (
              <PrimaryBtn
                variant="primary"
                onClick={() => {
                  const { valid, message } = validateStep("DateTime");
                  if (!valid && !form.event_date) {
                    setError(message);
                    return;
                  }
                  if (!form.start_time) {
                    setError("Choose a start time to continue.");
                    return;
                  }
                  setShowScheduleConfirm(true);
                }}
              >
                {isEditing ? "Save and review" : "Continue"}
                <ArrowRight size={16} />
              </PrimaryBtn>
            ) : (
              <PrimaryBtn variant="primary" onClick={handleNext}>
                {isEditing ? "Save and review" : "Continue"}
                <ArrowRight size={16} />
              </PrimaryBtn>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScheduleConfirm && (
        <Modal
          title="Confirm your schedule"
          onClose={() => setShowScheduleConfirm(false)}
        >
          <div className="space-y-4 text-sm text-[#64748B]">
            <p>
              We&apos;ll price your event for
              <strong className="text-[#1E293B]"> {scheduleDisplay.date}</strong> at
              <strong className="text-[#1E293B]"> {scheduleDisplay.time}</strong>.
              You can change this later from the review step.
            </p>

            {isAvailabilityPending && (
              <InfoNote tone="info">
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#4C81E0]" />
                  Checking that this slot is still free
                </span>
              </InfoNote>
            )}

            {availability.status === "error" && (
              <InfoNote tone="danger" title="We couldn't check this slot">
                Something went wrong reaching our booking calendar. Close this and use
                Try again on the schedule card. Nothing you entered is lost.
              </InfoNote>
            )}

            {isAvailabilityBlocked && availability.status !== "error" && (
              <InfoNote tone="danger" title="This slot isn't available">
                {availability.message ||
                  "We already have an event at this time. Please choose a different date or time."}
              </InfoNote>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <PrimaryBtn
              variant="outline"
              onClick={() => setShowScheduleConfirm(false)}
              className="w-full sm:w-auto"
            >
              {isAvailabilityBlocked ? "Choose another time" : "Cancel"}
            </PrimaryBtn>
            <PrimaryBtn
              variant="primary"
              onClick={() => {
                setShowScheduleConfirm(false);
                handleNext();
              }}
              disabled={!isAvailabilityConfirmed}
              className="w-full sm:w-auto"
            >
              {isAvailabilityPending ? "Checking" : "Confirm and continue"}
            </PrimaryBtn>
          </div>
        </Modal>
      )}

      {/* The shared Modal clips its body (`overflow-hidden`) and DialogContent
          sets no max height, so a full policy document has to bring its own
          bounded, scrollable region or it runs off the viewport. */}
      {showTerms && (
        <Modal
          title="Terms and Conditions"
          onClose={() => setShowTerms(false)}
          className="max-h-[85vh] sm:max-w-2xl"
        >
          <div className="h-full overflow-y-auto pr-1">
            <TermsContent depositPercentage={estimate.depositPercentage} />
          </div>
        </Modal>
      )}

      {showPrivacy && (
        <Modal
          title="Privacy Policy"
          onClose={() => setShowPrivacy(false)}
          className="max-h-[85vh] sm:max-w-2xl"
        >
          <div className="h-full overflow-y-auto pr-1">
            <PrivacyContent />
          </div>
        </Modal>
      )}
    </CustomerLayout>
  );
}
