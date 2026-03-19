import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import AdminMenuTable from "../../components/tables/AdminMenuTable";
import AdminMenuForm from "../../components/forms/AdminMenuForm";
import useToast from "../../hooks/useToast";

export default function AdminMenu() {
  const [menu, setMenu] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const { notify } = useToast();

  const load = () => AdminAPI.getMenu().then((res) => setMenu(Array.isArray(res.data) ? res.data : []));
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      data.append(k, v);
    });
    if (file) data.append("image", file);

    try {
      if (form._id) {
        await AdminAPI.updateMenu(form._id, data);
        notify("Menu item updated.", "success");
      } else {
        await AdminAPI.createMenu(data);
        notify("Menu item created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save menu item.", "error");
      return;
    }

    setShow(false); setForm({}); setFile(null); load();
  };

  const edit = (m) => { setForm(m); setShow(true); };
  const remove = (id) =>
    AdminAPI.deleteMenu(id)
      .then(() => {
        notify("Menu item deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete menu item.", "error"));
  const toggleAvailability = (item) =>
    AdminAPI.updateMenu(item._id, { ...item, available: !item.available })
      .then(() => {
        notify(item.available ? "Menu item disabled." : "Menu item enabled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to update menu item.", "error"));

  const list = menu;
  const filtered = list.filter((item) =>
    item.name?.toLowerCase().includes(query.toLowerCase()) ||
    item.category?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Food Menu</h1>
          <p>Manage food menu items and availability</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => setShow(true)}>+ Add Menu Item</button>
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by item or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        {list.length === 0 && <p>No menu items yet.</p>}
        {list.length > 0 && (
          <AdminMenuTable
            items={filtered}
            onEdit={edit}
            onToggleAvailability={toggleAvailability}
            onDelete={remove}
          />
        )}
      </div>

      {show && (
        <Modal title="Add New Menu Item" onClose={() => setShow(false)}>
          <AdminMenuForm
            form={form}
            setForm={setForm}
            setFile={setFile}
            onCancel={() => setShow(false)}
            onSubmit={submit}
            submitLabel={form._id ? "Save Changes" : "Add Item"}
          />
        </Modal>
      )}
    </AdminLayout>
  );
}