import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import { CustomerAPI } from "../../api/customer";
import { 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  UtensilsCrossed, 
  Utensils,
  Palette, 
  User, 
  CreditCard, 
  CheckCircle2, 
  Pencil, 
  MessageSquare, 
  AlertCircle,
  Package,
  Check,
  Image as ImageIcon,
  ExternalLink,
  X
} from "lucide-react";
import { formatCurrency, formatShortDate, formatEventDateTime } from "../../utils/format";
import { resolveServiceType, inquiryStatusMeta, recordTitle } from "./portal/statusMeta";
import { cn } from "@/lib/utils";

export default function CustomerInquiryDetailModal({
  open,
  onClose,
  inquiryId,
  initialInquiry,
  onOpenEdit,
  onOpenQuote,
  onOpenChat,
}) {
  const [inquiry, setInquiry] = useState(initialInquiry || null);
  const [loading, setLoading] = useState(!initialInquiry);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (open && inquiryId) {
      const fetchFullInquiry = async () => {
        try {
          setLoading(true);
          const res = await CustomerAPI.getInquiryById(inquiryId);
          setInquiry(res.data || initialInquiry);
        } catch (err) {
          console.error("Failed to load inquiry details:", err);
          setInquiry(initialInquiry);
        } finally {
          setLoading(false);
        }
      };
      fetchFullInquiry();
    }
  }, [open, inquiryId, initialInquiry]);

  if (!inquiry && !loading) return null;

  const data = inquiry || initialInquiry;
  const status = data ? inquiryStatusMeta(data) : { label: "Loading...", tone: "neutral" };
  const serviceType = data ? resolveServiceType(data) : "Event Service";
  const refCode = data?.reference || (data?._id ? `INQ-${data._id.substring(0, 6).toUpperCase()}` : "INQ-######");

  const fullAddress = [data?.street, data?.barangay, data?.municipality, data?.province, data?.zip_code]
    .filter(Boolean)
    .join(", ") || data?.venue_address || "Location to be confirmed";

  const isQuotationReady = data?.status === "Quotation Sent";
  const isEditable = ["Pending Review", "Under Review"].includes(data?.status);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-md overflow-hidden bg-white border border-slate-200 shadow-xl">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 pr-14 border-b border-slate-200 bg-slate-50/80 shrink-0 space-y-3">
          {/* Top metadata row */}
          <div className="flex items-center gap-2 flex-wrap pr-8">
            <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {refCode}
            </span>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded font-semibold font-mono tracking-wide border",
                status.tone === "info" && "bg-blue-50 text-blue-700 border-blue-200",
                status.tone === "warning" && "bg-amber-50 text-amber-800 border-amber-200",
                status.tone === "success" && "bg-emerald-50 text-emerald-800 border-emerald-200",
                status.tone === "neutral" && "bg-slate-100 text-slate-600 border-slate-200",
                status.tone === "danger" && "bg-rose-50 text-rose-700 border-rose-200"
              )}
            >
              {status.label}
            </span>
            <span className="text-xs text-slate-400 ml-auto mr-1">
              Submitted {data?.createdAt ? formatShortDate(data.createdAt) : "Recently"}
            </span>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-900 leading-tight">
              {data ? recordTitle(data) : "Inquiry Details"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {serviceType} · {data?.guest_count || 0} Estimated Guests
            </p>
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-md text-xs font-medium overflow-x-auto [scrollbar-width:none]">
            {[
              { id: "overview", label: "Event Specifications" },
              { id: "menu", label: "Package & Inclusions" },
              { id: "logistics", label: "Venue & Notes" },
              { id: "contact", label: "Contact & Billing" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-1.5 px-2.5 rounded text-xs transition-all whitespace-nowrap text-center cursor-pointer shrink-0",
                  activeTab === tab.id
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans [scrollbar-width:thin]">
          {loading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">
              Loading complete inquiry details...
            </div>
          ) : (
            <>
              {/* TAB 1: Event Specifications */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  {isQuotationReady && (
                    <div className="p-3.5 sm:p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-emerald-600 text-white rounded-md shrink-0">
                          <CheckCircle2 size={15} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-emerald-950 text-xs sm:text-sm leading-tight">
                            Quotation Ready
                          </h4>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            A quotation has been prepared for{" "}
                            <strong>{data?.total_price > 0 ? formatCurrency(data.total_price) : "this event"}</strong>.
                          </p>
                        </div>
                      </div>
                      {onOpenQuote && (
                        <Button
                          size="sm"
                          onClick={() => onOpenQuote(data)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3.5 rounded-md cursor-pointer shadow-xs shrink-0"
                        >
                          View Quote
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Schedule & Setup */}
                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#2C4B8A]" /> Schedule &amp; Setup
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data?.celebrant_name && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Celebrant / Honoree</span>
                          <span className="font-semibold text-slate-900 block mt-0.5">{data.celebrant_name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Event Date</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{formatShortDate(data?.event_date)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Start Time</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{data?.start_time || "To be determined"}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Duration</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{data?.duration_hours ? `${data.duration_hours} hours` : "Standard"}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Guest Headcount</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{data?.guest_count || 0} guests</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Service Type</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{serviceType}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Delivery Method</span>
                        <span className="font-semibold text-slate-900 capitalize block mt-0.5">{data?.delivery_method || "Setup"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Styling & Design */}
                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#2C4B8A]" /> Styling &amp; Theme
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Event Theme</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">
                          {serviceType === "Food Only" && !data?.event_theme
                            ? "N/A (Food Only Service)"
                            : data?.event_theme || "Standard Event Styling"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Color Palette</span>
                        {data?.event_palette && data.event_palette.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {data.event_palette.filter(Boolean).map((color, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-medium">
                                {color}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-700 font-semibold block mt-0.5">
                            {serviceType === "Food Only" ? "N/A" : "Standard Palette"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Package & Inclusions */}
              {activeTab === "menu" && (
                <div className="space-y-4">
                  {data?.is_custom_setup || (!data?.package_id && (data?.custom_setup_scope?.length || data?.inspiration_images?.length || data?.custom_setup_notes)) ? (
                    <div className="p-4 bg-white border border-blue-200 rounded-md shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-blue-600" /> Custom Setup &amp; Styling Brief
                        </h4>
                        <span className="px-2 py-0.5 rounded font-mono bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                          100% Custom
                        </span>
                      </div>

                      <div className="text-xs">
                        <div>
                          <span className="text-[10.5px] text-slate-400 block font-medium">Styling Theme</span>
                          <span className="font-semibold text-slate-900 block mt-0.5">
                            {data?.event_theme || "Custom Event Styling"}
                          </span>
                        </div>
                      </div>

                      {/* Setup Scope Elements */}
                      {Array.isArray(data?.custom_setup_scope) && data.custom_setup_scope.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider block">
                            Requested Scope Elements ({data.custom_setup_scope.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {data.custom_setup_scope.map((scope, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-xs font-medium"
                              >
                                <Check size={12} className="text-blue-600 shrink-0" />
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stylist Notes */}
                      {data?.custom_setup_notes && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider block">
                            Stylist Vision &amp; Notes
                          </span>
                          <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {data.custom_setup_notes}
                          </p>
                        </div>
                      )}

                      {/* Inspiration Photos */}
                      {Array.isArray(data?.inspiration_images) && data.inspiration_images.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon size={13} className="text-blue-600" /> Uploaded Inspiration Moodboard Pegs ({data.inspiration_images.length})
                            </span>
                            <span className="text-[10px] text-slate-400">Click photo to view full size</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {data.inspiration_images.map((imgUrl, idx) => (
                              <a
                                key={idx}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 block hover:ring-2 hover:ring-blue-500 shadow-2xs transition-all cursor-pointer"
                                title="Open full resolution image in new tab"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Inspiration ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                                  <ExternalLink size={12} />
                                  <span>View</span>
                                </div>
                                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.2 rounded font-mono font-bold">
                                  #{idx + 1}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        {serviceType === "Food Only" ? (
                          <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-[#2C4B8A]" />
                        )}
                        <span>{serviceType === "Food Only" ? "Food Catering Service" : "Selected Package"}</span>
                      </h4>
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">
                          {data?.package_id?.name || (serviceType === "Food Only" ? "Custom Food Catering Selections" : "Customized Catering Package")}
                        </span>
                        <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                          {data?.package_id?.description || (serviceType === "Food Only" ? "Food catering service with drop-off/delivery logistics. Venue setup and styling are excluded." : "Standard catering selections tailored for your event.")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Selected Menu Items */}
                  {Array.isArray(data?.menu_items) && data.menu_items.length > 0 ? (
                    <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-[#2C4B8A]" /> Selected Menu Dishes ({data.menu_items.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {data.menu_items.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{typeof item === "object" ? item.name : item}</span>
                            {item.category && <span className="text-[10px] text-slate-400 capitalize font-mono">{item.category}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white border border-slate-200 rounded-md text-slate-500 text-xs shadow-2xs">
                      Menu dishes will be finalized based on the selected catering package during quotation review.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Venue & Notes */}
              {activeTab === "logistics" && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#2C4B8A]" /> Venue Location
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Full Address</span>
                        <span className="font-semibold text-slate-900 leading-relaxed block mt-0.5">{fullAddress}</span>
                      </div>
                      {data?.landmark && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Nearby Landmark</span>
                          <span className="text-slate-700 block mt-0.5">{data.landmark}</span>
                        </div>
                      )}
                      {data?.venue_type && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Venue Type</span>
                          <span className="text-slate-700 capitalize block mt-0.5">{data.venue_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-[#2C4B8A]" /> Special Requests &amp; Diet
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Special Requests</span>
                        <span className="text-slate-800 leading-relaxed block mt-0.5">{data?.special_requests || "None specified"}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Dietary Restrictions / Allergies</span>
                        <span className="text-slate-800 block mt-0.5">
                          {[data?.allergies, data?.dietary_restrictions, data?.dietary_requirements].filter(Boolean).join(" · ") || "None specified"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Contact & Billing */}
              {activeTab === "contact" && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#2C4B8A]" /> Contact Person
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Name</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{`${data?.contact_first_name || ""} ${data?.contact_last_name || ""}`.trim() || "N/A"}</span>
                      </div>
                      {data?.celebrant_name && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Booked For</span>
                          <span className="font-semibold text-slate-900 block mt-0.5">{data.celebrant_name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Email Address</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{data?.contact_email || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Phone Number</span>
                        <span className="font-semibold text-slate-900 block mt-0.5">{data?.contact_phone || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-md shadow-2xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#2C4B8A]" /> Budget &amp; Quotation
                    </h4>
                    <div className={cn("grid gap-3", data?.budget_range ? "grid-cols-2" : "grid-cols-1")}>
                      {data?.budget_range && (
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Client Budget Range</span>
                          <span className="font-semibold text-slate-900 block mt-0.5">{data.budget_range}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Quoted Total</span>
                        <span className="font-bold text-sm text-[#2C4B8A] block mt-0.5">
                          {data?.total_price > 0 ? formatCurrency(data.total_price) : "Quotation in preparation"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenChat && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChat(data?._id)}
                className="rounded-md border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8 gap-1.5 cursor-pointer shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#2C4B8A]" /> Message Team
              </Button>
            )}
            {isEditable && onOpenEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenEdit(data)}
                className="rounded-md border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8 gap-1.5 cursor-pointer shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit Request
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isQuotationReady && onOpenQuote && (
              <Button
                size="sm"
                onClick={() => onOpenQuote(data)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold h-8 cursor-pointer shadow-2xs"
              >
                Review &amp; Accept Quote
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-md border-slate-200 text-xs h-8 cursor-pointer">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
