import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminBookingsHistoryTable from "../../components/tables/AdminBookingsHistoryTable";

export default function AdminBookingsHistory() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    AdminAPI.getBookings().then((res) => {
      setBookings(res.data.filter((b) => b.status !== "active"));
    });
  }, []);

  return (
    <AdminLayout>
      <h1>Event History</h1>
      <div className="panel">
        <AdminBookingsHistoryTable bookings={bookings} />
      </div>
    </AdminLayout>
  );
}