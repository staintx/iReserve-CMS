import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminBusinessInfo() {
  return (
    <AdminLayout>
      <h1>Business Info</h1>
      <div className="panel">
        <input placeholder="Business name" />
        <input placeholder="Email" />
        <input placeholder="Address" />
        <button className="btn">Save Changes</button>
      </div>
    </AdminLayout>
  );
}