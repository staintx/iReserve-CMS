import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import DashboardStatCard from "../../components/dashboard/DashboardStatCard";
import AdminEventCalendar from "../../components/dashboard/AdminEventCalendar";

export default function AdminDashboard() {
  const [summary, setSummary] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    pendingInquiries: 0,
    totalRevenue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    AdminAPI.getMetrics().then((res) => {
      setSummary(res.data.summary || {});
      setRecentActivity(res.data.recentActivity || []);
    });
  }, []);

  const formatCurrency = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Dashboard overview</h1>
        <p className="mt-2 text-sm text-slate-500">Overview of system activities</p>
      </div>

      <div className="dashboard-cards">
        <DashboardStatCard label="Total Bookings" value={summary.totalBookings || 0} />
        <DashboardStatCard label="Active Bookings" value={summary.activeBookings || 0} />
        <DashboardStatCard label="Pending Inquiries" value={summary.pendingInquiries || 0} />
        <DashboardStatCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
      </div>

      <AdminEventCalendar />

      <div className="panel">
        <h3>Recent Activity</h3>
        {recentActivity.length === 0 && <p>No activity yet.</p>}
        {recentActivity.map((item) => (
          <div className="list-item" key={`${item.type}-${item.id}`}>
            <strong>{item.title}</strong> · {item.type}
            <div>
              <small>Status: {item.status || "-"}</small>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}