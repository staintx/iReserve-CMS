import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminBookingsActive() {
  const [bookings, setBookings] = useState([]);

  const load = () => {
    AdminAPI.getBookings().then((res) =>
      setBookings(res.data.filter((b) => b.status === "active"))
    );
  };

  useEffect(() => load(), []);

  const markDone = (id) => AdminAPI.updateBooking(id, { status: "completed" }).then(load);
  const cancel = (id) => AdminAPI.updateBooking(id, { status: "cancelled" }).then(load);

  return (
    <AdminLayout>
      <h1>Active Bookings</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.event_type}</td>
                <td>{new Date(b.event_date).toLocaleDateString()}</td>
                <td>{b.guest_count}</td>
                <td>{b.status}</td>
                <td>
                  <button className="btn" onClick={() => markDone(b._id)}>Mark Done</button>
                  <button className="btn-danger" onClick={() => cancel(b._id)}>Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}