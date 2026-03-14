import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import DashboardStatCard from "../../components/dashboard/DashboardStatCard";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";

const formatCurrency = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    CustomerAPI.getPayments().then((res) => setPayments(res.data)).catch(() => setPayments([]));
  }, []);

  const totalPaid = useMemo(
    () => payments.reduce((sum, item) => sum + (item.amount || 0), 0),
    [payments]
  );
  const upcomingDue = useMemo(
    () => payments.filter((p) => p.status === "pending").reduce((sum, item) => sum + (item.amount || 0), 0),
    [payments]
  );

  return (
    <CustomerDashboardLayout
      title="Payment History"
      subtitle="Track your payments and transactions"
    >
      <div className="dashboard-cards">
        <DashboardStatCard
          label="Total Spent"
          value={formatCurrency(totalPaid)}
          helper="All payments processed"
        />
        <DashboardStatCard
          label="Upcoming Payments"
          value={formatCurrency(upcomingDue)}
          helper="Payments due"
        />
        <DashboardStatCard
          label="Bookings"
          value={new Set(payments.map((p) => p.booking_id?._id || p.booking_id)).size || 0}
          helper="Across all bookings"
        />
      </div>

      <div className="table-card" style={{ marginBottom: "16px" }}>
        <div className="tile-header">
          <h3>Upcoming Payments</h3>
        </div>
        {payments.filter((p) => p.status === "pending").map((p) => (
          <div key={p._id} className="list-card">
            <div>
              <strong>{p.booking_id?.event_type || "Event"}</strong>
              <div><small>{p.booking_id?._id || ""}</small></div>
            </div>
            <div>
              <strong>{formatCurrency(p.amount)}</strong>
              <div className="action-link">Pay Now →</div>
            </div>
          </div>
        ))}
        {payments.filter((p) => p.status === "pending").length === 0 && <p>No upcoming payments.</p>}
      </div>

      <div className="table-card" style={{ marginBottom: "16px" }}>
        <div className="tile-header">
          <h3>All Transactions</h3>
        </div>
        <CustomerPaymentsTable payments={payments} formatCurrency={formatCurrency} />
        {payments.length === 0 && <p>No transactions yet.</p>}
      </div>

      <div className="profile-section">
        <h3>Saved Payment Methods</h3>
        <div className="payment-method-card">
          <strong>VISA •••• 4242</strong>
          <div><small>Expires 12/25</small></div>
        </div>
        <div className="action-link" style={{ marginTop: "10px" }}>+ Add Payment Method</div>
      </div>
    </CustomerDashboardLayout>
  );
}
