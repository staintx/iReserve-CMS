import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";

export default function AdminMenu() {
  const [menu, setMenu] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);

  const load = () => AdminAPI.getMenu().then((res) => setMenu(res.data));
  useEffect(() => load(), []);

  const submit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append("image", file);

    if (form._id) await AdminAPI.updateMenu(form._id, data);
    else await AdminAPI.createMenu(data);

    setShow(false); setForm({}); setFile(null); load();
  };

  const edit = (m) => { setForm(m); setShow(true); };
  const remove = (id) => AdminAPI.deleteMenu(id).then(load);

  return (
    <AdminLayout>
      <h1>Food Menu</h1>
      <button className="btn" onClick={() => setShow(true)}>+ Add Menu Item</button>

      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Available</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {menu.map((m) => (
              <tr key={m._id}>
                <td>{m.name}</td>
                <td>{m.category}</td>
                <td>{m.available ? "Yes" : "No"}</td>
                <td>
                  <button className="btn-outline" onClick={() => edit(m)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(m._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="Menu Item" onClose={() => setShow(false)}>
          <input placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn" onClick={submit}>Save</button>
        </Modal>
      )}
    </AdminLayout>
  );
}