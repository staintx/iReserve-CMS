import { useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";

export default function CustomerInquiry() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    event_type: "",
    event_date: "",
    guest_count: "",
    venue: "",
    service_type: "",
    budget_min: "",
    budget_max: "",
    menu_preferences: "",
    dietary_needs: ""
  });

  const submit = async () => {
    await CustomerAPI.submitInquiry({ ...form, customer_id: user._id });
    alert("Inquiry submitted!");
  };

  return (
    <CustomerLayout>
      <h1>Submit Inquiry</h1>
      <div className="form-card">
        <input placeholder="Event Type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
        <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        <input placeholder="Guest Count" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
        <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        <input placeholder="Service Type" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} />
        <input placeholder="Budget Min" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
        <input placeholder="Budget Max" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
        <textarea placeholder="Menu Preferences" value={form.menu_preferences} onChange={(e) => setForm({ ...form, menu_preferences: e.target.value })} />
        <textarea placeholder="Dietary Needs" value={form.dietary_needs} onChange={(e) => setForm({ ...form, dietary_needs: e.target.value })} />
        <button className="btn" onClick={submit}>Submit Inquiry</button>
      </div>
    </CustomerLayout>
  );
}