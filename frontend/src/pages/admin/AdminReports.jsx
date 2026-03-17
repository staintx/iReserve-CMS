import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminReports() {
  const [metrics, setMetrics] = useState({
    summary: {},
    monthlyRevenue: [],
    bookingStatus: [],
    eventTypes: [],
    topPackages: []
  });

  useEffect(() => {
    AdminAPI.getMetrics().then((res) => setMetrics(res.data));
  }, []);

  const formatCurrency = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

  return (
    <AdminLayout>
      <h1>Reports & Analytics</h1>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Completed Bookings</h4>
          <p className="kpi-value">{metrics.summary.completedBookings || 0}</p>
        </div>
        <div className="kpi-card">
          <h4>Active Bookings</h4>
          <p className="kpi-value">{metrics.summary.activeBookings || 0}</p>
        </div>
        <div className="kpi-card">
          <h4>Pending Inquiries</h4>
          <p className="kpi-value">{metrics.summary.pendingInquiries || 0}</p>
        </div>
        <div className="kpi-card">
          <h4>Total Revenue</h4>
          <p className="kpi-value">{formatCurrency(metrics.summary.totalRevenue)}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h3>Monthly Revenue</h3>
          {metrics.monthlyRevenue.length === 0 && <p>No revenue data yet.</p>}
          {metrics.monthlyRevenue.map((item) => (
            <div className="list-item" key={item.month}>
              <strong>{item.month}</strong> · {formatCurrency(item.total)}
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Booking Status Breakdown</h3>
          {metrics.bookingStatus.length === 0 && <p>No status data yet.</p>}
          {metrics.bookingStatus.map((item) => (
            <div className="list-item" key={item.status}>
              <strong>{item.status}</strong> · {item.count}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <h3>Event Types</h3>
          {metrics.eventTypes.length === 0 && <p>No event data yet.</p>}
          {metrics.eventTypes.map((item) => (
            <div className="list-item" key={item.event_type}>
              <strong>{item.event_type}</strong> · {item.count}
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Top Packages</h3>
          {metrics.topPackages.length === 0 && <p>No package data yet.</p>}
          {metrics.topPackages.map((item) => (
            <div className="list-item" key={item.package_id}>
              <strong>{item.name}</strong> · {item.bookings} bookings · {formatCurrency(item.revenue)}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}