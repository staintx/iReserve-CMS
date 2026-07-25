import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";

const DetailRow = ({ label, value, children }) => (
  <div style={{ marginBottom: "8px" }}>
    <span style={{ color: "#64748b", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>{label}</span>
    <div style={{ fontSize: "1rem", color: "#0f172a", fontWeight: 500 }}>{children || value || "-"}</div>
  </div>
);

export default function AdminQuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  
  const [convertForm, setConvertForm] = useState({
    package_id: "",
    total_price: ""
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await AdminAPI.getQuote(id);
        if (isMounted) setQuote(res.data);
      } catch (err) {
        notify(err.response?.data?.message || "Could not load quote details.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();

    AdminAPI.getPackages().then(res => setPackages(res.data || [])).catch(() => {});

    return () => { isMounted = false; };
  }, [id, notify]);

  const handleConvert = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...convertForm };
      const res = await AdminAPI.convertToBooking(id, payload);
      notify("Quote converted to booking successfully!", "success");
      navigate(`/admin/bookings/${res.data.booking._id}/details`);
    } catch (err) {
      notify(err.response?.data?.message || "Could not convert quote.", "error");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-slate-500">Loading quote details...</div>
      </AdminLayout>
    );
  }

  if (!quote) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-slate-500">Quote not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1">Quote Details</h1>
          <div className="text-slate-500 text-sm">ID: {quote._id}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => navigate("/admin/quotes")}>Back</button>
          {quote.status !== "converted" && (
            <button className="btn" onClick={() => setShowConvertModal(true)}>Convert to Booking</button>
          )}
          {quote.status === "converted" && quote.converted_booking_id && (
            <button className="btn" onClick={() => navigate(`/admin/bookings/${quote.converted_booking_id}/details`)}>View Booking</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{quote.event_type}</h2>
            <div className="text-sm text-slate-500 mt-1">{quote.event_date ? new Date(quote.event_date).toLocaleDateString() : "Date TBD"}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${quote.status === 'converted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {quote.status.toUpperCase()}
          </span>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-slate-700 mb-4 pb-2 border-b">Customer Info</h3>
            <div className="space-y-4">
              <DetailRow label="Name" value={quote.full_name || quote.customer_id?.full_name} />
              <DetailRow label="Email" value={quote.email || quote.customer_id?.email} />
              <DetailRow label="Phone" value={quote.phone || quote.customer_id?.phone} />
            </div>

            <h3 className="text-md font-semibold text-slate-700 mt-8 mb-4 pb-2 border-b">Event Details</h3>
            <div className="space-y-4">
              <DetailRow label="Theme" value={quote.event_theme} />
              <DetailRow label="Guest Count" value={quote.guest_count} />
              <DetailRow label="Time / Duration" value={`${quote.start_time || "TBD"} (${quote.duration_hours || "?"} hours)`} />
              <DetailRow label="Venue Type" value={quote.venue_type} />
              <DetailRow label="Address" value={`${quote.street || ""}, ${quote.barangay || ""}, ${quote.municipality || ""}, ${quote.province || ""}`} />
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold text-slate-700 mb-4 pb-2 border-b">Preferences</h3>
            <div className="space-y-4">
              <DetailRow label="Selected Menu">
                {quote.selected_menu?.length > 0 ? quote.selected_menu.join(", ") : "None specified"}
              </DetailRow>
              <DetailRow label="Dietary Restrictions" value={quote.dietary_restrictions} />
              <DetailRow label="Allergies" value={quote.allergies} />
              <DetailRow label="Furniture Setup" value={quote.furniture_setup?.join(", ")} />
              <DetailRow label="Dining Inventory" value={quote.dining_inventory?.join(", ")} />
              <DetailRow label="Add-ons" value={quote.add_ons?.join(", ")} />
              <DetailRow label="Notes">
                <div className="whitespace-pre-wrap">{quote.notes || "None"}</div>
              </DetailRow>
            </div>
          </div>
        </div>
      </div>

      {showConvertModal && (
        <Modal title="Convert Quote to Booking" onClose={() => setShowConvertModal(false)}>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Converting this quote will automatically create a booking for this customer.
              You can optionally assign a specific package or explicitly set the total price.
            </p>
            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Package (Optional)</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded"
                  value={convertForm.package_id}
                  onChange={(e) => setConvertForm({...convertForm, package_id: e.target.value})}
                >
                  <option value="">-- Custom Build / Calculate Automatically --</option>
                  {packages.map(p => (
                    <option key={p._id} value={p._id}>{p.name} (₱{p.base_price})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Override Total Price (Optional)</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-slate-300 rounded" 
                  placeholder="e.g. 50000"
                  value={convertForm.total_price}
                  onChange={(e) => setConvertForm({...convertForm, total_price: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty to auto-calculate price based on package and pax.</p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn-outline" onClick={() => setShowConvertModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>Convert</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

    </AdminLayout>
  );
}
