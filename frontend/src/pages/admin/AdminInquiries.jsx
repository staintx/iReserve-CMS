import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminInquiriesTable from "../../components/tables/AdminInquiriesTable";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState({ amount: "", notes: "" });
  const [bookingData, setBookingData] = useState({ package_id: "", manager_id: "", staff_ids: [], total_price: "" });
  const [packages, setPackages] = useState([]);
  const [staff, setStaff] = useState([]);

  const load = () =>
    AdminAPI.getInquiries().then((res) => {
      setInquiries(res.data);
      if (res.data.length > 0) setSelected(res.data[0]);
    });

  useEffect(() => {
    load();
    AdminAPI.getPackages().then((res) => setPackages(res.data));
    AdminAPI.getStaff().then((res) => setStaff(res.data));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setQuote({
      amount: selected.quote_amount || "",
      notes: selected.quote_notes || ""
    });
    setBookingData((prev) => ({
      ...prev,
      package_id: selected.package_id || "",
      total_price: selected.quote_amount || ""
    }));
  }, [selected]);

  const updateStatus = (id, status) => {
    AdminAPI.updateInquiry(id, { status }).then(load);
  };

  const saveQuote = () => {
    if (!selected) return;
    AdminAPI.updateInquiry(selected._id, {
      quote_amount: Number(quote.amount || 0),
      quote_notes: quote.notes,
      status: "quoted"
    }).then(load);
  };

  const createBooking = () => {
    if (!selected) return;
    AdminAPI.createBookingFromInquiry(selected._id, {
      total_price: Number(bookingData.total_price || 0),
      package_id: bookingData.package_id || undefined,
      manager_id: bookingData.manager_id || undefined,
      staff_ids: bookingData.staff_ids
    }).then(load);
  };

  return (
    <AdminLayout>
      <h1>Inquiry Management</h1>
      <div className="grid lg:grid-cols-[2fr,1fr]">
        <div className="panel">
          <AdminInquiriesTable inquiries={inquiries} onSelect={setSelected} />
        </div>

        {selected && (
          <div className="panel">
            <h3>Inquiry Details</h3>
            <p className="text-sm text-slate-600">{selected.customer_id?.full_name || "Customer"}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p><strong>Event:</strong> {selected.event_type}</p>
              <p><strong>Date:</strong> {selected.event_date ? new Date(selected.event_date).toLocaleDateString() : ""}</p>
              <p><strong>Venue:</strong> {selected.venue_type || ""}</p>
              <p><strong>Status:</strong> {selected.status}</p>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold">Quotation</h4>
              <input
                placeholder="Quote Amount"
                value={quote.amount}
                onChange={(e) => setQuote({ ...quote, amount: e.target.value })}
              />
              <textarea
                placeholder="Quote Notes"
                value={quote.notes}
                onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
              />
              <button className="btn" onClick={saveQuote}>Save Quote</button>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold">Create Booking</h4>
              <select value={bookingData.package_id} onChange={(e) => setBookingData({ ...bookingData, package_id: e.target.value })}>
                <option value="">Select package (optional)</option>
                {packages.map((pkg) => (
                  <option key={pkg._id} value={pkg._id}>{pkg.name}</option>
                ))}
              </select>
              <select value={bookingData.manager_id} onChange={(e) => setBookingData({ ...bookingData, manager_id: e.target.value })}>
                <option value="">Assign manager (optional)</option>
                {staff.filter((person) => person.role === "manager").map((person) => (
                  <option key={person._id} value={person._id}>{person.full_name}</option>
                ))}
              </select>
              <select
                multiple
                value={bookingData.staff_ids}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    staff_ids: Array.from(e.target.selectedOptions, (option) => option.value)
                  })
                }
              >
                {staff.filter((person) => person.role === "staff").map((person) => (
                  <option key={person._id} value={person._id}>{person.full_name}</option>
                ))}
              </select>
              <input
                placeholder="Total Price"
                value={bookingData.total_price}
                onChange={(e) => setBookingData({ ...bookingData, total_price: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={createBooking}>Create Booking</button>
                <button className="btn" onClick={() => updateStatus(selected._id, "approved")}>Approve</button>
                <button className="btn-danger" onClick={() => updateStatus(selected._id, "rejected")}>Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}