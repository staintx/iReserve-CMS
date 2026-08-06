import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import { 
  FileText, 
  Clock, 
  Send, 
  CheckCircle, 
  Search, 
  Filter, 
  PlusCircle, 
  ArrowRight, 
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Utensils
} from "lucide-react";

export default function AdminQuotesList() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all_quotes");

  const loadData = async () => {
    setLoading(true);
    try {
      const [inqRes, qtnRes] = await Promise.all([
        AdminAPI.getInquiries(),
        AdminAPI.getAllQuotations()
      ]);
      setInquiries(inqRes.data || []);
      setQuotations(qtnRes.data || []);
    } catch (err) {
      notify(err.response?.data?.message || "Could not load quotations list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    const totalQuotations = quotations.length;
    const pendingInquiries = inquiries.filter(q => q.status === "Pending Review").length;
    const sentQuotations = quotations.filter(q => q.status === "Sent").length;
    const revisionRequests = quotations.filter(q => q.status === "Revision Requested").length;
    const acceptedQuotations = quotations.filter(q => q.status === "Accepted").length;
    return { totalQuotations, pendingInquiries, sentQuotations, revisionRequests, acceptedQuotations };
  }, [inquiries, quotations]);

  // Combine items depending on activeTab
  const displayItems = useMemo(() => {
    let items = [];

    if (activeTab === "pending_inquiries") {
      // Pending inquiries that need a quote created
      items = inquiries
        .filter(i => i.status === "Pending Review" || i.status === "Revision Requested")
        .map(i => ({
          type: "INQUIRY",
          id: i._id,
          inquiryId: i._id,
          reference: i.reference || i._id.slice(-8).toUpperCase(),
          eventType: i.event_type || "Event Inquiry",
          customerName: `${i.contact_first_name} ${i.contact_last_name}`,
          customerContact: i.contact_phone || i.contact_email,
          eventDate: i.event_date,
          guestCount: i.guest_count,
          status: i.status,
          version: null,
          totalCost: null
        }));
    } else {
      // Real Quotations created by Admin
      items = quotations.map(q => {
        const inq = q.inquiry_id || {};
        return {
          type: "QUOTATION",
          id: q._id,
          inquiryId: inq._id || q.inquiry_id,
          quotationNumber: q.quotation_number || `QTN-${q._id.slice(-6).toUpperCase()}`,
          reference: inq.reference || "INQ",
          eventType: inq.event_type || "Event",
          customerName: inq.contact_first_name ? `${inq.contact_first_name} ${inq.contact_last_name}` : "Customer",
          customerContact: inq.contact_phone || inq.contact_email,
          eventDate: inq.event_date,
          guestCount: q.guest_count || inq.guest_count,
          status: q.status,
          version: q.version_number || 1,
          totalCost: q.total_cost || 0
        };
      });

      if (activeTab === "sent") {
        items = items.filter(i => i.status === "Sent");
      } else if (activeTab === "revision") {
        items = items.filter(i => i.status === "Revision Requested");
      } else if (activeTab === "accepted") {
        items = items.filter(i => i.status === "Accepted");
      }
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      items = items.filter(item => {
        const ref = (item.reference || "").toLowerCase();
        const qtn = (item.quotationNumber || "").toLowerCase();
        const name = (item.customerName || "").toLowerCase();
        const event = (item.eventType || "").toLowerCase();
        return ref.includes(query) || qtn.includes(query) || name.includes(query) || event.includes(query);
      });
    }

    return items;
  }, [inquiries, quotations, activeTab, search]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Review":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Pending Review</span>;
      case "Revision Requested":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200/60 flex items-center gap-1.5 w-fit"><RefreshCw size={12} /> Revision Requested</span>;
      case "Sent":
      case "Quotation Sent":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200/60 flex items-center gap-1.5 w-fit"><Send size={12} /> Quotation Sent</span>;
      case "Accepted":
      case "Quote Accepted":
      case "Converted to Booking":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 flex items-center gap-1.5 w-fit"><CheckCircle size={12} /> Accepted</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">{status}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Admin Quotations</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and track formal quotations generated for customer inquiries.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-colors w-fit"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* KPI Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Issued Quotations</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.totalQuotations}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Needs Quote</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.pendingInquiries}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
              <RefreshCw size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Revisions Requested</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.revisionRequests}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Accepted Quotes</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.acceptedQuotations}</h3>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: "all_quotes", label: `Issued Quotations (${metrics.totalQuotations})` },
              { id: "pending_inquiries", label: `Needs Quotation (${metrics.pendingInquiries})` },
              { id: "sent", label: `Sent (${metrics.sentQuotations})` },
              { id: "revision", label: `Revisions (${metrics.revisionRequests})` },
              { id: "accepted", label: `Accepted (${metrics.acceptedQuotations})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? "bg-[#D4AF37] text-slate-900 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ref, QTN#, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* Quotation Records Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#D4AF37]" />
              <p className="text-sm font-medium">Loading quotations...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <FileText size={40} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">No Records Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">There are no records matching your current filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-6 font-semibold">Quote / Inquiry Ref</th>
                    <th className="py-3.5 px-6 font-semibold">Customer</th>
                    <th className="py-3.5 px-6 font-semibold">Event Date</th>
                    <th className="py-3.5 px-6 font-semibold">Quoted Total</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {displayItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 text-[#D4AF37] rounded-lg border border-amber-100/60">
                            <Utensils size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{item.quotationNumber || item.reference}</span>
                              {item.version && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">v{item.version}</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">{item.eventType} ({item.reference})</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800 block">{item.customerName}</span>
                        <span className="text-xs text-slate-500">{item.customerContact || "No contact"}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar size={14} className="text-slate-400" />
                          {item.eventDate ? new Date(item.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {item.totalCost !== null ? (
                          <span className="font-bold text-emerald-600">₱{Number(item.totalCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not Quoted Yet</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/quotes/${item.inquiryId}/details`)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-[#D4AF37] hover:bg-[#c5a030] rounded-lg transition-colors shadow-sm"
                        >
                          {item.type === "INQUIRY" ? (
                            <>
                              <span>Create Quote</span>
                              <ArrowRight size={14} />
                            </>
                          ) : (
                            <>
                              <Eye size={14} />
                              <span>View & Edit</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}

