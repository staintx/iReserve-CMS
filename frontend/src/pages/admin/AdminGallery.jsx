import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);

  const load = () => AdminAPI.getGallery().then((res) => setItems(res.data));
  useEffect(() => load(), []);

  const submit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append("image", file);

    if (form._id) await AdminAPI.updateGallery(form._id, data);
    else await AdminAPI.createGallery(data);

    setShow(false); setForm({}); setFile(null); load();
  };

  const edit = (g) => { setForm(g); setShow(true); };
  const remove = (id) => AdminAPI.deleteGallery(id).then(load);

  return (
    <AdminLayout>
      <h1>Gallery Manager</h1>
      <button className="btn" onClick={() => setShow(true)}>+ Add Photo</button>

      <div className="grid">
        {items.map((g) => (
          <div className="card" key={g._id}>
            <h4>{g.title}</h4>
            <p>{g.category}</p>
            <button className="btn-outline" onClick={() => edit(g)}>Edit</button>
            <button className="btn-danger" onClick={() => remove(g._id)}>Delete</button>
          </div>
        ))}
      </div>

      {show && (
        <Modal title="Gallery Item" onClose={() => setShow(false)}>
          <input placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn" onClick={submit}>Save</button>
        </Modal>
      )}
    </AdminLayout>
  );
}