import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminPaymentApprovalsTable from "../../components/tables/AdminPaymentApprovalsTable";
import useToast from "../../hooks/useToast";

export default function AdminPaymentApprovals() {
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const { notify } = useToast();

  const load = () => AdminAPI.getPayments().then((res) => setPayments(Array.isArray(res.data) ? res.data : []));
  useEffect(() => {
    load();
  }, []);

  const approve = (id) =>
    AdminAPI.updatePayment(id, { status: "approved" })
      .then(() => {
        notify("Payment approved.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to approve payment.", "error"));
  const reject = (id) =>
    AdminAPI.updatePayment(id, { status: "rejected" })
      .then(() => {
        notify("Payment rejected.", "warning");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to reject payment.", "error"));

  const mockPayments = [
    { _id: "mock-1", booking_id: { event_type: "Wedding" }, customer_id: { full_name: "Maria Santos" }, amount: 5000, payment_type: "Deposit", method: "GCash", status: "pending" },
    { _id: "mock-2", booking_id: { event_type: "Birthday" }, customer_id: { full_name: "John Reyes" }, amount: 15000, payment_type: "Remaining", method: "Credit Card", status: "approved" }
  ];

  const list = payments.length > 0 ? payments : mockPayments;
  const filtered = list.filter((p) =>
    p.customer_id?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    p.booking_id?.event_type?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Payment Approvals</h1>
          <p>Review and approve pending payments</p>
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by client name, booking ID, or event type" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="admin-filter">Filters</button>
      </div>

      <div className="admin-table-wrap">
        <AdminPaymentApprovalsTable
          payments={filtered}
          onApprove={approve}
          onReject={reject}
        />
      </div>
    </AdminLayout>
  );
}