import { useState } from "react";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import useAuth from "../../../hooks/useAuth";

const steps = ["Event Information", "Delivery Address", "Menu Selection", "Dietary Needs", "Contact"];

export default function QuoteWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ customer_id: user._id, service_type: "food" });

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    await CustomerAPI.submitQuote(form);
    alert("Quote submitted!");
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
          <h3>Choose Your Service Type</h3>
          <label><input type="radio" name="svc" defaultChecked onChange={() => setForm({ ...form, service_type: "food" })}/> Food Only</label>
          <label><input type="radio" name="svc" onChange={() => setForm({ ...form, service_type: "event" })}/> Event Styling</label>
          <label><input type="radio" name="svc" onChange={() => setForm({ ...form, service_type: "full" })}/> Full Package</label>
          <button className="btn" onClick={next}>Continue to Details</button>
        </div>
      )}

      {step === 1 && (
        <div className="form-card">
          <h3>Delivery Address</h3>
          <input placeholder="Province" onChange={(e) => setForm({ ...form, province: e.target.value })} />
          <input placeholder="Municipality" onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
          <input placeholder="Barangay" onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 2 && (
        <div className="form-card">
          <h3>Menu Selection</h3>
          <textarea placeholder="Preferred Menu Items" onChange={(e) => setForm({ ...form, menu_notes: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 3 && (
        <div className="form-card">
          <h3>Dietary Needs</h3>
          <textarea placeholder="Dietary Restrictions" onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })} />
          <textarea placeholder="Allergies" onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={next}>Next Step</button>
        </div>
      )}

      {step === 4 && (
        <div className="form-card">
          <h3>Contact</h3>
          <input placeholder="Full Name" onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea placeholder="Additional Notes" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn-outline" onClick={back}>Back</button>
          <button className="btn" onClick={submit}>Submit</button>
        </div>
      )}
    </CustomerLayout>
  );
}