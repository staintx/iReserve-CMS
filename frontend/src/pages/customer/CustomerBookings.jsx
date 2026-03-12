import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";

export default function CustomerBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    CustomerAPI.getBookings().then((res) => {
      const filtered = res.data.filter((b) => {
        const id = b.customer_id?._id || b.customer_id;
        return id === user._id;
      });
      setBookings(filtered);
    });
  }, [user]);

  return (
    <CustomerLayout>
      <h1>My Bookings</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Event</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.event_type}</td>
                <td>{new Date(b.event_date).toLocaleDateString()}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CustomerLayout>
  );
}