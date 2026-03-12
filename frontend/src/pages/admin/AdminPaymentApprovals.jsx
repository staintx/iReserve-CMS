import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminPaymentApprovals() {
  const [payments, setPayments] = useState([]);

  const load = () => AdminAPI.getPayments().then((res) => setPayments(res.data));
  useEffect(() => load(), []);

  const approve = (id) => AdminAPI.updatePayment(id, { status: "approved" }).then(load);
  const reject = (id) => AdminAPI.updatePayment(id, { status: "rejected" }).then(load);

  return (
    <AdminLayout>
      <h1>Payment Approvals</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Type</th>
              <th>Method</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td>₱{p.amount}</td>
                <td>{p.payment_type}</td>
                <td>{p.method}</td>
                <td>{p.status}</td>
                <td>
                  <button className="btn" onClick={() => approve(p._id)}>Approve</button>
                  <button className="btn-danger" onClick={() => reject(p._id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}