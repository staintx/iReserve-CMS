import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";

export default function AdminQuotesList() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await AdminAPI.getInquiries();
        if (isMounted) setQuotes(res.data || []);
      } catch (err) {
        notify(err.response?.data?.message || "Could not load quotes.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [notify]);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Pending Quotations</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading inquiries...</div>
        ) : quotes.filter(q => q.status === 'Pending Review' || q.status === 'Revision Requested').length === 0 ? (
          <div className="p-8 text-center text-slate-500">No inquiries waiting for quotation.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-medium">Event Type</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Guests</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.filter(q => q.status === 'Pending Review' || q.status === 'Revision Requested').map((q) => (
                <tr key={q._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-ink-900">
                    {q.event_type}
                    <div className="text-xs text-slate-400 mt-1">{q.reference || q._id.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="p-4">
                    {q.contact_first_name} {q.contact_last_name}
                    <div className="text-xs text-slate-500 mt-1">{q.contact_phone || "-"}</div>
                  </td>
                  <td className="p-4 text-slate-600">
                    {q.event_date ? new Date(q.event_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-4 text-slate-600">{q.guest_count || "-"}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700">
                      {q.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/quotes/${q._id}/details`)}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Create Quotation &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
