import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});

  const load = () => AdminAPI.getInventory().then((res) => setItems(res.data));
  useEffect(() => load(), []);

  const submit = async () => {
    if (form._id) await AdminAPI.updateInventory(form._id, form);
    else await AdminAPI.createInventory(form);
    setShow(false); setForm({}); load();
  };

  const edit = (i) => { setForm(i); setShow(true); };
  const remove = (id) => AdminAPI.deleteInventory(id).then(load);

  return (
    <AdminLayout>
      <h1>Inventory</h1>
      <button className="btn" onClick={() => setShow(true)}>+ Add Item</button>
      <div className="panel">
        <table className="table">
          <thead><tr><th>Item</th><th>Qty</th><th>Category</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i._id}>
                <td>{i.item_name}</td>
                <td>{i.quantity}</td>
                <td>{i.category}</td>
                <td>
                  <button className="btn-outline" onClick={() => edit(i)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(i._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal title="Inventory Item" onClose={() => setShow(false)}>
          <input placeholder="Item name" value={form.item_name || ""} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          <input placeholder="Quantity" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <button className="btn" onClick={submit}>Save</button>
        </Modal>
      )}
    </AdminLayout>
  );
}