import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminDashboard() {
  const [data, setData] = useState({ totalBookings: 0, pendingInquiries: 0, totalRevenue: 0 });

  useEffect(() => {
    AdminAPI.getSummary().then((res) => setData(res.data));
  }, []);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Dashboard overview</h1>
        <p className="mt-2 text-sm text-slate-500">Overview of system activities</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Total Bookings</h4>
          <p className="kpi-value">{data.totalBookings}</p>
        </div>
        <div className="kpi-card">
          <h4>Pending Inquiries</h4>
          <p className="kpi-value">{data.pendingInquiries}</p>
        </div>
        <div className="kpi-card">
          <h4>Total Revenue</h4>
          <p className="kpi-value">₱{data.totalRevenue}</p>
        </div>
      </div>
    </AdminLayout>
  );
}