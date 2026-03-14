import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminBookingsActiveTable from "../../components/tables/AdminBookingsActiveTable";

export default function AdminBookingsActive() {
  const [bookings, setBookings] = useState([]);

  const load = () => {
    AdminAPI.getBookings().then((res) =>
      setBookings(res.data.filter((b) => b.status === "active"))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const markDone = (id) => AdminAPI.updateBooking(id, { status: "completed" }).then(load);
  const cancel = (id) => AdminAPI.updateBooking(id, { status: "cancelled" }).then(load);

  return (
    <AdminLayout>
      <h1>Active Bookings</h1>
      <div className="panel">
        <AdminBookingsActiveTable
          bookings={bookings}
          onMarkDone={markDone}
          onCancel={cancel}
        />
      </div>
    </AdminLayout>
  );
}