import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import AdminManagersTable from "../../components/tables/AdminManagersTable";
import AdminManagersForm from "../../components/forms/AdminManagersForm";

export default function AdminManagers({ defaultTab = "managers" }) {
  const [staff, setStaff] = useState([]);
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState(defaultTab);
  const [form, setForm] = useState({ role: "manager", is_active: true });

  const load = () => AdminAPI.getStaff().then((res) => setStaff(Array.isArray(res.data) ? res.data : []));
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const payload = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      username: form.username,
      password: form.password,
      role: form.role,
      is_active: form.is_active
    };

    if (form._id) {
      await AdminAPI.updateStaff(form._id, payload);
    } else {
      await AdminAPI.createStaff(payload);
    }

    setShow(false);
    setForm({ role: tab === "managers" ? "manager" : "staff", is_active: true });
    load();
  };

  const edit = (member) => {
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

  const remove = (id) => AdminAPI.deleteStaff(id).then(load);

  const managers = staff.filter((m) => m.role === "manager");
  const staffMembers = staff.filter((m) => m.role === "staff");
  const mockManagers = [
    { _id: "mock-1", full_name: "James Rodriguez", role: "manager", is_active: true },
    { _id: "mock-2", full_name: "Patricia Lee", role: "manager", is_active: true }
  ];
  const mockStaff = [
    { _id: "mock-3", full_name: "Anna Marie Lopez", role: "staff", is_active: true },
    { _id: "mock-4", full_name: "John Dela Cruz", role: "staff", is_active: true }
  ];
  const rows = (tab === "managers" ? managers : staffMembers);
  const list = rows.length > 0 ? rows : (tab === "managers" ? mockManagers : mockStaff);

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Manager and Staff Directory</h1>
          <p>Create and manage manager & staff accounts</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => { setTab("managers"); setForm({ role: "manager", is_active: true }); setShow(true); }}>+ Create Manager</button>
          <button className="btn" onClick={() => { setTab("staff"); setForm({ role: "staff", is_active: true }); setShow(true); }}>+ Create Staff</button>
        </div>
      </div>

      <div className="tab-row" style={{ marginBottom: "12px" }}>
        <button className={tab === "managers" ? "active" : ""} onClick={() => setTab("managers")}>Managers</button>
        <button className={tab === "staff" ? "active" : ""} onClick={() => setTab("staff")}>Staff</button>
      </div>

      <div className="admin-table-wrap">
        <AdminManagersTable
          list={list}
          tab={tab}
          onEdit={edit}
          onRemove={remove}
        />
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
    </AdminLayout>
  );
}