import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import useToast from "../../../hooks/useToast";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../../utils/batangas";
import Modal from "../../../components/common/Modal";

const stepLabels = {
  event: "Event Details",
  venue: "Venue Information",
  menu: "Menu Options",
  services: "Additional Services",
  contact: "Contact Info",
  review: "Review & Payment"
};

const furnitureOptions = ["Couch", "Balloon", "Cake Table", "Round Tables", "Monoblock Chairs", "Other"];
const diningOptions = ["Food Warmer", "Serving Spoons", "Plates", "Glasses", "Ice Cooler"];
const addOnOptions = ["Standee", "Host", "Clown", "Cake", "Videoke"];

export default function BookingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().split("T")[0];
  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState({ status: "idle", message: "" });
  const { notify } = useToast();
  const [agreements, setAgreements] = useState({ terms: false, privacy: false });
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [form, setForm] = useState({
    customer_id: user?._id || "",
    event_type: "",
    event_type_other: "",
    event_theme: "",
    event_date: "",
    start_time: "",
    guest_count: "",
    duration_hours: "",
    include_food: true,
    budget_min: "",
    budget_max: "",
    venue_type: "",
    indoor_outdoor: "",
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
  });

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      customer_id: prev.customer_id || user._id,
      contact_email: prev.contact_email || user.email || ""
    }));
  }, [user]);

  const stepKeys = useMemo(
    () => (form.include_food
      ? ["event", "venue", "menu", "services", "contact", "review"]
      : ["event", "venue", "services", "contact", "review"]),
    [form.include_food]
  );
  const steps = stepKeys.map((key) => stepLabels[key]);
  const currentStep = stepKeys[step];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  useEffect(() => {
    if (form.include_food) return;
    if (currentStep === "menu") {
      const nextIndex = stepKeys.indexOf("services");
      setStep(nextIndex === -1 ? 0 : nextIndex);
    }
  }, [form.include_food, currentStep, stepKeys]);

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(form.municipality),
    [form.municipality]
  );

  useEffect(() => {
    CustomerAPI.getMenu()
      .then((res) => setMenuItems(res.data))
      .catch(() => setMenuItems([]));
  }, []);

  useEffect(() => {
    if (!form.event_date || !form.start_time || !form.duration_hours) {
      setAvailability({ status: "idle", message: "" });
      return;
    }

    setAvailability({ status: "checking", message: "Checking availability..." });
    const timer = setTimeout(() => {
      CustomerAPI.checkAvailability({
        event_date: form.event_date,
        start_time: form.start_time,
        duration_hours: form.duration_hours,
        venue_type: form.venue_type,
        province: form.province,
        municipality: form.municipality,
        barangay: form.barangay,
        street: form.street
      })
        .then((res) => {
          if (res.data.available) {
            setAvailability({ status: "available", message: "Selected time is available." });
          } else {
            setAvailability({ status: "unavailable", message: "Selected time has a conflict. Please choose another schedule." });
          }
        })
        .catch(() => {
          setAvailability({ status: "idle", message: "" });
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
    form.street
  ]);

  const toggleService = (value) => {
    setForm((prev) => {
      const exists = prev.additional_services.includes(value);
      return {
        ...prev,
        additional_services: exists
          ? prev.additional_services.filter((item) => item !== value)
          : [...prev.additional_services, value]
      };
    });
  };

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

  const parseNumber = (value) => {
    const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const submit = async () => {
    setError("");
    try {
      if (!user?._id) {
        setError("Your session expired. Please log in again.");
        return;
      }

      if (form.event_date && form.event_date < today) {
        setError("Please choose a future date for the event.");
        return;
      }

      const eventTypeValue = form.event_type === "Other"
        ? String(form.event_type_other || "").trim()
        : String(form.event_type || "").trim();
      if (!eventTypeValue) {
        setError(form.event_type === "Other" ? "Please specify the event type." : "Please choose an event type.");
        return;
      }

      if (!agreements.terms || !agreements.privacy) {
        setError("Please accept the terms and privacy policy to continue.");
        return;
      }

      if (availability.status === "unavailable") {
        setError("That time is unavailable. Please choose a different schedule.");
        return;
      }

      const payload = {
        ...form,
        customer_id: user._id,
        event_type: eventTypeValue,
        guest_count: parseNumber(form.guest_count),
        duration_hours: parseNumber(form.duration_hours),
        budget_min: parseNumber(form.budget_min),
        budget_max: parseNumber(form.budget_max)
      };

      delete payload.event_type_other;
      if (!payload.contact_alt_phone) {
        delete payload.contact_alt_phone;
      }

      await CustomerAPI.submitInquiry(payload);
      notify("Inquiry submitted.", "success");
      navigate("/customer/booking-success");
    } catch (err) {
      const message = err.response?.data?.message || "We could not submit your inquiry. Please try again.";
      setError(message);
      notify(message, "error");
    }
  };

  return (
    <CustomerLayout>
      <div className="booking-page">
        <div className="booking-titlebar">
          <button className="booking-back" type="button" onClick={() => navigate("/packages")}>
            Back
          </button>
          <div>
            <p className="booking-kicker">Booking</p>
            <h2>Plan your event details</h2>
          </div>
          <div className="booking-summary">{user?.full_name || "Customer"}</div>
        </div>

        <div className="booking-stepper">
          {steps.map((label, index) => {
            const isActive = index === step;
            const isDone = index < step;
            return (
              <div key={label} className={`booking-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                <span className="booking-step-icon">{index + 1}</span>
                <span className="booking-step-label">{label}</span>
                {index < steps.length - 1 && <span className="booking-step-line" />}
              </div>
            );
          })}
        </div>

        {currentStep === "event" && (
          <div className="booking-card">
            <div className="booking-card-header">
              <h3>Event Details</h3>
            </div>
            <div className="booking-grid">
              <label className="field">
                <span>Event Type</span>
                <select
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
              </label>
              {form.event_type === "Other" && (
                <label className="field">
                  <span>Please Specify</span>
                  <input
                    placeholder="Anniversary, Christening, etc."
                    value={form.event_type_other}
                    onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                <span>Event Theme or Colors</span>
                <input placeholder="Navy and Gold, Rustic Garden" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
              </label>
              <label className="field">
                <span>Event Date</span>
                <input type="date" min={today} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </label>
              <label className="field">
                <span>Event Start Time</span>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </label>
              <label className="field">
                <span>Estimated Guest Count</span>
                <input type="number" min="1" placeholder="50" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
              </label>
              <label className="field">
                <span>Event Duration (hours)</span>
                <input type="number" min="1" step="0.5" placeholder="2" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
              </label>
            </div>

            {availability.status !== "idle" && (
              <div className={`booking-alert ${availability.status}`}>
                {availability.message}
              </div>
            )}

            <div className="booking-toggle">
              <p>Would you like to include food and menu service in your package?</p>
              <label className="choice">
                <input
                  type="radio"
                  name="include_food"
                  checked={form.include_food === true}
                  onChange={() => setForm({ ...form, include_food: true })}
                />
                Yes, include food/menu
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="include_food"
                  checked={form.include_food === false}
                  onChange={() => setForm({ ...form, include_food: false })}
                />
                No, event setup only
              </label>
            </div>

            <div className="booking-tip">
              <span className="tip-icon">i</span>
              <div>
                <strong>Planning Tip</strong>
                <p>We recommend booking at least 1-2 months in advance for optimal availability.</p>
              </div>
            </div>

            <div className="booking-actions">
              <button className="btn" onClick={next}>Next Step</button>
            </div>
          </div>
        )}

        {currentStep === "venue" && (
          <div className="booking-card">
            <div className="booking-card-header">
              <h3>Venue Information</h3>
            </div>
            <div className="booking-grid">
              <label className="field">
                <span>Venue Type</span>
                <input placeholder="Covered court, private resort, backyard" value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} />
              </label>
              <div className="field">
                <span>Venue Setting</span>
                <div className="choice-row">
                  <label className="choice">
                    <input
                      type="radio"
                      name="venue_setting"
                      checked={form.indoor_outdoor === "Indoor"}
                      onChange={() => setForm({ ...form, indoor_outdoor: "Indoor" })}
                    />
                    Indoor
                  </label>
                  <label className="choice">
                    <input
                      type="radio"
                      name="venue_setting"
                      checked={form.indoor_outdoor === "Outdoor"}
                      onChange={() => setForm({ ...form, indoor_outdoor: "Outdoor" })}
                    />
                    Outdoor
                  </label>
                </div>
              </div>
              <label className="field">
                <span>Province</span>
                <select value={form.province} disabled>
                  <option value={BATANGAS_PROVINCE}>{BATANGAS_PROVINCE}</option>
                </select>
              </label>
              <label className="field">
                <span>Municipality</span>
                <select
                  value={form.municipality}
                  onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
                >
                  <option value="">Select Municipality</option>
                  {municipalities.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Barangay</span>
                <select
                  value={form.barangay}
                  disabled={!form.municipality}
                  onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                >
                  <option value="">Select Barangay</option>
                  {barangays.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Street Name</span>
                <input placeholder="Purok 4" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </label>
              <label className="field">
                <span>Landmark</span>
                <input placeholder="Near 7/11" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
              </label>
              <label className="field">
                <span>Zip Code</span>
                <input placeholder="3125" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
              </label>
              <label className="field">
                <span>Venue Contact Person</span>
                <input placeholder="Name" value={form.venue_contact_name} onChange={(e) => setForm({ ...form, venue_contact_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Venue Contact Number</span>
                <input placeholder="Contact Number" value={form.venue_contact_phone} onChange={(e) => setForm({ ...form, venue_contact_phone: e.target.value })} />
              </label>
            </div>
            <div className="booking-actions split">
              <button className="btn-outline" onClick={back}>Back</button>
              <button className="btn" onClick={next}>Next Step</button>
            </div>
          </div>
        )}

        {currentStep === "menu" && (
          <div className="booking-card">
            <div className="booking-card-header">
              <h3>Menu Options</h3>
            </div>
            <div className="booking-menu">
              <div>
                <h4>Recommended food for this package</h4>
                {menuItems.length > 0 ? (
                  <div className="menu-grid">
                    {menuItems.map((item) => (
                      <label key={item._id || item.name} className={`menu-card ${form.selected_menu.includes(item.name) ? "selected" : ""}`}>
                        {item.image_url && <img src={item.image_url} alt={item.name} />}
                        <div className="menu-card-body">
                          <div>
                            <h5>{item.name}</h5>
                            {item.category && <p>{item.category}</p>}
                          </div>
                          <input
                            type="checkbox"
                            checked={form.selected_menu.includes(item.name)}
                            onChange={() => toggleMenuItem(item.name)}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="package-empty">Menu items will appear once loaded.</div>
                )}

                <div className="booking-textareas">
                  <label className="field">
                    <span>Dietary Restrictions</span>
                    <textarea placeholder="Vegetarian, vegan, gluten-free" value={form.dietary_restrictions} onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Allergies & Intolerances</span>
                    <textarea placeholder="List any allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Food Preferences & Special Requests</span>
                    <textarea placeholder="Share requests for the menu" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
                  </label>
                </div>
              </div>

              <aside className="menu-summary">
                <h4>Your Package Menu</h4>
                <p>Selected items</p>
                <div className="menu-summary-list">
                  {form.selected_menu.length ? (
                    form.selected_menu.map((item) => (
                      <div key={item} className="menu-summary-item">
                        <span>{item}</span>
                        <button type="button" onClick={() => toggleMenuItem(item)}>×</button>
                      </div>
                    ))
                  ) : (
                    <div className="menu-summary-empty">No menu items selected yet.</div>
                  )}
                </div>
                <div className="menu-summary-footer">
                  <span>Selected Items</span>
                  <strong>{form.selected_menu.length}</strong>
                </div>
              </aside>
            </div>
            <div className="booking-actions split">
              <button className="btn-outline" onClick={back}>Back</button>
              <button className="btn" onClick={next}>Next Step</button>
            </div>
          </div>
        )}

        {currentStep === "services" && (
          <div className="booking-card">
            <div className="booking-card-header">
              <h3>Additional Services</h3>
            </div>
            <div className="service-grid">
              <div>
                <h4>Furniture</h4>
                <div className="service-list">
                  {furnitureOptions.map((item) => (
                    <label key={item} className="choice">
                      <input
                        type="checkbox"
                        checked={form.additional_services.includes(item)}
                        onChange={() => toggleService(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h4>Dining Inventory</h4>
                <div className="service-list">
                  {diningOptions.map((item) => (
                    <label key={item} className="choice">
                      <input
                        type="checkbox"
                        checked={form.additional_services.includes(item)}
                        onChange={() => toggleService(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h4>Adds On</h4>
                <div className="service-list">
                  {addOnOptions.map((item) => (
                    <label key={item} className="choice">
                      <input
                        type="checkbox"
                        checked={form.additional_services.includes(item)}
                        onChange={() => toggleService(item)}
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
          </div>
        )}

        {currentStep === "contact" && (
          <div className="booking-card">
            <div className="booking-card-header">
              <h3>Contact Information</h3>
            </div>
            <div className="booking-grid">
              <label className="field">
                <span>First Name</span>
                <input placeholder="First name" value={form.contact_first_name} onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })} />
              </label>
              <label className="field">
                <span>Last Name</span>
                <input placeholder="Last name" value={form.contact_last_name} onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })} />
              </label>
              <label className="field span-2">
                <span>Email Address</span>
                <input placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </label>
              <label className="field">
                <span>Phone Number</span>
                <input placeholder="(+63) 901-000-0000" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </label>
              <label className="field">
                <span>Alternative Phone</span>
                <input placeholder="Optional" value={form.contact_alt_phone} onChange={(e) => setForm({ ...form, contact_alt_phone: e.target.value })} />
              </label>
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
            <div className="booking-actions split">
              <button className="btn-outline" onClick={back}>Back</button>
              <button className="btn" onClick={next}>Next Step</button>
            </div>
          </div>
        )}

        {currentStep === "review" && (
          <div className="booking-card">
            <div className="booking-card-header">
              <h3>Review & Payment</h3>
            </div>
            <label className="field">
              <span>Special Requests or Notes</span>
              <textarea placeholder="Any other details we should know about your event?" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <div className="payment-grid">
              <label className={`payment-card ${form.payment_method === "card" ? "selected" : ""}`}>
                <input type="radio" name="pay" checked={form.payment_method === "card"} onChange={() => setForm({ ...form, payment_method: "card" })} />
                <div>
                  <strong>Credit/Debit Card</strong>
                  <p>Secure payment processed by Stripe</p>
                </div>
              </label>
              <label className={`payment-card ${form.payment_method === "bank" ? "selected" : ""}`}>
                <input type="radio" name="pay" checked={form.payment_method === "bank"} onChange={() => setForm({ ...form, payment_method: "bank" })} />
                <div>
                  <strong>Bank Transfer</strong>
                  <p>Wire transfer or ACH</p>
                </div>
              </label>
              <label className={`payment-card ${form.payment_method === "cash" ? "selected" : ""}`}>
                <input type="radio" name="pay" checked={form.payment_method === "cash"} onChange={() => setForm({ ...form, payment_method: "cash" })} />
                <div>
                  <strong>Cash</strong>
                  <p>Direct cash payment</p>
                </div>
              </label>
            </div>
            <div className="agreement-row">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={agreements.terms}
                  onChange={(e) => setAgreements({ ...agreements, terms: e.target.checked })}
                />
                <span className="choice-text">
                  I agree to the
                  <button className="action-link" type="button" onClick={() => setShowTerms(true)}>
                    Terms & Conditions
                  </button>
                </span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={agreements.privacy}
                  onChange={(e) => setAgreements({ ...agreements, privacy: e.target.checked })}
                />
                <span className="choice-text">
                  I agree to the
                  <button className="action-link" type="button" onClick={() => setShowPrivacy(true)}>
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>
            <div className="booking-tip info">
              <span className="tip-icon">i</span>
              <div>
                <strong>Before You Submit</strong>
                <p>You will be required to pay a 20% deposit to confirm your booking. The remaining balance is due 7 days before the event date.</p>
              </div>
            </div>
            <div className="booking-actions split">
              <button className="btn-outline" onClick={back}>Back</button>
              <button className="btn" onClick={submit}>Submit Booking</button>
            </div>
          </div>
        )}
      </div>

      {showTerms && (
        <Modal title="Terms and Conditions" onClose={() => setShowTerms(false)}>
          <div className="policy-content">
            <h4>Booking & Reservation</h4>
            <p>All bookings are subject to availability. A reservation is only considered confirmed once the client has provided the necessary event details and paid the required deposit.</p>

            <h4>Payment Terms</h4>
            <ul>
              <li><strong>Deposit:</strong> A 20% down payment is required to reserve the date.</li>
              <li><strong>Final Payment:</strong> The remaining balance must be paid a day before the event date.</li>
            </ul>

            <h4>Cancellation & Refund Policy</h4>
            <p><strong>IMPORTANT:</strong> All deposits made are non-refundable and non-transferable. If a booking is canceled by the client for any reason, the deposit will be forfeited to cover administrative costs and lost business opportunities.</p>

            <h4>Lost or Damaged Equipment</h4>
            <p>The client is responsible for the safekeeping of all catering equipment and materials provided during the event. The client will be billed and held financially responsible for the replacement cost of any items that are lost, missing, or damaged during the event.</p>

            <h4>Liability</h4>
            <p>Caezelle's Catering Service is not responsible for any delays or failures in performance due to circumstances beyond our control (e.g., natural disasters, extreme weather, or government restrictions).</p>
          </div>
        </Modal>
      )}

      {showPrivacy && (
        <Modal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
          <div className="policy-content">
            <h4>Data Collection</h4>
            <p>We collect personal information such as your name, contact number, email address, and event details to facilitate your booking and provide our services.</p>

            <h4>Use of Information</h4>
            <p>Your data is used strictly for: processing your catering orders and payments, communicating regarding event logistics, and improving our system's user experience.</p>

            <h4>Data Security</h4>
            <p>We implement secure protocols to protect your information from unauthorized access. We do not sell or share your personal data with third-party marketers.</p>

            <h4>Consent</h4>
            <p>By using this system and paying the deposit, you agree to the collection of your data and acknowledge the No-Refund Policy stated in our Terms and Conditions.</p>
          </div>
        </Modal>
      )}
    </CustomerLayout>
  );
}