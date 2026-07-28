import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import useToast from "../../../hooks/useToast";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../../utils/batangas";
import Modal from "../../../components/common/Modal";
import { Button } from "../../../components/ui/button";

// New Step Components
import BookingStepper from "./components/BookingStepper";
import StepServiceType from "./steps/StepServiceType";
import StepDateTime from "./steps/StepDateTime";
import StepEventDetails from "./steps/StepEventDetails";
import StepDeliveryDetails from "./steps/StepDeliveryDetails";
import StepMenuSelection from "./steps/StepMenuSelection";
import StepDietaryNeeds from "./steps/StepDietaryNeeds";
import StepCostSummary from "./steps/StepCostSummary";
import StepContactInfo from "./steps/StepContactInfo";
import StepReviewBooking from "./steps/StepReviewBooking";
import StepPayment from "./steps/StepPayment";

export default function BookingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  const initialEventType = location.state?.eventType || "";
  const initialPackageId = location.state?.packageId || null;
  const initialPackagePrice = location.state?.packagePrice || 0;
  const initialPackageName = location.state?.packageName || "";
  const isCustomBooking = !initialPackageId;

  const [step, setStep] = useState(() => {
    if (location.state?.resetWizard) {
      sessionStorage.removeItem("booking_wizard_step");
      sessionStorage.removeItem("booking_wizard_form");
      return isCustomBooking ? 0 : 1;
    }
    try {
      const saved = sessionStorage.getItem("booking_wizard_step");
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return isCustomBooking ? 0 : 1;
  });

  const today = new Date().toISOString().split("T")[0];
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() + 3);
  const minDate = minDateObj.toISOString().split("T")[0];

  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState({ status: "idle", message: "" });
  const [agreements, setAgreements] = useState({ terms: false, privacy: false });
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedDates, setSuggestedDates] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({});
  const [packageDetails, setPackageDetails] = useState(null);
  
  const validEventTypes = ["Birthday", "Wedding", "Corporate"];
  const matchedType = validEventTypes.find(t => t.toLowerCase() === initialEventType.toLowerCase());
  const isOther = initialEventType && !matchedType;

  const [form, setForm] = useState(() => {
    if (!location.state?.resetWizard) {
      try {
        const saved = sessionStorage.getItem("booking_wizard_form");
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
      guest_count: "50",
      service_type: "Food and Event Setup",
      include_food: true,
      venue_type: "",
      indoor_outdoor: "Indoor",
      province: BATANGAS_PROVINCE,
      municipality: "",
      barangay: "",
      street: "",
      landmark: "",
      zip_code: "",
      venue_contact_name: "",
      venue_contact_phone: "",
      selected_menu: [],
      dietary_restrictions: "",
      allergies: "",
      special_requests: "",
      additional_services: [],
      contact_first_name: "",
      contact_last_name: "",
      contact_email: user?.email || "",
      contact_phone: "",
      contact_alt_phone: "",
      contact_method: "email",
      payment_method: ""
    };
  });

  useEffect(() => {
    sessionStorage.setItem("booking_wizard_form", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    sessionStorage.setItem("booking_wizard_step", step.toString());
  }, [step]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      customer_id: prev.customer_id || user._id,
      contact_email: prev.contact_email || user.email || ""
    }));
  }, [user]);

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(() => getBatangasBarangays(form.municipality), [form.municipality]);

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
    if (initialPackageId) {
      CustomerAPI.getPackageById(initialPackageId)
        .then((res) => setPackageDetails(res.data))
        .catch(() => {});
    }
  }, [initialPackageId]);

  const isFoodOnly = isCustomBooking && form.service_type === "Food Only";

  const wizardSteps = useMemo(() => {
    const steps = [];
    if (isCustomBooking) {
      steps.push({ id: 'ServiceType', label: "Service Type", key: "service" });
    }
    steps.push({ id: 'DateTime', label: "Event Info", key: "datetime" });
    
    if (isFoodOnly) {
      steps.push({ id: 'DeliveryDetails', label: "Delivery", key: "delivery" });
      steps.push({ id: 'MenuSelection', label: "Menu", key: "menu" });
      steps.push({ id: 'DietaryNeeds', label: "Dietary Needs", key: "dietary" });
    } else {
      steps.push({ id: 'EventDetails', label: "Event Details", key: "event" });
    }
    
    steps.push({ id: 'CostSummary', label: "Cost Summary", key: "summary" });
    steps.push({ id: 'ContactInfo', label: "Contact Info", key: "contact" });
    steps.push({ id: 'ReviewBooking', label: "Review Booking", key: "review" });
    steps.push({ id: 'Payment', label: "Payment", key: "payment" });
    return steps;
  }, [isCustomBooking, isFoodOnly]);

  // Adjust current step index if the array length shrinks and we are out of bounds
  useEffect(() => {
    if (step >= wizardSteps.length) {
      setStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [wizardSteps.length, step]);

  useEffect(() => {
    if (!form.event_date || !form.start_time) {
      setAvailability({ status: "idle", message: "" });
      return;
    }

    setAvailability({ status: "checking", message: "Checking availability..." });
    const timer = setTimeout(() => {
      CustomerAPI.checkAvailability({
        event_date: form.event_date,
        start_time: form.start_time,
        venue_type: form.venue_type,
        province: form.province,
        municipality: form.municipality,
        barangay: form.barangay,
        street: form.street
      })
        .then((res) => {
          if (res.data.available) {
            setAvailability({ status: "available", message: "Selected time is available." });
            setSuggestedDates([]);
          } else {
            setAvailability({ status: "unavailable", message: "Selected time has a conflict." });
            CustomerAPI.suggestDates({
              event_date: form.event_date,
              start_time: form.start_time,
              duration_hours: form.duration_hours,
              venue_type: form.venue_type,
              province: form.province,
              municipality: form.municipality,
              barangay: form.barangay,
              street: form.street,
              range: 7
            }).then(sugRes => {
              if (sugRes.data?.suggestions) {
                setSuggestedDates(sugRes.data.suggestions);
              }
            }).catch(() => {});
          }
        })
        .catch(() => {
          setAvailability({ status: "idle", message: "" });
          setSuggestedDates([]);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [form.event_date, form.start_time, form.venue_type, form.municipality, form.barangay]);

  const parseNumber = (value) => {
    const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const depositPercentage = businessInfo?.deposit_percentage ?? 20;

  const totalPrice = useMemo(() => {
    let pax = parseNumber(form.guest_count) || 0;
    let sum = 0;

    if (isCustomBooking) {
      // Dynamic Custom Booking Pricing
      const customEventSetupPrice = businessInfo?.custom_event_setup_price || 15000;
      const customFoodEventPricePerPax = businessInfo?.custom_food_and_event_price || 800;

      if (form.service_type === "Event Setup Only") {
        sum += customEventSetupPrice;
      } else if (form.service_type === "Food and Event Setup") {
        sum += customFoodEventPricePerPax * pax;
      } else if (form.service_type === "Food Only") {
        if (form.selected_menu && form.selected_menu.length > 0) {
          const perPaxCost = form.selected_menu.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
          sum += perPaxCost * pax;
        } else {
          // Fallback if nothing selected yet
          sum += 0;
        }
      }
    } else {
      // Standard Package Pricing
      let basePrice = initialPackagePrice || 0;
      const packageType = packageDetails?.package_type || "Food + Event Setup";
      
      if (packageType === "Event Setup Only") {
        sum += basePrice;
      } else {
        sum += basePrice * pax;
      }
    }

    form.additional_services?.forEach(svc => {
      sum += Number(svc.price || 0) * Number(svc.quantity || 1);
    });

    return sum;
  }, [form.guest_count, form.service_type, form.additional_services, initialPackagePrice, packageDetails, isCustomBooking, businessInfo]);

  const depositAmount = (totalPrice * depositPercentage) / 100;

  const currentStepId = wizardSteps[step]?.id;

  const handleNext = () => {
    if (currentStepId === 'DateTime') {
      if (!form.event_date || !form.start_time) {
        notify("Please select a date and time.", "error");
        return;
      }
      if (availability.status === "unavailable") {
        notify("Please select an available schedule.", "error");
        return;
      }
    }
    if (currentStepId === 'EventDetails') {
      const eventTypeValue = form.event_type === "Other" ? form.event_type_other : form.event_type;
      if (!eventTypeValue || !form.municipality || !form.barangay) {
        notify("Please fill in all required fields.", "error");
        return;
      }
    }
    if (currentStepId === 'DeliveryDetails') {
      if (form.delivery_method !== "pickup" && (!form.municipality || !form.barangay || !form.street)) {
        notify("Please fill in all required delivery address fields.", "error");
        return;
      }
    }
    if (currentStepId === 'ContactInfo') {
      if (!form.contact_first_name || !form.contact_last_name || !form.contact_email || !form.contact_phone) {
        notify("Please fill in all required contact fields.", "error");
        return;
      }
    }
    if (currentStepId === 'ReviewBooking') {
      if (!agreements.terms || !agreements.privacy) {
        notify("Please accept the terms and privacy policy to continue.", "error");
        return;
      }
    }
    
    setStep((s) => Math.min(s + 1, wizardSteps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 0 || (step === 1 && !isCustomBooking)) {
      navigate("/customer/packages");
    } else {
      setStep((s) => Math.max(s - 1, 0));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const submitBooking = async (paymentMethod) => {
    if (isSubmitting) return;
    setError("");
    try {
      if (!user?._id) {
        setError("Your session expired. Please log in again.");
        return;
      }

      setIsSubmitting(true);

      const eventTypeValue = form.event_type === "Other" ? String(form.event_type_other || "").trim() : String(form.event_type || "").trim();

      const payload = {
        ...form,
        customer_id: user._id,
        event_type: eventTypeValue,
        guest_count: parseNumber(form.guest_count),
        duration_hours: parseNumber(form.duration_hours) || 4,
        total_price: totalPrice,
        payment_method: paymentMethod,
        inventory_items: form.additional_services,
        delivery_method: isFoodOnly ? form.delivery_method : "setup",
      };

      if (initialPackageId) {
        payload.package_id = initialPackageId;
      }

      delete payload.event_type_other;
      delete payload.additional_services;
      if (!payload.contact_alt_phone) {
        delete payload.contact_alt_phone;
      }

      const bookingRes = await CustomerAPI.createBooking(payload);
      const newBooking = bookingRes.data;

      sessionStorage.removeItem("booking_wizard_form");
      sessionStorage.removeItem("booking_wizard_step");
      
      notify("Redirecting to secure payment...", "success");
      
      if (newBooking.payment_intent_url) {
        window.location.href = newBooking.payment_intent_url;
      } else if (newBooking.checkout_url) {
        window.location.href = newBooking.checkout_url;
      } else {
        navigate("/customer/booking-success", { state: { booking: newBooking } });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit booking");
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <BookingStepper currentStepIndex={step + 1} steps={wizardSteps} />
        </div>

        <div className="mb-6">
          {currentStepId === 'ServiceType' && (
            <StepServiceType 
              form={form} 
              setForm={setForm} 
            />
          )}
          {currentStepId === 'DateTime' && (
            <StepDateTime 
              form={form} 
              setForm={setForm} 
              minDate={minDate} 
              availability={availability} 
              setAvailability={setAvailability}
              suggestedDates={suggestedDates} 
              onNext={handleNext}
            />
          )}
          {currentStepId === 'EventDetails' && (
            <StepEventDetails 
              form={form} 
              setForm={setForm} 
              initialEventType={initialEventType} 
              municipalities={municipalities} 
              barangays={barangays} 
            />
          )}
          {currentStepId === 'DeliveryDetails' && (
            <StepDeliveryDetails 
              form={form} 
              setForm={setForm} 
              municipalities={municipalities} 
              barangays={barangays} 
            />
          )}
          {currentStepId === 'MenuSelection' && (
            <StepMenuSelection 
              form={form} 
              setForm={setForm} 
              menuItems={menuItems} 
            />
          )}
          {currentStepId === 'DietaryNeeds' && (
            <StepDietaryNeeds 
              form={form} 
              setForm={setForm} 
            />
          )}
          {currentStepId === 'CostSummary' && (
            <StepCostSummary 
              form={form} 
              initialPackageName={initialPackageName} 
              initialPackagePrice={initialPackagePrice} 
              totalPrice={totalPrice} 
              depositAmount={depositAmount} 
              depositPercentage={depositPercentage} 
            />
          )}
          {currentStepId === 'ContactInfo' && (
            <StepContactInfo 
              form={form} 
              setForm={setForm} 
            />
          )}
          {currentStepId === 'ReviewBooking' && (
            <StepReviewBooking 
              form={form} 
              initialPackageName={initialPackageName} 
              totalPrice={totalPrice} 
              depositAmount={depositAmount} 
              agreements={agreements} 
              setAgreements={setAgreements} 
              setShowTerms={setShowTerms} 
              setShowPrivacy={setShowPrivacy} 
            />
          )}
          {currentStepId === 'Payment' && (
            <StepPayment 
              depositAmount={depositAmount} 
              isSubmitting={isSubmitting} 
              onSubmit={submitBooking} 
              error={error} 
            />
          )}
        </div>

        {currentStepId !== 'Payment' && (
          <div className="mt-8 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <Button 
              variant="ghost"
              size="lg"
              onClick={handleBack} 
              className="px-6 py-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Back
            </Button>
            <Button 
              size="lg"
              onClick={handleNext} 
              className="px-8 py-3 font-medium shadow-sm active:scale-[0.98]"
            >
              Continue
            </Button>
          </div>
        )}
      </div>

      {showTerms && (
        <Modal title="Terms and Conditions" onClose={() => setShowTerms(false)}>
          <div className="text-slate-600 space-y-4 p-4 text-sm">
            <h4 className="font-semibold text-slate-800">Booking & Reservation</h4>
            <p>All bookings are subject to availability. A reservation is confirmed only once details are provided and deposit paid.</p>
            <h4 className="font-semibold text-slate-800">Payment Terms</h4>
            <p>A {depositPercentage}% down payment is required to reserve the date. Balance is due before the event.</p>
            <h4 className="font-semibold text-slate-800 text-red-600">Cancellation Policy</h4>
            <p>All deposits are non-refundable and non-transferable.</p>
          </div>
        </Modal>
      )}

      {showPrivacy && (
        <Modal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
          <div className="text-slate-600 space-y-4 p-4 text-sm">
            <h4 className="font-semibold text-slate-800">Data Collection</h4>
            <p>We collect personal information to facilitate your booking and provide services.</p>
            <h4 className="font-semibold text-slate-800">Use of Information</h4>
            <p>Data is used strictly for processing catering orders and communications.</p>
          </div>
        </Modal>
      )}
    </CustomerLayout>
  );
}