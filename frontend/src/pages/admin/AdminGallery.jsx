import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const { notify } = useToast();

  const load = () =>
    AdminAPI.getGallery()
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const titleValue = (form.title || "").trim();
    if (!titleValue) {
      notify("Please add a caption.", "error");
      return;
    }
    if (!form._id && !file) {
      notify("Please upload a photo.", "error");
      return;
    }

    const data = new FormData();
    data.append("title", titleValue);
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
      notify(err.response?.data?.message || "We could not save the gallery item. Please try again.", "error");
      return;
    }

    setShow(false); setForm({}); setFile(null); load();
  };

  const edit = (g) => { setForm(g); setFile(null); setShow(true); };
  const remove = (id) =>
    AdminAPI.deleteGallery(id)
      .then(() => {
        notify("Gallery item deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not delete the gallery item. Please try again.", "error"));

  const list = items;
  const handlePick = async (picked) => {
    const files = Array.from(picked || []);
    if (files.length === 0) return;

    if (files.length === 1) {
      setForm({ title: "" });
      setFile(files[0]);
      setShow(true);
      return;
    }

    const data = new FormData();
    for (const fileItem of files) {
      data.append("images", fileItem);
    }

    try {
      const res = await AdminAPI.createGalleryBulk(data);
      const uploaded = res.data?.length || 0;
      if (uploaded > 0) {
        notify(`Uploaded ${uploaded} photo${uploaded > 1 ? "s" : ""}.`, "success");
        load();
      }
    } catch (err) {
      notify(err.response?.data?.message || "We could not upload the photos. Please try again.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Gallery Management</h1>
          <p>Update landing page photo gallery</p>
        </div>
      </div>

      <label className="gallery-upload-box">
        <span className="gallery-upload-icon">↑</span>
        <span className="gallery-upload-title">Click to upload photos for Landing Page carousel</span>
        <span className="gallery-upload-hint">PNG, JPG, PDF up to 50MB</span>
        <input type="file" multiple onChange={(e) => handlePick(e.target.files)} />
      </label>

      <h3 className="gallery-section-title">Our Gallery</h3>
      <div className="gallery-grid">
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
              <div className="gallery-card-actions">
                <button type="button" className="gallery-icon-btn" onClick={() => edit(g)} aria-label="Edit">✎</button>
                <button type="button" className="gallery-icon-btn danger" onClick={() => remove(g._id)} aria-label="Delete">🗑</button>
              </div>
            </div>
          </div>
        ))}

        <label className="gallery-card gallery-upload-tile">
          <div className="gallery-upload-inner">
            <span className="gallery-upload-icon">↑</span>
            <span className="gallery-upload-title">Click to upload photo</span>
            <span className="gallery-upload-hint">PNG, JPG, PDF up to 10MB</span>
            <input type="file" onChange={(e) => handlePick(e.target.files)} />
          </div>
          <div className="gallery-upload-caption">Add a caption</div>
        </label>
      </div>

      {show && (
        <Modal title="Gallery Item" onClose={() => setShow(false)}>
          <div className="admin-modal">
            <input
              placeholder="Caption"
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
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