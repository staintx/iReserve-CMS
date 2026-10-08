import { useMemo, useState } from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileText,
  Calendar,
  DollarSign,
  Package,
  Utensils,
  Sparkles,
  Layers,
  MapPin,
  Users,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate, formatEventDate } from "../../utils/format";
import CustomerQuotationModal from "../customer/CustomerQuotationModal";
import { Button } from "../ui/button";

const MONEY_FIELDS = new Set([
  "total_price",
  "price_difference",
  "deposit_amount",
  "package_price",
  "package_starting_price",
]);

const EXCLUDED_FIELDS = new Set([
  "event_manager_id",
  "staff_ids",
  "staff_assignments",
  "equipment_assignments",
  "equipment_returned",
  "items",
  "line_items",
  "_id",
]);

const prettyField = (key) => {
  const map = {
    total_price: "Total Price",
    guest_count: "Guest Count",
    start_time: "Start Time",
    duration_hours: "Duration",
    event_date: "Event Date",
    venue_type: "Venue Type",
    venue_address: "Venue Address",
    service_type: "Service Type",
    event_theme: "Theme / Motif",
    event_palette: "Color Palette",
    delivery_method: "Delivery Method",
    package_name_snapshot: "Package Name",
    package_price: "Package Price",
    package_starting_price: "Starting Price",
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const normDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).trim();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const prettyValue = (key, value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (MONEY_FIELDS.has(key)) return formatCurrency(value);
  if (key === "event_date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? String(value)
      : d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  }
  if (key === "guest_count") return `${value} pax`;
  if (key === "duration_hours") return `${value} hrs`;
  return String(value);
};

const isSameValue = (key, fromVal, toVal) => {
  if (fromVal === toVal) return true;
  if (key === "event_date") {
    const d1 = normDate(fromVal);
    const d2 = normDate(toVal);
    return Boolean(d1 && d2 && d1 === d2);
  }
  if (MONEY_FIELDS.has(key) || typeof fromVal === "number" || typeof toVal === "number") {
    return Number(fromVal || 0) === Number(toVal || 0);
  }
  return String(fromVal ?? "").trim().toLowerCase() === String(toVal ?? "").trim().toLowerCase();
};

const actorLabel = (who) => {
  if (!who) return null;
  const n = String(who).toLowerCase();
  if (n === "admin") return "Caterer";
  if (n === "customer") return "You";
  return who;
};

const normalizeKey = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isTransportFee = (name) => /transport|logistics|delivery|travel/i.test(String(name || ""));
const isEquipmentFee = (name) => /equipment/i.test(String(name || ""));
const isDecorationFee = (name) => /styling|decor/i.test(String(name || ""));

/**
 * Extracts and canonicalizes items from any version representation:
 * Quotation, Inquiry, Booking, or Revision Snapshot.
 */
function extractVersionItems(doc, fallbackGuestCount = 1) {
  if (!doc) return { services: new Map(), menu: new Map(), charges: new Map() };

  const services = new Map();
  const menu = new Map();
  const charges = new Map();

  const guestCount = Number(doc.guest_count || fallbackGuestCount) || 1;

  // 1. Service Items / Add-ons:
  const rawServices = Array.isArray(doc.service_items)
    ? doc.service_items
    : Array.isArray(doc.add_ons)
    ? doc.add_ons
    : Array.isArray(doc.additional_services)
    ? doc.additional_services
    : [];

  rawServices.forEach((s) => {
    const name = String(s?.name || s?.service_name || (typeof s === "string" ? s : "") || "").trim();
    if (!name) return;
    const key = normalizeKey(name);
    const qty = Number(s?.quantity) > 0 ? Number(s.quantity) : 1;
    const price = Number(s?.price || s?.unit_price) || 0;
    const total = price * qty;
    services.set(key, {
      name,
      quantity: qty,
      price,
      total,
      unit: s?.unit || "",
      note: s?.note || "",
      pricing_type: s?.pricing_type || "quantity",
    });
  });

  // 2. Menu Items:
  const rawMenu = Array.isArray(doc.menu_items)
    ? doc.menu_items
    : Array.isArray(doc.selected_menu)
    ? doc.selected_menu
    : Array.isArray(doc.offer_food_snapshot)
    ? doc.offer_food_snapshot
    : [];

  rawMenu.forEach((m) => {
    const name = String(m?.name || m?.item_name || (typeof m === "string" ? m : "") || "").trim();
    if (!name) return;
    const key = normalizeKey(name);
    const qty = Number(m?.quantity) > 0 ? Number(m.quantity) : 1;
    const price = Number(m?.price) || 0;
    const pricingType = m?.pricing_type || "per_guest";
    const total = pricingType === "per_guest" ? price * guestCount : price * qty;
    menu.set(key, {
      name,
      category: m?.category || m?.menu_category || "",
      quantity: qty,
      unit: m?.unit || "Per Pax",
      pricing_type: pricingType,
      price,
      total,
      note: m?.note || "",
    });
  });

  // 3. Additional Charges & Fees:
  const rawCharges = Array.isArray(doc.additional_charges)
    ? doc.additional_charges
    : Array.isArray(doc.additional_fees)
    ? doc.additional_fees
    : [];

  rawCharges.forEach((c) => {
    const name = String(c?.name || "").trim();
    if (!name) return;
    let key = normalizeKey(name);
    if (isTransportFee(name)) key = "__fee_transport__";
    else if (isEquipmentFee(name)) key = "__fee_equipment__";
    else if (isDecorationFee(name)) key = "__fee_decoration__";

    const amt = Number(c?.amount ?? c?.price) || 0;
    charges.set(key, {
      name,
      price: amt,
      total: amt,
    });
  });

  if (Number(doc.transportation_fee) > 0 && !charges.has("__fee_transport__")) {
    charges.set("__fee_transport__", {
      name: "Transportation & Logistics Fee",
      price: Number(doc.transportation_fee),
      total: Number(doc.transportation_fee),
    });
  }
  if (Number(doc.equipment_fee) > 0 && !charges.has("__fee_equipment__")) {
    charges.set("__fee_equipment__", {
      name: "Equipment Rental Fee",
      price: Number(doc.equipment_fee),
      total: Number(doc.equipment_fee),
    });
  }
  if (Number(doc.decoration_fee) > 0 && !charges.has("__fee_decoration__")) {
    charges.set("__fee_decoration__", {
      name: "Styling & Decoration Fee",
      price: Number(doc.decoration_fee),
      total: Number(doc.decoration_fee),
    });
  }

  return { services, menu, charges };
}

/**
 * Pure diff computation between two canonical version extractions.
 * Displays ONLY genuinely changed items. Unchanged items are omitted.
 */
function computeItemsDiff(prevItems, currItems) {
  const diffs = [];

  // A. Services / Add-ons diff
  currItems.services.forEach((curr, key) => {
    const prev = prevItems.services.get(key);
    if (!prev) {
      diffs.push({
        kind: "added",
        category: "Add-on & Service",
        name: curr.name,
        quantity: curr.quantity,
        price: curr.price,
        total: curr.total,
        unit: curr.unit,
      });
    } else {
      const qtyDiff = prev.quantity !== curr.quantity;
      const priceDiff = prev.price !== curr.price;
      const totalDiff = prev.total !== curr.total;
      if (qtyDiff || priceDiff || totalDiff) {
        diffs.push({
          kind: "updated",
          category: "Add-on & Service",
          name: curr.name,
          fromQty: prev.quantity,
          toQty: curr.quantity,
          fromPrice: prev.price,
          toPrice: curr.price,
          fromTotal: prev.total,
          toTotal: curr.total,
          priceDiff: curr.total - prev.total,
        });
      }
    }
  });

  prevItems.services.forEach((prev, key) => {
    if (!currItems.services.has(key)) {
      diffs.push({
        kind: "removed",
        category: "Add-on & Service",
        name: prev.name,
        quantity: prev.quantity,
        price: prev.price,
        total: prev.total,
        unit: prev.unit,
      });
    }
  });

  // B. Menu Items diff
  currItems.menu.forEach((curr, key) => {
    const prev = prevItems.menu.get(key);
    if (!prev) {
      diffs.push({
        kind: "added",
        category: "Food Menu Dish",
        name: curr.name,
        quantity: curr.quantity,
        unit: curr.unit,
        price: curr.price,
        total: curr.total,
      });
    } else {
      const qtyDiff = prev.quantity !== curr.quantity && curr.pricing_type !== "per_guest";
      const priceDiff = prev.price !== curr.price;
      const unitDiff =
        String(prev.unit || "").trim().toLowerCase() !== String(curr.unit || "").trim().toLowerCase();
      const totalDiff = prev.total !== curr.total;
      if (qtyDiff || priceDiff || unitDiff || totalDiff) {
        diffs.push({
          kind: "updated",
          category: "Food Menu Dish",
          name: curr.name,
          fromQty: prev.quantity,
          toQty: curr.quantity,
          fromUnit: prev.unit,
          toUnit: curr.unit,
          fromPrice: prev.price,
          toPrice: curr.price,
          fromTotal: prev.total,
          toTotal: curr.total,
          priceDiff: curr.total - prev.total,
        });
      }
    }
  });

  prevItems.menu.forEach((prev, key) => {
    if (!currItems.menu.has(key)) {
      diffs.push({
        kind: "removed",
        category: "Food Menu Dish",
        name: prev.name,
        quantity: prev.quantity,
        unit: prev.unit,
        price: prev.price,
        total: prev.total,
      });
    }
  });

  // C. Charges & Fees diff
  currItems.charges.forEach((curr, key) => {
    const prev = prevItems.charges.get(key);
    if (!prev) {
      diffs.push({
        kind: "added",
        category: "Adjustment / Fee",
        name: curr.name,
        price: curr.price,
        total: curr.total,
      });
    } else {
      const priceDiff = prev.price !== curr.price;
      if (priceDiff) {
        diffs.push({
          kind: "updated",
          category: "Adjustment / Fee",
          name: curr.name,
          fromPrice: prev.price,
          toPrice: curr.price,
          fromTotal: prev.total,
          toTotal: curr.total,
          priceDiff: curr.total - prev.total,
        });
      }
    }
  });

  prevItems.charges.forEach((prev, key) => {
    if (!currItems.charges.has(key)) {
      diffs.push({
        kind: "removed",
        category: "Adjustment / Fee",
        name: prev.name,
        price: prev.price,
        total: prev.total,
      });
    }
  });

  return diffs;
}

export default function BookingVersionHistory({ booking, sourceQuotation = null }) {
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Initial quotation that was originally created for this booking
  const initialQuotation = useMemo(() => {
    if (Array.isArray(sourceQuotation?.versions) && sourceQuotation.versions.length > 0) {
      const v1 = sourceQuotation.versions.find((v) => Number(v.version_number) === 1);
      if (v1) return v1;
      const sorted = [...sourceQuotation.versions].sort(
        (a, b) => (Number(a.version_number) || 1) - (Number(b.version_number) || 1)
      );
      return sorted[0];
    }
    return (
      sourceQuotation?.quotation ||
      (booking?.quotation_id && typeof booking.quotation_id === "object" ? booking.quotation_id : null)
    );
  }, [sourceQuotation, booking]);

  const pending = booking?.pending_revision;
  const hasPending =
    pending && ["pending_customer_approval", "pending_admin_approval"].includes(pending.status);

  /** Newest version first; version 1.0 is the current booking revision, plus Original tab. */
  const versions = useMemo(() => {
    const revisions = Array.isArray(booking?.revisions) ? [...booking.revisions] : [];
    const mapped = revisions
      .map((rev) => ({
        key: `rev-${rev.revision_number}`,
        number: Number(rev.revision_number) || 0,
        label: `v${Number(rev.revision_number) || 0}.0`,
        at: rev.customer_confirmed_at || rev.admin_confirmed_at || rev.created_at,
        status: rev.status === "rejected" ? "Declined" : "Confirmed & applied",
        tone: rev.status === "rejected" ? "danger" : "success",
        message: rev.message,
        proposedBy: actorLabel(rev.proposed_by),
        confirmedBy: actorLabel(rev.confirmed_by),
        priceDifference: Number(rev.price_difference) || 0,
        changes: rev.changes || {},
        snapshot: rev.snapshot || {},
        rawRev: rev,
      }))
      .sort((a, b) => b.number - a.number);

    // The Original tab represents the booking exactly as it was originally booked.
    mapped.push({
      key: "original",
      number: 0,
      label: "Original",
      at: booking?.createdAt || initialQuotation?.createdAt,
      status: "As booked",
      tone: "neutral",
      message: "The booking specifications and quotation terms as originally confirmed.",
      changes: {},
      isOriginal: true,
    });

    return mapped;
  }, [booking, initialQuotation]);

  const [selectedKey, setSelectedKey] = useState(versions[0]?.key || "original");
  const selected = versions.find((v) => v.key === selectedKey) || versions[0] || null;

  // Compute version-based item modifications by comparing Previous Version -> Selected Version
  const changedItems = useMemo(() => {
    if (!selected || selected.isOriginal) return [];

    // Find the index of the selected version
    const selIdx = versions.findIndex((v) => v.key === selected.key);
    if (selIdx === -1) return [];

    // The previous version chronologically is at selIdx + 1 (since versions is sorted newest first)
    const prevVersion = versions[selIdx + 1] || versions[versions.length - 1];

    // Resolve previous document representation
    let prevDoc = null;
    if (prevVersion.isOriginal) {
      prevDoc = initialQuotation || sourceQuotation?.quotation || booking?.quotation_id;
    } else {
      prevDoc = prevVersion.snapshot || null;
    }

    // Resolve current document representation for this version
    let currDoc = null;
    if (selIdx === 0) {
      // Latest version uses live booking state (or snapshot if present)
      currDoc = booking || selected.snapshot;
    } else {
      currDoc = selected.snapshot || booking;
    }

    const guestCount = Number(booking?.guest_count) || 1;
    const prevExtracted = extractVersionItems(prevDoc, guestCount);
    const currExtracted = extractVersionItems(currDoc, guestCount);

    // 1. Pure dynamic diff between Previous Version and Selected Version
    const dynamicDiffs = computeItemsDiff(prevExtracted, currExtracted);

    // 2. Validate any pre-saved changes.items against the previous version to ensure no unchanged items appear
    const savedItems = Array.isArray(selected?.changes?.items)
      ? selected.changes.items
      : Array.isArray(selected?.changes?.line_items)
      ? selected.changes.line_items
      : null;

    if (savedItems && savedItems.length > 0) {
      const validatedSaved = savedItems.filter((item) => {
        if (!item || !item.name) return false;
        const key = normalizeKey(item.name);
        const itemQty = Number(item.quantity ?? item.toQty) || 1;
        const itemPrice = Number(item.price ?? item.toPrice) || 0;
        const itemTotal = Number(item.total ?? item.toTotal) || itemPrice * itemQty;

        if (item.kind === "added") {
          // Check if it already existed in previous version with identical price/qty
          const inPrevSrv = prevExtracted.services.get(key);
          if (inPrevSrv && inPrevSrv.price === itemPrice && inPrevSrv.quantity === itemQty) {
            return false; // False added item
          }
          const isTrans = isTransportFee(item.name);
          const inPrevChg = isTrans
            ? prevExtracted.charges.get("__fee_transport__")
            : prevExtracted.charges.get(key);
          if (inPrevChg && inPrevChg.price === itemPrice) {
            return false; // False added fee
          }
          const inPrevMenu = prevExtracted.menu.get(key);
          if (inPrevMenu && inPrevMenu.price === itemPrice && inPrevMenu.quantity === itemQty) {
            return false; // False added dish
          }
          return true;
        }

        if (item.kind === "updated") {
          if (
            item.fromQty !== undefined &&
            item.toQty !== undefined &&
            item.fromQty === item.toQty &&
            item.fromPrice !== undefined &&
            item.toPrice !== undefined &&
            item.fromPrice === item.toPrice &&
            item.fromTotal !== undefined &&
            item.toTotal !== undefined &&
            item.fromTotal === item.toTotal
          ) {
            return false; // Unchanged item
          }
          return true;
        }

        return true;
      });

      if (validatedSaved.length > 0) {
        return validatedSaved;
      }
    }

    return dynamicDiffs;
  }, [selected, versions, initialQuotation, sourceQuotation, booking]);

  // Scalar change entries that actually changed (filter out unchanged fields and total_price handled separately)
  const scalarChangeEntries = useMemo(() => {
    if (selected?.isOriginal) return [];
    return Object.entries(selected?.changes || {}).filter(([k, val]) => {
      if (EXCLUDED_FIELDS.has(k) || k === "total_price") return false;
      if (isSameValue(k, val?.from, val?.to)) return false;
      return true;
    });
  }, [selected]);

  // Total price change object (Old Total -> Current Total)
  const totalPriceChange = useMemo(() => {
    if (selected?.isOriginal) return null;
    if (selected?.changes?.total_price) {
      const { from, to } = selected.changes.total_price;
      if (Number(from || 0) !== Number(to || 0)) {
        return { from: Number(from || 0), to: Number(to || 0) };
      }
    }
    const origTotal =
      Number(initialQuotation?.total_cost || initialQuotation?.total_price || 0) ||
      (selected?.priceDifference !== 0
        ? Number(booking?.total_price || 0) - selected.priceDifference
        : 0);
    const currTotal = Number(booking?.total_price || 0);
    if (origTotal > 0 && currTotal > 0 && origTotal !== currTotal) {
      return { from: origTotal, to: currTotal };
    }
    return null;
  }, [selected, initialQuotation, booking]);

  const hasAnyChanges =
    changedItems.length > 0 || scalarChangeEntries.length > 0 || totalPriceChange !== null;

  const pendingChangeEntries = Object.entries(pending?.proposed_changes || {}).filter(
    ([k, val]) => !EXCLUDED_FIELDS.has(k) && !isSameValue(k, val?.from, val?.to)
  );

  return (
    <div className="space-y-4">
      {/* Pending revision alert banner */}
      {hasPending && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
          <p className="flex items-start gap-2 text-xs text-amber-900">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              <strong className="font-semibold">
                {pending.status === "pending_customer_approval"
                  ? "Revision awaiting your confirmation"
                  : "Revision request pending review"}
              </strong>
              {pending.requested_at && (
                <span className="ml-1.5 tabular-nums text-[11px]">
                  · Submitted {formatShortDate(pending.requested_at)}
                </span>
              )}
            </span>
          </p>
          {pending.message && (
            <p className="pl-5 text-xs leading-relaxed text-amber-900/90 font-medium">
              {pending.message}
            </p>
          )}
          {pendingChangeEntries.length > 0 && (
            <div className="pl-5 pt-1.5 border-t border-amber-200/60 mt-1">
              <p className="text-[11px] font-semibold text-amber-900 mb-1">
                Proposed Modifications:
              </p>
              <ul className="space-y-0.5 text-xs text-amber-950">
                {pendingChangeEntries.map(([key, val]) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <span className="font-medium">{prettyField(key)}:</span>
                    <span className="text-muted-foreground line-through text-[11px]">
                      {prettyValue(key, val?.from)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="font-bold">{prettyValue(key, val?.to)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Version Layout */}
      <div className="grid gap-4 lg:grid-cols-[12rem_1fr]">
        {/* Version Selector Tabs */}
        <div className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-1.5 lg:flex-col">
            {versions.map((v) => {
              const isActive = v.key === selected?.key;
              return (
                <li key={v.key} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => setSelectedKey(v.key)}
                    aria-pressed={isActive}
                    className={cn(
                      "w-full rounded-md border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                      isActive
                        ? "border-primary/40 bg-powder shadow-2xs"
                        : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-sans text-xs font-semibold tabular-nums text-foreground">
                        {v.label}
                      </span>
                      {v.number === versions[0].number && !v.isOriginal && (
                        <span className="text-[10px] font-semibold text-primary">Current</span>
                      )}
                      {v.isOriginal && (
                        <span className="text-[10px] text-muted-foreground">As booked</span>
                      )}
                    </span>
                    <span className="mt-0.5 block font-sans text-[11px] tabular-nums text-muted-foreground">
                      {formatShortDate(v.at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Selected Version Detail Card */}
        <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
          {selected?.isOriginal ? (
            /* --- ORIGINAL TAB CONTENT --- */
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-sans text-sm font-bold text-slate-900">
                    Original Booking Specifications
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The baseline specifications, package, and pricing as originally confirmed.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  <Check className="h-3 w-3 text-slate-500" /> As Booked
                </span>
              </div>

              {/* Original Booking Key Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                    Event Date &amp; Time
                  </span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {initialQuotation?.event_date || booking?.event_date
                      ? formatEventDate(initialQuotation?.event_date || booking?.event_date)
                      : "Date on record"}
                    <span className="text-slate-500 font-normal">
                      · {initialQuotation?.start_time || booking?.start_time || "12:00"}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                    Guest Count &amp; Service
                  </span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {initialQuotation?.guest_count || booking?.guest_count || 1} Guests (Pax)
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                    Initial Package
                  </span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    {initialQuotation?.package_name ||
                      booking?.package_name_snapshot ||
                      "Standard Catering Package"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                    Original Total Cost
                  </span>
                  <p className="font-bold text-slate-900 font-mono text-sm flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    {formatCurrency(
                      initialQuotation?.total_cost ||
                        initialQuotation?.total_price ||
                        (totalPriceChange ? totalPriceChange.from : booking?.total_price) ||
                        0
                    )}
                  </p>
                </div>
              </div>

              {/* View Original Quote CTA */}
              <div className="rounded-lg border border-blue-200/80 bg-blue-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-blue-950 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#4C81E0]" />
                    Initial Approved Quotation
                  </p>
                  <p className="text-[11.5px] text-blue-800/80">
                    {initialQuotation?.quotation_number || "Quotation"} · Version{" "}
                    {Number(initialQuotation?.version_number) || 1}.0
                    {initialQuotation?.updatedAt && (
                      <> · Accepted {formatShortDate(initialQuotation.updatedAt)}</>
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowQuoteModal(true)}
                  className="inline-flex items-center gap-2 bg-[#4C81E0] hover:bg-[#3B6EC9] text-white font-semibold text-xs h-8.5 px-3.5 rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View original quote</span>
                </Button>
              </div>
            </div>
          ) : (
            /* --- REVISION VERSION TAB CONTENT --- */
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-100 pb-3">
                <h4 className="font-sans text-sm font-bold text-slate-900">
                  Changes in Version {selected?.label.slice(1)}
                </h4>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold",
                    selected?.tone === "danger"
                      ? "text-rose-700"
                      : selected?.tone === "success"
                      ? "text-emerald-700"
                      : "text-muted-foreground"
                  )}
                >
                  {selected?.tone === "danger" ? (
                    <XCircle className="h-3 w-3" aria-hidden="true" />
                  ) : selected?.tone === "success" ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {selected?.status}
                </span>
              </div>

              {selected?.message && (
                <p className="text-xs leading-relaxed text-slate-700 font-medium">
                  {selected.message}
                </p>
              )}

              {(selected?.proposedBy || selected?.confirmedBy || selected?.priceDifference) && (
                <p className="font-sans text-[11px] text-slate-500">
                  {[
                    selected.proposedBy ? `Requested by ${selected.proposedBy}` : null,
                    selected.confirmedBy ? `Approved by ${selected.confirmedBy}` : null,
                    selected.priceDifference
                      ? `Price ${selected.priceDifference > 0 ? "+" : "−"}${formatCurrency(
                          Math.abs(selected.priceDifference)
                        )}`
                      : null,
                  ]
                    .filter(Boolean)
                    .map((part, i) => (
                      <span key={i}>
                        {i > 0 && (
                          <span className="px-1 opacity-40" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <span className="tabular-nums font-semibold">{part}</span>
                      </span>
                    ))}
                </p>
              )}

              {/* Itemized Modifications */}
              {hasAnyChanges ? (
                <div className="space-y-3 pt-1">
                  {/* Changed Items Cards */}
                  {changedItems.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                        Itemized Modifications
                      </span>
                      <div className="space-y-2">
                        {changedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 transition-all hover:bg-slate-50"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                  {item.category || "Line Item"}
                                </span>
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {item.name}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                                  item.kind === "added"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : item.kind === "removed"
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : "bg-blue-100 text-[#2C4B8A] border border-blue-200"
                                )}
                              >
                                {item.kind === "added"
                                  ? "Added"
                                  : item.kind === "removed"
                                  ? "Removed"
                                  : "Updated"}
                              </span>
                            </div>

                            {/* Details breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1.5 border-t border-slate-200/60">
                              {/* Quantity change */}
                              {item.fromQty !== undefined &&
                              item.toQty !== undefined &&
                              item.fromQty !== item.toQty ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                                    Quantity
                                  </span>
                                  <span className="font-mono text-slate-800">
                                    <span className="line-through text-slate-400 mr-1">
                                      {item.fromQty}
                                    </span>
                                    <ArrowRight className="inline h-2.5 w-2.5 text-slate-400 mx-0.5" />
                                    <strong className="text-slate-900">{item.toQty}</strong>
                                    {item.toUnit ? ` ${item.toUnit}` : ""}
                                  </span>
                                </div>
                              ) : item.quantity ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                                    Quantity
                                  </span>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {item.quantity} {item.unit || ""}
                                  </span>
                                </div>
                              ) : null}

                              {/* Price / Line Total */}
                              {(item.fromTotal !== undefined || item.fromPrice !== undefined) &&
                              (item.toTotal !== undefined || item.toPrice !== undefined) ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                                    {item.fromTotal !== undefined && item.toTotal !== undefined
                                      ? "Price / Total"
                                      : "Price"}
                                  </span>
                                  <span className="font-mono text-slate-800">
                                    <span className="line-through text-slate-400 mr-1">
                                      {formatCurrency(item.fromTotal ?? item.fromPrice)}
                                    </span>
                                    <ArrowRight className="inline h-2.5 w-2.5 text-slate-400 mx-0.5" />
                                    <strong className="text-slate-900">
                                      {formatCurrency(item.toTotal ?? item.toPrice)}
                                    </strong>
                                  </span>
                                </div>
                              ) : item.price !== undefined ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                                    Price / Total
                                  </span>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {formatCurrency(item.total ?? item.price)}
                                  </span>
                                </div>
                              ) : null}

                              {/* Price Difference */}
                              {item.priceDiff !== undefined && item.priceDiff !== 0 && (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                                    Change
                                  </span>
                                  <span
                                    className={cn(
                                      "font-bold font-mono",
                                      item.priceDiff > 0 ? "text-emerald-700" : "text-rose-700"
                                    )}
                                  >
                                    {item.priceDiff > 0 ? "+" : ""}
                                    {formatCurrency(item.priceDiff)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scalar Field Changes (e.g. Event Date if changed, Guest Count, Venue) */}
                  {scalarChangeEntries.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                        Specification Changes
                      </span>
                      <ul className="divide-y divide-border rounded-lg border border-border bg-white px-3">
                        {scalarChangeEntries.map(([key, val]) => (
                          <li
                            key={key}
                            className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                          >
                            <span className="text-xs font-semibold text-slate-800">
                              {prettyField(key)}
                            </span>
                            <span className="flex shrink-0 items-baseline gap-1.5 font-sans text-xs tabular-nums">
                              <span className="text-muted-foreground line-through text-[11px]">
                                {prettyValue(key, val?.from)}
                              </span>
                              <ArrowRight
                                className="h-3 w-3 shrink-0 self-center text-muted-foreground"
                                aria-hidden="true"
                              />
                              <span className="font-bold text-slate-900 font-mono">
                                {prettyValue(key, val?.to)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Total Price Summary Row (Old Total -> Current Total) */}
                  {totalPriceChange && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          Total Price
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Overall booking cost summary
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 font-mono">
                        <span className="line-through text-slate-400 text-xs tabular-nums">
                          {formatCurrency(totalPriceChange.from)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0 self-center" />
                        <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                          {formatCurrency(totalPriceChange.to)}
                        </span>
                        {selected?.priceDifference !== undefined && selected.priceDifference !== 0 && (
                          <span
                            className={cn(
                              "text-xs font-bold ml-1",
                              selected.priceDifference > 0 ? "text-emerald-700" : "text-rose-700"
                            )}
                          >
                            ({selected.priceDifference > 0 ? "+" : ""}
                            {formatCurrency(selected.priceDifference)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  No modifications recorded for this version.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Quotation Modal for Original Quote Viewing */}
      {showQuoteModal && initialQuotation && (
        <CustomerQuotationModal
          open={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          quotation={initialQuotation}
          inquiry={sourceQuotation?.inquiry}
          versions={sourceQuotation?.versions || []}
        />
      )}
    </div>
  );
}
