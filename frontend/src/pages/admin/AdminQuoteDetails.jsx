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
  
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await AdminAPI.getInquiry(id);
        if (isMounted) setQuote(res.data);
      } catch (err) {
        notify(err.response?.data?.message || "Could not load quote details.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [id, notify]);

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
          <h1 className="text-2xl font-bold text-ink-900 mb-1">Inquiry Details</h1>
          <div className="text-slate-500 text-sm">ID: {quote.reference || quote._id}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => navigate("/admin/quotes")}>Back</button>
          {quote.status !== "Converted to Booking" && (
            <button className="btn" onClick={() => setShowConvertModal(true)}>
              {quote.status === "Pending Review" || quote.status === "Revision Requested" ? "Generate Quotation" : "Update Status"}
            </button>
          )}
          {quote.converted_booking_id && (
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
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
            {quote.status.toUpperCase()}
          </span>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-slate-700 mb-4 pb-2 border-b">Customer Info</h3>
            <div className="space-y-4">
              <DetailRow label="Name" value={quote.contact_first_name + " " + quote.contact_last_name} />
              <DetailRow label="Email" value={quote.contact_email} />
              <DetailRow label="Phone" value={quote.contact_phone} />
            </div>

            <h3 className="text-md font-semibold text-slate-700 mt-8 mb-4 pb-2 border-b">Event Details</h3>
            <div className="space-y-4">
              <DetailRow label="Guest Count" value={quote.guest_count} />
              <DetailRow label="Time / Duration" value={quote.start_time || "TBD"} />
              <DetailRow label="Venue Type" value={quote.venue_type} />
              <DetailRow label="Address" value={`${quote.street || ""}, ${quote.barangay || ""}, ${quote.municipality || ""}, ${quote.province || ""}`} />
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold text-slate-700 mb-4 pb-2 border-b">Preferences</h3>
            <div className="space-y-4">
              <DetailRow label="Budget Range" value={quote.budget_range} />
              <DetailRow label="Dietary Restrictions" value={quote.dietary_requirements} />
              <DetailRow label="Notes / Special Requests">
                <div className="whitespace-pre-wrap">{quote.special_requests || "None"}</div>
              </DetailRow>
            </div>
          </div>
        </div>
      </div>

      {showConvertModal && (
        <Modal title="Manage Inquiry" onClose={() => setShowConvertModal(false)}>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Action placeholder for generating quotations. To complete this, we will send an API call to quotation creation endpoints. For now, mark as Quotation Sent to move it forward.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn-outline" onClick={() => setShowConvertModal(false)}>Cancel</button>
              <button type="button" className="btn" disabled={submitting} onClick={() => {
                setSubmitting(true);
                AdminAPI.updateInquiry(quote._id, { status: "Quotation Sent" }).then(() => {
                  notify("Status updated to Quotation Sent", "success");
                  setShowConvertModal(false);
                  window.location.reload();
                }).finally(() => setSubmitting(false));
              }}>Mark as Quotation Sent</button>
            </div>
          </div>
        </Modal>
      )}

    </AdminLayout>
  );
}
