import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function CustomerProfile() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    CustomerAPI.getProfile().then((res) => setForm(res.data));
  }, []);

  const save = async () => {
    await CustomerAPI.updateProfile(form);
    alert("Profile updated");
  };

  return (
    <CustomerLayout>
      <h1>My Profile</h1>
      <div className="form-card">
        <input placeholder="Full Name" value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <button className="btn" onClick={save}>Save</button>
      </div>
    </CustomerLayout>
  );
}