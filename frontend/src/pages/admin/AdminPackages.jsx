import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);

  const load = () => AdminAPI.getPackages().then((res) => setPackages(res.data));
  useEffect(() => load(), []);

  const submit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append("image", file);

    if (form._id) await AdminAPI.updatePackage(form._id, data);
    else await AdminAPI.createPackage(data);

    setShow(false);
    setForm({});
    setFile(null);
    load();
  };

  const edit = (p) => { setForm(p); setShow(true); };
  const remove = (id) => AdminAPI.deletePackage(id).then(load);

  return (
    <AdminLayout>
      <h1>Packages</h1>
      <button className="btn" onClick={() => setShow(true)}>+ Add Package</button>

      <div className="grid">
        {packages.map((p) => (
          <div className="card" key={p._id}>
            <h4>{p.name}</h4>
            <p>{p.description}</p>
            <button className="btn-outline" onClick={() => edit(p)}>Edit</button>
            <button className="btn-danger" onClick={() => remove(p._id)}>Delete</button>
          </div>
        ))}
      </div>

      {show && (
        <Modal title="Package" onClose={() => setShow(false)}>
          <input placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input placeholder="Size" value={form.size || ""} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          <input placeholder="Price Min" value={form.price_min || ""} onChange={(e) => setForm({ ...form, price_min: e.target.value })} />
          <input placeholder="Price Max" value={form.price_max || ""} onChange={(e) => setForm({ ...form, price_max: e.target.value })} />
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn" onClick={submit}>Save</button>
        </Modal>
      )}
    </AdminLayout>
  );
}