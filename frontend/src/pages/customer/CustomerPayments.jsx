import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import DashboardStatCard from "../../components/dashboard/DashboardStatCard";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";
import useToast from "../../hooks/useToast";
import { useSearchParams, useNavigate } from "react-router-dom";

const formatCurrency = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  useEffect(() => {
    const fetchAndVerify = async () => {
      try {
        const res = await CustomerAPI.getPayments();
        let data = res.data;
        
        if (searchParams.get("status") === "success") {
          let updated = false;
          for (const p of data) {
            if (p.status === "pending") {
              try {
                const vRes = await CustomerAPI.verifyPayment(p._id);
                if (vRes.data?.payment?.status === "approved") {
                  updated = true;
                }
              } catch (e) {}
            }
          }
          if (updated) {
            const fresh = await CustomerAPI.getPayments();
            data = fresh.data;
          }
        }
        setPayments(data);
      } catch (error) {
        setPayments([]);
      }
    };
    fetchAndVerify();
  }, [searchParams]);

  const paymentStatus = searchParams.get("status");
  const paymentNotice = paymentStatus === "success"
    ? { type: "success", text: "PayMongo payment completed. Your transaction will update shortly." }
    : paymentStatus === "cancelled"
      ? { type: "warning", text: "PayMongo checkout was cancelled." }
      : null;

  const startPayment = async (payment) => {
    if (!payment?._id || !payment.booking_id?._id) return;

    const amount = Number(payment.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("This payment does not have a valid amount.", "error");
      return;
    }

    setPayingPaymentId(payment._id);
    navigate("/customer/checkout", {
      state: {
        bookingId: payment.booking_id._id,
        amount,
        paymentType: payment.payment_type || "deposit"
      }
    });
  };

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
      {paymentNotice && (
        <div className={`booking-alert ${paymentNotice.type}`} style={{ marginBottom: "16px" }}>
          {paymentNotice.text}
        </div>
      )}

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
              <button
                className="action-link"
                type="button"
                onClick={() => startPayment(p)}
                disabled={payingPaymentId === p._id}
                style={{ background: "none", border: 0, padding: 0 }}
              >
                {payingPaymentId === p._id ? "Opening PayMongo..." : "Pay Now →"}
              </button>
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
