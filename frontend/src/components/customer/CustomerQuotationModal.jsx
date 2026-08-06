import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  FileText,
  CheckCircle,
  RefreshCw,
  XCircle,
  Calendar,
  Users,
  MapPin,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  Utensils,
  Package as PackageIcon,
  Truck,
  Sparkles,
  ChevronRight,
  Info,
  DollarSign
} from "lucide-react";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === "") return "₱0.00";
  return `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CustomerQuotationModal({ open, onClose, quotation, inquiry, onUpdated }) {
  const { notify } = useToast();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!quotation) return null;

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      await CustomerAPI.acceptQuotation(quotation._id);
      notify("Quotation accepted! Generating deposit payment checkout...", "success");

      const depositVal = Number(quotation.deposit_amount) > 0
        ? Number(quotation.deposit_amount)
        : Number(quotation.total_cost || 0);

      const targetInquiryId = inquiry?._id || quotation.inquiry_id?._id || quotation.inquiry_id;

      if (depositVal > 0 && targetInquiryId) {
        const checkoutRes = await CustomerAPI.createPaymentCheckout({
          inquiry_id: targetInquiryId,
          amount: depositVal,
          payment_type: "deposit"
        });

        if (checkoutRes.data?.checkout_url) {
          notify("Redirecting to payment checkout...", "success");
          window.location.assign(checkoutRes.data.checkout_url);
          return;
        }
      }

      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to accept quotation or start checkout.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      notify("Please provide details for your revision request.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await CustomerAPI.requestQuotationRevision(quotation._id, revisionNote.trim());
      notify("Revision request sent to the admin team.", "success");
      setShowRevisionForm(false);
      setRevisionNote("");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to send revision request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Are you sure you want to decline this quotation?")) return;
    try {
      setIsSubmitting(true);
      await CustomerAPI.rejectQuotation(quotation._id);
      notify("Quotation declined.", "info");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to decline quotation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = quotation.expiration_date && new Date(quotation.expiration_date) < new Date();
  const canRespond = (quotation.status === "Sent" || quotation.status === "Draft") && !isExpired;

  // Build full address string
  const fullAddress = [
    inquiry?.street,
    inquiry?.barangay,
    inquiry?.municipality,
    inquiry?.province,
    inquiry?.zip_code
  ].filter(Boolean).join(", ") || "Location details specified in booking inquiry";

  const guestCount = quotation.guest_count || inquiry?.guest_count || 1;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      {/* 
        CRITICAL FIX: Override radix grid layout by specifying `block w-full max-w-4xl`
        to ensure full vertical flow without horizontal scrollbars or squeezed panels.
      */}
      <DialogContent className="block w-full max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl bg-white text-slate-900 focus:outline-none">

        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-t-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <h2 className="font-serif text-2xl font-bold tracking-tight">Official Catering Quotation</h2>
              </div>
              <p className="text-xs text-slate-400">
                Quotation Ref: <span className="text-amber-400 font-mono font-semibold">{quotation.quotation_number || "QTN-000001"}</span> (Version v{quotation.version_number || 1})
                {inquiry?.reference && <span> · Inquiry: <span className="font-mono text-slate-300">{inquiry.reference}</span></span>}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`px-3.5 py-1 text-xs font-bold rounded-full border shadow-sm ${quotation.status === "Accepted"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : quotation.status === "Revision Requested"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : quotation.status === "Rejected"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  }`}
              >
                Status: {quotation.status}
              </Badge>
            </div>
          </div>

          {/* Key Quote Highlights Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Grand Total</span>
              <strong className="text-amber-400 text-base font-serif font-bold">{formatCurrency(quotation.total_cost)}</strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Deposit Required</span>
              <strong className="text-white text-sm font-semibold">{formatCurrency(quotation.deposit_amount)}</strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Remaining Balance</span>
              <strong className="text-slate-300 text-sm">{formatCurrency(quotation.remaining_balance || (quotation.total_cost - quotation.deposit_amount))}</strong>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Quote Expiration</span>
              <strong className="text-amber-300 text-sm">
                {quotation.expiration_date ? new Date(quotation.expiration_date).toLocaleDateString() : "Valid for 7 days"}
              </strong>
            </div>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 sm:p-8 space-y-8">

          {/* Admin Note if provided */}
          {quotation.admin_notes && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block mb-1 text-amber-950">Special Note from Caterer Admin:</strong>
                <p className="leading-relaxed">{quotation.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Customer Requested Revision Alert if any */}
          {quotation.customer_response && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3 shadow-sm">
              <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block mb-1 text-blue-950">Your Submitted Revision Request:</strong>
                <p className="leading-relaxed">{quotation.customer_response}</p>
              </div>
            </div>
          )}

          {/* SECTION 1: Whole Booking & Event Information */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
              <Info className="w-4 h-4 text-amber-600" /> Event & Booking Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              {/* Customer Contact */}
              <div className="space-y-1.5">
                <span className="text-slate-400 font-medium block">Customer Information</span>
                <strong className="text-slate-900 text-sm block font-semibold">
                  {inquiry?.contact_first_name || "Customer"} {inquiry?.contact_last_name || ""}
                </strong>
                <div className="text-slate-600 flex items-center gap-1.5 pt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {inquiry?.contact_email || "N/A"}
                </div>
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {inquiry?.contact_phone || "N/A"}
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-1.5">
                <span className="text-slate-400 font-medium block">Event Schedule & Type</span>
                <strong className="text-slate-900 text-sm block font-semibold">{inquiry?.event_type || "Catering Event"}</strong>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Date: <strong>{inquiry?.event_date ? new Date(inquiry.event_date).toLocaleDateString() : "TBA"}</strong>
                </div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Time: <strong>{inquiry?.start_time || "TBA"}</strong>
                </div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600" /> Guests: <strong>{guestCount} pax</strong>
                </div>
              </div>

              {/* Delivery & Venue */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                <span className="text-slate-400 font-medium block">Location & Delivery</span>
                <div className="text-slate-800 font-medium flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{fullAddress}</span>
                </div>
                {inquiry?.landmark && (
                  <p className="text-slate-500 italic pl-5">Landmark: {inquiry.landmark}</p>
                )}
                {inquiry?.delivery_method && (
                  <span className="inline-block px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-md font-semibold text-[10px] uppercase mt-1">
                    Method: {inquiry.delivery_method}
                  </span>
                )}
              </div>
            </div>

            {/* Special Requests / Dietary Requirements */}
            {(inquiry?.special_requests || inquiry?.dietary_requirements) && (
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {inquiry.special_requests && (
                  <div>
                    <span className="text-slate-400 font-medium block">Special Instructions</span>
                    <p className="text-slate-700 italic mt-0.5">{inquiry.special_requests}</p>
                  </div>
                )}
                {inquiry.dietary_requirements && (
                  <div>
                    <span className="text-slate-400 font-medium block">Dietary Requirements</span>
                    <p className="text-amber-800 font-medium mt-0.5">{inquiry.dietary_requirements}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: Itemized Financial Breakdown */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" /> Itemized Pricing Breakdown
              </span>
              <span className="text-xs text-amber-400 font-semibold">
                {quotation.package_name || inquiry?.event_type || "Custom Quotation"}
              </span>
            </div>

            <div className="p-6 space-y-6">

              {/* Package Base Price if applicable */}
              {quotation.package_name && (
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 text-sm">
                  <div>
                    <strong className="text-slate-900 font-bold block">{quotation.package_name}</strong>
                    <span className="text-xs text-slate-500">Selected Catering Package ({guestCount} guests)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-base">Included in calculation</span>
                </div>
              )}

              {/* Selected Menu Items Table */}
              {quotation.menu_items && quotation.menu_items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
                    <span>Menu Dishes & Items</span>
                    <span>Price</span>
                  </div>

                  <div className="space-y-2">
                    {quotation.menu_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs text-slate-700">
                        <div>
                          <strong className="text-slate-900 font-medium">{item.name}</strong>
                          {item.note && <span className="text-slate-400 block text-[11px]">{item.note}</span>}
                        </div>
                        <span className="font-semibold text-slate-900 whitespace-nowrap pl-4">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons & Equipment Rental Items */}
              {quotation.add_ons && quotation.add_ons.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
                    <span>Add-ons & Rentals</span>
                    <span>Subtotal</span>
                  </div>

                  <div className="space-y-2">
                    {quotation.add_ons.map((item, idx) => {
                      const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs text-slate-700">
                          <div>
                            <strong className="text-slate-900 font-medium">{item.name}</strong>
                            <span className="text-slate-400 text-[11px] block">
                              Qty: {item.quantity || 1} @ {formatCurrency(item.price)} each
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900 whitespace-nowrap pl-4">
                            {formatCurrency(itemTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Service Fees */}
              {(quotation.transportation_fee > 0 || quotation.equipment_fee > 0 || quotation.decoration_fee > 0) && (
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Service & Logistics Fees</span>

                  {quotation.transportation_fee > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" /> Transportation & Logistics Fee</span>
                      <span className="font-medium text-slate-900">{formatCurrency(quotation.transportation_fee)}</span>
                    </div>
                  )}

                  {quotation.equipment_fee > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span className="flex items-center gap-1.5"><PackageIcon className="w-3.5 h-3.5 text-slate-400" /> Equipment Rental & Setup Fee</span>
                      <span className="font-medium text-slate-900">{formatCurrency(quotation.equipment_fee)}</span>
                    </div>
                  )}

                  {quotation.decoration_fee > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-slate-400" /> Venue Styling & Decoration Fee</span>
                      <span className="font-medium text-slate-900">{formatCurrency(quotation.decoration_fee)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary Totals Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                {quotation.subtotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">{formatCurrency(quotation.subtotal)}</span>
                  </div>
                )}

                {quotation.discounts > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(quotation.discounts)}</span>
                  </div>
                )}

                {quotation.taxes > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes & VAT</span>
                    <span className="font-medium text-slate-900">{formatCurrency(quotation.taxes)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-300 flex justify-between items-center text-base font-bold text-slate-900">
                  <span>Grand Total Cost</span>
                  <span className="text-amber-600 font-serif text-2xl">{formatCurrency(quotation.total_cost)}</span>
                </div>

                {quotation.deposit_amount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg text-xs font-semibold text-amber-900 border border-amber-200 mt-2">
                    <span>Required Deposit Amount to Reserve Date:</span>
                    <span className="text-base font-bold text-amber-700">{formatCurrency(quotation.deposit_amount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revision Form input section */}
          {showRevisionForm && (
            <form onSubmit={handleRevisionSubmit} className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3 shadow-sm">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                Specify Requested Changes / Revision Details
              </label>
              <textarea
                className="w-full text-xs p-3 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white min-h-[100px] text-slate-900"
                placeholder="E.g., Please adjust guest count to 80, swap dish A with dish B, or modify delivery setup time..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowRevisionForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSubmitting ? "Submitting..." : "Submit Revision Request"}
                </Button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 rounded-b-2xl sticky bottom-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          {canRespond && !showRevisionForm && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={isSubmitting}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Decline Quote
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevisionForm(true)}
                disabled={isSubmitting}
                className="text-amber-800 border-amber-300 hover:bg-amber-50 font-semibold"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Request Revision
              </Button>

              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md transition-transform active:scale-95"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" /> Accept & Confirm Quote
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
