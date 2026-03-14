import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminBookingsCalendarTable from "../../components/tables/AdminBookingsCalendarTable";

export default function AdminBookingsCalendar() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    AdminAPI.getBookings().then((res) =>
      setBookings(res.data.filter((booking) => booking.status === "active"))
    );
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    bookings.forEach((booking) => {
      const dateKey = booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD";
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(booking);
    });
    return Array.from(map.entries());
  }, [bookings]);

  return (
    <AdminLayout>
      <h1>Availability Calendar</h1>
      <div className="panel">
        {grouped.length === 0 && <p>No bookings scheduled yet.</p>}
        {grouped.map(([dateKey, items]) => (
          <div key={dateKey} className="mb-6">
            <h3 className="text-sm font-semibold text-ink-900">{dateKey}</h3>
            <AdminBookingsCalendarTable items={items} />
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
