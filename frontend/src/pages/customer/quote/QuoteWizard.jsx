import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import useAuth from "../../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import useToast from "../../../hooks/useToast";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../../utils/batangas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Info, ArrowLeft, ArrowRight, Save, Utensils, CalendarDays, Box, Phone, Mail, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const stepsByService = {
  food: ["Event Information", "Delivery Address", "Menu Selection", "Dietary Needs", "Contact"],
  event: ["Event Overview", "Venue Information", "Budget", "Furniture and Setup", "Decor and Lighting", "Contact"],
  full: ["Event Overview", "Venue Information", "Budget", "Menu Selection", "Dietary Needs", "Furniture and Setup", "Decor and Lighting", "Contact"]
};
const menuTabs = ["Viand", "Veggies", "Pasta", "Fried", "Dessert", "Drinks"];
const budgetOptions = [
  "Under P20,000",
  "P20,000 - P30,000",
  "P30,000 - P40,000",
  "P40,000 - P50,000",
  "Over P50,000",
  "Flexible Budget"
];
const furnitureOptions = [
  "Stage Setup",
  "Buffet Setup",
  "Balloon and Name Backdrop",
  "Couch",
  "Other",
  "Grass Carpet",
  "Cake Table",
  "Round Tables",
  "Monoblock Chairs"
];
const diningOptions = [
  "Serving Spoons",
  "Plates",
  "Glasses",
  "Tissues",
  "Other",
  "Planggana",
  "Dishwashing Liquid",
  "Styrofoam Containers",
  "Food Warmer"
];
const addOnOptions = [
  "Styro Customize Name",
  "Entourage Setup",
  "Clown",
  "Other",
  "Basic Lights and Sounds",
  "Host",
  "Cake"
];
const lightingOptions = [
  "Ambient Lighting",
  "String Lights",
  "Chandeliers",
  "Outdoor Lighting",
  "Uplighting",
  "Spotlights",
  "Dance Floor Lighting",
  "Custom Lighting"
];
const decorOptions = [
  "Centerpieces",
  "Balloons",
  "Backdrop Setup",
  "Candles and Votives",
  "Floral Arrangements",
  "Draping and Fabric",
  "Signage",
  "Event Theme Decor"
];

export default function QuoteWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() + 3);
  const minDate = minDateObj.toISOString().split("T")[0];
  
  const [stage, setStage] = useState("service");
  const [step, setStep] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [menuFilter, setMenuFilter] = useState(menuTabs[0]);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const { notify } = useToast();
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const initialEventType = location.state?.eventType || "";
  const validEventTypes = ["Birthday", "Wedding", "Corporate"];
  const matchedType = validEventTypes.find(t => t.toLowerCase() === initialEventType.toLowerCase());
  const isOther = initialEventType && !matchedType;

  const [form, setForm] = useState({
    customer_id: user?._id || "",
    service_type: "food",
    event_type: matchedType || (isOther ? "Other" : ""),
    event_type_other: isOther ? initialEventType : "",
    event_theme: "",
    event_date: "",
    start_time: "",
    guest_count: "",
    venue_type: "",
    venue_size: "",
    indoor_outdoor: "",
    province: BATANGAS_PROVINCE,
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    budget_range: "",
    furniture_setup: [],
    dining_inventory: [],
    add_ons: [],
    lighting_options: [],
    decor_options: [],
    theme_colors: "",
    delivery_date: "",
    delivery_time: "",
    delivery_method: "delivery",
    pickup_date: "",
    pickup_time: "",
    delivery_instructions: "",
    selected_menu: [],
    menu_other: "",
    dietary_restrictions: "",
    allergies: "",
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: "",
    contact_method: ["email"],
    best_time_to_call: "",
    inspiration_links: "",
    attachments: [],
    notes: "",
    agree_terms: false,
    agree_privacy: false
  });

  const activeSteps = stepsByService[form.service_type] || stepsByService.food;
  const next = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep((s) => Math.min(s + 1, activeSteps.length - 1));
  };
  const back = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep((s) => Math.max(s - 1, 0));
  };
  const currentStep = activeSteps[step];

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(form.municipality),
    [form.municipality]
  );

  useEffect(() => {
    setStep(0);
  }, [form.service_type]);

  const [blockedDates, setBlockedDates] = useState([]);
  useEffect(() => {
    CustomerAPI.getMenu()
      .then((res) => setMenuItems(res.data))
      .catch(() => setMenuItems([]));

    CustomerAPI.getBlockedDates()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const formatted = list.map((item) => {
          const dt = new Date(item.date);
          const yr = dt.getFullYear();
          const mo = String(dt.getMonth() + 1).padStart(2, '0');
          const da = String(dt.getDate()).padStart(2, '0');
          return `${yr}-${mo}-${da}`;
        });
        setBlockedDates(formatted);
      })
      .catch(() => setBlockedDates([]));
  }, []);

  const filteredMenu = useMemo(() => {
    if (!menuFilter) return menuItems;
    const filtered = menuItems.filter((item) =>
      (item.category || "").toLowerCase().includes(menuFilter.toLowerCase())
    );
    return filtered.length ? filtered : menuItems;
  }, [menuItems, menuFilter]);

  const toggleMenuItem = (value) => {
    setForm((prev) => {
      const exists = prev.selected_menu.includes(value);
      return {
        ...prev,
        selected_menu: exists
          ? prev.selected_menu.filter((item) => item !== value)
          : [...prev.selected_menu, value]
      };
    });
  };

  const toggleValue = (field, value) => {
    setForm((prev) => {
      const list = prev[field] || [];
      const exists = list.includes(value);
      return {
        ...prev,
        [field]: exists ? list.filter((item) => item !== value) : [...list, value]
      };
    });
  };

  const nextStepText = () => {
    if (form.service_type === "event") {
      return "We will help you plan the perfect setup, furniture, decor, and event details.";
    }
    return "We will guide you through menu selection, dietary preferences, and beverage options.";
  };

  const parseNumber = (value) => {
    const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const getEventTypeValue = () =>
    form.event_type === "Other"
      ? String(form.event_type_other || "").trim()
      : String(form.event_type || "").trim();

  const buildInquiryPayload = () => {
    // Labels must match the canonical service_type values used everywhere else
    // (Booking.service_type enum, StepServiceType.jsx, admin/customer filters) —
    // "Food & Event Setup" here used to diverge from "Food and Event Setup" and
    // silently fail to persist against the Inquiry schema's enum.
    const serviceLookup = {
      food: { include_food: true, label: "Food Only" },
      event: { include_food: false, label: "Event Setup Only" },
      full: { include_food: true, label: "Food and Event Setup" }
    };
    const serviceConfig = serviceLookup[form.service_type] || serviceLookup.full;

    const nameParts = String(form.full_name || "").trim().split(/\s+/).filter(Boolean);
    const contactFirstName = nameParts[0] || "";
    const contactLastName = nameParts.slice(1).join(" ");

    const additionalServices = [
      ...(form.furniture_setup || []),
      ...(form.dining_inventory || []),
      ...(form.add_ons || []),
      ...(form.lighting_options || []),
      ...(form.decor_options || [])
    ].filter(Boolean);
    const uniqueAdditionalServices = Array.from(new Set(additionalServices));

    const specialNotes = [
      form.menu_other && `Menu notes: ${form.menu_other}`,
      form.delivery_instructions && `Delivery instructions: ${form.delivery_instructions}`,
      form.best_time_to_call && `Best time to call: ${form.best_time_to_call}`,
      form.inspiration_links && `Inspiration links: ${form.inspiration_links}`,
      form.notes && `Notes: ${form.notes}`,
      form.venue_size && `Venue size: ${form.venue_size}`
    ].filter(Boolean).join("\n");

    const contactMethods = Array.isArray(form.contact_method)
      ? form.contact_method
      : [form.contact_method].filter(Boolean);

    return {
      customer_id: form.customer_id,
      event_type: getEventTypeValue(),
      event_theme: form.event_theme,
      event_date: form.event_date,
      start_time: form.start_time,
      guest_count: parseNumber(form.guest_count),
      include_food: serviceConfig.include_food,
      service_type: serviceConfig.label,
      venue_type: form.venue_type,
      indoor_outdoor: form.indoor_outdoor,
      province: form.province,
      municipality: form.municipality,
      barangay: form.barangay,
      street: form.street,
      landmark: form.landmark,
      zip_code: form.zip_code,
      selected_menu: form.selected_menu || [],
      dietary_restrictions: form.dietary_restrictions,
      allergies: form.allergies,
      special_requests: specialNotes || undefined,
      additional_services: uniqueAdditionalServices,
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName,
      contact_email: form.email,
      contact_phone: form.phone,
      contact_method: contactMethods.join(", ") || undefined,
      status: "new"
    };
  };

  const fieldLabels = {
    event_type: "Event type",
    event_date: "Event date",
    start_time: "Event start time",
    guest_count: "Guest count",
    venue_type: "Venue type",
    indoor_outdoor: "Indoor or outdoor",
    province: "Province",
    municipality: "Municipality",
    barangay: "Barangay",
    street: "Street name",
    zip_code: "Zip code",
    budget_range: "Budget range",
    delivery_date: "Delivery date",
    delivery_time: "Preferred delivery time",
    pickup_date: "Pickup date",
    pickup_time: "Pickup time",
    full_name: "Full name",
    email: "Email address",
    phone: "Phone number",
    agree_terms: "Terms and Conditions",
    agree_privacy: "Privacy Policy"
  };

  const mapBackendErrors = (list) => {
    const nextErrors = {};
    (list || []).forEach((item) => {
      const match = String(item).match(/"([^"]+)"/);
      const field = match ? match[1] : null;
      if (!field) return;
      if (item.includes("is required")) {
        nextErrors[field] = `${fieldLabels[field] || field} is required.`;
      } else if (item.includes("must be a valid email")) {
        nextErrors[field] = "Enter a valid email address.";
      } else {
        nextErrors[field] = item;
      }
    });
    return nextErrors;
  };

  const validateRequired = () => {
    const nextErrors = {};
    const isEmpty = (value) => !String(value || "").trim();

    const setRequired = (field, label) => {
      if (isEmpty(form[field])) {
        nextErrors[field] = `${label} is required.`;
      }
    };

    if (isEmpty(form.event_type)) {
      nextErrors.event_type = "Event type is required.";
    } else if (form.event_type === "Other" && isEmpty(form.event_type_other)) {
      nextErrors.event_type_other = "Please specify the event type.";
    }
    setRequired("event_date", "Event date");
    setRequired("start_time", "Event start time");

    if (form.event_date && blockedDates.includes(form.event_date)) {
      nextErrors.event_date = "The selected date is blocked by administration and unavailable for inquiries/bookings.";
    }

    if (isEmpty(form.guest_count)) {
      nextErrors.guest_count = "Guest count is required.";
    } else if (!Number.isFinite(parseNumber(form.guest_count))) {
      nextErrors.guest_count = "Enter a valid guest count.";
    }

    if (form.service_type !== "food") {
      setRequired("venue_type", "Venue type");
      setRequired("indoor_outdoor", "Indoor or outdoor");
        setRequired("municipality", "Municipality");
        setRequired("barangay", "Barangay");
        setRequired("street", "Street name");
        setRequired("zip_code", "Zip code");
        setRequired("budget_range", "Budget range");
      }

      if (form.service_type === "food") {
      setRequired("zip_code", "Zip code");

      if (form.delivery_method === "pickup") {
        setRequired("pickup_date", "Pickup date");
        setRequired("pickup_time", "Pickup time");
      } else {
        setRequired("delivery_date", "Delivery date");
        setRequired("delivery_time", "Preferred delivery time");
      }
    }

    setRequired("full_name", "Full name");
    setRequired("email", "Email address");
    setRequired("phone", "Phone number");

    if (!isEmpty(form.email) && !/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.agree_terms) {
      nextErrors.agree_terms = "Please accept the Terms and Conditions.";
    }
    if (!form.agree_privacy) {
      nextErrors.agree_privacy = "Please accept the Privacy Policy.";
    }

    return nextErrors;
  };

  const submit = async () => {
    setError("");
    const nextErrors = validateRequired();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Please complete the required fields below.");
      return;
    }
    try {
      const inquiryPayload = buildInquiryPayload();
      const res = await CustomerAPI.submitInquiry(inquiryPayload);
      setBookingRef(res?.data?._id || "");
      setShowSuccessModal(true);
    } catch (err) {
      const backendErrors = mapBackendErrors(err.response?.data?.errors);
      if (Object.keys(backendErrors).length > 0) {
        setErrors(backendErrors);
        setError("Please complete the required fields below.");
        return;
      }
      const message = err.response?.data?.message || "We could not submit your inquiry. Please try again.";
      setError(message);
      notify(message, "error");
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Modals */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-lg text-center">
            <DialogHeader>
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-serif text-center">Custom Quote Request Submitted!</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground mb-6">Thank you for your detailed submission! Our team is excited to create a personalized proposal for your event.</p>
              <div className="bg-muted/50 rounded-xl p-6 mb-6 text-left border border-border">
                <h4 className="font-bold text-foreground mb-3 font-serif">What You Can Expect:</h4>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
                  <li><strong className="text-foreground">Event Review:</strong> We'll review your requirements and contact you to schedule a consultation</li>
                  <li><strong className="text-foreground">Consultation Call:</strong> 30-60 minute discussion to understand your vision and answer questions</li>
                  <li><strong className="text-foreground">Custom Proposal (3-5 days):</strong> Detailed quote with other options, pricing breakdown, and recommendations</li>
                  <li><strong className="text-foreground">Refinement & Booking:</strong> We'll work together to perfect every detail before confirming your booking</li>
                </ol>
              </div>
              <p className="text-sm text-muted-foreground mb-2">A confirmation email has been sent to <strong className="text-foreground">{form.email || "your email"}</strong>.</p>
              {bookingRef && (
                <p className="text-sm text-muted-foreground">Inquiry Reference: <strong className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">{bookingRef}</strong></p>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setShowSuccessModal(false); navigate("/customer/inquiries"); }}>View My Inquiry</Button>
              <Button className="w-full sm:w-auto" onClick={() => { setShowSuccessModal(false); navigate("/"); }}>Return to Home</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTerms} onOpenChange={setShowTerms}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Terms and Conditions</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Booking & Reservation</h4>
                <p>All bookings are subject to availability. A reservation is only considered confirmed once the client has provided the necessary event details and paid the required deposit.</p>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Payment Terms</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Deposit:</strong> A 20% down payment is required to reserve the date.</li>
                  <li><strong>Final Payment:</strong> The remaining balance must be paid a day before the event date.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Cancellation & Refund Policy</h4>
                <p className="text-destructive font-medium">IMPORTANT: All deposits made are non-refundable and non-transferable. If a booking is canceled by the client for any reason, the deposit will be forfeited to cover administrative costs and lost business opportunities.</p>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Lost or Damaged Equipment</h4>
                <p>The client is responsible for the safekeeping of all catering equipment and materials provided during the event. The client will be billed and held financially responsible for the replacement cost of any items that are lost, missing, or damaged during the event.</p>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Liability</h4>
                <p>Caezelle's Catering Service is not responsible for any delays or failures in performance due to circumstances beyond our control (e.g., natural disasters, extreme weather, or government restrictions).</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowTerms(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">Privacy Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Data Collection</h4>
                <p>We collect personal information such as your name, contact number, email address, and event details to facilitate your booking and provide our services.</p>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Use of Information</h4>
                <p>Your data is used strictly for: processing your catering orders and payments, communicating regarding event logistics, and improving our system's user experience.</p>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Data Security</h4>
                <p>We implement secure protocols to protect your information from unauthorized access. We do not sell or share your personal data with third-party marketers.</p>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2 text-base">Consent</h4>
                <p>By using this system and paying the deposit, you agree to the collection of your data and acknowledge the No-Refund Policy stated in our Terms and Conditions.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowPrivacy(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {stage === "service" ? (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <Button variant="ghost" className="text-muted-foreground -ml-4" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {user?.full_name || "Customer"}
              </div>
            </div>
            
            <div className="text-center space-y-4 mb-10">
              <h1 className="text-4xl md:text-5xl font-bold font-serif text-foreground">Request a Custom Quote</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">Tell us about your dream event and we will create a personalized proposal tailored to your vision and budget.</p>
            </div>

            <Card className="border-border shadow-md overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border text-center pb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                  <span className="font-bold text-xl font-serif">Q</span>
                </div>
                <CardTitle className="text-2xl font-serif">Choose Your Service Type</CardTitle>
                <CardDescription>What would you like us to provide?</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                      form.service_type === "food" ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                    onClick={() => setForm({ ...form, service_type: "food" })}
                  >
                    <Utensils className={cn("w-10 h-10 mb-4", form.service_type === "food" ? "text-primary" : "text-muted-foreground")} />
                    <strong className="text-foreground text-lg mb-1">Food Only</strong>
                    <span className="text-sm text-muted-foreground">Menu and catering services</span>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                      form.service_type === "event" ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                    onClick={() => setForm({ ...form, service_type: "event" })}
                  >
                    <Box className={cn("w-10 h-10 mb-4", form.service_type === "event" ? "text-primary" : "text-muted-foreground")} />
                    <strong className="text-foreground text-lg mb-1">Event Setup Only</strong>
                    <span className="text-sm text-muted-foreground">Planning, setup and decor</span>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                      form.service_type === "full" ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                    onClick={() => setForm({ ...form, service_type: "full" })}
                  >
                    <div className="flex -space-x-2 mb-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 border-background", form.service_type === "full" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 border-background", form.service_type === "full" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                        <Box className="w-5 h-5" />
                      </div>
                    </div>
                    <strong className="text-foreground text-lg mb-1">Food & Setup</strong>
                    <span className="text-sm text-muted-foreground">Complete catering services</span>
                  </button>
                </div>

                <div className="flex items-start gap-4 p-4 bg-accent/10 border border-accent/20 rounded-xl">
                  <Info className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-accent text-sm uppercase tracking-wider block mb-1">Next Steps</strong>
                    <p className="text-sm text-foreground">{nextStepText()}</p>
                  </div>
                </div>

                <Button className="w-full h-14 text-base font-bold" onClick={() => setStage("form")}>
                  Continue to Details <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => (step === 0 ? setStage("service") : back())}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Custom Quote Request</p>
                  <h2 className="text-2xl font-bold font-serif text-foreground">Step {step + 1} of {activeSteps.length}</h2>
                </div>
              </div>
              <div className="text-sm font-medium text-muted-foreground bg-card border border-border px-4 py-2 rounded-full hidden md:block">
                {user?.full_name || "Customer"}
              </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between relative max-w-3xl mx-auto mb-12">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2"></div>
              {activeSteps.map((label, index) => {
                const isActive = index === step;
                const isDone = index < step;
                return (
                  <div key={label} className="flex flex-col items-center gap-2 relative z-10 w-24">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm",
                      isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : isDone ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
                    )}>
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className={cn("text-[10px] sm:text-xs text-center font-medium leading-tight", isActive ? "text-foreground font-bold" : "text-muted-foreground")}>{label}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2">
                <Card className="border-border shadow-md">
                  
                  {currentStep === "Event Information" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Event Information</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Event Type</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={form.event_type}
                              onChange={(e) => setForm({
                                ...form,
                                event_type: e.target.value,
                                event_type_other: e.target.value === "Other" ? form.event_type_other : ""
                              })}
                              disabled={!!initialEventType}
                            >
                              <option value="">Select event type</option>
                              <option value="Birthday">Birthday</option>
                              <option value="Wedding">Wedding</option>
                              <option value="Corporate">Corporate</option>
                              <option value="Other">Others (please specify)</option>
                            </select>
                            {errors.event_type && <p className="text-xs text-destructive mt-1">{errors.event_type}</p>}
                          </div>
                          
                          {form.event_type === "Other" && (
                            <div className="space-y-2">
                              <Label>Please Specify</Label>
                              <Input
                                placeholder="Anniversary, Christening, etc."
                                value={form.event_type_other}
                                onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
                                disabled={!!initialEventType}
                              />
                              {errors.event_type_other && <p className="text-xs text-destructive mt-1">{errors.event_type_other}</p>}
                            </div>
                          )}
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label>Event Theme or Colors</Label>
                            <Input placeholder="Navy and Gold, Rustic Garden" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Event Date</Label>
                            <Input type="date" min={minDate} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                            {form.event_date && blockedDates.includes(form.event_date) && (
                              <p className="text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1">
                                <AlertTriangle size={13} /> Selected date is blocked by administration and unavailable.
                              </p>
                            )}
                            {errors.event_date && <p className="text-xs text-destructive mt-1">{errors.event_date}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Event Start Time</Label>
                            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                            {errors.start_time && <p className="text-xs text-destructive mt-1">{errors.start_time}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Estimated Guest Count</Label>
                            <Input placeholder="50" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
                            {errors.guest_count && <p className="text-xs text-destructive mt-1">{errors.guest_count}</p>}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-end">
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Delivery Address" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Delivery Details</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-8">
                        <div className="space-y-4">
                          <Label className="text-base">Delivery Method</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div 
                              className={cn("p-4 rounded-xl border-2 cursor-pointer transition-colors", form.delivery_method === "delivery" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}
                              onClick={() => setForm({ ...form, delivery_method: "delivery" })}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", form.delivery_method === "delivery" ? "border-primary" : "border-muted-foreground")}>
                                  {form.delivery_method === "delivery" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                                <span className="font-medium text-sm">Deliver to this address</span>
                              </div>
                            </div>
                            <div 
                              className={cn("p-4 rounded-xl border-2 cursor-pointer transition-colors", form.delivery_method === "pickup" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}
                              onClick={() => setForm({ ...form, delivery_method: "pickup" })}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", form.delivery_method === "pickup" ? "border-primary" : "border-muted-foreground")}>
                                  {form.delivery_method === "pickup" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                                <span className="font-medium text-sm">Customer pickup</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {form.delivery_method === "delivery" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Municipality</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={form.municipality}
                                onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
                              >
                                <option value="">Select Municipality</option>
                                {municipalities.map((name) => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                              {errors.municipality && <p className="text-xs text-destructive mt-1">{errors.municipality}</p>}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Barangay</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                                value={form.barangay}
                                disabled={!form.municipality}
                                onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                              >
                                <option value="">Select Barangay</option>
                                {barangays.map((name) => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                              {errors.barangay && <p className="text-xs text-destructive mt-1">{errors.barangay}</p>}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Street Name</Label>
                              <Input placeholder="Purok 4" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                              {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Zip Code</Label>
                              <Input placeholder="3125" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
                              {errors.zip_code && <p className="text-xs text-destructive mt-1">{errors.zip_code}</p>}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Landmark</Label>
                              <Input placeholder="Near 7/11" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                            </div>
                          </div>
                        )}

                        <div className="space-y-6">
                          <h4 className="font-bold text-foreground font-serif border-b border-border pb-2">
                            {form.delivery_method === "pickup" ? "Pickup Schedule" : "Delivery Schedule"}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {form.delivery_method === "pickup" ? (
                              <>
                                <div className="space-y-2">
                                  <Label>Pickup Date</Label>
                                  <Input type="date" min={minDate} value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} />
                                  {errors.pickup_date && <p className="text-xs text-destructive mt-1">{errors.pickup_date}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label>Pickup Time</Label>
                                  <Input type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} />
                                  {errors.pickup_time && <p className="text-xs text-destructive mt-1">{errors.pickup_time}</p>}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <Label>Delivery Date</Label>
                                  <Input type="date" min={minDate} value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
                                  {errors.delivery_date && <p className="text-xs text-destructive mt-1">{errors.delivery_date}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label>Preferred Delivery Time</Label>
                                  <Input type="time" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} />
                                  {errors.delivery_time && <p className="text-xs text-destructive mt-1">{errors.delivery_time}</p>}
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>{form.delivery_method === "pickup" ? "Pickup Instructions (Optional)" : "Delivery Instructions (Optional)"}</Label>
                            <Textarea
                              placeholder="Floor/unit number, gate color, parking notes, or access instructions"
                              value={form.delivery_instructions}
                              onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Menu Selection" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Menu Selection</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
                          {menuTabs.map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              className={cn(
                                "px-6 py-4 font-semibold text-sm whitespace-nowrap transition-colors border-b-2",
                                menuFilter === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              )}
                              onClick={() => setMenuFilter(tab)}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                        
                        <div className="p-6 md:p-8 space-y-8 bg-muted/5">
                          {filteredMenu.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                              {filteredMenu.map((item) => (
                                <div 
                                  key={item._id || item.name} 
                                  className={cn(
                                    "flex flex-col rounded-xl border transition-all overflow-hidden bg-card",
                                    form.selected_menu.includes(item.name) ? "border-primary ring-1 ring-primary/20 shadow-md" : "border-border hover:border-primary/30 hover:shadow-sm"
                                  )}
                                >
                                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover" />}
                                  <div className="p-4 flex flex-col flex-1">
                                    <div className="mb-4">
                                      <h5 className="font-bold text-foreground text-sm line-clamp-2">{item.name}</h5>
                                      {item.category && <p className="text-xs text-muted-foreground mt-1">{item.category}</p>}
                                    </div>
                                    <Button
                                      variant={form.selected_menu.includes(item.name) ? "default" : "outline"}
                                      size="sm"
                                      className="w-full mt-auto"
                                      onClick={() => toggleMenuItem(item.name)}
                                    >
                                      {form.selected_menu.includes(item.name) ? "Selected" : "Select Food"}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                              <p className="text-muted-foreground">Menu items will appear once loaded.</p>
                            </div>
                          )}
                          
                          <div className="p-5 bg-card border border-border rounded-xl space-y-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="menu_other_toggle"
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                checked={Boolean(form.menu_other)}
                                onChange={(e) => setForm({ ...form, menu_other: e.target.checked ? "Other" : "" })}
                              />
                              <Label htmlFor="menu_other_toggle" className="text-base font-semibold">Other Menu Requests</Label>
                            </div>
                            
                            {Boolean(form.menu_other) && (
                              <Textarea
                                placeholder="Let us know if you have other menu requests."
                                value={form.menu_other === "Other" ? "" : form.menu_other}
                                onChange={(e) => setForm({ ...form, menu_other: e.target.value })}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Dietary Needs" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Dietary Needs</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8">
                        <div className="space-y-3">
                          <Label className="text-base">Allergies and Intolerances (Optional)</Label>
                          <Textarea
                            placeholder="Nut allergies, seafood allergies, lactose intolerance, etc."
                            className="min-h-[150px]"
                            value={form.allergies}
                            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Contact" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Full Name</Label>
                            <Input placeholder="Your Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input placeholder="0900 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                          </div>
                          
                          {form.service_type === "event" && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>Best Time to Call</Label>
                              <Input placeholder="Weekdays morning, evenings after 6pm" value={form.best_time_to_call} onChange={(e) => setForm({ ...form, best_time_to_call: e.target.value })} />
                            </div>
                          )}
                        </div>

                        {form.service_type === "event" && (
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <Label>Inspiration Links or Pinterest Board</Label>
                              <Textarea
                                placeholder="Share any Pinterest boards, Instagram posts, or websites that inspire your vision."
                                value={form.inspiration_links}
                                onChange={(e) => setForm({ ...form, inspiration_links: e.target.value })}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Upload Photos or Documents (Optional)</Label>
                              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
                                <input
                                  type="file"
                                  multiple
                                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                  onChange={(e) => setForm({ ...form, attachments: Array.from(e.target.files || []) })}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Additional Notes</Label>
                          <Textarea
                            placeholder="Any other details we should know about your needs..."
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          />
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-border">
                          <div>
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id="agree_terms"
                                className="mt-1 rounded border-input text-primary focus:ring-primary h-4 w-4"
                                checked={form.agree_terms}
                                onChange={(e) => setForm({ ...form, agree_terms: e.target.checked })}
                              />
                              <Label htmlFor="agree_terms" className="font-normal text-sm leading-snug">
                                I agree to the <button type="button" className="text-primary hover:underline font-medium" onClick={() => setShowTerms(true)}>Terms and Conditions</button> and understand that this is a request for a quote, not a confirmed booking.
                              </Label>
                            </div>
                            {errors.agree_terms && <p className="text-xs text-destructive mt-1 ml-7">{errors.agree_terms}</p>}
                          </div>
                          
                          <div>
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id="agree_privacy"
                                className="mt-1 rounded border-input text-primary focus:ring-primary h-4 w-4"
                                checked={form.agree_privacy}
                                onChange={(e) => setForm({ ...form, agree_privacy: e.target.checked })}
                              />
                              <Label htmlFor="agree_privacy" className="font-normal text-sm leading-snug">
                                I have read the <button type="button" className="text-primary hover:underline font-medium" onClick={() => setShowPrivacy(true)}>Privacy Policy</button>.
                              </Label>
                            </div>
                            {errors.agree_privacy && <p className="text-xs text-destructive mt-1 ml-7">{errors.agree_privacy}</p>}
                          </div>
                        </div>

                        {error && (
                          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-medium">
                            {error}
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4 p-4 bg-accent/10 border border-accent/20 rounded-xl">
                          <Info className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-accent text-sm uppercase tracking-wider block mb-1">What Happens Next?</strong>
                            <p className="text-sm text-foreground">We will review your custom quote request and reach out within 24-48 hours to schedule a consultation.</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submit} size="lg">Submit Quote Request <CheckCircle2 className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Event Overview" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Event Details</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Event Type</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={form.event_type}
                              onChange={(e) => setForm({
                                ...form,
                                event_type: e.target.value,
                                event_type_other: e.target.value === "Other" ? form.event_type_other : ""
                              })}
                            >
                              <option value="">Select event type</option>
                              <option value="Birthday">Birthday</option>
                              <option value="Wedding">Wedding</option>
                              <option value="Corporate">Corporate</option>
                              <option value="Other">Others (please specify)</option>
                            </select>
                            {errors.event_type && <p className="text-xs text-destructive mt-1">{errors.event_type}</p>}
                          </div>
                          
                          {form.event_type === "Other" && (
                            <div className="space-y-2">
                              <Label>Please Specify</Label>
                              <Input
                                placeholder="Anniversary, Christening, etc."
                                value={form.event_type_other}
                                onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
                              />
                              {errors.event_type_other && <p className="text-xs text-destructive mt-1">{errors.event_type_other}</p>}
                            </div>
                          )}
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label>Event Theme or Colors</Label>
                            <Input placeholder="Navy and Gold, Rustic Garden" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Event Date</Label>
                            <Input type="date" min={minDate} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                            {form.event_date && blockedDates.includes(form.event_date) && (
                              <p className="text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1">
                                <AlertTriangle size={13} /> Selected date is blocked by administration and unavailable.
                              </p>
                            )}
                            {errors.event_date && <p className="text-xs text-destructive mt-1">{errors.event_date}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Event Start Time</Label>
                            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                            {errors.start_time && <p className="text-xs text-destructive mt-1">{errors.start_time}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Estimated Guest Count</Label>
                            <Input placeholder="50" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
                            {errors.guest_count && <p className="text-xs text-destructive mt-1">{errors.guest_count}</p>}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Venue Information" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Venue Information</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Venue Type</Label>
                            <Input placeholder="Covered court, Hotel, Resort" value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} />
                            {errors.venue_type && <p className="text-xs text-destructive mt-1">{errors.venue_type}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Venue Size</Label>
                            <Input placeholder="20 x 20 sq m" value={form.venue_size} onChange={(e) => setForm({ ...form, venue_size: e.target.value })} />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label>Indoor or Outdoor</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={form.indoor_outdoor}
                              onChange={(e) => setForm({ ...form, indoor_outdoor: e.target.value })}
                            >
                              <option value="">Select option</option>
                              <option value="Indoor">Indoor</option>
                              <option value="Outdoor">Outdoor</option>
                              <option value="Both">Both</option>
                            </select>
                            {errors.indoor_outdoor && <p className="text-xs text-destructive mt-1">{errors.indoor_outdoor}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Municipality</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={form.municipality}
                              onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
                            >
                              <option value="">Select Municipality</option>
                              {municipalities.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                            {errors.municipality && <p className="text-xs text-destructive mt-1">{errors.municipality}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Barangay</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                              value={form.barangay}
                              disabled={!form.municipality}
                              onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                            >
                              <option value="">Select Barangay</option>
                              {barangays.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                            {errors.barangay && <p className="text-xs text-destructive mt-1">{errors.barangay}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Street Name</Label>
                            <Input placeholder="Purok 4" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                            {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Zip Code</Label>
                            <Input placeholder="3125" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
                            {errors.zip_code && <p className="text-xs text-destructive mt-1">{errors.zip_code}</p>}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Landmark</Label>
                            <Input placeholder="Near 7/11" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Budget" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Budget Range</CardTitle>
                        <CardDescription>Help us understand your budget for event setup.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {budgetOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={cn(
                                "p-4 text-center rounded-xl border-2 font-medium transition-all",
                                form.budget_range === option 
                                  ? "border-primary bg-primary/5 text-primary" 
                                  : "border-border bg-card text-foreground hover:bg-muted/30 hover:border-primary/30"
                              )}
                              onClick={() => setForm({ ...form, budget_range: option })}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {errors.budget_range && <p className="text-sm text-destructive mt-4 text-center">{errors.budget_range}</p>}
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Furniture and Setup" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Furniture and Setup Needs</CardTitle>
                        <CardDescription>Select all items you might need for your event</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-10">
                        <div>
                          <h4 className="font-bold text-foreground border-b border-border pb-2 mb-4">Event Setup and Furniture</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {furnitureOptions.map((item) => (
                              <label key={item} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                  checked={form.furniture_setup.includes(item)}
                                  onChange={() => toggleValue("furniture_setup", item)}
                                />
                                <span className="text-sm font-medium">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground border-b border-border pb-2 mb-4">Dining and Service Inventory</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {diningOptions.map((item) => (
                              <label key={item} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                  checked={form.dining_inventory.includes(item)}
                                  onChange={() => toggleValue("dining_inventory", item)}
                                />
                                <span className="text-sm font-medium">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground border-b border-border pb-2 mb-4">Add Ons</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {addOnOptions.map((item) => (
                              <label key={item} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                  checked={form.add_ons.includes(item)}
                                  onChange={() => toggleValue("add_ons", item)}
                                />
                                <span className="text-sm font-medium">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}

                  {currentStep === "Decor and Lighting" && (
                    <>
                      <CardHeader className="border-b border-border bg-muted/30">
                        <CardTitle className="text-xl font-serif">Decor and Lighting</CardTitle>
                        <CardDescription>Enhance your event atmosphere</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 space-y-10">
                        <div>
                          <h4 className="font-bold text-foreground border-b border-border pb-2 mb-4">Lighting Options</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {lightingOptions.map((item) => (
                              <label key={item} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                  checked={form.lighting_options.includes(item)}
                                  onChange={() => toggleValue("lighting_options", item)}
                                />
                                <span className="text-sm font-medium">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-foreground border-b border-border pb-2 mb-4">Decorations</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {decorOptions.map((item) => (
                              <label key={item} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                  checked={form.decor_options.includes(item)}
                                  onChange={() => toggleValue("decor_options", item)}
                                />
                                <span className="text-sm font-medium">{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t border-border">
                          <Label className="text-base font-bold text-foreground">Theme and Color Scheme</Label>
                          <Textarea
                            placeholder="Describe your event theme, color palette, and style preferences..."
                            className="min-h-[100px]"
                            value={form.theme_colors}
                            onChange={(e) => setForm({ ...form, theme_colors: e.target.value })}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/20 border-t border-border p-6 flex justify-between">
                        <Button variant="outline" onClick={back} size="lg"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                        <Button onClick={next} size="lg">Next Step <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </CardFooter>
                    </>
                  )}
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-serif">Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-sm block">Call Us</strong>
                        <span className="text-sm text-muted-foreground">(555) 123-4567</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-sm block">Email Us</strong>
                        <span className="text-sm text-muted-foreground">quotes@caezelles.com</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-sm block">Office Hours</strong>
                        <span className="text-sm text-muted-foreground">Mon-Fri: 9AM-6PM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-accent/20 bg-accent/5">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-serif text-accent">Quick Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-foreground">
                      {form.service_type === "event" ? (
                        <>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Measure your venue space</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Check venue restrictions</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Plan setup timeline</li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Consider dietary restrictions</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Include beverage options</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> Plan setup timeline</li>
                        </>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}