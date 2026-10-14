import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import Badge from "../../components/admin/ui/Badge";
import { useConfirm } from "../../components/feedback/confirmContext";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  Sparkles,
  Info,
  AlertCircle,
  AlertTriangle,
  Lock,
  Utensils,
  Layers,
  Banknote,
  ExternalLink,
  CheckCircle2,
  PackageCheck,
  Check,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  UserCheck,
  HelpCircle,
  CreditCard,
  Receipt,
  MessageSquare,
  Wrench,
  XCircle,
  Eye,
  Plus,
  RotateCcw
} from "lucide-react";
import { parseInclusion } from "../../lib/packageDisplay";
import {
  formatCurrency,
  formatShortDate,
  formatDateTime,
  getEventTimingStatus,
  getBookingVenueLocation,
  formatEventStartTime,
  initialsOf
} from "../../utils/format";

// Dynamic checklist generator combining package setup inclusions and inventory equipment
function buildDynamicChecklist(booking) {
  if (!booking) return [];

  const savedChecklist = Array.isArray(booking.equipment_checklist) && booking.equipment_checklist.length > 0
    ? booking.equipment_checklist
    : [];
  const savedMap = new Map();
  savedChecklist.forEach((item) => {
    if (item.item_key) savedMap.set(item.item_key, item);
  });

  const items = [];

  // 1. Package Inclusions (Event Setup inclusions and Package Equipment)
  const inclusions = Array.isArray(booking.package_inclusions) ? booking.package_inclusions : [];
  inclusions.forEach((inc, idx) => {
    const raw = String(inc).trim();
    if (!raw) return;

    const parsed = parseInclusion(raw);
    if (!parsed) return;

    const nameLower = parsed.name.toLowerCase();
    const catLower = (parsed.category || "").toLowerCase();

    // Skip crew/staff inclusions
    if (nameLower === "crew" || catLower === "crew" || catLower === "staff") {
      return;
    }

    const isSetup = catLower.includes("setup");
    const itemCategory = isSetup ? "Event Setup Inclusion" : "Package Equipment";

    let qty = undefined;
    let unit = "";
    if (!isSetup) {
      if (parsed.qty) {
        const numMatch = parsed.qty.match(/\d+/);
        qty = numMatch ? parseInt(numMatch[0], 10) : 1;
        const unitMatch = parsed.qty.match(/[a-zA-Z]+/);
        unit = unitMatch ? unitMatch[0] : "pcs";
      } else {
        qty = 1;
        unit = "pcs";
      }
    }

    const itemKey = `inclusion_${idx}_${parsed.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const saved = savedMap.get(itemKey);

    // Event Setup items must NEVER display a quantity or dispatched count
    const finalQuantity = isSetup
      ? null
      : (saved?.quantity !== undefined && saved?.quantity !== null ? saved.quantity : qty);
    const finalUnit = isSetup
      ? ""
      : (saved?.unit || unit || "pcs");

    items.push({
      item_key: itemKey,
      name: parsed.name,
      category: itemCategory,
      quantity: finalQuantity,
      unit: finalUnit,
      is_inspected: saved ? Boolean(saved.is_inspected) : false,
      status: saved?.status || "not_inspected",
      issue_type: saved?.issue_type || "none",
      notes: saved?.notes || "",
      completed_at: saved?.completed_at || null,
    });
  });

  // 2. Direct Inventory Items (Package physical equipment)
  const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];
  inventoryItems.forEach((inv, idx) => {
    const name = inv.name || inv.inventory_id?.name || inv.inventory_id?.item_name || `Equipment Item #${idx + 1}`;
    const itemKey = `inv_${inv.inventory_id?._id || inv.inventory_id || idx}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    if (items.some((it) => it.item_key === itemKey || it.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const saved = savedMap.get(itemKey);
    items.push({
      item_key: itemKey,
      name,
      category: "Inventory Equipment",
      quantity: saved?.quantity !== undefined && saved?.quantity !== null ? saved.quantity : (Number(inv.quantity) || 1),
      unit: saved?.unit || inv.unit || "units",
      is_inspected: saved ? Boolean(saved.is_inspected) : false,
      status: saved?.status || "not_inspected",
      issue_type: saved?.issue_type || "none",
      notes: saved?.notes || "",
      completed_at: saved?.completed_at || null,
    });
  });

  // Add-ons & Extra Services are excluded from Equipment Check per requirements
  return items;
}

export default function ManagerEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Specifications Expand Toggle
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);

  // Staff Attendance Section Expand Toggle
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(true);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);

  // Financial History See More Toggle
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);

  // Equipment Checklist Section Expand Toggle
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(true);
  const [checklist, setChecklist] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [savingAdditionalNotes, setSavingAdditionalNotes] = useState(false);

  // Inline Issue Reporting State per Item
  const [openInlineNotes, setOpenInlineNotes] = useState({});
  const [inlineDrafts, setInlineDrafts] = useState({});
  const [savingItemKey, setSavingItemKey] = useState(null);
  const [pendingAction, setPendingAction] = useState({});

  // Complete / Done State
  const [submittingDone, setSubmittingDone] = useState(false);

  const loadEvent = async (options = {}) => {
    const isSilent = typeof options === "boolean" ? options : Boolean(options?.silent);
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const res = await ManagerAPI.getBooking(id);
      const data = res.data;
      setBooking(data);
      setChecklist(buildDynamicChecklist(data));
      setAdditionalNotes(data.equipment_notes || "");
    } catch (err) {
      console.error("Failed to load booking details:", err);
      if (!isSilent) {
        notify("Failed to load assigned event details.", "error");
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  useRealTimeRefresh((data) => {
    if (data?.booking_id && String(data.booking_id) !== String(id)) {
      return;
    }
    loadEvent({ silent: true });
  }, ["booking"]);

  const timing = useMemo(() => {
    return booking ? getEventTimingStatus(booking) : { isUpcoming: true, isStarted: false, isFinished: false };
  }, [booking]);

  const isCompleted = useMemo(() => {
    return Boolean(booking && ["completed", "Completed"].includes(booking.status));
  }, [booking]);

  // Back navigation handler preserving origin tab & search
  const handleBack = () => {
    const originTab = location.state?.fromTab;
    const originSearch = location.state?.fromSearch;
    if (originTab) {
      const params = new URLSearchParams();
      params.set("tab", originTab);
      if (originSearch) params.set("q", originSearch);
      navigate(`/manager/bookings?${params.toString()}`);
    } else {
      navigate("/manager/bookings");
    }
  };

  // Staff Attendance Handlers
  const staffAssignments = booking?.staff_assignments || [];
  const markedStaffCount = staffAssignments.filter((s) => s.attendance_status === "present").length;
  const totalStaffCount = staffAssignments.length;

  const handleToggleAttendance = async (staffMember) => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }

    const currentStatus = staffMember.attendance_status;
    const isPresent = currentStatus === "present";
    const nextStatus = isPresent ? "not_recorded" : "present";
    const targetUserId = staffMember.user_id?._id || staffMember.user_id;

    setUpdatingStaffId(targetUserId || staffMember._id);

    // Optimistic UI update
    setBooking((prev) => {
      if (!prev) return prev;
      const updatedAssignments = (prev.staff_assignments || []).map((sa) => {
        const match =
          (targetUserId && String(sa.user_id?._id || sa.user_id) === String(targetUserId)) ||
          String(sa._id) === String(staffMember._id);
        if (match) {
          return {
            ...sa,
            attendance_status: nextStatus,
            marked_at: isPresent ? null : new Date()
          };
        }
        return sa;
      });
      return { ...prev, staff_assignments: updatedAssignments };
    });

    try {
      const payload = [
        {
          user_id: targetUserId,
          _id: staffMember._id,
          attendance_status: nextStatus
        }
      ];
      await ManagerAPI.updateStaffAttendance(booking._id, { attendance: payload });
      notify(`Attendance updated for ${staffMember.name || staffMember.user_id?.full_name || "staff"}.`, "success");
    } catch (err) {
      console.error("Attendance update error:", err);
      notify("Failed to update staff attendance. Please try again.", "error");
      loadEvent({ silent: true });
    } finally {
      setUpdatingStaffId(null);
    }
  };

  // Equipment Checklist Handlers
  const isChecklistDone = Boolean(booking?.equipment_checklist_done);
  const totalChecklistCount = checklist.length;

  const validlyInspectedItems = useMemo(() => {
    return checklist.filter((item) => {
      const isInspected = Boolean(item.is_inspected && item.status !== "not_inspected");
      if (!isInspected) return false;
      if (item.status === "incomplete" || item.status === "issue_reported") {
        return Boolean(item.notes && item.notes.trim());
      }
      return true;
    });
  }, [checklist]);

  const inspectedItemsCount = validlyInspectedItems.length;

  const uninspectedItems = useMemo(() => {
    return checklist.filter((item) => !item.is_inspected || item.status === "not_inspected");
  }, [checklist]);

  const incompleteMissingNotes = useMemo(() => {
    return checklist.filter(
      (item) =>
        (item.status === "incomplete" || item.status === "issue_reported") &&
        (!item.notes || !item.notes.trim())
    );
  }, [checklist]);

  const hasUnsavedDrafts = useMemo(() => {
    return checklist.some((item) => {
      const draft = (inlineDrafts[item.item_key] || "").trim();
      const saved = (item.notes || "").trim();
      return openInlineNotes[item.item_key] && draft && draft !== saved;
    });
  }, [checklist, inlineDrafts, openInlineNotes]);

  const hasPendingIncomplete = useMemo(() => {
    return Object.values(pendingAction).some((action) => action === "incomplete");
  }, [pendingAction]);

  const isDoneEnabled = useMemo(() => {
    if (checklist.length === 0) return false;
    if (isChecklistDone) return false;
    if (isCompleted) return false;
    if (uninspectedItems.length > 0) return false;
    if (incompleteMissingNotes.length > 0) return false;
    if (hasUnsavedDrafts) return false;
    if (hasPendingIncomplete) return false;
    return true;
  }, [checklist.length, isChecklistDone, isCompleted, uninspectedItems.length, incompleteMissingNotes.length, hasUnsavedDrafts, hasPendingIncomplete]);

  const handleToggleInlineNote = (itemKey) => {
    if (isCompleted) return;
    const targetItem = checklist.find((item) => item.item_key === itemKey);
    const isOpen = Boolean(openInlineNotes[itemKey]);
    if (!isOpen && targetItem) {
      setInlineDrafts((prev) => ({
        ...prev,
        [itemKey]: prev[itemKey] !== undefined ? prev[itemKey] : (targetItem.notes || "")
      }));
    }
    setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: !isOpen }));
  };

  const handleCancelInlineNote = (itemKey) => {
    const targetItem = checklist.find((item) => item.item_key === itemKey);
    setInlineDrafts((prev) => ({
      ...prev,
      [itemKey]: targetItem?.notes || ""
    }));
    setPendingAction((prev) => ({
      ...prev,
      [itemKey]: null
    }));
    setOpenInlineNotes((prev) => ({
      ...prev,
      [itemKey]: false
    }));
  };

  const handleOpenIncomplete = (itemKey) => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }
    const targetItem = checklist.find((item) => item.item_key === itemKey);
    if (!targetItem) return;

    // Set pending action to incomplete and open inline note field
    setPendingAction((prev) => ({
      ...prev,
      [itemKey]: "incomplete"
    }));
    setOpenInlineNotes((prev) => ({
      ...prev,
      [itemKey]: true
    }));
    setInlineDrafts((prev) => ({
      ...prev,
      [itemKey]: prev[itemKey] !== undefined ? prev[itemKey] : (targetItem.notes || "")
    }));
    notify("Please enter an issue description in the notes field and click Save to confirm Incomplete status.", "info");
  };

  const handleSaveInlineNotes = async (itemKey) => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }
    const targetItem = checklist.find((item) => item.item_key === itemKey);
    if (!targetItem) return;

    const currentDraft = inlineDrafts[itemKey] !== undefined ? inlineDrafts[itemKey] : (targetItem.notes || "");
    const noteText = currentDraft.trim();

    const isMarkingIncomplete = pendingAction[itemKey] === "incomplete" || targetItem.status === "incomplete";

    if (isMarkingIncomplete && !noteText) {
      notify("Please enter a description in the Issue Reported field before confirming Incomplete status.", "warning");
      setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: true }));
      return;
    }

    // Determine target status
    let nextStatus = targetItem.status;
    let nextIsInspected = targetItem.is_inspected;
    let nextIssueType = targetItem.issue_type || "none";

    if (isMarkingIncomplete) {
      nextStatus = "incomplete";
      nextIsInspected = true;
      nextIssueType = "damaged";
    } else if (targetItem.status === "inspected_ok") {
      // Completed item saving optional notes: status stays inspected_ok
      nextStatus = "inspected_ok";
      nextIsInspected = true;
      nextIssueType = "none";
    } else {
      // Item not inspected yet: saving notes without changing inspection status
      nextStatus = "not_inspected";
      nextIsInspected = false;
      nextIssueType = "none";
    }

    setSavingItemKey(itemKey);
    const updatedChecklist = checklist.map((item) => {
      if (item.item_key === itemKey) {
        return {
          ...item,
          is_inspected: nextIsInspected,
          status: nextStatus,
          issue_type: nextIssueType,
          notes: noteText,
          completed_at: nextIsInspected ? (item.completed_at || new Date()) : null
        };
      }
      return item;
    });
    setChecklist(updatedChecklist);

    try {
      await ManagerAPI.updateEquipmentChecklist(booking._id, {
        item: {
          item_key: itemKey,
          name: targetItem.name,
          category: targetItem.category,
          quantity: targetItem.quantity,
          unit: targetItem.unit,
          is_inspected: nextIsInspected,
          status: nextStatus,
          issue_type: nextIssueType,
          notes: noteText,
          is_complete: true
        }
      });

      // Clear pending action and close inline editor
      setPendingAction((prev) => ({ ...prev, [itemKey]: null }));
      setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: false }));

      if (nextStatus === "incomplete") {
        notify(`Issue report saved for "${targetItem.name}". Marked as Incomplete.`, "success");
      } else if (nextStatus === "inspected_ok") {
        notify(`Notes saved for "${targetItem.name}". Item remains Complete.`, "success");
      } else {
        notify(`Notes saved for "${targetItem.name}".`, "success");
      }
    } catch (err) {
      console.error("Checklist update error:", err);
      notify(err.response?.data?.message || "Failed to save equipment notes.", "error");
      loadEvent({ silent: true });
    } finally {
      setSavingItemKey(null);
    }
  };

  const handleCompleteItem = async (itemKey) => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }
    const targetItem = checklist.find((item) => item.item_key === itemKey);
    if (!targetItem) return;

    setSavingItemKey(itemKey);
    const updatedChecklist = checklist.map((item) => {
      if (item.item_key === itemKey) {
        return {
          ...item,
          is_inspected: true,
          status: "inspected_ok",
          issue_type: "none",
          notes: targetItem.notes || "",
          completed_at: new Date()
        };
      }
      return item;
    });
    setChecklist(updatedChecklist);
    setPendingAction((prev) => ({ ...prev, [itemKey]: null }));
    setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: false }));

    try {
      await ManagerAPI.updateEquipmentChecklist(booking._id, {
        item: {
          item_key: itemKey,
          name: targetItem.name,
          category: targetItem.category,
          quantity: targetItem.quantity,
          unit: targetItem.unit,
          is_inspected: true,
          status: "inspected_ok",
          issue_type: "none",
          notes: targetItem.notes || "",
          is_complete: true
        }
      });
      notify(`Marked "${targetItem.name}" as Complete.`, "success");
    } catch (err) {
      console.error("Error completing item inspection:", err);
      notify(err.response?.data?.message || "Failed to mark inspection as completed.", "error");
      loadEvent({ silent: true });
    } finally {
      setSavingItemKey(null);
    }
  };

  const handleChangeStatus = async (itemKey) => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }
    const targetItem = checklist.find((item) => item.item_key === itemKey);
    if (!targetItem) return;

    const currentStatusLabel = targetItem.status === "incomplete" ? "Incomplete" : "Complete";
    const ok = await confirm({
      title: "Change Inspection Status?",
      message: `Reset "${targetItem.name}" from ${currentStatusLabel} back to Not Inspected? You will be able to re-inspect this item as Complete or Incomplete. Any existing notes will be preserved.`,
      confirmText: "Yes, Change Status",
      tone: "warning"
    });
    if (!ok) return;

    setSavingItemKey(itemKey);
    try {
      await ManagerAPI.updateEquipmentChecklist(booking._id, {
        item: {
          item_key: itemKey,
          name: targetItem.name,
          category: targetItem.category,
          quantity: targetItem.quantity,
          unit: targetItem.unit,
          is_inspected: false,
          status: "not_inspected",
          issue_type: "none",
          notes: targetItem.notes || "",
          is_complete: true
        }
      });

      const updatedChecklist = checklist.map((item) => {
        if (item.item_key === itemKey) {
          return {
            ...item,
            is_inspected: false,
            status: "not_inspected",
            issue_type: "none",
            completed_at: null
            // targetItem.notes is preserved!
          };
        }
        return item;
      });
      setChecklist(updatedChecklist);
      // Preserve notes in drafts so when Incomplete is clicked, notes are still there
      setInlineDrafts((prev) => ({
        ...prev,
        [itemKey]: targetItem.notes || ""
      }));
      setPendingAction((prev) => ({ ...prev, [itemKey]: null }));
      setOpenInlineNotes((prev) => ({ ...prev, [itemKey]: false }));
      notify(`Reset "${targetItem.name}" to Not Inspected.`, "success");
    } catch (err) {
      console.error("Error resetting inspection status:", err);
      notify(err.response?.data?.message || "Failed to reset inspection status.", "error");
      loadEvent({ silent: true });
    } finally {
      setSavingItemKey(null);
    }
  };

  const handleSaveAdditionalNotes = async () => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }
    setSavingAdditionalNotes(true);
    try {
      await ManagerAPI.updateEquipmentNotes(booking._id, { notes: additionalNotes });
      notify("General equipment notes saved.", "success");
    } catch (err) {
      console.error("Error saving equipment notes:", err);
      notify("Failed to save equipment notes.", "error");
    } finally {
      setSavingAdditionalNotes(false);
    }
  };

  const handleMarkDone = async () => {
    if (isCompleted) {
      notify("Completed bookings are read-only.", "info");
      return;
    }

    // 1. Validation: check for uninspected items
    const uninspected = checklist.filter((item) => !item.is_inspected || item.status === "not_inspected");
    if (uninspected.length > 0) {
      notify(`Please inspect all equipment items before marking as Done. (${uninspected.length} items remaining)`, "warning");
      setIsEquipmentOpen(true);
      return;
    }

    // 2. Validation: check for incomplete items with empty notes
    const invalidIncomplete = checklist.filter(
      (item) => (item.status === "incomplete" || item.status === "issue_reported") && (!item.notes || !item.notes.trim())
    );
    if (invalidIncomplete.length > 0) {
      const names = invalidIncomplete.map((i) => i.name).join(", ");
      notify(`Incomplete equipment items must have a saved issue report note before marking as Done (${names}).`, "warning");
      setIsEquipmentOpen(true);
      return;
    }

    // 3. Validation: check for unsaved drafts in open inline fields
    const unsavedItem = checklist.find((item) => {
      const draft = (inlineDrafts[item.item_key] || "").trim();
      const saved = (item.notes || "").trim();
      return openInlineNotes[item.item_key] && draft && draft !== saved;
    });
    if (unsavedItem) {
      notify(`You have unsaved issue notes for "${unsavedItem.name}". Please save or cancel the notes before marking as Done.`, "warning");
      setIsEquipmentOpen(true);
      return;
    }

    const ok = await confirm({
      title: "Mark Equipment Checklist as Done?",
      message: "This will record that you have completed the equipment inspection for this event. The admin will review any reported notes and finalize the reservation.",
      confirmText: "Yes, Mark as Done",
      tone: "primary"
    });
    if (!ok) return;

    setSubmittingDone(true);
    try {
      await ManagerAPI.markEquipmentChecklistDone(booking._id);
      notify("Equipment inspection checklist marked as Done successfully.", "success");
      await loadEvent({ silent: true });
    } catch (err) {
      console.error("Mark checklist done error:", err);
      notify(err.response?.data?.message || "Failed to mark checklist as done.", "error");
    } finally {
      setSubmittingDone(false);
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl">
          Loading assigned event details...
        </div>
      </ManagerLayout>
    );
  }

  if (!booking) {
    return (
      <ManagerLayout>
        <div className="p-8 text-center space-y-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <AlertCircle size={32} className="mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">Assigned Event Not Found</h2>
          <p className="text-xs text-slate-500">The assigned event could not be found or is not assigned to your manager profile.</p>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            Back to Bookings
          </button>
        </div>
      </ManagerLayout>
    );
  }

  // Financial & quotation calculations from active DB data
  const quotation = booking.quotation || null;
  const totalPrice = Number(booking.total_price || quotation?.total_price || 0);
  const totalPaid = Number(booking.total_paid || 0);
  const remainingBalance = Number(booking.remaining_balance || Math.max(0, totalPrice - totalPaid));
  const depositPaid = Number(
    (booking.approved_payments || [])
      .filter((p) => String(p.payment_type || "").toLowerCase().includes("deposit"))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) ||
    (booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid"
      ? (booking.deposit_amount || quotation?.deposit_amount || 0)
      : 0)
  );
  const otherPayments = Math.max(0, totalPaid - depositPaid);

  const venueLocation = getBookingVenueLocation(booking);
  const locationAddress = venueLocation !== "Location not specified" ? venueLocation : "Address details to be confirmed";
  const locationQuery = [booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || (booking.location || "");

  const customerName =
    booking.customer_id?.full_name ||
    `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.trim() ||
    "Customer";
  const customerPhone = booking.contact_phone || booking.customer_id?.phone || "—";
  const customerEmail = booking.contact_email || booking.customer_id?.email || "—";

  // Menu items from quotation or booking
  const menuDishes = booking.menu_items || quotation?.menu_items || [];
  const hasFoodMenu = menuDishes.length > 0;

  // Package pricing
  const startingPrice = Number(booking.package_starting_price || quotation?.package_starting_price || booking.package_id?.price || 0);
  const packagePrice = Number(booking.package_price || quotation?.package_price || startingPrice);
  const packageName = booking.package_id?.name || quotation?.package_name || "Standard Catering Package";
  const packageInclusions = booking.package_inclusions || quotation?.package_inclusions || [];

  // Add-ons & Extra Services
  const addOns = booking.service_items || quotation?.service_items || [];
  const additionalCharges = booking.additional_charges || quotation?.additional_charges || [];

  return (
    <ManagerLayout>
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to My Bookings</span>
          </button>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600" /> Event Completed (Read-Only)
              </span>
            ) : (
              timing.isStarted && (
                <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  <Sparkles size={13} className="text-blue-600" /> Event In Progress
                </span>
              )
            )}
          </div>
        </div>

        {/* Master Work Document Container */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs divide-y divide-slate-100 overflow-hidden">
          
          {/* TOP HEADER: Event Overview & Identity */}
          <div className="p-4 sm:p-6 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Manager Operations Lead
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Ref: {booking.reference || booking._id?.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {booking.event_type || "Catering Event"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Client: <strong className="text-slate-900">{customerName}</strong> · Contact: <span className="text-slate-700">{customerPhone}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start">
                <Badge status={booking.status || "Ready for Event"} />
                {booking.payment_status && (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 capitalize">
                    {booking.payment_status.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: BOOKING SPECIFICATIONS (At the very top)       */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers size={18} className="text-[#4C81E0]" />
                  <span>Booking Specifications</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Concise overview of event specifications, customer details, package inclusions, and logistics.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSpecsExpanded(!isSpecsExpanded)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <Eye size={13} className="text-[#4C81E0]" />
                <span>{isSpecsExpanded ? "Collapse Details" : "View All"}</span>
                {isSpecsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Quick Summary Grid (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              
              {/* Category 1: Event & Customer Specifications */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <CalendarIcon size={14} className="text-[#4C81E0]" />
                  <span>Event Schedule & Venue</span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium">Date: </span>
                    <strong className="text-slate-900">
                      {booking.event_date
                        ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                        : "TBA"}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1 text-slate-700">
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <span>Time: <strong className="text-slate-900">{formatEventStartTime(booking.start_time)}</strong></span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Guests: </span>
                    <strong className="text-slate-900">{booking.guest_count || "—"} pax</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Venue: </span>
                    <span className="text-slate-800 font-medium">{locationAddress}</span>
                  </div>
                  {locationQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-1 pt-0.5"
                    >
                      <ExternalLink size={11} /> Open in Google Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Category 2: Package & Starting Price */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Package & Pricing</span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium">Package: </span>
                    <strong className="text-slate-900">{packageName}</strong>
                  </div>
                  {startingPrice > 0 && (
                    <div>
                      <span className="text-slate-400 font-medium">Starting Price: </span>
                      <span className="font-semibold text-slate-900">{formatCurrency(startingPrice)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 font-medium">Approved Base Price: </span>
                    <strong className="text-emerald-700 font-bold">{formatCurrency(packagePrice)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Booking Total: </span>
                    <strong className="text-slate-900 font-bold">{formatCurrency(totalPrice)}</strong>
                  </div>
                </div>
              </div>

              {/* Category 3: Customer Details & Contact */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <UserCheck size={14} className="text-[#4C81E0]" />
                  <span>Customer Contact</span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div>
                    <span className="text-slate-400 font-medium">Client: </span>
                    <strong className="text-slate-900">{customerName}</strong>
                  </div>
                  <div className="flex items-center gap-1 text-slate-700">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span>{customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-700 truncate">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{customerEmail}</span>
                  </div>
                  {booking.contact_method && (
                    <div>
                      <span className="text-slate-400 font-medium">Pref: </span>
                      <span className="text-slate-700 capitalize">{booking.contact_method}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EXPANDED VIEW: Complete Specifications (Visible when View All is clicked) */}
            {isSpecsExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-5 animate-in fade-in duration-200">
                
                {/* 3. Package Inclusions Breakdown */}
                {packageInclusions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Package Inclusions ({packageInclusions.length} items)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {packageInclusions.map((inc, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-800">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span className="font-medium">{inc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Food Menu Dishes (Only when booking contains menu selections) */}
                {hasFoodMenu && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Utensils size={14} className="text-[#4C81E0]" />
                      <span>Approved Food Menu Dishes ({menuDishes.length} dishes)</span>
                    </h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10.5px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 font-bold">Category</th>
                            <th className="py-2.5 px-3 font-bold">Dish Name</th>
                            <th className="py-2.5 px-3 font-bold text-center">Quantity</th>
                            <th className="py-2.5 px-3 font-bold text-center">Unit</th>
                            <th className="py-2.5 px-3 font-bold text-right">Quoted Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {menuDishes.map((dish, i) => (
                            <tr key={dish._id || i} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-500">{dish.category || "General"}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {dish.name}
                                {dish.note && <span className="block text-[11px] text-slate-400 font-normal italic">{dish.note}</span>}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold text-slate-800">{dish.quantity || 1}</td>
                              <td className="py-2 px-3 text-center text-slate-600">{dish.unit || "Serving"}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {dish.price ? formatCurrency(dish.price) : "Included"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. Add-ons & Extra Services */}
                {(addOns.length > 0 || additionalCharges.length > 0) && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <PackageCheck size={14} className="text-[#4C81E0]" />
                      <span>Add-ons &amp; Extra Services</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {addOns.map((addon, i) => (
                        <div key={addon._id || i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900">{addon.name}</strong>
                            <span className="font-mono font-bold text-slate-800">{formatCurrency(addon.price)}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Quantity: {addon.quantity || 1} {addon.note ? `· ${addon.note}` : ""}
                          </div>
                        </div>
                      ))}
                      {additionalCharges.map((chg, i) => (
                        <div key={chg._id || i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900">{chg.name}</strong>
                            <span className="font-mono font-bold text-slate-800">{formatCurrency(chg.amount)}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 capitalize">{chg.charge_type || "Extra Charge"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Adjustments & Logistics */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500" />
                    <span>Adjustments &amp; Event Logistics</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800">Fulfillment &amp; Setup</div>
                      <div className="text-slate-600">
                        Method: <strong className="text-slate-900 capitalize">{booking.delivery_method || "Setup"}</strong>
                      </div>
                      {booking.pickup_location && (
                        <div className="text-slate-600">Pickup Location: <strong className="text-slate-900">{booking.pickup_location}</strong></div>
                      )}
                      {booking.event_theme && (
                        <div className="text-slate-600">Theme: <strong className="text-slate-900">{booking.event_theme}</strong></div>
                      )}
                      {Array.isArray(booking.custom_setup_scope) && booking.custom_setup_scope.length > 0 && (
                        <div className="text-slate-600 pt-1">
                          Setup Scope: <span className="font-medium text-slate-800">{booking.custom_setup_scope.join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800">Dietary &amp; Special Requests</div>
                      {booking.dietary_restrictions && (
                        <div className="text-slate-600">Dietary: <strong className="text-slate-900">{booking.dietary_restrictions}</strong></div>
                      )}
                      {booking.allergies && (
                        <div className="text-slate-600">Allergies: <strong className="text-slate-900">{booking.allergies}</strong></div>
                      )}
                      {booking.special_requests ? (
                        <div className="text-slate-600">Special Notes: <span className="italic text-slate-800">"{booking.special_requests}"</span></div>
                      ) : (
                        <div className="text-slate-400 italic">No special requests noted for this booking.</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: STAFF ATTENDANCE (Keep Dropdown Interaction)   */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D6E4F7] text-[#4C81E0] font-bold flex items-center justify-center shrink-0">
                  <UserCheck size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Staff Attendance</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {markedStaffCount} of {totalStaffCount} staff marked
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Verify crew check-in status. Changes persist directly to the database.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAttendanceOpen(!isAttendanceOpen)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                aria-label="Toggle staff attendance section"
              >
                {isAttendanceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isAttendanceOpen && (
              <div className="pt-2 space-y-2.5">
                {staffAssignments.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/50">
                    No staff crew members assigned to this booking yet. Admin assigns staff for catering events.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {staffAssignments.map((staff) => {
                      const isPresent = staff.attendance_status === "present";
                      const staffUserId = staff.user_id?._id || staff.user_id;
                      const staffName = staff.name || staff.user_id?.full_name || "Crew Member";
                      const role = staff.role || staff.user_id?.position || "Staff";
                      const phone = staff.phone || staff.user_id?.phone;
                      const isUpdating = updatingStaffId && String(updatingStaffId) === String(staffUserId || staff._id);

                      return (
                        <div
                          key={staff._id || staffUserId}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isPresent
                              ? "bg-emerald-50/40 border-emerald-200 shadow-2xs"
                              : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Attendance Checkbox */}
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPresent}
                                disabled={isCompleted || isUpdating}
                                onChange={() => handleToggleAttendance(staff)}
                                className="w-4 h-4 rounded text-[#4C81E0] focus:ring-[#4C81E0] border-slate-300 cursor-pointer disabled:opacity-50"
                              />
                            </label>

                            {/* Staff Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPresent ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                            }`}>
                              {initialsOf(staffName)}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">{staffName}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <span className="font-semibold text-slate-700">{role}</span>
                                {phone && <span>· {phone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check size={12} /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Not Marked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: FINANCIAL & HISTORY (Read-Only for Manager)    */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                  <Banknote size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Financial &amp; History</h2>
                  <p className="text-xs text-slate-500">
                    Approved quotation totals, deposit received, and payment transaction history (read-only).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentHistoryOpen(!isPaymentHistoryOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <Receipt size={13} className="text-emerald-700" />
                <span>{isPaymentHistoryOpen ? "Hide History" : "See More"}</span>
                {isPaymentHistoryOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Always-Visible Financial Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">Total Quotation</span>
                <span className="text-base font-extrabold text-slate-900 block font-mono">{formatCurrency(totalPrice)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">Deposit Paid</span>
                <span className="text-base font-bold text-slate-800 block font-mono">{formatCurrency(depositPaid)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">Other Payments</span>
                <span className="text-base font-bold text-slate-800 block font-mono">{formatCurrency(otherPayments)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">Total Paid</span>
                <span className="text-base font-extrabold text-emerald-700 block font-mono">{formatCurrency(totalPaid)}</span>
              </div>

              <div className={`col-span-2 sm:col-span-1 p-3 rounded-xl border space-y-1 ${
                remainingBalance > 0
                  ? "bg-amber-50/80 border-amber-300 text-amber-950"
                  : "bg-emerald-50 border-emerald-300 text-emerald-950"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider block">Remaining Balance</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border capitalize">
                    {remainingBalance > 0 ? (booking.payment_status?.replace(/_/g, " ") || "Pending") : "Fully Paid"}
                  </span>
                </div>
                <span className="text-base font-extrabold block font-mono">{formatCurrency(remainingBalance)}</span>
              </div>
            </div>

            {/* See More Dropdown: Complete Payment Transaction History */}
            {isPaymentHistoryOpen && (
              <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-[#4C81E0]" />
                    <span>Customer Payment Transactions</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {(booking.payments || []).length} recorded transactions
                  </span>
                </div>

                {(booking.payments || []).length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/50">
                    No payment transaction records found for this booking.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10.5px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">Date &amp; Time</th>
                          <th className="py-2.5 px-3 font-bold">Reference / ID</th>
                          <th className="py-2.5 px-3 font-bold">Type</th>
                          <th className="py-2.5 px-3 font-bold">Method</th>
                          <th className="py-2.5 px-3 font-bold text-right">Amount</th>
                          <th className="py-2.5 px-3 font-bold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(booking.payments || []).map((pay, i) => {
                          const statusStr = String(pay.status || "").toLowerCase();
                          const isApproved = ["approved", "paid", "completed"].includes(statusStr);
                          const isRejected = ["rejected", "failed"].includes(statusStr);

                          return (
                            <tr key={pay._id || i} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                {formatDateTime(pay.createdAt || pay.paid_at)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
                                {pay.gateway_reference || pay.transaction_id || pay.reference_number || (pay._id?.slice(-8).toUpperCase()) || "—"}
                              </td>
                              <td className="py-2.5 px-3 font-medium capitalize text-slate-800">
                                {pay.payment_type || "Payment"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 capitalize">
                                {pay.payment_method || pay.method || "Cash / In Person"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(pay.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10.5px] font-bold capitalize ${
                                  isApproved
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : isRejected
                                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}>
                                  {pay.status || "Pending"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 4: EQUIPMENT CHECK (Expandable, Item-by-Item)      */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
                  <PackageCheck size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Equipment Check</h2>
                    {isChecklistDone ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Inspection Done
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {inspectedItemsCount} of {totalChecklistCount} items inspected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Inspect event inclusions and package equipment. Report missing or damaged gear for admin review.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEquipmentOpen(!isEquipmentOpen)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                aria-label="Toggle equipment check section"
              >
                {isEquipmentOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isEquipmentOpen && (
              <div className="pt-2 space-y-4">
                {checklist.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/50 space-y-1">
                    <p className="font-semibold text-slate-700">No equipment items to inspect</p>
                    <p className="text-slate-400">This event does not contain physical equipment or setup inclusions.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {checklist.map((item) => {
                      const isInspected = item.is_inspected && item.status !== "not_inspected";
                      const hasIssue = item.status === "incomplete" || item.status === "issue_reported";

                      return (
                        <div
                          key={item.item_key}
                          className={`p-3.5 transition-colors ${
                            hasIssue
                              ? "bg-rose-50/30"
                              : isInspected
                              ? "bg-emerald-50/20"
                              : "hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Non-Interactive Inspection Check Icon Indicator */}
                              <div className="shrink-0 pt-0.5">
                                {isInspected && hasIssue ? (
                                  <div
                                    className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xs"
                                    title="Inspected – Issue Reported"
                                    aria-label="Inspected with issue"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                ) : isInspected ? (
                                  <div
                                    className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs"
                                    title="Inspected (Good Condition)"
                                    aria-label="Inspected in good condition"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div
                                    className="w-5 h-5 rounded-full border-2 border-slate-300 bg-slate-50"
                                    title="Not Inspected"
                                    aria-label="Not inspected"
                                  />
                                )}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                    {item.name}
                                  </span>
                                  {item.category && (
                                    <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                      {item.category}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                  {/* Physical equipment displays quantity; Event Setup inclusions do NOT */}
                                  {item.quantity !== null && item.quantity !== undefined && (
                                    <span>
                                      Dispatched: <strong className="text-slate-800">{item.quantity} {item.unit || "pcs"}</strong>
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  {hasIssue ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      <AlertTriangle size={11} /> Incomplete – Issue Reported
                                    </span>
                                  ) : isInspected ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <Check size={11} /> Inspected (Good Condition)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-500">
                                      Not Inspected
                                    </span>
                                  )}
                                </div>

                                {/* Display saved notes snippet when inline editor is collapsed */}
                                {item.notes && !openInlineNotes[item.item_key] && (
                                  hasIssue ? (
                                    <div className="text-[11px] text-slate-700 bg-rose-50/70 p-2 rounded-lg border border-rose-200/70 mt-1 flex items-start gap-1.5">
                                      <AlertTriangle size={12} className="text-rose-600 shrink-0 mt-0.5" />
                                      <div>
                                        <strong className="text-rose-800 font-semibold">Issue Reported: </strong>
                                        <span>{item.notes}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1 flex items-start gap-1.5">
                                      <FileText size={12} className="text-slate-500 shrink-0 mt-0.5" />
                                      <div>
                                        <strong className="text-slate-700 font-semibold">Note: </strong>
                                        <span>{item.notes}</span>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Action Buttons: Mutually Exclusive */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {/* Add / Edit Notes */}
                              <button
                                type="button"
                                onClick={() => handleToggleInlineNote(item.item_key)}
                                disabled={isCompleted}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <MessageSquare size={12} />
                                <span>{item.notes ? "Edit Notes" : "Add Notes"}</span>
                              </button>

                              {isInspected ? (
                                /* When item is Inspected (Complete or Incomplete): Hide Incomplete & Complete, show Change Status */
                                <button
                                  type="button"
                                  onClick={() => handleChangeStatus(item.item_key)}
                                  disabled={isCompleted || savingItemKey === item.item_key}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                                  title="Change or undo inspection status"
                                >
                                  <RotateCcw size={12} />
                                  <span>Change Status</span>
                                </button>
                              ) : (
                                /* When item is Not Inspected: Show both Incomplete and Complete */
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenIncomplete(item.item_key)}
                                    disabled={isCompleted || savingItemKey === item.item_key}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 hover:bg-rose-50 text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <AlertTriangle size={12} />
                                    <span>Incomplete</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCompleteItem(item.item_key)}
                                    disabled={isCompleted || savingItemKey === item.item_key}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4C81E0] hover:bg-[#3b6bc4] text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <Check size={12} />
                                    <span>Complete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Inline Notes Field */}
                          {openInlineNotes[item.item_key] && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  {(pendingAction[item.item_key] === "incomplete" || item.status === "incomplete") ? (
                                    <>
                                      <AlertTriangle size={13} className="text-amber-600" />
                                      <span>Issue Reported</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText size={13} className="text-blue-600" />
                                      <span>Inspection Notes</span>
                                    </>
                                  )}
                                </label>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {(pendingAction[item.item_key] === "incomplete" || item.status === "incomplete")
                                    ? "Required to mark item Incomplete"
                                    : "Optional notes for this item"}
                                </span>
                              </div>

                              <textarea
                                rows={2}
                                value={inlineDrafts[item.item_key] !== undefined ? inlineDrafts[item.item_key] : (item.notes || "")}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInlineDrafts((prev) => ({ ...prev, [item.item_key]: val }));
                                }}
                                disabled={isCompleted}
                                placeholder={
                                  (pendingAction[item.item_key] === "incomplete" || item.status === "incomplete")
                                    ? "Describe damage, missing gear, quantity discrepancy, or equipment issues..."
                                    : "Add any optional notes, remarks, or serial numbers for this item..."
                                }
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:border-[#4C81E0] focus:ring-1 focus:ring-[#4C81E0] outline-none bg-white text-slate-800 disabled:bg-slate-50"
                              />

                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <div className="text-[11px] text-slate-500">
                                  {(pendingAction[item.item_key] === "incomplete" || item.status === "incomplete") && (
                                    <span className="text-rose-700 font-semibold">Will be saved as Incomplete</span>
                                  )}
                                  {item.status === "inspected_ok" && (
                                    <span className="text-emerald-700 font-semibold">Item is marked Complete</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelInlineNote(item.item_key)}
                                    disabled={savingItemKey === item.item_key}
                                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineNotes(item.item_key)}
                                    disabled={savingItemKey === item.item_key || isCompleted}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#4C81E0] hover:bg-[#3b6bc4] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                                  >
                                    <span>{savingItemKey === item.item_key ? "Saving..." : "Save"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ADDITIONAL NOTES */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        ADDITIONAL NOTES
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Overall feedback or venue observations for admin review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAdditionalNotes}
                      disabled={savingAdditionalNotes || isCompleted}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <span>{savingAdditionalNotes ? "Saving..." : "Save Notes"}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    disabled={isCompleted}
                    placeholder="Enter any general notes regarding equipment turnover, customer feedback, or event setup observations..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-[#4C81E0] focus:ring-1 focus:ring-[#4C81E0] outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* Equipment Inspection Done Footer */}
                {!isCompleted && (
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="text-xs">
                      {isChecklistDone ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>
                            Equipment checklist completed{booking.equipment_checklist_done_at ? ` on ${new Date(booking.equipment_checklist_done_at).toLocaleDateString()}` : ""}. Awaiting admin review.
                          </span>
                        </div>
                      ) : uninspectedItems.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                          <AlertCircle size={15} className="text-amber-600 shrink-0" />
                          <span>
                            {uninspectedItems.length} checklist item{uninspectedItems.length > 1 ? "s" : ""} remaining to inspect before marking checklist as Done.
                          </span>
                        </div>
                      ) : incompleteMissingNotes.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-rose-800 font-medium">
                          <AlertCircle size={15} className="text-rose-600 shrink-0" />
                          <span>
                            {incompleteMissingNotes.length} incomplete item{incompleteMissingNotes.length > 1 ? "s" : ""} require an issue report note before marking as Done.
                          </span>
                        </div>
                      ) : hasUnsavedDrafts || hasPendingIncomplete ? (
                        <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                          <AlertCircle size={15} className="text-amber-600 shrink-0" />
                          <span>
                            Please save your pending issue report notes before marking checklist as Done.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>
                            All {totalChecklistCount} checklist items inspected. Equipment inspection ready to mark as Done.
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkDone}
                      disabled={!isDoneEnabled || submittingDone || isChecklistDone}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        isChecklistDone
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-not-allowed opacity-90"
                          : isDoneEnabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>
                        {submittingDone
                          ? "Saving..."
                          : isChecklistDone
                            ? "Checklist Done"
                            : "Done"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </ManagerLayout>
  );
}
