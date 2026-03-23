import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { AdminAPI } from "../../api/admin";

export default function AdminEventCalendar() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function fetchEvents() {
      const [bookingsRes, quotesRes] = await Promise.all([
        AdminAPI.getBookings(),
        AdminAPI.getInquiries ? AdminAPI.getInquiries() : AdminAPI.getQuotes ? AdminAPI.getQuotes() : { data: [] }
      ]);
      const bookings = (bookingsRes.data || []).map((b) => ({
        id: `booking-${b._id}`,
        title: b.event_type || "Booking",
        start: b.event_date,
        end: b.event_date,
        extendedProps: { ...b, type: "booking" },
        color: "#4BB543"
      }));
      const quotes = (quotesRes.data || []).map((q) => ({
        id: `quote-${q._id}`,
        title: q.event_type ? `Quote: ${q.event_type}` : "Quote",
        start: q.event_date,
        end: q.event_date,
        extendedProps: { ...q, type: "quote" },
        color: "#fbbf24"
      }));
      setEvents([...bookings, ...quotes]);
    }
    fetchEvents();
  }, []);

  return (
    <div className="admin-calendar-panel">
      <h3>Event Scheduling Management</h3>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height={600}
        eventContent={renderEventContent}
      />
    </div>
  );
}

function renderEventContent(eventInfo) {
  return (
    <div>
      <b>{eventInfo.event.title}</b>
      <div style={{ fontSize: 12, color: '#666' }}>{eventInfo.event.extendedProps?.location || ""}</div>
      <div style={{ fontSize: 11, color: '#aaa' }}>{eventInfo.event.extendedProps?.type === "quote" ? "Quote" : "Booking"}</div>
    </div>
  );
}
