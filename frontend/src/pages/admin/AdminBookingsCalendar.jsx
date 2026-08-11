import React from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminEventCalendar from "../../components/dashboard/AdminEventCalendar";

export default function AdminBookingsCalendar() {
  return (
    <AdminLayout>
      <div className="p-6 bg-background min-h-screen">
        <AdminEventCalendar />
      </div>
    </AdminLayout>
  );
}
