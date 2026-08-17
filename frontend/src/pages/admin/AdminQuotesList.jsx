import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { 
  FileText, 
  Clock, 
  Send, 
  CheckCircle, 
  Search, 
  Filter, 
  PlusCircle,
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Utensils,
  ChevronDown,
  ChevronRight,
  History
} from "lucide-react";

export default function AdminQuotesList() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all_quotes");
  const [expandedRows, setExpandedRows] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const qtnRes = await AdminAPI.getAllQuotations();
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

  useRealTimeRefresh(loadData);

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group quotations by inquiry ID to present only the latest active version per inquiry thread
  const groupedQuotations = useMemo(() => {
    const groups = {};
    quotations.forEach(q => {
      const inqId = (q.inquiry_id && q.inquiry_id._id) ? String(q.inquiry_id._id) : String(q.inquiry_id || q._id);
      if (!groups[inqId]) {
        groups[inqId] = [];
      }
      groups[inqId].push(q);
    });

    return Object.values(groups).map(versionList => {
      versionList.sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
      const latest = versionList[0];
      return {
        ...latest,
        history: versionList
      };
    });
  }, [quotations]);

  // Compute Metrics using latest version per inquiry
  const metrics = useMemo(() => {
    const totalQuotations = groupedQuotations.length;
    const sentQuotations = groupedQuotations.filter(q => q.status === "Sent" || q.status === "Quotation Sent").length;
    const revisionRequests = groupedQuotations.filter(q => q.status === "Revision Requested").length;
    const acceptedQuotations = groupedQuotations.filter(q =>
      q.status === "Accepted" || q.status === "Quote Accepted" || q.status === "Awaiting Final Confirmation" || q.status === "Converted to Booking"
    ).length;
    return { totalQuotations, sentQuotations, revisionRequests, acceptedQuotations };
  }, [groupedQuotations]);

  // Combine items depending on activeTab
  const displayItems = useMemo(() => {
    // Latest Quotations per Inquiry thread
    let items = groupedQuotations.map(q => {
      const inq = q.inquiry_id || {};
      return {
        type: "QUOTATION",
        id: q._id,
        inquiryId: inq._id || q.inquiry_id,
        quotationNumber: q.quotation_number || `QTN-${q._id.slice(-6).toUpperCase()}`,
        reference: inq.reference || "INQ",
        eventType: inq.event_type || "Event",
        customerName: inq.contact_first_name ? `${inq.contact_first_name} ${inq.contact_last_name}` : (inq.customer_id?.full_name || "Customer"),
        customerContact: inq.contact_phone || inq.contact_email || inq.customer_id?.email,
        eventDate: inq.event_date,
        guestCount: q.guest_count || inq.guest_count,
        status: q.status,
        version: q.version_number || 1,
        totalCost: q.total_cost || 0,
        history: q.history || [q]
      };
    });

    if (activeTab === "sent") {
      items = items.filter(i => i.status === "Sent" || i.status === "Quotation Sent");
    } else if (activeTab === "revision") {
      items = items.filter(i => i.status === "Revision Requested");
    } else if (activeTab === "accepted") {
      items = items.filter(i =>
        i.status === "Accepted" || i.status === "Quote Accepted" || i.status === "Awaiting Final Confirmation" || i.status === "Converted to Booking"
      );
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
  }, [groupedQuotations, activeTab, search]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Review":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Pending Review</span>;
      case "Under Review":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Under Review</span>;
      case "Revision Requested":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200/60 flex items-center gap-1.5 w-fit"><RefreshCw size={12} /> Revision Requested</span>;
      case "Sent":
      case "Quotation Sent":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200/60 flex items-center gap-1.5 w-fit"><Send size={12} /> Quotation Sent</span>;
      case "Awaiting Final Confirmation":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Awaiting Final Confirmation</span>;
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
              { id: "sent", label: `Sent (${metrics.sentQuotations})` },
              { id: "revision", label: `Revisions (${metrics.revisionRequests})` },
              { id: "accepted", label: `Accepted (${metrics.acceptedQuotations})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
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
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* Quotation Records Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-primary" />
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
                  {displayItems.map((item) => {
                    const isExpanded = !!expandedRows[item.id];
                    const hasHistory = item.history && item.history.length > 1;

                    return (
                      <React.Fragment key={item.id}>
                        <tr className={`transition-colors ${isExpanded ? "bg-amber-50/30" : "hover:bg-slate-50/80"}`}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-powder text-primary rounded-lg border border-primary/20">
                                <Utensils size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900">{item.quotationNumber || item.reference}</span>
                                  {item.version && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                                      v{item.version}
                                    </span>
                                  )}
                                  {hasHistory && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(item.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded transition-colors shadow-2xs"
                                    >
                                      <History size={10} />
                                      <span>{item.history.length} Revisions</span>
                                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    </button>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 block mt-0.5">{item.eventType} ({item.reference})</span>
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
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
                            >
                              <Eye size={14} />
                              <span>View & Edit</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Version History Sub-row */}
                        {isExpanded && hasHistory && (
                          <tr className="bg-slate-50/90 border-t border-b border-amber-200/60">
                            <td colSpan={6} className="p-4 pl-14">
                              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <History size={14} className="text-primary" /> Revision History for Inquiry {item.reference}
                                  </h4>
                                  <span className="text-[11px] text-slate-500 font-medium">Total Versions: {item.history.length}</span>
                                </div>
                                <div className="divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden text-xs">
                                  {item.history.map((ver, idx) => (
                                    <div key={ver._id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${idx === 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                                          v{ver.version_number || 1} {idx === 0 ? "(Latest)" : ""}
                                        </span>
                                        <span className="font-mono font-semibold text-slate-800">
                                          {ver.quotation_number || `QTN-${ver._id.slice(-6).toUpperCase()}`}
                                        </span>
                                        <span className="text-slate-400">|</span>
                                        <span className="text-slate-500">
                                          Issued: {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="font-bold text-emerald-600">
                                          ₱{Number(ver.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </span>
                                        {getStatusBadge(ver.status)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}

