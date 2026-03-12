import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ role: "staff" });

  const load = () => AdminAPI.getStaff().then((res) => setStaff(res.data));
  useEffect(() => load(), []);

  const submit = async () => {
    await AdminAPI.createStaff(form);
    setShow(false); setForm({ role: "staff" }); load();
  };

  return (
    <AdminLayout>
      <h1>Staff Directory</h1>
      <button className="btn" onClick={() => setShow(true)}>+ Create Staff</button>

      <div className="panel">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s._id}>
                <td>{s.full_name}</td>
                <td>{s.email}</td>
                <td>{s.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="Create Staff" onClose={() => setShow(false)}>
          <input placeholder="Full name" value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Password" type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
          <button className="btn" onClick={submit}>Save</button>
        </Modal>
      )}
    </AdminLayout>
  );
}