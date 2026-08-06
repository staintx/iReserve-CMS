import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import useToast from "../../../hooks/useToast";
import {
  BATANGAS_PROVINCE,
  getBatangasBarangays,
  getBatangasMunicipalities,
} from "../../../utils/batangas";
import Modal from "../../../components/common/Modal";
import { Button } from "../../../components/ui/button";
import { PrimaryBtn } from "./components/BookingSharedUI";
// Step Components
import BookingStepper from "./components/BookingStepper";
import StepServiceType from "./steps/StepServiceType";
import StepDateTime from "./steps/StepDateTime";
import StepEventDetails from "./steps/StepEventDetails";
import StepDeliveryDetails from "./steps/StepDeliveryDetails";
import StepMenuSelection from "./steps/StepMenuSelection";
import StepDietaryNeeds from "./steps/StepDietaryNeeds";
import StepContactInfo from "./steps/StepContactInfo";
import StepReviewBooking from "./steps/StepReviewBooking";
import StepPayment from "./steps/StepPayment";
import StepAddonSelection from "./steps/StepAddonSelection";
import StepPackageSelection from "./steps/StepPackageSelection";
import StepPackageAddOns from "./steps/StepPackageAddOns";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const VALID_EVENT_TYPES = ["Birthday", "Wedding", "Corporate"];
const DEFAULT_DEPOSIT_PERCENTAGE = 20;
const MIN_DATE_OFFSET_DAYS = 3;
const SESSION_STORAGE_KEY_FORM = "booking_wizard_form";
const SESSION_STORAGE_KEY_STEP = "booking_wizard_step";

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------
const parseNumber = (value) => {
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isValidEmail = (value) => {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const isValidPhone = (value) => {
  const digits = normalizePhone(value);
  return /^(?:63|0)?9\d{9}$/.test(digits);
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function BookingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  // --- Location State ---
  const initialEventType = location.state?.eventType || "";
  const initialServiceType = location.state?.serviceType || "";
  const initialPackageId = location.state?.packageId || null;
  const initialPackagePrice = location.state?.packagePrice || 0;
  const initialPackageName = location.state?.packageName || "";
  const initialGuestMin = location.state?.guestMin || null;
  const initialGuestMax = location.state?.guestMax || null;
  const isCustomBooking = !initialPackageId;
  const matchedServiceType = ["Food Only", "Event Setup Only", "Food and Event Setup"].find(
    (service) => service.toLowerCase() === initialServiceType.toLowerCase(),
  );
  const shouldSkipServiceType = Boolean(initialPackageId || matchedServiceType);

  // --- Derived ---
  const matchedType = VALID_EVENT_TYPES.find(
    (t) => t.toLowerCase() === initialEventType.toLowerCase(),
  );
  const isOther = initialEventType && !matchedType;

  // --- State ---
  const [step, setStep] = useState(() => {
    if (location.state?.resetWizard) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY_STEP);
      sessionStorage.removeItem(SESSION_STORAGE_KEY_FORM);
      return 0;
    }
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY_STEP);
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 0;
  });

  const [form, setForm] = useState(() => {
    if (!location.state?.resetWizard) {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY_FORM);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      customer_id: user?._id || "",
      event_type: matchedType || (isOther ? "Other" : ""),
      event_type_other: isOther ? initialEventType : "",
      event_theme: "",
      event_date: "",
      start_time: "",
      duration_hours: "4",
      guest_count: initialGuestMin ? String(initialGuestMin) : "50",
      service_type: matchedServiceType || "Food and Event Setup",
      include_food: !matchedServiceType || matchedServiceType !== "Event Setup Only",
      package_id: initialPackageId || "",
      venue_type: "",
      indoor_outdoor: "Indoor",
      province: BATANGAS_PROVINCE,
      municipality: "",
      barangay: "",
      street: "",
      landmark: "",
      zip_code: "",
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
      payment_method: "",
    };
  });

  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState({
    status: "idle",
    message: "",
  });
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
  });
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedDates, setSuggestedDates] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({});
  const [packageDetails, setPackageDetails] = useState(null);
  const guestMin = isCustomBooking ? 1 : initialGuestMin || 1;
  const guestMax = isCustomBooking ? 1000 : initialGuestMax || 500;

  // Payment option: 'deposit' or 'full'
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("deposit");

  // --- Memoized values ---
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() + MIN_DATE_OFFSET_DAYS);
  const minDate = minDateObj.toISOString().split("T")[0];

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(form.municipality),
    [form.municipality],
  );

  const isFoodOnly = isCustomBooking && form.service_type === "Food Only";
  const isEventSetupOnly =
    isCustomBooking && form.service_type === "Event Setup Only";
  const isFoodAndEventSetup =
    isCustomBooking && form.service_type === "Food and Event Setup";

  const requireAvailabilityCheck = !isFoodOnly;

  // --- Step Definition ---
  const wizardSteps = useMemo(() => {
    const steps = [];
    if (isCustomBooking && !shouldSkipServiceType) {
      steps.push({ id: "ServiceType", label: "Service Type", key: "service" });
    }
    steps.push({ id: "DateTime", label: "Event Info", key: "datetime" });

    if (isFoodOnly) {
      steps.push({ id: "DeliveryDetails", label: "Delivery", key: "delivery" });
      steps.push({ id: "MenuSelection", label: "Menu", key: "menu" });
      steps.push({
        id: "DietaryNeeds",
        label: "Dietary Needs",
        key: "dietary",
      });
    } else if (isEventSetupOnly) {
      steps.push({
        id: "PackageSelection",
        label: "Package",
        key: "package",
      });
      steps.push({ id: "EventDetails", label: "Event Details", key: "event" });
      steps.push({ id: "PackageAddOns", label: "Add-ons", key: "addons" });
    } else if (isFoodAndEventSetup) {
      steps.push({ id: "EventDetails", label: "Event Details", key: "event" });
      steps.push({ id: "MenuSelection", label: "Menu", key: "menu" });
      steps.push({
        id: "DietaryNeeds",
        label: "Dietary Needs",
        key: "dietary",
      });
      steps.push({
        id: "AddonSelection",
        label: "Addons",
        key: "addons",
      });
    } else {
      // Standard Package
      steps.push({ id: "EventDetails", label: "Event Details", key: "event" });
      steps.push({ id: "PackageAddOns", label: "Add-ons", key: "addons" });
    }

    // ✅ Removed CostSummary step - price info now shown in Review step
    steps.push({ id: "ContactInfo", label: "Contact Info", key: "contact" });
    steps.push({ id: "ReviewBooking", label: "Review Inquiry", key: "review" });
    return steps;
  }, [isCustomBooking, isFoodOnly, isEventSetupOnly, isFoodAndEventSetup]);

  const currentStepId = wizardSteps[step]?.id;

  // --- Validation Rules ---
  const STEP_VALIDATIONS = {
    DateTime: {
      check: () => !!form.event_date && !!form.start_time,
      message: "Please select a date and time.",
      extraCheck: () => {
        if (requireAvailabilityCheck && availability.status !== "available") {
          return {
            valid: false,
            message: "Please perform and pass the availability check.",
          };
        }
        return { valid: true };
      },
    },
    EventDetails: {
      check: () => {
        const eventType =
          form.event_type === "Other"
            ? form.event_type_other?.trim()
            : form.event_type;
        const guestCount = Number(form.guest_count);
        return (
          !!eventType &&
          !!form.municipality &&
          !!form.barangay &&
          guestCount > 0
        );
      },
      message:
        "Please fill in all required fields (event type, location, guest count).",
    },
    DeliveryDetails: {
      check: () => {
        if (form.delivery_method === "pickup") return true;
        return !!form.municipality && !!form.barangay && !!form.street;
      },
      message: "Please fill in all required delivery address fields.",
    },
    MenuSelection: {
      check: () => true,
      message: "",
    },
    AddonSelection: {
      check: () => true,
      message: "",
    },
    PackageAddOns: {
      check: () => true,
      message: "",
    },
    PackageSelection: {
      check: () => !!form.package_id || !!initialPackageId,
      message: "Please select a package to continue.",
    },
    ContactInfo: {
      check: () => {
        const primaryPhoneValid = isValidPhone(form.contact_phone);
        const altPhoneValid = !form.contact_alt_phone || isValidPhone(form.contact_alt_phone);

        return (
          !!String(form.contact_first_name || "").trim() &&
          !!String(form.contact_last_name || "").trim() &&
          isValidEmail(form.contact_email) &&
          primaryPhoneValid &&
          altPhoneValid
        );
      },
      message: "Please fill in all required contact fields with valid information.",
    },
    ReviewBooking: {
      check: () => agreements.terms && agreements.privacy,
      message: "Please accept the terms and privacy policy to continue.",
    },
  };

  // --- Persist to session storage ---
  useEffect(() => {
    sessionStorage.setItem(SESSION_STORAGE_KEY_FORM, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_STORAGE_KEY_STEP, step.toString());
  }, [step]);

  // --- Auto-fill user data ---
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      customer_id: prev.customer_id || user._id,
      contact_email: prev.contact_email || user.email || "",
    }));
  }, [user]);

  // --- Fetch data ---
  useEffect(() => {
    CustomerAPI.getBusinessInfo()
      .then((res) => setBusinessInfo(res.data || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    CustomerAPI.getMenu()
      .then((res) => {
        const next = Array.isArray(res.data) ? res.data : [];
        setMenuItems(next.filter((item) => item?.available !== false));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    CustomerAPI.getAddons()
      .then((res) => {
        const next = Array.isArray(res.data) ? res.data : [];
        setAddons(
          next.filter(
            (item) => item?.available !== false,
          ),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    CustomerAPI.getPackages()
      .then((res) => {
        const next = Array.isArray(res.data) ? res.data : [];
        setPackages(next.filter((pkg) => pkg?.available !== false));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const selectedPackageId = form.package_id || initialPackageId;
    if (!selectedPackageId) {
      setPackageDetails(null);
      return;
    }

    CustomerAPI.getPackageById(selectedPackageId)
      .then((res) => setPackageDetails(res.data))
      .catch(() => setPackageDetails(null));
  }, [form.package_id, initialPackageId]);

  // If an event-setup-only package is selected, populate inventory_items from package setup_equipment
  useEffect(() => {
    if (!packageDetails) return;
    if (form.service_type !== "Event Setup Only") return;
    if (!Array.isArray(packageDetails.setup_equipment)) return;

    const inventoryItemsFromPackage = packageDetails.setup_equipment.map(
      (it) => ({
        inventory_id: it.inventory_id,
        quantity: Number(it.quantity || 1),
      }),
    );

    setForm((prev) => ({
      ...prev,
      inventory_items: inventoryItemsFromPackage,
    }));
  }, [packageDetails, form.service_type]);

  // --- Availability auto-check ---
  useEffect(() => {
    if (!form.event_date || !form.start_time) {
      setAvailability({ status: "idle", message: "" });
      return;
    }

    setAvailability({
      status: "checking",
      message: "Checking availability...",
    });

    const timer = setTimeout(() => {
      CustomerAPI.checkAvailability({
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
      })
        .then((res) => {
          // Normalize API truthy/falsy values
          const apiAvailable =
            res.data.available === true ||
            res.data.available === "true" ||
            res.data.available === 1 ||
            Boolean(res.data.available);

          if (apiAvailable) {
            setAvailability({
              status: "available",
              message: "Selected time is available.",
            });
            setSuggestedDates([]);
          } else {
            if (res.data.blocked) {
              setAvailability({
                status: "blocked",
                message: res.data.reason || "This date is currently unavailable.",
              });
            } else if (res.data.inventory_issue) {
              setAvailability({
                status: "blocked",
                message:
                  res.data.inventory_issue || "This date is blocked due to inventory limitations.",
              });
            } else {
              setAvailability({
                status: "unavailable",
                message: "Selected time has a conflict.",
              });
            }

            CustomerAPI.suggestDates({
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
              range: 7,
            })
              .then((sugRes) => {
                if (sugRes.data?.suggestions) {
                  setSuggestedDates(sugRes.data.suggestions);
                }
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.error("Availability check failed:", err);
          setAvailability({ 
            status: "idle", 
            message: err.message || "Failed to check availability." 
          });
          setSuggestedDates([]);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [
    form.event_date,
    form.start_time,
    form.venue_type,
    form.municipality,
    form.barangay,
  ]);

  // --- Pricing calculations ---
  const depositPercentage =
    businessInfo?.deposit_percentage ?? DEFAULT_DEPOSIT_PERCENTAGE;

  const totalPrice = useMemo(() => {
    const pax = parseNumber(form.guest_count) || 0;
    let sum = 0;

    if (isCustomBooking) {
      const customEventSetupPrice =
        businessInfo?.custom_event_setup_price || 15000;
      const customFoodEventPricePerPax =
        businessInfo?.custom_food_and_event_price || 800;

      if (form.service_type === "Event Setup Only") {
        const selectedPackageId = form.package_id || initialPackageId;
        const packagePrice = Number(packageDetails?.setup_price || 0);
        sum +=
          selectedPackageId && packagePrice > 0
            ? packagePrice
            : customEventSetupPrice;
      } else if (form.service_type === "Food and Event Setup") {
        sum += customFoodEventPricePerPax * pax;
      } else if (form.service_type === "Food Only") {
        if (form.selected_menu && form.selected_menu.length > 0) {
          const perPaxCost = form.selected_menu.reduce(
            (acc, item) => acc + (Number(item.price) || 0),
            0,
          );
          sum += perPaxCost * pax;
        }
      }
    } else {
      // Standard Package
      const basePrice = initialPackagePrice || 0;
      const packageType = packageDetails?.package_type || "Food + Event Setup";
      sum += packageType === "Event Setup Only" ? basePrice : basePrice * pax;
    }

    form.additional_services?.forEach((svc) => {
      sum += Number(svc.price || 0) * Number(svc.quantity || 1);
    });

    form.selected_package_addons?.forEach((addon) => {
      sum += Number(addon.price || 0) * Number(addon.quantity || 1);
    });

    return sum;
  }, [
    form.guest_count,
    form.service_type,
    form.additional_services,
    form.selected_menu,
    initialPackagePrice,
    packageDetails,
    isCustomBooking,
    businessInfo,
  ]);

  const depositAmount = (totalPrice * depositPercentage) / 100;

  // --- Adjust step if out of bounds ---
  useEffect(() => {
    if (step >= wizardSteps.length) {
      setStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, step]);

  // --- Navigation handlers ---
  const handleNext = () => {
    const validation = STEP_VALIDATIONS[currentStepId];
    if (validation) {
      if (!validation.check()) {
        notify(validation.message, "error");
        return;
      }
      if (validation.extraCheck) {
        const extra = validation.extraCheck();
        if (!extra.valid) {
          notify(extra.message, "error");
          return;
        }
      }
    }

    setStep((s) => Math.min(s + 1, wizardSteps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step === 0 || (step === 1 && !isCustomBooking)) {
      if (initialPackageId) {
        navigate(`/packages/${initialPackageId}`);
      } else {
        navigate("/customer/packages");
      }
    } else {
      setStep((s) => Math.max(s - 1, 0));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // --- Submit booking ---
  const submitBooking = async (paymentMethod, paymentOption = "deposit") => {
    if (isSubmitting) return;
    setError("");
    try {
      if (!user?._id) {
        setError("Your session expired. Please log in again.");
        return;
      }

      setIsSubmitting(true);

      const eventTypeValue =
        form.event_type === "Other"
          ? String(form.event_type_other || "").trim()
          : String(form.event_type || "").trim();

      const finalEventType =
        eventTypeValue || (isFoodOnly ? "Food Delivery" : "");

      const payload = {
        ...form,
        customer_id: user._id,
        event_type: finalEventType,
        guest_count: parseNumber(form.guest_count),
        duration_hours: parseNumber(form.duration_hours) || 4,
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_type: paymentOption === "full" ? "full" : "deposit",
        service_items: [...(form.selected_package_addons || []), ...(form.additional_services || [])],
        delivery_method: isFoodOnly ? form.delivery_method : "setup",
        selected_menu: form.selected_menu
          ? form.selected_menu.map((m) => m._id || m)
          : [],
      };

      if (form.package_id || initialPackageId) {
        payload.package_id = form.package_id || initialPackageId;
      } else {
        delete payload.package_id;
      }

      delete payload.event_type_other;
      delete payload.additional_services;
      delete payload.selected_package_addons;
      if (!payload.contact_alt_phone) {
        delete payload.contact_alt_phone;
      }

      const inquiryRes = await CustomerAPI.submitInquiry(payload);
      const newInquiry = inquiryRes.data;

      sessionStorage.removeItem(SESSION_STORAGE_KEY_FORM);
      sessionStorage.removeItem(SESSION_STORAGE_KEY_STEP);

      notify("Inquiry submitted successfully! We will review and send you a quotation.", "success");
      navigate("/customer/inquiries");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit booking");
      setIsSubmitting(false);
    }
  };

  // --- Render step components ---
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
            setAvailability={setAvailability}
            suggestedDates={suggestedDates}
            requireAvailabilityCheck={requireAvailabilityCheck}
            onNext={handleNext}
          />
        );
      case "PackageSelection":
        return (
          <StepPackageSelection
            packages={packages}
            form={form}
            setForm={setForm}
            packageDetails={packageDetails}
            selectedPackageId={form.package_id || initialPackageId}
            onSelectPackage={(pkgId) => {
              const pkg =
                packages.find((p) => p._id === pkgId) || packageDetails;
              let selectedOptionId = pkg?.default_scaffold_option_id || null;
              let width = null;
              let length = null;
              let area = null;
              if (
                pkg &&
                Array.isArray(pkg.scaffold_size_options) &&
                pkg.scaffold_size_options.length > 0
              ) {
                const opt =
                  pkg.scaffold_size_options.find(
                    (o) => String(o._id) === String(selectedOptionId),
                  ) || pkg.scaffold_size_options[0];
                if (opt) {
                  selectedOptionId = String(opt._id);
                  width = opt.width_ft || null;
                  length = opt.length_ft || null;
                  area =
                    opt.area_ft2 || (width && length ? width * length : null);
                }
              }

              setForm((prev) => ({
                ...prev,
                package_id: pkgId,
                selected_scaffold_option_id:
                  selectedOptionId || prev.selected_scaffold_option_id,
                scaffold_width: width || prev.scaffold_width,
                scaffold_length: length || prev.scaffold_length,
                scaffold_base_area: area || prev.scaffold_base_area,
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
            totalPrice={totalPrice}
            depositAmount={depositAmount}
            onNext={handleNext}
          />
        );
      case "MenuSelection":
        return (
          <StepMenuSelection
            form={form}
            setForm={setForm}
            menuItems={menuItems}
            totalPrice={totalPrice}
            depositAmount={depositAmount}
            onNext={handleNext}
            depositPercentage={depositPercentage}
            selectedPaymentOption={selectedPaymentOption}
            setSelectedPaymentOption={setSelectedPaymentOption}
          />
        );
      case "DietaryNeeds":
        return (
          <StepDietaryNeeds
            form={form}
            setForm={setForm}
            totalPrice={totalPrice}
            depositAmount={depositAmount}
            onNext={handleNext}
            depositPercentage={depositPercentage}
            selectedPaymentOption={selectedPaymentOption}
            setSelectedPaymentOption={setSelectedPaymentOption}
          />
        );
      case "AddonSelection":
        return (
          <StepAddonSelection
            form={form}
            setForm={setForm}
            addons={addons}
          />
        );
      case "PackageAddOns":
        return (
          <StepPackageAddOns
            form={form}
            setForm={setForm}
            packageDetails={packageDetails}
          />
        );
      case "ContactInfo":
        return <StepContactInfo form={form} setForm={setForm} />;
      case "ReviewBooking":
        return (
          <StepReviewBooking
            form={form}
            initialPackageName={initialPackageName}
            pickupAddress={businessInfo?.pickup_address || businessInfo?.address}
            totalPrice={totalPrice}
            depositAmount={depositAmount}
            agreements={agreements}
            setAgreements={setAgreements}
            setShowTerms={setShowTerms}
            setShowPrivacy={setShowPrivacy}
          />
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <BookingStepper currentStepIndex={step + 1} steps={wizardSteps} />
        </div>

        <div className="mb-6">{renderStep()}</div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-[#E2E8F0] pt-6">
          <PrimaryBtn variant="ghost" onClick={handleBack}>
            Back
          </PrimaryBtn>
          {currentStepId === "ReviewBooking" ? (
            <PrimaryBtn
              variant="primary"
              onClick={submitBooking}
              className="w-full sm:w-auto"
              disabled={!agreements.terms || !agreements.privacy || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Inquiry"}
            </PrimaryBtn>
          ) : (
            !["DeliveryDetails", "MenuSelection", "DietaryNeeds"].includes(
              currentStepId,
            ) &&
            !(currentStepId === "DateTime" && requireAvailabilityCheck) && (
              <PrimaryBtn
                variant="primary"
                onClick={handleNext}
                className="w-full sm:w-auto"
              >
                Continue
              </PrimaryBtn>
            )
          )}
        </div>
      </div>

      {/* Modals */}
      {showTerms && (
        <Modal title="Terms and Conditions" onClose={() => setShowTerms(false)}>
          <div className="text-slate-600 space-y-4 p-4 text-sm">
            <h4 className="font-semibold text-slate-800">
              Booking & Reservation
            </h4>
            <p>
              All bookings are subject to availability. A reservation is
              confirmed only once details are provided and deposit paid.
            </p>
            <h4 className="font-semibold text-slate-800">Payment Terms</h4>
            <p>
              A {depositPercentage}% down payment is required to reserve the
              date. Balance is due before the event.
            </p>
            <h4 className="font-semibold text-slate-800 text-red-600">
              Cancellation Policy
            </h4>
            <p>All deposits are non-refundable and non-transferable.</p>
          </div>
        </Modal>
      )}

      {showPrivacy && (
        <Modal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
          <div className="text-slate-600 space-y-4 p-4 text-sm">
            <h4 className="font-semibold text-slate-800">Data Collection</h4>
            <p>
              We collect personal information to facilitate your booking and
              provide services.
            </p>
            <h4 className="font-semibold text-slate-800">Use of Information</h4>
            <p>
              Data is used strictly for processing catering orders and
              communications.
            </p>
          </div>
        </Modal>
      )}
    </CustomerLayout>
  );
}
