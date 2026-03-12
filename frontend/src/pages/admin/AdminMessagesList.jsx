import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminMessagesList() {
  return (
    <AdminLayout>
      <h1>Messages</h1>
      <div className="panel">
        <div className="list-item">Birthday - Jan 05 (INQ-024)</div>
        <div className="list-item">Wedding - Feb 28 (EVT-002)</div>
      </div>
    </AdminLayout>
  );
}