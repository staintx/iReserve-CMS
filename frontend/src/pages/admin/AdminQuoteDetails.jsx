import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";
import QuotationBuilderModal from "../../components/admin/quotation/QuotationBuilderModal";
import ConvertBookingModal from "../../components/admin/quotation/ConvertBookingModal";
import { 
  User, Mail, Phone, Calendar, Clock, MapPin, 
  DollarSign, Info, List, ArrowLeft, CheckCircle2,
  FileText, Activity, Utensils, Send, RefreshCw,
  Package as PackageIcon, Users, AlertTriangle, Layers
} from "lucide-react";
import Badge from "../../components/admin/ui/Badge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { pendingChangeRequestOf } from "../../utils/quotationDiff";
import { priceLabel, capacityLabel } from "../../lib/packageDisplay";

const DetailCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
    <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-primary">
        <Icon size={18} />
      </div>
      <h3 className="font-bold text-slate-800 text-lg tracking-tight">{title}</h3>
    </div>
    <div className="p-5 flex-1 space-y-5">
      {children}
    </div>
  </div>
);

const DetailRow = ({ icon: Icon, label, value, children }) => (
  <div className="flex gap-4 items-start group">
    <div className="mt-0.5 text-slate-400 group-hover:text-primary transition-colors">
      <Icon size={16} />
    </div>
    <div className="flex-1">
      <span className="text-[0.7rem] uppercase tracking-wider font-bold text-slate-400 block mb-1">{label}</span>
      <div className="text-[0.95rem] text-slate-800 font-medium leading-relaxed">
        {children || value || <span className="text-slate-300 italic">Not specified</span>}
      </div>
    </div>
  </div>
);

export default function AdminQuoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await AdminAPI.getInquiry(id);
        if (isMounted) setQuote(res.data);

        // The customer's change request is stored on the quotation
        // (customer_response), not the inquiry — load the versions so the
        // admin can read what was actually asked for.
        try {
          const qRes = await AdminAPI.getQuotationsByInquiry(id);
          if (isMounted) setQuotations(qRes.data || []);
        } catch {
          if (isMounted) setQuotations([]);
        }
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading inquiry details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!quote) {
    return (
      <AdminLayout>
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Info className="text-slate-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Inquiry Not Found</h2>
          <p className="text-slate-500 mb-6">The inquiry you are looking for does not exist or has been deleted.</p>
          <button className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium" onClick={() => navigate("/admin/bookings/inquiries")}>
            Return to Inquiries
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Header Section */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate("/admin/bookings/inquiries")}
              className="group flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Inquiries
            </button>
            <div className="flex items-center gap-4">
              <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-slate-900">
                Inquiry Details
              </h1>
              <Badge status={quote.status} />
            </div>
            <p className="text-sm font-mono text-slate-500 mt-2 flex items-center gap-2">
              <FileText size={14} /> REF: {quote.reference || quote._id}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {quote.status !== "Converted to Booking" && (
              <button 
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-sm font-semibold rounded-lg hover:from-slate-800 hover:to-slate-700 shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5"
                onClick={() => setShowConvertModal(true)}
              >
                <Activity size={16} />
                {quote.status === "Pending Review" || quote.status === "Revision Requested" ? "Generate Quotation" : "Update Status"}
              </button>
            )}
            {quote.converted_booking_id && (
              <button 
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                onClick={() => navigate(`/admin/bookings/${quote.converted_booking_id}/details`)}
              >
                <CheckCircle2 size={16} />
                View Confirmed Booking
              </button>
            )}
          </div>
        </div>

        {/* Status Alert Banners */}
        {quote.status === "Quotation Sent" && (
          <div className="mb-6 p-4 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm">
                <Send size={20} />
              </div>
              <div>
                <h4 className="font-bold text-blue-950 text-sm">Formal Quotation Issued & Sent to Customer</h4>
                <p className="text-xs text-blue-700 mt-0.5">A quotation has been created and sent to {quote.contact_first_name} {quote.contact_last_name}. Awaiting customer response.</p>
              </div>
            </div>
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              Edit / Revise Quotation
            </button>
          </div>
        )}

        {quote.status === "Pending Review" && (
          <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-lg shadow-sm">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-sm">Action Needed: Quotation Pending</h4>
                <p className="text-xs text-amber-700 mt-0.5">This customer inquiry is awaiting pricing calculations and a formal quotation from the admin.</p>
              </div>
            </div>
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              Build Quotation
            </button>
          </div>
        )}

        {quote.status === "Revision Requested" && (() => {
          // Show what the customer actually wrote, not a generic notice. The
          // message lives on the quotation as customer_response; there is no
          // dedicated request timestamp, so updatedAt is the closest real value.
          const request = pendingChangeRequestOf(quotations);
          const nextVersion = (quotations.reduce(
            (max, q) => Math.max(max, Number(q.version_number) || 1), 0
          ) || 1) + 1;

          return (
            <div className="mb-6 p-4 bg-orange-50/90 border border-orange-200 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 bg-orange-500 text-white rounded-lg shadow-sm shrink-0">
                    <RefreshCw size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-orange-950 text-sm">Pending Change Request</h4>
                    <p className="text-xs text-orange-700 mt-0.5">
                      {request?.version_number
                        ? `Requested against quotation v${request.version_number}`
                        : "Requested against the issued quotation"}
                      {/* Falls back to updatedAt for requests submitted before
                          revision_requested_at existed. */}
                      {(request?.revision_requested_at || request?.updatedAt) && (
                        <> · Submitted {new Date(request.revision_requested_at || request.updatedAt).toLocaleString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}</>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Review &amp; Create v{nextVersion}
                </button>
              </div>

              {request?.customer_response ? (
                <blockquote className="mt-3 rounded-lg border border-orange-200 bg-white/70 px-4 py-3 text-sm text-slate-800 leading-relaxed">
                  “{request.customer_response}”
                </blockquote>
              ) : (
                <p className="mt-3 text-xs text-orange-700 italic">
                  The customer did not include a written message with this request.
                </p>
              )}

              <p className="mt-2 text-xs text-orange-700">
                Review the request, then create a new quotation version with whatever you approve.
                The customer only sees changes you actually save.
              </p>
            </div>
          );
        })()}

        {(quote.status === "Awaiting Final Confirmation" || quote.status === "Quote Accepted") && (
          <div className="mb-6 p-4 bg-purple-50/90 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-lg shadow-sm">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="font-bold text-purple-950 text-sm">Customer Accepted & Awaiting Admin Final Confirmation</h4>
                <p className="text-xs text-purple-700 mt-0.5">The customer accepted this quotation. Review final negotiations or agreements, then click below to manually convert into a confirmed reservation.</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmConvert(true)}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} /> Confirm & Convert to Booking
            </button>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Selected Package Card */}
            <DetailCard title="Selected Package" icon={PackageIcon}>
              {quote.package_id && typeof quote.package_id === "object" ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {quote.package_id.image_url ? (
                        <img
                          src={quote.package_id.image_url}
                          alt={quote.package_id.name}
                          className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20">
                          <PackageIcon size={28} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-lg leading-snug truncate">
                          {quote.package_id.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {quote.package_id.package_type && (
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                              {quote.package_id.package_type}
                            </span>
                          )}
                          {quote.package_id.event_type && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-xs font-medium">
                              {quote.package_id.event_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 shrink-0">
                      <span className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-bold block">
                        Base Pricing
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {priceLabel(quote.package_id)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {capacityLabel(quote.package_id) && (
                      <div className="flex items-center gap-2.5 text-slate-700 bg-white p-3 rounded-lg border border-slate-100">
                        <Users size={16} className="text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-bold block">Guest Capacity</span>
                          <span className="font-semibold text-slate-800">{capacityLabel(quote.package_id)}</span>
                        </div>
                      </div>
                    )}
                    {quote.package_id.description && (
                      <div className="flex items-start gap-2.5 text-slate-700 bg-white p-3 rounded-lg border border-slate-100 sm:col-span-2">
                        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-bold block">Package Summary</span>
                          <span className="text-slate-700">{quote.package_id.description}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {Array.isArray(quote.package_id.inclusions) && quote.package_id.inclusions.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[0.7rem] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                        Included Services &amp; Inclusions ({quote.package_id.inclusions.length})
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {quote.package_id.inclusions.map((inc, i) => (
                          <li key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md text-slate-700 border border-slate-100 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : quote.had_package_selection ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Selected Package Unavailable</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      The customer originally selected a package for this inquiry, but the package details are no longer available in the database (it may have been deleted or removed).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3 text-slate-600">
                  <PackageIcon className="text-slate-400 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Custom Inquiry (No Package Selected)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No preset package was chosen. The customer submitted event requirements to build a custom quote from scratch.
                    </p>
                  </div>
                </div>
              )}
            </DetailCard>
            
            {/* Event Specifics Card */}
            <DetailCard title="Event Specifics" icon={Calendar}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <DetailRow icon={Layers} label="Service Type" value={quote.service_type || (quote.include_food === false ? "Event Setup Only" : "Food and Event Setup")} />
                <DetailRow icon={Utensils} label="Event Type" value={quote.event_type} />
                <DetailRow icon={User} label="Guest Count" value={quote.guest_count ? `${quote.guest_count} Pax` : null} />
                <DetailRow icon={Calendar} label="Event Date">
                  {quote.event_date ? (
                    <span className="font-semibold text-slate-800">
                      {new Date(quote.event_date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  ) : null}
                </DetailRow>
                <DetailRow
                  icon={Clock}
                  label="Time / Duration"
                  value={
                    quote.start_time
                      ? `${quote.start_time}${quote.duration_hours ? ` · ${quote.duration_hours} hrs` : ""}`
                      : null
                  }
                />
                <DetailRow icon={Calendar} label="Theme / Motif">
                  {quote.event_theme ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{quote.event_theme}</span>
                      {/* Colour names come from the curated palettes in the
                          booking flow, so they are consistent and actionable. */}
                      {(quote.event_palette || []).map((colour) => (
                        <span key={colour} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                          {colour}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </DetailRow>
                {/* What the customer saw in the wizard. Informational only —
                    the quotation you build below is the authoritative price. */}
                <DetailRow icon={DollarSign} label="Customer's on-screen estimate">
                  {quote.estimated_total > 0 ? (
                    <span className="text-slate-700 text-sm">
                      ₱{Number(quote.estimated_total).toLocaleString("en-PH")}
                      <span className="ml-2 text-xs text-slate-400">
                        estimate shown at submission
                      </span>
                    </span>
                  ) : null}
                </DetailRow>
                <DetailRow icon={MapPin} label="Venue Type" value={quote.venue_type} />
                <DetailRow icon={MapPin} label="Full Address">
                  {quote.street || quote.barangay || quote.municipality || quote.province ? (
                    <span className="leading-snug block text-slate-700">
                      {[quote.street, quote.barangay, quote.municipality, quote.province].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </DetailRow>
                <DetailRow icon={Utensils} label="Delivery Method" value={quote.delivery_method ? quote.delivery_method.toUpperCase() : null} />
              </div>
            </DetailCard>

            {/* Food & Service / Add-ons Details Card */}
            <DetailCard title={quote.service_type === "Event Setup Only" ? "Add-ons & Equipment Services" : "Food & Service Order"} icon={quote.service_type === "Event Setup Only" ? Layers : Utensils}>
              {quote.service_type !== "Event Setup Only" && quote.selected_menu?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Selected Menu</h4>
                  <div className="space-y-2">
                    {quote.selected_menu.map((menu, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <span className="font-medium text-slate-700">{menu.name || (typeof menu === 'string' ? menu : "Menu Item")}</span>
                        {menu.price > 0 && <span className="text-sm font-semibold text-slate-500">₱{menu.price}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(quote.service_items?.length > 0 || quote.additional_services?.length > 0) ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add-ons &amp; Additional Services</h4>
                  <div className="space-y-2">
                    {quote.service_items?.map((svc, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <div>
                          <span className="font-medium text-slate-700 block">{svc.name || "Add-on"}</span>
                          {svc.description && <span className="text-xs text-slate-400">{svc.description}</span>}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-500">
                            {svc.price > 0 ? `₱${svc.price}` : "Selected"} {svc.quantity > 1 ? <span className="text-xs font-normal">x{svc.quantity}</span> : null}
                          </span>
                        </div>
                      </div>
                    ))}
                    {Array.isArray(quote.additional_services) && quote.additional_services.map((svcName, i) => (
                      <div key={`add-${i}`} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <span className="font-medium text-slate-700">{svcName}</span>
                        <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-white rounded border border-slate-200">Selected Service</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : quote.service_type === "Event Setup Only" ? (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500">
                  No custom add-ons requested beyond package setup inclusions.
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500">
                  No specific menu items or add-ons selected.
                </div>
              )}
            </DetailCard>

            {/* Preferences & Requests Card */}
            <DetailCard title="Preferences & Special Requests" icon={List}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 mb-6">
                <DetailRow icon={DollarSign} label="Budget Range">
                  {quote.budget_range ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-md font-medium text-sm border border-green-100">
                      {quote.budget_range}
                    </span>
                  ) : null}
                </DetailRow>
                {/* `allergies` and `dietary_restrictions` come from the booking
                    wizard; `dietary_requirements` is the older single field
                    kept for inquiries submitted before the split. */}
                <DetailRow icon={Info} label="Allergies">
                  {quote.allergies ? (
                    <span className="text-red-600 font-medium bg-red-50 px-3 py-1 rounded-md border border-red-100 text-sm">
                      {quote.allergies}
                    </span>
                  ) : null}
                </DetailRow>
                <DetailRow icon={Info} label="Dietary Restrictions">
                  {quote.dietary_restrictions || quote.dietary_requirements ? (
                    <span className="text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-md border border-amber-100 text-sm">
                      {quote.dietary_restrictions || quote.dietary_requirements}
                    </span>
                  ) : null}
                </DetailRow>
                {quote.delivery_instructions ? (
                  <DetailRow icon={FileText} label="Delivery Instructions">
                    <span className="text-slate-700 text-sm">
                      {quote.delivery_instructions}
                    </span>
                  </DetailRow>
                ) : null}
              </div>
              <div className="pt-4 border-t border-slate-100">
                <DetailRow icon={FileText} label="Additional Notes & Requests">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 whitespace-pre-wrap mt-2">
                    {quote.special_requests || "No special requests provided."}
                  </div>
                </DetailRow>
              </div>
            </DetailCard>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Customer Info Card */}
            <DetailCard title="Customer Profile" icon={User}>
              <DetailRow icon={User} label="Primary Contact">
                <div className="font-bold text-slate-900 text-lg">
                  {quote.contact_first_name} {quote.contact_last_name}
                </div>
              </DetailRow>
              <DetailRow icon={Mail} label="Email Address">
                <a href={`mailto:${quote.contact_email}`} className="text-blue-600 hover:underline">
                  {quote.contact_email}
                </a>
              </DetailRow>
              <DetailRow icon={Phone} label="Contact Number">
                <a href={`tel:${quote.contact_phone}`} className="text-slate-700 hover:text-slate-900">
                  {quote.contact_phone}
                </a>
              </DetailRow>
              {quote.contact_alt_phone && (
                <DetailRow icon={Phone} label="Alternate Number">
                  {quote.contact_alt_phone}
                </DetailRow>
              )}
            </DetailCard>

            {/* Quick Actions / Status Summary (Optional Sidebar Widget) */}
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
              {/* Decorative background element */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Next Steps
              </h3>
              <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                Review the customer's requirements thoroughly before generating their formal quotation.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${quote.status === 'Pending Review' ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-slate-200">Review Request</span>
                </div>
                <div className="flex items-center gap-3 text-sm opacity-50">
                  <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                  <span className="text-slate-200">Generate Quote</span>
                </div>
                <div className="flex items-center gap-3 text-sm opacity-50">
                  <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                  <span className="text-slate-200">Await Customer Acceptance</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showConvertModal && (
        <QuotationBuilderModal 
          inquiry={quote} 
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false);
            window.location.reload();
          }}
        />
      )}

      {showConfirmConvert && (
        <ConvertBookingModal
          quote={quote}
          submitting={submitting}
          onClose={() => setShowConfirmConvert(false)}
          onConfirm={() => {
            setSubmitting(true);
            AdminAPI.createBookingFromInquiry(quote._id, {})
              .then(() => {
                notify("Quotation converted to booking successfully!", "success");
                setShowConfirmConvert(false);
                navigate("/admin/bookings/reservations");
              })
              .catch((err) => {
                notify(err.response?.data?.message || "Failed to convert booking.", "error");
              })
              .finally(() => setSubmitting(false));
          }}
        />
      )}

    </AdminLayout>
  );
}
