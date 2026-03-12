import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";

export default function CustomerPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    CustomerAPI.getPayments().then((res) => {
      const filtered = res.data.filter((p) => {
        const id = p.customer_id?._id || p.customer_id;
        return id === user._id;
      });
      setPayments(filtered);
    });
  }, [user]);

  return (
    <CustomerLayout>
      <h1>Payments</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Amount</th><th>Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td>₱{p.amount}</td>
                <td>{p.payment_type}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CustomerLayout>
  );
}