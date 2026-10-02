import React from "react";
import {
  User,
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Package,
  Utensils,
  Sparkles,
  Pencil,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  Heart,
  Ruler,
  AlertCircle,
  FileText,
  Palette,
  Check,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { formatShortDate } from "../../../../utils/format";
import { EVENT_TYPES, OTHER_EVENT_TYPE } from "../../../../lib/eventTypes";
import DishThumbnail from "../DishThumbnail";

const INPUT_BASE =
  "w-full rounded-md border bg-white px-3 py-1.5 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500 placeholder:text-slate-400";
const inputClass = (hasError) =>
  `${INPUT_BASE} ${hasError ? "border-red-400 bg-red-50/40" : "border-slate-300"}`;

export default function CustomerRequestStep({
  inquiry,
  details,
  setDetail,
  packageRecord,
  packageName,
  eventSpace,
  customerSelection,
  cateringIncluded,
  isFoodOnly,
  isSetupOnly,
  isSpecialOffer,
  catalogMenuItems = [],
  errors = {},
  isEditMode,
  setIsEditMode,
  onProceedToPrices,
  today,
  municipalities = [],
  barangays = [],
}) {
  const celebrant = details.celebrant_name || inquiry?.celebrant_name;
  const fullAddress = [details.street, details.barangay, details.municipality, details.province]
    .filter(Boolean)
    .join(", ");

  const paletteColors = String(details.event_palette || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const specialRequest = String(
    details?.special_requests || inquiry?.special_requests || inquiry?.notes || inquiry?.custom_setup_notes || ""
  ).trim();

  return (
    <div className="space-y-4 max-w-4xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {isEditMode ? "Edit Customer Request Details" : "Customer Request Review"}
            </span>
            {inquiry?.reference && (
              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                #{inquiry.reference}
              </span>
            )}
            <span className="text-[10px] font-medium text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
              Customer Provided
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEditMode
              ? "Make corrections only if the customer requested changes or if information needs updating."
              : "Review the customer's submitted specifications below. These are locked to prevent accidental changes."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditMode(!isEditMode)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer shrink-0 self-start sm:self-auto ${
            isEditMode
              ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          {isEditMode ? (
            <>
              <Check size={12} className="text-emerald-600" />
              <span>Done Editing</span>
            </>
          ) : (
            <>
              <Pencil size={12} className="text-slate-500" />
              <span>Edit Request Details</span>
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------
          VIEW MODE: Clean, Structured Cards
      ------------------------------------------------------------------ */}
      {!isEditMode ? (
        <div className="space-y-3.5">
          {/* Section 1: Event & Customer Specifications */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarDays size={13} className="text-primary" /> Event &amp; Customer Details
              </span>
              <span className="text-xs font-medium text-slate-600">
                {details.service_type || "Catering Service"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Customer Card */}
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Customer
                </span>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <User size={13} className="text-slate-500 shrink-0" />
                  <span>{details.contact_first_name} {details.contact_last_name}</span>
                </div>
                {celebrant && (
                  <div className="text-[11px] text-slate-700 font-medium flex items-center gap-1">
                    <Heart size={11} className="text-rose-500 shrink-0" />
                    <span>Honoree: {celebrant}</span>
                  </div>
                )}
                <div className="pt-1 space-y-0.5 text-slate-600 text-[11px]">
                  {details.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" />
                      <span className="font-mono">{details.contact_phone}</span>
                    </div>
                  )}
                  {details.contact_email && (
                    <div className="flex items-center gap-1 truncate">
                      <Mail size={11} className="text-slate-400" />
                      <span className="truncate">{details.contact_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Card */}
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Schedule &amp; Type
                </span>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-slate-500 shrink-0" />
                  <span>{details.event_date ? formatShortDate(details.event_date) : "Date pending"}</span>
                </div>
                <div className="text-[11px] text-slate-700 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400 shrink-0" />
                  <span>Starts at {details.start_time || "TBD"} (4 hours standard)</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Event type: <strong className="text-slate-800">{details.event_type || "Event"}</strong>
                </div>
              </div>

              {/* Headcount Card */}
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Headcount &amp; Dimensions
                </span>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Users size={14} className="text-primary shrink-0" />
                  <span>{details.guest_count} Guests (Pax)</span>
                </div>
                {eventSpace && !isFoodOnly && (
                  <div className="text-[11px] text-slate-700 flex items-center gap-1">
                    <Ruler size={11} className="text-slate-500 shrink-0" />
                    <span>Space size: <strong className="font-mono text-slate-900">{eventSpace}</strong></span>
                  </div>
                )}
                {details.venue_type && (
                  <div className="text-[11px] text-slate-500">
                    Venue type: {details.venue_type}
                  </div>
                )}
              </div>
            </div>

            {/* Venue Address & Design Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 block text-[11px]">Venue Address</span>
                  <span className="text-slate-600 text-[11px] leading-relaxed block">
                    {fullAddress || "Address to be confirmed"}
                  </span>
                  {details.landmark && (
                    <span className="text-[10.5px] text-slate-500 block mt-0.5">
                      Landmark: {details.landmark}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
                <Palette size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 block text-[11px]">Event Theme &amp; Colors</span>
                  <span className="text-slate-700 text-[11px] block font-medium">
                    {details.event_theme || "Standard Theme"}
                  </span>
                  {paletteColors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {paletteColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 font-medium"
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Selected Package, Food Catering Only, or Bespoke Custom Setup Brief */}
          {inquiry?.is_custom_setup || (!packageRecord && !inquiry?.package_id && !isFoodOnly) ? (
            <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    Bespoke Custom Setup &amp; Styling Brief
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                  Design From Scratch
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Theme &amp; Motif
                  </span>
                  <span className="font-semibold text-slate-900 block">
                    {inquiry?.event_theme || <span className="text-slate-400 italic font-normal">Not specified</span>}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Budget
                  </span>
                  <span className="font-bold font-mono text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded inline-block text-[11px]">
                    {inquiry?.budget_range || "On Quotation"}
                  </span>
                </div>
              </div>

              {/* Setup Scope Elements */}
              {Array.isArray(inquiry?.custom_setup_scope) && inquiry.custom_setup_scope.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Requested Setup Scope Elements ({inquiry.custom_setup_scope.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inquiry.custom_setup_scope.map((scope, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-xs font-medium shadow-2xs"
                      >
                        <Check size={12} className="text-blue-600 shrink-0" />
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Setup Notes */}
              {inquiry?.custom_setup_notes && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Stylist Vision &amp; Notes
                  </span>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {inquiry.custom_setup_notes}
                  </p>
                </div>
              )}

              {/* Inspiration Photos */}
              {Array.isArray(inquiry?.inspiration_images) && inquiry.inspiration_images.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-blue-600" /> Customer Inspiration Moodboard Pegs ({inquiry.inspiration_images.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Click photo to view full size</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {inquiry.inspiration_images.map((imgUrl, idx) => (
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
          ) : isFoodOnly && !inquiry?.is_custom_setup ? (
            /* Dedicated Food-Only Catering Summary Card */
            <div className="bg-white rounded-lg border border-emerald-200 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Utensils size={14} className="text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    Food Catering Service (Drop-Off / Delivery)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Food Only · No Setup
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Delivery / Pickup Logistics
                  </span>
                  <span className="font-semibold text-slate-900 capitalize block">
                    {details.delivery_method === "pickup" ? "Customer Pickup at Commissary" : "Drop-off Catering Delivery"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Estimated Guests
                  </span>
                  <span className="font-bold text-slate-900 block">
                    {details.guest_count || inquiry?.guest_count || 0} guests
                  </span>
                </div>
              </div>

              {details.delivery_instructions && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Delivery Instructions
                  </span>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {details.delivery_instructions}
                  </p>
                </div>
              )}

              {details.dietary_notes && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Dietary Requirements &amp; Special Requests
                  </span>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {details.dietary_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package size={13} className="text-primary" /> Selected Package
                </span>
                <span className="text-xs font-semibold text-primary">
                  {packageName || "Custom Package"}
                </span>
              </div>

              <div className="text-xs text-slate-600">
                <p className="leading-relaxed">
                  {packageRecord?.description || "Package selected by the customer in their booking inquiry."}
                </p>

                {Array.isArray(packageRecord?.inclusions) && packageRecord.inclusions.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Standard Inclusions ({packageRecord.inclusions.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11.5px] text-slate-700">
                      {packageRecord.inclusions.map((inc, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{typeof inc === "string" ? inc : inc?.name || ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Customer Selected Menu Dishes */}
          {(cateringIncluded || (customerSelection?.dishes && customerSelection.dishes.length > 0)) ? (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Utensils size={13} className="text-primary" /> Customer Menu Selections
                </span>
                <span className="text-xs font-semibold text-slate-600 font-mono">
                  {customerSelection?.dishes?.length || 0} {(customerSelection?.dishes?.length || 0) === 1 ? "Dish" : "Dishes"} Selected
                </span>
              </div>

              {!customerSelection?.dishes || customerSelection.dishes.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">
                  No menu dishes were pre-selected by the customer. You will add dishes in the next step.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {customerSelection.dishes.map((dish, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/50 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <DishThumbnail
                          dish={dish}
                          catalogMenuItems={catalogMenuItems}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 truncate block" title={dish.name}>
                            {dish.name || "Selected Dish"}
                          </span>
                          {dish.category && (
                            <span className="text-[10px] text-slate-500 font-medium block truncate">
                              {dish.category}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSpecialOffer || dish.isSpecialInclusion ? (
                        <span className="shrink-0 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                          Included
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs text-slate-600 flex items-center gap-2">
              <Utensils size={14} className="text-slate-400 shrink-0" />
              <span>
                <strong>Food Excluded:</strong> This booking is set up as Event Setup Only or food catering was skipped.
              </span>
            </div>
          )}

          {/* Section 4: Extra Services & Special Notes */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" /> Extra Services &amp; Notes
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {Array.isArray(inquiry?.service_items) && inquiry.service_items.length > 0 ? (
                <div>
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Requested Add-ons
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {inquiry.service_items.map((srv, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px]"
                      >
                        {typeof srv === "string" ? srv : `${srv.name || "Add-on"}${srv.quantity > 1 ? ` × ${srv.quantity}` : ""}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">No extra services requested by customer.</p>
              )}

              {Boolean(specialRequest) && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="rounded-md border border-amber-200/90 bg-amber-50/60 p-3 text-xs shadow-2xs">
                    <span className="font-bold text-slate-900">Notes: </span>
                    <span className="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {specialRequest}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Review completed? Proceed to set prices for this quotation.
            </span>
            <button
              type="button"
              onClick={onProceedToPrices}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <span>Proceed to Set Prices</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------
            EDIT MODE: Guarded Form for Customer Details
        ------------------------------------------------------------------ */
        <div className="bg-white rounded-lg border border-slate-300 p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs">
            <AlertCircle size={14} className="shrink-0 text-primary" />
            <span>
              <strong>Edit Mode:</strong> Make updates here if the customer contacted you with changes. Details will be saved upon sending.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={details.contact_first_name}
                onChange={(e) => setDetail("contact_first_name", e.target.value)}
                className={inputClass(errors.contact_first_name)}
              />
              {errors.contact_first_name && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.contact_first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={details.contact_last_name}
                onChange={(e) => setDetail("contact_last_name", e.target.value)}
                className={inputClass(errors.contact_last_name)}
              />
              {errors.contact_last_name && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.contact_last_name}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Celebrant / Honoree
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={details.celebrant_name}
                onChange={(e) => setDetail("celebrant_name", e.target.value)}
                className={inputClass(errors.celebrant_name)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                value={details.contact_phone}
                onChange={(e) => setDetail("contact_phone", e.target.value)}
                className={inputClass(errors.contact_phone)}
              />
              {errors.contact_phone && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.contact_phone}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={details.contact_email}
                onChange={(e) => setDetail("contact_email", e.target.value)}
                className={inputClass(errors.contact_email)}
              />
              {errors.contact_email && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.contact_email}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Guest Count (Pax) *
              </label>
              <input
                type="number"
                min="1"
                value={details.guest_count}
                onChange={(e) => setDetail("guest_count", e.target.value)}
                className={inputClass(errors.guest_count)}
              />
              {errors.guest_count && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.guest_count}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Event Date *
              </label>
              <input
                type="date"
                min={today}
                value={details.event_date}
                onChange={(e) => setDetail("event_date", e.target.value)}
                className={inputClass(errors.event_date)}
              />
              {errors.event_date && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.event_date}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={details.start_time}
                onChange={(e) => setDetail("start_time", e.target.value)}
                className={inputClass(errors.start_time)}
              />
              {errors.start_time && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.start_time}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Event Type *
              </label>
              <select
                value={details.event_type}
                onChange={(e) => setDetail("event_type", e.target.value)}
                className={inputClass(errors.event_type)}
              >
                <option value="">Select event type</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Venue Address */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Venue Location
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10.5px] font-medium text-slate-500 mb-1">
                  Municipality
                </label>
                <select
                  value={details.municipality}
                  onChange={(e) => setDetail("municipality", e.target.value)}
                  className={inputClass(errors.municipality)}
                >
                  <option value="">Select municipality</option>
                  {municipalities.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-medium text-slate-500 mb-1">
                  Barangay
                </label>
                <select
                  value={details.barangay}
                  onChange={(e) => setDetail("barangay", e.target.value)}
                  className={inputClass(errors.barangay)}
                >
                  <option value="">Select barangay</option>
                  {barangays.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-medium text-slate-500 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="Street / House #"
                  value={details.street}
                  onChange={(e) => setDetail("street", e.target.value)}
                  className={inputClass(false)}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-medium text-slate-500 mb-1">
                  Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Church"
                  value={details.landmark}
                  onChange={(e) => setDetail("landmark", e.target.value)}
                  className={inputClass(false)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Save &amp; Return to Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
