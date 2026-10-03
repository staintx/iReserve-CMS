import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import AdminManagersTable from "../../components/tables/AdminManagersTable";
import AdminManagersForm from "../../components/forms/AdminManagersForm";
import useToast from "../../hooks/useToast";
import { validateName, validatePhone, validateUsername } from "@/lib/validationRules";

export default function AdminManagers({ defaultTab = "managers" }) {
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState(defaultTab);
  const [form, setForm] = useState({ role: "manager", is_active: true });
  const [viewTarget, setViewTarget] = useState(null);
  const { notify } = useToast();

  const load = () => {
    AdminAPI.getStaff()
      .then((res) => setStaff(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStaff([]));

    AdminAPI.getCustomers()
      .then((res) => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCustomers([]));

    AdminAPI.getBookings()
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBookings([]));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const nameErr = validateName(form.full_name, "Full name", { min: 2, max: 100, required: true });
    if (nameErr) return notify(nameErr, "error");
    if (!form.email?.trim()) return notify("Email is required.", "error");
    if (form.phone?.trim()) {
      const pErr = validatePhone(form.phone, "Phone number", { required: false });
      if (pErr) return notify(pErr, "error");
    }
    if (form.username?.trim()) {
      const uErr = validateUsername(form.username, { required: false });
      if (uErr) return notify(uErr, "error");
    }

    const payload = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      username: form.username,
      password: form.password,
      role: form.role,
      is_active: form.is_active
    };

    try {
      if (form._id) {
        await AdminAPI.updateStaff(form._id, payload);
        notify("Account updated.", "success");
      } else {
        await AdminAPI.createStaff(payload);
        notify("Account created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "We could not save the account. Please try again.", "error");
      return;
    }

    setShow(false);
    setForm({ role: tab === "managers" ? "manager" : "staff", is_active: true });
    load();
  };

  const edit = (member) => {
    if (tab === "customers") return;
    setForm({
      _id: member._id,
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      username: member.username,
      role: member.role,
      is_active: member.is_active
    });
    setShow(true);
  };

  const toggleStatus = (member) => {
    const request = tab === "customers"
      ? AdminAPI.updateCustomerStatus(member._id, { is_active: !member.is_active })
      : AdminAPI.updateStaff(member._id, { is_active: !member.is_active });

    request
      .then(() => {
        notify(member.is_active ? "Account disabled." : "Account enabled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not update the account. Please try again.", "error"));
  };

  const managers = staff.filter((m) => m.role === "manager");
  const staffMembers = staff.filter((m) => m.role === "staff");
  const list = tab === "managers" ? managers : tab === "staff" ? staffMembers : customers;

  const counts = useMemo(() => {
    const next = { managers: {}, staff: {} };
    bookings.forEach((booking) => {
      if (booking.manager_id) {
        const key = String(booking.manager_id._id || booking.manager_id);
        next.managers[key] = (next.managers[key] || 0) + 1;
      }
      if (Array.isArray(booking.staff_ids)) {
        booking.staff_ids.forEach((id) => {
          const key = String(id?._id || id);
          next.staff[key] = (next.staff[key] || 0) + 1;
        });
      }
    });
    return next;
  }, [bookings]);

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Manager and Staff Directory</h1>
          <p>Create and manage manager & staff accounts</p>
        </div>
        {tab !== "customers" && (
          <div className="admin-actions">
            <button className="btn" onClick={() => { setTab("managers"); setForm({ role: "manager", is_active: true }); setShow(true); }}>+ Create Manager</button>
            <button className="btn" onClick={() => { setTab("staff"); setForm({ role: "staff", is_active: true }); setShow(true); }}>+ Create Staff</button>
          </div>
        )}
      </div>

      <div className="tab-row" style={{ marginBottom: "12px" }}>
        <button className={tab === "managers" ? "active" : ""} onClick={() => setTab("managers")}>Managers</button>
        <button className={tab === "staff" ? "active" : ""} onClick={() => setTab("staff")}>Staff</button>
        <button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>Customers</button>
      </div>

      <div className="admin-table-wrap">
        <AdminManagersTable
          list={list}
          tab={tab}
          onEdit={edit}
          onToggleStatus={toggleStatus}
          onView={(member) => setViewTarget(member)}
        />
        {list.length === 0 && <p className="dash-empty">No accounts found.</p>}
      </div>

      {show && (
        <Modal title={form._id ? "Update Account" : tab === "managers" ? "Create Manager Account" : "Create Staff Account"} onClose={() => setShow(false)}>
          <AdminManagersForm
            form={form}
            setForm={setForm}
            tab={tab}
            onCancel={() => setShow(false)}
            onSubmit={submit}
          />
        </Modal>
      )}
      {viewTarget && (
        <Modal title="Account Details" onClose={() => setViewTarget(null)}>
          <div className="admin-modal">
            <div className="form-section">
              <h4>{viewTarget.full_name || "Account"}</h4>
              <p><strong>Role:</strong> {viewTarget.role || "customer"}</p>
              <p><strong>Status:</strong> {viewTarget.is_active ? "Active" : "Inactive"}</p>
              <p><strong>Email:</strong> {viewTarget.email || "-"}</p>
              <p><strong>Phone:</strong> {viewTarget.phone || "-"}</p>
              {viewTarget.role === "manager" && (
                <p><strong>Active Events:</strong> {counts.managers[String(viewTarget._id)] || 0}</p>
              )}
              {viewTarget.role === "staff" && (
                <p><strong>Assigned Events:</strong> {counts.staff[String(viewTarget._id)] || 0}</p>
              )}
            </div>
            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setViewTarget(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}