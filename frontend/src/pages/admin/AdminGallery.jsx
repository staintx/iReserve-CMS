import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [foods, setFoods] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const { notify } = useToast();

  const load = () => AdminAPI.getGallery().then((res) => setItems(Array.isArray(res.data) ? res.data : []));
  const loadFoods = () => AdminAPI.getMenu().then((res) => setFoods(Array.isArray(res.data) ? res.data : []));
  useEffect(() => { load(); loadFoods(); }, []);

  const submit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (file) data.append("image", file);

    try {
      if (form._id) {
        await AdminAPI.updateGallery(form._id, data);
        notify("Gallery item updated.", "success");
      } else {
        await AdminAPI.createGallery(data);
        notify("Gallery item created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save gallery item.", "error");
      return;
    }

    setShow(false); setForm({}); setFile(null); load();
  };

  const edit = (g) => { setForm(g); setShow(true); };
  const remove = (id) =>
    AdminAPI.deleteGallery(id)
      .then(() => {
        notify("Gallery item deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete gallery item.", "error"));

  const list = items;
  const foodList = foods;

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Gallery Management</h1>
          <p>Update landing page photo gallery</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => setShow(true)}>+ Add Photo</button>
        </div>
      </div>

      <div className="upload-box" style={{ marginBottom: "16px" }}>
        Click to upload photo for landing page cover
      </div>

      <h3>Our Gallery</h3>
      <div className="gallery-grid" style={{ marginTop: "12px" }}>
        {list.length === 0 && <p>No gallery items yet.</p>}
        {list.map((g) => (
          <div className="gallery-card" key={g._id}>
            {g.image_url ? (
              <img src={g.image_url} alt={g.title} />
            ) : (
              <div className="thumb" />
            )}
            <div className="gallery-card-body">
              <strong>{g.title}</strong>
              <div className="actions">
                <button className="btn-outline" onClick={() => edit(g)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(g._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: "18px" }}>Our Food</h3>
      <div className="gallery-grid" style={{ marginTop: "12px" }}>
        {foodList.length === 0 && <p>No menu items available.</p>}
        {foodList.map((food) => (
          <div className="gallery-card" key={food._id}>
            {food.image_url ? (
              <img src={food.image_url} alt={food.name} />
            ) : (
              <div className="thumb" />
            )}
            <div className="gallery-card-body">
              <strong>{food.name}</strong>
            </div>
          </div>
        ))}
      </div>

      {show && (
        <Modal title="Gallery Item" onClose={() => setShow(false)}>
          <div className="admin-modal">
            <input placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="upload-box">
              Upload image
              <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            </label>
            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn" onClick={submit}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}