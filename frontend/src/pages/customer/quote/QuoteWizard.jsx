import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import useAuth from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useToast from "../../../hooks/useToast";

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
  const [stage, setStage] = useState("service");
  const [step, setStep] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [menuFilter, setMenuFilter] = useState(menuTabs[0]);
  const [error, setError] = useState("");
  const { notify } = useToast();
  const [form, setForm] = useState({
    customer_id: user?._id || "",
    service_type: "food",
    event_type: "",
    event_theme: "",
    event_date: "",
    start_time: "",
    guest_count: "",
    duration_hours: "",
    venue_type: "",
    venue_size: "",
    indoor_outdoor: "",
    province: "",
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
    contact_method: "email",
    best_time_to_call: "",
    inspiration_links: "",
    attachments: [],
    notes: "",
    agree_terms: false,
    agree_privacy: false
  });

  const activeSteps = stepsByService[form.service_type] || stepsByService.food;
  const next = () => setStep((s) => Math.min(s + 1, activeSteps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const currentStep = activeSteps[step];

  useEffect(() => {
    setStep(0);
  }, [form.service_type]);

  useEffect(() => {
    CustomerAPI.getMenu()
      .then((res) => setMenuItems(res.data))
      .catch(() => setMenuItems([]));
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

  const submit = async () => {
    setError("");
    if (!form.agree_terms || !form.agree_privacy) {
      setError("Please accept the terms and privacy policy.");
      return;
    }
    try {
      const payload = {
        ...form,
        guest_count: parseNumber(form.guest_count),
        duration_hours: parseNumber(form.duration_hours)
      };

      await CustomerAPI.submitQuote(payload);
      notify("Quote submitted.", "success");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to submit quote.";
      setError(message);
      notify(message, "error");
    }
  };

  return (
    <CustomerLayout>
      <div className="booking-page quote-page">
        {stage === "service" ? (
          <>
            <div className="quote-topbar">
              <button className="booking-back" type="button" onClick={() => navigate(-1)}>
                Back
              </button>
              <div className="booking-summary">{user?.full_name || "Customer"}</div>
            </div>
            <div className="quote-hero">
              <h1>Request a Custom Quote</h1>
              <p>Tell us about your dream event and we will create a personalized proposal tailored to your vision and budget.</p>
            </div>

            <div className="booking-card quote-card">
              <div className="quote-card-header">
                <div className="quote-card-icon">Q</div>
                <div>
                  <h3>Choose Your Service Type</h3>
                  <p className="quote-muted">What would you like us to provide?</p>
                </div>
              </div>
              <div className="quote-service-grid">
                <button
                  type="button"
                  className={`quote-service-option ${form.service_type === "food" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, service_type: "food" })}
                >
                  <span className="quote-service-icon">F</span>
                  <div>
                    <strong>Food Only</strong>
                    <span>Menu and catering services</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`quote-service-option ${form.service_type === "event" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, service_type: "event" })}
                >
                  <span className="quote-service-icon">E</span>
                  <div>
                    <strong>Event Setup Only</strong>
                    <span>Planning, setup and decor</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`quote-service-option ${form.service_type === "full" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, service_type: "full" })}
                >
                  <span className="quote-service-icon">F+E</span>
                  <div>
                    <strong>Food and Event Setup</strong>
                    <span>Complete catering and event services</span>
                  </div>
                </button>
              </div>

              <div className="booking-tip info">
                <span className="tip-icon">i</span>
                <div>
                  <strong>Next Steps</strong>
                  <p>{nextStepText()}</p>
                </div>
              </div>

              <div className="booking-actions">
                <button className="btn" onClick={() => setStage("form")}>Continue to Details</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="booking-titlebar">
              <button className="booking-back" type="button" onClick={() => (step === 0 ? setStage("service") : back())}>
                Back
              </button>
              <div>
                <p className="booking-kicker">Custom Quote Request</p>
                <h2>Step {step + 1} of {activeSteps.length}</h2>
              </div>
              <div className="booking-summary">{user?.full_name || "Customer"}</div>
            </div>

            <div className="booking-stepper">
              {activeSteps.map((label, index) => {
                const isActive = index === step;
                const isDone = index < step;
                return (
                  <div key={label} className={`booking-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                    <span className="booking-step-icon">{index + 1}</span>
                    <span className="booking-step-label">{label}</span>
                    {index < activeSteps.length - 1 && <span className="booking-step-line" />}
                  </div>
                );
              })}
            </div>

            <div className="quote-layout">
              <div className="booking-card">
                {currentStep === "Event Information" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Event Information</h3>
                    </div>
                    <div className="booking-grid">
                      <label className="field">
                        <span>Event Type</span>
                        <input placeholder="Birthday" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Theme or Colors</span>
                        <input placeholder="Navy and Gold, Rustic Garden" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Date</span>
                        <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Start Time</span>
                        <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Estimated Guest Count</span>
                        <input placeholder="50" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Duration (hours)</span>
                        <input placeholder="2 hours" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
                      </label>
                    </div>
                    <div className="booking-actions">
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Delivery Address" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Delivery Address</h3>
                    </div>
                    <div className="booking-grid">
                      <label className="field">
                        <span>Province</span>
                        <input placeholder="Nueva Ecija" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Municipality</span>
                        <input placeholder="General M. Natividad" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Barangay</span>
                        <input placeholder="Mataas Na Kahoy" value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Street Name</span>
                        <input placeholder="Purok 4" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Zip Code</span>
                        <input placeholder="3125" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Landmark</span>
                        <input placeholder="Near 7/11" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                      </label>
                    </div>

                    <div className="quote-section">
                      <h4>Delivery Schedule</h4>
                      <div className="booking-grid">
                        <label className="field">
                          <span>Delivery Date</span>
                          <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
                        </label>
                        <label className="field">
                          <span>Preferred Delivery Time</span>
                          <input type="time" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} />
                        </label>
                      </div>
                      <div className="booking-toggle">
                        <p>Delivery Method</p>
                        <div className="choice-row">
                          <label className="choice">
                            <input
                              type="radio"
                              name="delivery_method"
                              checked={form.delivery_method === "delivery"}
                              onChange={() => setForm({ ...form, delivery_method: "delivery" })}
                            />
                            Deliver to this address
                          </label>
                          <label className="choice">
                            <input
                              type="radio"
                              name="delivery_method"
                              checked={form.delivery_method === "pickup"}
                              onChange={() => setForm({ ...form, delivery_method: "pickup" })}
                            />
                            Customer pickup
                          </label>
                        </div>
                      </div>
                      <div className="booking-grid">
                        <label className="field">
                          <span>Pickup Date</span>
                          <input
                            type="date"
                            value={form.pickup_date}
                            disabled={form.delivery_method !== "pickup"}
                            onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>Pickup Time</span>
                          <input
                            type="time"
                            value={form.pickup_time}
                            disabled={form.delivery_method !== "pickup"}
                            onChange={(e) => setForm({ ...form, pickup_time: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="field">
                        <span>Delivery Instructions (Optional)</span>
                        <textarea
                          placeholder="Floor/unit number, gate color, parking notes, or access instructions"
                          value={form.delivery_instructions}
                          onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
                        />
                      </label>
                    </div>

                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Menu Selection" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Menu Selection</h3>
                    </div>
                    <div className="quote-tabs">
                      {menuTabs.map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          className={`quote-tab ${menuFilter === tab ? "active" : ""}`}
                          onClick={() => setMenuFilter(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    {filteredMenu.length > 0 ? (
                      <div className="menu-grid">
                        {filteredMenu.map((item) => (
                          <div key={item._id || item.name} className={`menu-card ${form.selected_menu.includes(item.name) ? "selected" : ""}`}>
                            {item.image_url && <img src={item.image_url} alt={item.name} />}
                            <div className="menu-card-body quote-menu-body">
                              <div>
                                <h5>{item.name}</h5>
                                {item.category && <p>{item.category}</p>}
                              </div>
                              <button
                                type="button"
                                className="quote-select-btn"
                                onClick={() => toggleMenuItem(item.name)}
                              >
                                {form.selected_menu.includes(item.name) ? "Selected" : "Select Food"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="package-empty">Menu items will appear once loaded.</div>
                    )}
                    <label className="quote-other">
                      <input
                        type="checkbox"
                        checked={Boolean(form.menu_other)}
                        onChange={(e) => setForm({ ...form, menu_other: e.target.checked ? "Other" : "" })}
                      />
                      Other
                    </label>
                    <label className="field">
                      <span>Other Menu Requests</span>
                      <textarea
                        placeholder="Let us know if you have other menu requests."
                        value={form.menu_other}
                        onChange={(e) => setForm({ ...form, menu_other: e.target.value })}
                      />
                    </label>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Dietary Needs" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Dietary Needs</h3>
                    </div>
                    <label className="field">
                      <span>Dietary Restrictions</span>
                      <textarea
                        placeholder="Vegetarian, vegan, gluten-free, etc."
                        value={form.dietary_restrictions}
                        onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>Allergies and Intolerances</span>
                      <textarea
                        placeholder="Nut allergies, seafood allergies, lactose intolerance, etc."
                        value={form.allergies}
                        onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      />
                    </label>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Contact" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Contact Information</h3>
                    </div>
                    <div className="booking-grid">
                      <label className="field span-2">
                        <span>Full Name</span>
                        <input placeholder="Your Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Email Address</span>
                        <input placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Phone Number</span>
                        <input placeholder="0900 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </label>
                      {form.service_type === "event" && (
                        <label className="field">
                          <span>Best Time to Call</span>
                          <input placeholder="Weekdays morning, evenings after 6pm" value={form.best_time_to_call} onChange={(e) => setForm({ ...form, best_time_to_call: e.target.value })} />
                        </label>
                      )}
                    </div>
                    <div className="booking-toggle">
                      <p>Preferred Contact Method</p>
                      <div className="choice-row">
                        <label className="choice">
                          <input
                            type="radio"
                            name="contact_method"
                            checked={form.contact_method === "email"}
                            onChange={() => setForm({ ...form, contact_method: "email" })}
                          />
                          Email
                        </label>
                        <label className="choice">
                          <input
                            type="radio"
                            name="contact_method"
                            checked={form.contact_method === "phone"}
                            onChange={() => setForm({ ...form, contact_method: "phone" })}
                          />
                          Phone
                        </label>
                        <label className="choice">
                          <input
                            type="radio"
                            name="contact_method"
                            checked={form.contact_method === "sms"}
                            onChange={() => setForm({ ...form, contact_method: "sms" })}
                          />
                          Text Message
                        </label>
                      </div>
                    </div>
                    {form.service_type === "event" && (
                      <>
                        <label className="field">
                          <span>Inspiration Links or Pinterest Board</span>
                          <textarea
                            placeholder="Share any Pinterest boards, Instagram posts, or websites that inspire your vision."
                            value={form.inspiration_links}
                            onChange={(e) => setForm({ ...form, inspiration_links: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>Upload Photos or Documents (Optional)</span>
                          <input
                            className="quote-upload"
                            type="file"
                            multiple
                            onChange={(e) => setForm({ ...form, attachments: Array.from(e.target.files || []) })}
                          />
                        </label>
                      </>
                    )}
                    <label className="field">
                      <span>Additional Notes</span>
                      <textarea
                        placeholder="Any other details we should know about your food catering needs..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </label>
                    <div className="agreement-row">
                      <label className="choice">
                        <input
                          type="checkbox"
                          checked={form.agree_terms}
                          onChange={(e) => setForm({ ...form, agree_terms: e.target.checked })}
                        />
                        I agree to the Terms and Conditions and understand that this is a request for a quote, not a confirmed booking.
                      </label>
                      <label className="choice">
                        <input
                          type="checkbox"
                          checked={form.agree_privacy}
                          onChange={(e) => setForm({ ...form, agree_privacy: e.target.checked })}
                        />
                        I have read the Privacy Policy.
                      </label>
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <div className="booking-tip info">
                      <span className="tip-icon">i</span>
                      <div>
                        <strong>What Happens Next?</strong>
                        <p>We will review your custom quote request and reach out within 24-48 hours to schedule a consultation.</p>
                      </div>
                    </div>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={submit}>Submit</button>
                    </div>
                  </>
                )}

                {currentStep === "Event Overview" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Event Details</h3>
                    </div>
                    <div className="booking-grid">
                      <label className="field">
                        <span>Event Type</span>
                        <input placeholder="Birthday" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Theme or Colors</span>
                        <input placeholder="Navy and Gold, Rustic Garden" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Date</span>
                        <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Start Time</span>
                        <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Estimated Guest Count</span>
                        <input placeholder="50" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Event Duration (hours)</span>
                        <input placeholder="2 hours" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
                      </label>
                    </div>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Venue Information" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Venue Information</h3>
                    </div>
                    <div className="booking-grid">
                      <label className="field">
                        <span>Venue Type</span>
                        <input placeholder="Covered court" value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Venue Size</span>
                        <input placeholder="20 x 20" value={form.venue_size} onChange={(e) => setForm({ ...form, venue_size: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Indoor or Outdoor</span>
                        <input placeholder="Indoor" value={form.indoor_outdoor} onChange={(e) => setForm({ ...form, indoor_outdoor: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Province</span>
                        <input placeholder="Nueva Ecija" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Municipality</span>
                        <input placeholder="General M. Natividad" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Barangay</span>
                        <input placeholder="Mataas na Kahoy" value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Street Name</span>
                        <input placeholder="Purok 4" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Zip Code</span>
                        <input placeholder="3125" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
                      </label>
                      <label className="field">
                        <span>Landmark</span>
                        <input placeholder="Near at 7/11" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                      </label>
                    </div>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Budget" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Budget</h3>
                    </div>
                    <p className="quote-muted">Help us understand your budget for event setup.</p>
                    <div className="quote-budget-grid">
                      {budgetOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`quote-budget-option ${form.budget_range === option ? "selected" : ""}`}
                          onClick={() => setForm({ ...form, budget_range: option })}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Furniture and Setup" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Furniture and Setup Needs</h3>
                    </div>
                    <div className="quote-checklist">
                      <div>
                        <h4>Event Setup and Furniture</h4>
                        <div className="quote-checkbox-grid">
                          {furnitureOptions.map((item) => (
                            <label key={item} className="quote-checkbox">
                              <input
                                type="checkbox"
                                checked={form.furniture_setup.includes(item)}
                                onChange={() => toggleValue("furniture_setup", item)}
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4>Dining and Service Inventory</h4>
                        <div className="quote-checkbox-grid">
                          {diningOptions.map((item) => (
                            <label key={item} className="quote-checkbox">
                              <input
                                type="checkbox"
                                checked={form.dining_inventory.includes(item)}
                                onChange={() => toggleValue("dining_inventory", item)}
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4>Adds On</h4>
                        <div className="quote-checkbox-grid">
                          {addOnOptions.map((item) => (
                            <label key={item} className="quote-checkbox">
                              <input
                                type="checkbox"
                                checked={form.add_ons.includes(item)}
                                onChange={() => toggleValue("add_ons", item)}
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}

                {currentStep === "Decor and Lighting" && (
                  <>
                    <div className="booking-card-header">
                      <h3>Decor and Lighting</h3>
                    </div>
                    <div className="quote-checklist">
                      <div>
                        <h4>Lighting Options</h4>
                        <div className="quote-checkbox-grid">
                          {lightingOptions.map((item) => (
                            <label key={item} className="quote-checkbox">
                              <input
                                type="checkbox"
                                checked={form.lighting_options.includes(item)}
                                onChange={() => toggleValue("lighting_options", item)}
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4>Decorations</h4>
                        <div className="quote-checkbox-grid">
                          {decorOptions.map((item) => (
                            <label key={item} className="quote-checkbox">
                              <input
                                type="checkbox"
                                checked={form.decor_options.includes(item)}
                                onChange={() => toggleValue("decor_options", item)}
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                      <label className="field">
                        <span>Theme and Color Scheme</span>
                        <textarea
                          placeholder="Describe your event theme, color palette, and style preferences..."
                          value={form.theme_colors}
                          onChange={(e) => setForm({ ...form, theme_colors: e.target.value })}
                        />
                      </label>
                    </div>
                    <div className="booking-actions split">
                      <button className="btn-outline" onClick={back}>Back</button>
                      <button className="btn" onClick={next}>Next Step</button>
                    </div>
                  </>
                )}
              </div>

              <aside className="quote-help">
                <h4>Need Help?</h4>
                <div className="quote-help-list">
                  <div>
                    <strong>Call Us</strong>
                    <span>(555) 123-4567</span>
                  </div>
                  <div>
                    <strong>Email Us</strong>
                    <span>quotes@caezelles.com</span>
                  </div>
                  <div>
                    <strong>Office Hours</strong>
                    <span>Mon-Fri: 9AM-6PM</span>
                  </div>
                </div>
                <div className="quote-divider" />
                <div className="quote-tips">
                  <h5>Quick Tips</h5>
                  <ul>
                    {form.service_type === "event" ? (
                      <>
                        <li>Measure your venue space</li>
                        <li>Check venue restrictions</li>
                        <li>Plan setup timeline</li>
                      </>
                    ) : (
                      <>
                        <li>Consider dietary restrictions</li>
                        <li>Include beverage options</li>
                        <li>Plan setup timeline</li>
                      </>
                    )}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}