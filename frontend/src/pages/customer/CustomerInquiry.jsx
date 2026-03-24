import { useMemo, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../utils/batangas";

export default function CustomerInquiry() {
  const { user } = useAuth();
  const { notify } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    event_type: "",
    event_type_other: "",
    event_date: "",
    start_time: "",
    guest_count: "",
    duration_hours: "",
    service_type: "food_event",
    venue_type: "",
    indoor_outdoor: "",
    province: BATANGAS_PROVINCE,
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    budget_min: "",
    budget_max: "",
    selected_menu: "",
    dietary_restrictions: "",
    special_requests: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_method: ""
  });

  const parseMenuItems = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(
    () => getBatangasBarangays(form.municipality),
    [form.municipality]
  );

  const submit = async () => {
    if (!user?._id) {
      notify("Your session expired. Please log in again.", "error");
      return;
    }

    if (form.event_date && form.event_date < today) {
      notify("Please choose a future date for the event.", "error");
      return;
    }

    const eventTypeValue = form.event_type === "Other"
      ? String(form.event_type_other || "").trim()
      : String(form.event_type || "").trim();
    if (!eventTypeValue) {
      notify(form.event_type === "Other" ? "Please specify the event type." : "Please choose an event type.", "error");
      return;
    }

    const includeFood = form.service_type !== "event_setup";
    const payload = {
      ...form,
      event_type: eventTypeValue,
      customer_id: user._id,
      include_food: includeFood,
      service_type: includeFood ? "Food & Event Setup" : "Event Setup Only",
      guest_count: Number(form.guest_count || 0),
      duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
      budget_min: form.budget_min ? Number(form.budget_min) : undefined,
      budget_max: form.budget_max ? Number(form.budget_max) : undefined,
      selected_menu: form.selected_menu ? parseMenuItems(form.selected_menu) : []
    };

    try {
      await CustomerAPI.submitInquiry(payload);
      notify("Inquiry submitted.", "success");
    } catch (err) {
      notify(err.response?.data?.message || "We could not submit your inquiry. Please try again.", "error");
    }
  };

  return (
    <CustomerLayout>
      <h1>Submit Inquiry</h1>
      <div className="form-card">
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
        {form.event_type === "Other" && (
          <input
            placeholder="Please specify event type"
            value={form.event_type_other}
            onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
          />
        )}
        <input type="date" min={today} value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        <input placeholder="Start Time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        <input placeholder="Guest Count" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
        <input placeholder="Duration (hours)" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
        <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
          <option value="food_event">Food & Event Setup</option>
          <option value="event_setup">Event Setup Only</option>
        </select>
        <input placeholder="Venue Type" value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} />
        <input placeholder="Indoor or Outdoor" value={form.indoor_outdoor} onChange={(e) => setForm({ ...form, indoor_outdoor: e.target.value })} />
        <select value={form.province} disabled>
          <option value={BATANGAS_PROVINCE}>{BATANGAS_PROVINCE}</option>
        </select>
        <select
          value={form.municipality}
          onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
        >
          <option value="">Select Municipality</option>
          {municipalities.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
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
        <input placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
        <input placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
        <input placeholder="ZIP Code" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
        <input placeholder="Budget Min" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
        <input placeholder="Budget Max" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
        <textarea placeholder="Selected Menu (comma-separated)" value={form.selected_menu} onChange={(e) => setForm({ ...form, selected_menu: e.target.value })} />
        <textarea placeholder="Dietary Restrictions" value={form.dietary_restrictions} onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })} />
        <textarea placeholder="Special Requests" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
        <input placeholder="Contact First Name" value={form.contact_first_name} onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })} />
        <input placeholder="Contact Last Name" value={form.contact_last_name} onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })} />
        <input placeholder="Contact Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        <input placeholder="Contact Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        <input placeholder="Preferred Contact Method" value={form.contact_method} onChange={(e) => setForm({ ...form, contact_method: e.target.value })} />
        <button className="btn" onClick={submit}>Submit Inquiry</button>
      </div>
    </CustomerLayout>
  );
}