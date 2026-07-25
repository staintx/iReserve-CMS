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
    () => payments.filter(p => p.status === "approved").reduce((sum, item) => sum + (item.amount || 0), 0),
    [payments]
  );
  const pendingPayments = useMemo(() => {
    // Get all pending payments
    const pending = payments.filter((p) => p.status === "pending");
    // Group by booking to avoid spam of abandoned checkouts
    const uniquePending = [];
    const seenBookings = new Set();
    
    for (const p of pending) {
      const bookingId = p.booking_id?._id || p.booking_id;
      if (!seenBookings.has(bookingId)) {
        seenBookings.add(bookingId);
        uniquePending.push(p);
      }
    }
    return uniquePending;
  }, [payments]);

  const upcomingDue = useMemo(
    () => pendingPayments.reduce((sum, item) => sum + (item.amount || 0), 0),
    [pendingPayments]
  );

  const completedTransactions = useMemo(
    () => payments.filter(p => p.status !== "pending"),
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

      <div className="table-card" style={{ marginBottom: "24px" }}>
        <div className="tile-header">
          <h3>Upcoming Payments</h3>
        </div>
        {pendingPayments.map((p) => (
          <div key={p._id} className="list-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <strong style={{ fontSize: "1.1rem" }}>{p.booking_id?.event_type || "Event Booking"}</strong>
              <div style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "4px" }}>Booking Ref: {p.booking_id?._id || p.booking_id}</div>
              <div style={{ color: "#64748b", fontSize: "0.875rem" }}>Type: <span style={{ textTransform: "capitalize" }}>{p.payment_type || "deposit"}</span></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <strong style={{ fontSize: "1.1rem" }}>{formatCurrency(p.amount)}</strong>
              <button
                className="btn"
                type="button"
                onClick={() => startPayment(p)}
                disabled={payingPaymentId === p._id}
              >
                {payingPaymentId === p._id ? "Opening..." : "Pay Now"}
              </button>
            </div>
          </div>
        ))}
        {pendingPayments.length === 0 && <p style={{ padding: "16px", color: "#64748b" }}>No upcoming payments due at this time.</p>}
      </div>

      <div className="table-card" style={{ marginBottom: "24px" }}>
        <div className="tile-header">
          <h3>Transaction History</h3>
        </div>
        <CustomerPaymentsTable payments={completedTransactions} formatCurrency={formatCurrency} />
        {completedTransactions.length === 0 && <p style={{ padding: "16px", color: "#64748b" }}>No completed transactions yet.</p>}
      </div>
    </CustomerDashboardLayout>
  );
}
