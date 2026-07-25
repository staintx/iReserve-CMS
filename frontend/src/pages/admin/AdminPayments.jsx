import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminPaymentApprovalsTable from "../../components/tables/AdminPaymentApprovalsTable";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Modal from "../../components/common/Modal";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState("pending");
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [proofTarget, setProofTarget] = useState(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    booking_id: "",
    amount: "",
    payment_type: "Deposit",
    method: "PayMongo",
    proof_url: ""
  });
  const { notify } = useToast();

  const load = () =>
    AdminAPI.getPayments()
      .then((res) => setPayments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPayments([]));
  useEffect(() => {
    load();
  }, []);

  const approve = (id) =>
    AdminAPI.updatePayment(id, { status: "approved" })
      .then(() => {
        notify("Payment approved.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not approve the payment. Please try again.", "error"));
  const reject = (id) =>
    AdminAPI.updatePayment(id, { status: "rejected" })
      .then(() => {
        notify("Payment rejected.", "warning");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not reject the payment. Please try again.", "error"));

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const byStatus = payments.filter((p) => {
      if (statusTab === "pending") return p.status === "pending";
      if (statusTab === "completed") return ["approved", "rejected"].includes(p.status);
      return true;
    });

    if (!normalizedQuery) return byStatus;
    return byStatus.filter((p) => {
      const text = `${p._id || ""} ${p.booking_id?._id || ""} ${p.customer_id?.full_name || ""} ${p.booking_id?.event_type || ""}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [payments, query, statusTab]);

  const openAddPayment = () => {
    setShowAddPayment(true);
    if (bookings.length === 0) {
      AdminAPI.getBookings()
        .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
        .catch(() => setBookings([]));
    }
  };

  const selectedBooking = bookings.find((b) => b._id === paymentForm.booking_id);

  const savePayment = async () => {
    if (!paymentForm.booking_id) {
      notify("Please select a booking.", "error");
      return;
    }
    const amountValue = Number(paymentForm.amount || 0);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      notify("Please enter a valid amount.", "error");
      return;
    }
    if (!selectedBooking?.customer_id?._id) {
      notify("Selected booking has no customer.", "error");
      return;
    }

    try {
      await AdminAPI.createPayment({
        booking_id: paymentForm.booking_id,
        customer_id: selectedBooking.customer_id._id,
        amount: amountValue,
        payment_type: paymentForm.payment_type,
        method: paymentForm.method,
        proof_url: paymentForm.proof_url || undefined,
        status: "approved"
      });
      notify("Payment recorded.", "success");
      setShowAddPayment(false);
      setPaymentForm({ booking_id: "", amount: "", payment_type: "Deposit", method: "PayMongo", proof_url: "" });
      load();
    } catch (err) {
      notify(err.response?.data?.message || "We could not add the payment. Please try again.", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Payments</h1>
          <p>Track incoming payments and verify transactions</p>
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by client name, transaction ID, or event type..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn" type="button" onClick={openAddPayment}>+ Add Payment</button>
        <div className="tab-row" role="tablist" aria-label="Payment status">
          <button
            type="button"
            className={statusTab === "pending" ? "active" : ""}
            onClick={() => setStatusTab("pending")}
          >
            Pending
          </button>
          <button
            type="button"
            className={statusTab === "completed" ? "active" : ""}
            onClick={() => setStatusTab("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <AdminPaymentApprovalsTable
          payments={filtered}
          onApprove={(payment) => setApproveTarget(payment)}
          onReject={(payment) => setRejectTarget(payment)}
          onViewProof={(payment) => setProofTarget(payment)}
        />
        {filtered.length === 0 && <p className="dash-empty">No payments found.</p>}
      </div>
      {approveTarget && (
        <ConfirmDialog
          message={`Approve payment ${approveTarget._id?.slice(-6) || ""}?`}
          onConfirm={() => {
            approve(approveTarget._id);
            setApproveTarget(null);
          }}
          onCancel={() => setApproveTarget(null)}
        />
      )}
      {rejectTarget && (
        <ConfirmDialog
          message={`Reject payment ${rejectTarget._id?.slice(-6) || ""}? This cannot be undone.`}
          onConfirm={() => {
            reject(rejectTarget._id);
            setRejectTarget(null);
          }}
          onCancel={() => setRejectTarget(null)}
        />
      )}
      {showAddPayment && (
        <Modal title="Add Payment" onClose={() => setShowAddPayment(false)}>
          <div className="admin-modal">
            <div className="form-section">
              <h4>Customer & Event Information</h4>
              <div className="form-grid-2">
                <select
                  value={paymentForm.booking_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, booking_id: e.target.value })}
                >
                  <option value="">Select Booking</option>
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.event_type || "Event"} · EVT-{String(b._id).slice(-6).toUpperCase()}
                    </option>
                  ))}
                </select>
                <input value={selectedBooking?.customer_id?.full_name || ""} placeholder="Customer" readOnly />
              </div>
            </div>

            <div className="form-section">
              <h4>Payment Details</h4>
              <div className="form-grid-2">
                <select
                  value={paymentForm.payment_type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                >
                  <option value="Deposit">Deposit</option>
                  <option value="Remaining Balance">Remaining Balance</option>
                  <option value="Full Payment">Full Payment</option>
                </select>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="PayMongo">PayMongo</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <input
                placeholder="Amount"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
              <input
                placeholder="Proof URL (optional)"
                value={paymentForm.proof_url}
                onChange={(e) => setPaymentForm({ ...paymentForm, proof_url: e.target.value })}
              />
            </div>

            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setShowAddPayment(false)}>Cancel</button>
              <button className="btn" type="button" onClick={savePayment}>Record Payment</button>
            </div>
          </div>
        </Modal>
      )}
      {proofTarget && (
        <Modal title="Proof of Payment" onClose={() => setProofTarget(null)}>
          <div className="admin-modal">
            <p>{proofTarget.customer_id?.full_name || "Customer"}</p>
            {proofTarget.proof_url || proofTarget.checkout_url ? (
              <a className="action-link" href={proofTarget.proof_url || proofTarget.checkout_url} target="_blank" rel="noreferrer">
                Open proof in a new tab
              </a>
            ) : (
              <p>No proof uploaded.</p>
            )}
            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setProofTarget(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}