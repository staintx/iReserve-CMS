import { useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";

const steps = ["Event Details","Venue Information","Menu Options","Additional Services","Contact Info","Review & Payment"];

export default function BookingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    customer_id: user._id,
    event_type: "",
    event_theme: "",
    event_date: "",
    start_time: "",
    guest_count: "",
    duration_hours: "",
    include_food: true,
    venue_type: "",
    indoor_outdoor: "",
    province: "",
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    venue_contact_name: "",
    venue_contact_phone: "",
    dietary_restrictions: "",
    allergies: "",
    special_requests: "",
    additional_services: [],
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_alt_phone: "",
    contact_method: "email",
    payment_method: ""
  });

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    await CustomerAPI.createBooking(form);
    navigate("/customer/booking-success");
  };

  return (
    <CustomerLayout>
      <div className="stepper">
        {steps.map((s, i) => (
          <div key={s} className={`step ${i === step ? "active" : ""}`}>{s}</div>
        ))}
      </div>

      {step === 0 && (
        <div className="form-card">
          <h3>Event Details</h3>
          <input placeholder="Event Type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
          <input placeholder="Event Theme or Colors" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
          <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <input placeholder="Estimated Guest Count" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
          <input placeholder="Duration (hours)" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 1 && (
        <div className="form-card">
          <h3>Venue Information</h3>
          <input placeholder="Venue Type" value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} />
          <input placeholder="Indoor / Outdoor" value={form.indoor_outdoor} onChange={(e) => setForm({ ...form, indoor_outdoor: e.target.value })} />
          <input placeholder="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          <input placeholder="Municipality" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
          <input placeholder="Barangay" value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
          <input placeholder="Street Name" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <input placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
          <input placeholder="Zip Code" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 2 && (
        <div className="form-card">
          <h3>Menu Options</h3>
          <textarea placeholder="Dietary Restrictions" value={form.dietary_restrictions} onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })} />
          <textarea placeholder="Allergies & Intolerances" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          <textarea placeholder="Special Requests" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 3 && (
        <div className="form-card">
          <h3>Additional Services</h3>
          <label><input type="checkbox" /> Chairs</label>
          <label><input type="checkbox" /> Tables</label>
          <label><input type="checkbox" /> Sound System</label>
          <div>
            <button className="btn-outline" onClick={back}>Back</button>
            <button className="btn" onClick={next}>Next Step</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="form-card">
          <h3>Contact Info</h3>
          <input placeholder="First Name" value={form.contact_first_name} onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })} />
          <input placeholder="Last Name" value={form.contact_last_name} onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })} />
          <input placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <input placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 5 && (
        <div className="form-card">
          <h3>Review & Payment</h3>
          <textarea placeholder="Special Requests or Notes" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
          <label><input type="radio" name="pay" onChange={() => setForm({ ...form, payment_method: "card" })} /> Credit/Debit</label>
          <label><input type="radio" name="pay" onChange={() => setForm({ ...form, payment_method: "bank" })} /> Bank Transfer</label>
          <label><input type="radio" name="pay" onChange={() => setForm({ ...form, payment_method: "cash" })} /> Cash</label>
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={submit}>Submit Booking</button>
        </div>
      )}
    </CustomerLayout>
  );
}