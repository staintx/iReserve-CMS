import React, { useState, useEffect, useMemo } from "react";
import Modal from "../common/Modal";
import Badge from "../admin/ui/Badge";
import { useConfirm } from "../feedback/confirmContext";
import useToast from "../../hooks/useToast";
import { ManagerAPI } from "../../api/manager";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Check,
  Sparkles,
  Utensils,
  Layers,
  Banknote,
  Users,
  Phone,
  Mail,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowLeft,
  Loader2,
  Boxes,
  CircleDot
} from "lucide-react";
import {
  getEventTimingStatus,
  formatCurrency,
  formatEventDate,
  formatTime,
  parseLocalDate
} from "../../utils/format";

export default function ManagerEventDetailsModal({
  booking,
  open,
  onClose,
  onRefresh,
  onCompleteEvent
}) {
  const { notify } = useToast();
  const confirm = useConfirm();

  // Sub-view toggle between Equipment Check and Menu & Inclusions
  const [activeSubView, setActiveSubView] = useState("equipment"); // 'equipment' | 'booking'

  // Staff Attendance State
  const [staffAttendanceList, setStaffAttendanceList] = useState([]);
  const [savingStaffIndex, setSavingStaffIndex] = useState(null); // null | index | -1 for batch
  const [expandedStaffIndex, setExpandedStaffIndex] = useState(null);
  const [staffDetailsDraft, setStaffDetailsDraft] = useState({
    attendance_status: "present",
    check_in_time: "",
    attendance_notes: ""
  });
  const [staffSectionCollapsed, setStaffSectionCollapsed] = useState(false);
  const [showAllStaffMobile, setShowAllStaffMobile] = useState(false);

  // Equipment Verification State
  const [equipmentList, setEquipmentList] = useState([]);
  const [savingItemIndex, setSavingItemIndex] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemIssueDraft, setItemIssueDraft] = useState({ category: "missing", note: "" });

  // Booking items & services overview collapse
  const [viewAllBookingItems, setViewAllBookingItems] = useState(false);

  // Event Closeout / Completion State
  const [completingEvent, setCompletingEvent] = useState(false);

  // Timing and lifecycle evaluation
  const isCompleted = useMemo(() => {
    return booking && ["completed", "Completed"].includes(booking.status);
  }, [booking]);

  const timing = useMemo(() => {
    return booking ? getEventTimingStatus(booking) : { isUpcoming: true, isStarted: false, isFinished: false };
  }, [booking]);

  const isUpcoming = timing.isUpcoming && !isCompleted;
  const isActionable = !isUpcoming && !isCompleted;

  // Initialize state when booking changes
  useEffect(() => {
    if (!booking) return;

    // 1. Initialize Staff Attendance list
    const staffArr = Array.isArray(booking.staff_assignments) ? booking.staff_assignments : [];
    const initialStaff = staffArr.map((member) => {
      const rawStatus = member.attendance_status;
      const isRecorded = ["present", "late", "absent"].includes(rawStatus);
      return {
        _id: member._id,
        user_id: member.user_id?._id || member.user_id || null,
        name: member.name || member.user_id?.full_name || "Crew Member",
        role: member.role || member.user_id?.position || "Staff",
        phone: member.phone || member.user_id?.phone || "",
        attendance_status: isRecorded ? rawStatus : "not_recorded",
        check_in_time: member.check_in_time || "",
        attendance_notes: member.attendance_notes || "",
        marked_at: member.marked_at || null
      };
    });
    setStaffAttendanceList(initialStaff);
    setSavingStaffIndex(null);
    setExpandedStaffIndex(null);
    setShowAllStaffMobile(false);

    // 2. Initialize Returnable Equipment list
    const returns = Array.isArray(booking.equipment_returns) ? booking.equipment_returns : [];
    const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];
    const initialEquipment = [];

    if (returns.length > 0) {
      returns.forEach((ret) => {
        const booked = Number(ret.quantity_booked || 1);
        const hasSavedNote = Boolean(ret.notes && ret.notes.trim());
        const rawStatus = ret.verification_status;

        let status = "pending";
        if (rawStatus === "verified_ok") {
          status = "verified_ok";
        } else if (rawStatus === "issue_recorded" && hasSavedNote) {
          status = "issue_recorded";
        } else if (hasSavedNote) {
          status = "issue_recorded";
        } else if (ret.verified_at && !hasSavedNote) {
          status = "verified_ok";
        }

        initialEquipment.push({
          _id: ret._id,
          inventory_id: ret.inventory_id?._id || ret.inventory_id || null,
          name: ret.name || ret.inventory_id?.item_name || "Equipment Item",
          quantity_booked: booked,
          verification_status: status,
          issue_category: ret.issue_category || (Number(ret.quantity_damaged || 0) > 0 ? "damaged" : "missing"),
          notes: ret.notes || ""
        });
      });
    } else if (inventoryItems.length > 0) {
      inventoryItems.forEach((item) => {
        initialEquipment.push({
          inventory_id: item.inventory_id?._id || item.inventory_id || null,
          name: item.name || item.inventory_id?.item_name || "Equipment Item",
          quantity_booked: Number(item.quantity || 1),
          verification_status: "pending",
          issue_category: "",
          notes: ""
        });
      });
    }

    setEquipmentList(initialEquipment);
    setEditingItemIndex(null);
    setItemIssueDraft({ category: "missing", note: "" });
    setActiveSubView("equipment");
    setViewAllBookingItems(false);
  }, [booking]);

  // Derived Progress & Metrics
  const staffStats = useMemo(() => {
    const total = staffAttendanceList.length;
    const present = staffAttendanceList.filter((s) => s.attendance_status === "present").length;
    const late = staffAttendanceList.filter((s) => s.attendance_status === "late").length;
    const absent = staffAttendanceList.filter((s) => s.attendance_status === "absent").length;
    const recorded = present + late + absent;
    const notRecorded = Math.max(0, total - recorded);
    const checkedIn = present + late;
    const isAllRecorded = total > 0 && recorded === total;
    return { total, present, late, absent, notRecorded, recorded, checkedIn, isAllRecorded };
  }, [staffAttendanceList]);

  const equipmentStats = useMemo(() => {
    const total = equipmentList.length;
    const verifiedOk = equipmentList.filter((i) => i.verification_status === "verified_ok").length;
    const issues = equipmentList.filter(
      (i) => i.verification_status === "issue_recorded" && Boolean(i.notes && i.notes.trim())
    ).length;
    const checkedTotal = verifiedOk + issues;
    const pending = Math.max(0, total - checkedTotal);
    const isAllChecked = total > 0 && checkedTotal === total;
    return { total, verifiedOk, issues, pending, checkedTotal, isAllChecked };
  }, [equipmentList]);

  // Staff Attendance Handlers
  const handleToggleStaffDetails = (index) => {
    if (expandedStaffIndex === index) {
      handleCancelStaffEdit(index);
    } else {
      const member = staffAttendanceList[index];
      const initialStatus =
        member.attendance_status && member.attendance_status !== "not_recorded"
          ? member.attendance_status
          : "present";

      let initialTime = member.check_in_time || "";
      if (!initialTime && (initialStatus === "present" || initialStatus === "late")) {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, "0");
        const mins = String(now.getMinutes()).padStart(2, "0");
        initialTime = `${hrs}:${mins}`;
      }

      setExpandedStaffIndex(index);
      setStaffDetailsDraft({
        attendance_status: initialStatus,
        check_in_time: initialTime,
        attendance_notes: member.attendance_notes || ""
      });
    }
  };

  const handleCancelStaffEdit = async (index) => {
    const member = staffAttendanceList[index];
    const originalNotes = (member?.attendance_notes || "").trim();
    const currentNotes = staffDetailsDraft.attendance_notes.trim();

    if (currentNotes !== originalNotes && currentNotes.length > 0) {
      await confirm({
        tone: "warning",
        title: "Discard Unsaved Attendance Changes?",
        description: "You have unsaved details for this staff member. Do you want to discard them?",
        confirmLabel: "Discard Changes",
        cancelLabel: "Keep Editing",
        onConfirm: () => {
          setExpandedStaffIndex(null);
        }
      });
      return;
    }

    setExpandedStaffIndex(null);
  };

  const handleSaveStaffDetails = async (index) => {
    if (!booking || savingStaffIndex !== null) return;
    setSavingStaffIndex(index);

    const prevList = [...staffAttendanceList];
    let nextCheckIn = staffDetailsDraft.check_in_time.trim();
    const nextStatus = staffDetailsDraft.attendance_status || "present";

    if ((nextStatus === "present" || nextStatus === "late") && !nextCheckIn) {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      nextCheckIn = `${hrs}:${mins}`;
    } else if (nextStatus === "not_recorded") {
      nextCheckIn = "";
    }

    const updatedList = staffAttendanceList.map((m, i) => {
      if (i !== index) return m;
      return {
        ...m,
        attendance_status: nextStatus,
        check_in_time: nextCheckIn,
        attendance_notes: staffDetailsDraft.attendance_notes.trim()
      };
    });

    try {
      await ManagerAPI.updateStaffAttendance(booking._id, {
        attendance: updatedList
      });
      setStaffAttendanceList(updatedList);
      setExpandedStaffIndex(null);
      const statusLabel =
        nextStatus === "present" ? "Present" :
        nextStatus === "late" ? "Late" :
        nextStatus === "absent" ? "Absent" : "Not Marked";
      notify(`Attendance for "${updatedList[index].name}" saved as ${statusLabel}.`, "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      setStaffAttendanceList(prevList);
      notify(err.response?.data?.message || "Failed to save staff remarks.", "error");
    } finally {
      setSavingStaffIndex(null);
    }
  };

  const handleMarkAllStaffPresent = async () => {
    if (!booking || savingStaffIndex !== null || staffAttendanceList.length === 0) return;

    const unrecordedCount = staffAttendanceList.filter(
      (s) => s.attendance_status === "not_recorded" || !s.attendance_status || s.attendance_status === "unmarked"
    ).length;

    if (unrecordedCount === 0) {
      notify("All assigned staff members already have attendance recorded.", "info");
      return;
    }

    setSavingStaffIndex(-1);
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    const curTime = `${hrs}:${mins}`;

    const prevList = [...staffAttendanceList];
    const updatedList = staffAttendanceList.map((s) => {
      if (s.attendance_status === "not_recorded" || !s.attendance_status || s.attendance_status === "unmarked") {
        return {
          ...s,
          attendance_status: "present",
          check_in_time: s.check_in_time || curTime
        };
      }
      return s;
    });

    try {
      await ManagerAPI.updateStaffAttendance(booking._id, {
        attendance: updatedList
      });
      setStaffAttendanceList(updatedList);
      notify(`${unrecordedCount} staff member(s) marked Present.`, "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      setStaffAttendanceList(prevList);
      notify(err.response?.data?.message || "Failed to mark all staff present.", "error");
    } finally {
      setSavingStaffIndex(null);
    }
  };

  // Equipment Turnover persistence helper
  const persistEquipmentList = async (updatedList) => {
    const payloadReturns = updatedList.map((item) => {
      const isPending = item.verification_status === "pending";
      return {
        _id: item._id,
        inventory_id: item.inventory_id,
        name: item.name,
        quantity_booked: item.quantity_booked,
        quantity_returned: isPending ? 0 : item.quantity_booked,
        quantity_damaged: 0,
        quantity_missing: 0,
        verification_status: item.verification_status,
        issue_category: item.issue_category || "",
        notes: item.notes || ""
      };
    });

    await ManagerAPI.submitEquipmentReturns(booking._id, {
      returns: payloadReturns,
      equipment_returns: payloadReturns
    });
  };

  // Item Verification: Mark OK (with confirmation if clearing an existing reported problem)
  const handleMarkItemOk = async (index) => {
    if (!booking || savingItemIndex !== null) return;
    const item = equipmentList[index];

    const executeMarkOk = async () => {
      setSavingItemIndex(index);
      const updatedList = [...equipmentList];
      updatedList[index] = {
        ...updatedList[index],
        verification_status: "verified_ok",
        issue_category: "",
        notes: ""
      };

      try {
        await persistEquipmentList(updatedList);
        setEquipmentList(updatedList);
        if (editingItemIndex === index) {
          setEditingItemIndex(null);
        }
        notify(`"${updatedList[index].name}" marked as OK.`, "success");
        if (onRefresh) onRefresh();
      } catch (err) {
        notify(err.response?.data?.message || "Failed to save verification status.", "error");
      } finally {
        setSavingItemIndex(null);
      }
    };

    // If an existing problem report is being cleared, confirm first
    if (item.verification_status === "issue_recorded" && item.notes) {
      await confirm({
        tone: "warning",
        title: "Clear Reported Problem?",
        description: `This item currently has a problem reported: "${item.notes}". Marking it as OK will clear the reported problem and remove the note.`,
        confirmLabel: "Clear and Mark OK",
        cancelLabel: "Cancel",
        onConfirm: executeMarkOk
      });
      return;
    }

    await executeMarkOk();
  };

  // Item Verification: Open Report Issue / Edit Note Drawer
  const handleOpenReportIssue = (index) => {
    const item = equipmentList[index];
    setEditingItemIndex(index);
    setItemIssueDraft({
      category: item.issue_category || "missing",
      note: item.notes || ""
    });
  };

  // Item Verification: Cancel Drawer (confirm if discarding typed changes)
  const handleCancelIssueEdit = async (index) => {
    const item = equipmentList[index];
    const originalNote = (item?.notes || "").trim();
    const currentNote = itemIssueDraft.note.trim();

    if (currentNote !== originalNote && currentNote.length > 0) {
      await confirm({
        tone: "warning",
        title: "Discard Unsaved Note?",
        description: "You have typed unsaved changes for this note. Do you want to discard them?",
        confirmLabel: "Discard Changes",
        cancelLabel: "Keep Editing",
        onConfirm: () => {
          setEditingItemIndex(null);
        }
      });
      return;
    }

    setEditingItemIndex(null);
  };

  // Item Verification: Save Reported Issue / Note
  const handleSaveIssue = async (index) => {
    if (!booking || savingItemIndex !== null) return;
    const cleanNote = itemIssueDraft.note.trim();

    if (!cleanNote) {
      notify("Please enter a note describing the condition or problem.", "error");
      return;
    }

    setSavingItemIndex(index);
    const updatedList = [...equipmentList];
    const isCategoryIssue = itemIssueDraft.category === "missing" || itemIssueDraft.category === "damaged";

    updatedList[index] = {
      ...updatedList[index],
      verification_status: isCategoryIssue ? "issue_recorded" : "verified_ok",
      issue_category: itemIssueDraft.category,
      notes: cleanNote
    };

    try {
      await persistEquipmentList(updatedList);
      setEquipmentList(updatedList);
      setEditingItemIndex(null);
      notify(
        isCategoryIssue
          ? `Problem recorded for "${updatedList[index].name}".`
          : `Note saved for "${updatedList[index].name}".`,
        "success"
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save equipment note.", "error");
    } finally {
      setSavingItemIndex(null);
    }
  };

  // Item Verification: Revise back to not checked / pending (with confirmation)
  const handleReviseItem = async (index) => {
    if (!booking || savingItemIndex !== null) return;
    const item = equipmentList[index];

    await confirm({
      tone: "warning",
      title: "Reset Equipment Check?",
      description: `Do you want to reset "${item.name}" back to Not Checked? Any saved notes for this item will be removed.`,
      confirmLabel: "Reset Item",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setSavingItemIndex(index);
        const updatedList = [...equipmentList];
        updatedList[index] = {
          ...updatedList[index],
          verification_status: "pending",
          issue_category: "",
          notes: ""
        };

        try {
          await persistEquipmentList(updatedList);
          setEquipmentList(updatedList);
          if (editingItemIndex === index) {
            setEditingItemIndex(null);
          }
          notify(`"${updatedList[index].name}" reset to Not Checked.`, "info");
          if (onRefresh) onRefresh();
        } catch (err) {
          notify(err.response?.data?.message || "Failed to reset verification status.", "error");
        } finally {
          setSavingItemIndex(null);
        }
      }
    });
  };

  // Batch: Mark All Pending Items as OK
  const handleMarkAllPendingOk = async () => {
    if (!booking || savingItemIndex !== null || equipmentList.length === 0) return;

    const pendingCount = equipmentList.filter((i) => i.verification_status === "pending").length;
    if (pendingCount === 0) {
      notify("All equipment items have already been checked.", "info");
      return;
    }

    setSavingItemIndex(-1);
    const updatedList = equipmentList.map((item) => {
      if (item.verification_status === "pending") {
        return {
          ...item,
          verification_status: "verified_ok",
          issue_category: "",
          notes: ""
        };
      }
      return item;
    });

    try {
      await persistEquipmentList(updatedList);
      setEquipmentList(updatedList);
      setEditingItemIndex(null);
      notify(`${pendingCount} item(s) marked OK.`, "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save equipment checks.", "error");
    } finally {
      setSavingItemIndex(null);
    }
  };

  // Closeout and Mark Event Completed
  const executeComplete = async (collectedCash = false) => {
    if (!booking) return;
    setCompletingEvent(true);
    try {
      await ManagerAPI.markCompleted(booking._id, {
        collected_cash_balance: collectedCash
      });
      notify(
        collectedCash
          ? "Event marked completed and cash payment confirmed!"
          : "Event marked completed successfully!",
        "success"
      );
      if (onCompleteEvent) {
        onCompleteEvent();
      } else {
        onClose();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to complete event.", "error");
    } finally {
      setCompletingEvent(false);
    }
  };

  const handleCompleteEvent = async () => {
    if (!booking) return;
    const remainingBal = Number(booking.remaining_balance ?? 0);
    const isCashElected = booking.balance_payment_preference === "in_person";

    if (remainingBal > 0) {
      await confirm({
        tone: "confirm",
        title: "Complete Event & Confirm Cash Payment?",
        description: isCashElected
          ? `The client elected Cash on Event Day. Did you collect the outstanding balance of ₱${remainingBal.toLocaleString("en-PH", { minimumFractionDigits: 2 })} on-site?`
          : `The booking has an outstanding balance of ₱${remainingBal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Full payment is required before completion. If received in cash, choose "Yes, Collected Cash".`,
        confirmLabel: "Yes, Collected Cash",
        cancelLabel: "Cancel",
        onConfirm: async () => {
          await executeComplete(true);
        }
      });
      return;
    }

    await confirm({
      tone: "confirm",
      title: "Mark Event Completed?",
      description: "This closes out the event and archives operational records. Make sure all equipment checks and staff attendance have been saved.",
      confirmLabel: "Mark Completed",
      cancelLabel: "Not Yet",
      onConfirm: async () => {
        await executeComplete(false);
      }
    });
  };

  // Group menu items by category (Hook called unconditionally)
  const menuCategories = useMemo(() => {
    if (!booking) return {};
    const dishes = booking.menu_items || [];
    const grouped = {};
    dishes.forEach((dish) => {
      const cat = dish.category || dish.dish_id?.category || "Main Entrée";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(dish);
    });
    return grouped;
  }, [booking]);

  // Filtered staff list for mobile compact view (Hook called unconditionally)
  const visibleStaff = useMemo(() => {
    if (showAllStaffMobile || staffAttendanceList.length <= 3) {
      return staffAttendanceList;
    }
    return staffAttendanceList.slice(0, 3);
  }, [staffAttendanceList, showAllStaffMobile]);

  if (!booking) return null;

  // Format details for presentation
  const eventName = booking.event_type || booking.package_name_snapshot || "Catering Event";
  const clientName = booking.customer_id?.full_name || "Valued Client";
  const clientPhone = booking.customer_id?.phone || booking.contact_phone || "";
  const clientEmail = booking.customer_id?.email || booking.contact_email || "";
  const referenceCode = booking.reference || booking._id?.slice(-6).toUpperCase();
  const venueAddress =
    booking.venue_type ||
    [booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") ||
    "Subdivision Clubhouse";

  // Friendly date: "Dec 12, 2026 (Sat)"
  const parsedDate = parseLocalDate(booking.event_date);
  const eventDateStr = parsedDate
    ? `${parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${parsedDate.toLocaleDateString("en-US", { weekday: "short" })})`
    : formatEventDate(booking.event_date, { fallback: "Date TBA" });

  // Friendly time: "2:00 PM - 6:00 PM (4 hrs)"
  const startTimeStr = booking.start_time ? formatTime(booking.start_time) : "";
  const endTimeStr = booking.end_time ? formatTime(booking.end_time) : "";
  const durationHours = booking.duration_hours || 4;
  const eventTimeStr = startTimeStr
    ? endTimeStr
      ? `${startTimeStr} - ${endTimeStr} (${durationHours} hrs)`
      : `${startTimeStr} (${durationHours} hrs)`
    : "Time TBA";

  const guestCount = booking.guest_count || 0;
  const remainingBalance = Number(booking.remaining_balance || 0);
  const isCashElected = booking.balance_payment_preference === "in_person";
  const totalDishesCount = booking.menu_items?.length || 0;
  const addonsCount = (booking.service_items?.length || 0) + (booking.additional_charges?.length || 0);

  // Modal Footer (Redundant general Save button removed)
  const modalFooter = (
    <div className="w-full">
      {/* Mobile view action buttons */}
      <div className="sm:hidden w-full flex flex-col gap-2">
        {isActionable && (
          <button
            type="button"
            onClick={handleCompleteEvent}
            disabled={completingEvent}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-sm font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{completingEvent ? "Finalizing..." : "Mark Event Completed"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 active:bg-slate-50 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Desktop view actions & readiness indicator */}
      <div className="hidden sm:flex items-center justify-between gap-3 text-xs">
        {/* Left: Quick readiness summary */}
        <div className="flex items-center gap-2 flex-wrap text-slate-600">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Readiness:
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            {staffStats.isAllRecorded ? (
              <CheckCircle2 size={13} className="text-emerald-600" />
            ) : (
              <CircleDot size={13} className="text-slate-400" />
            )}
            <span>Staff: {staffStats.recorded}/{staffStats.total}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            {equipmentStats.isAllChecked ? (
              <CheckCircle2 size={13} className="text-emerald-600" />
            ) : (
              <CircleDot size={13} className="text-slate-400" />
            )}
            <span>Gear: {equipmentStats.checkedTotal}/{equipmentStats.total}</span>
          </span>
          {remainingBalance > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                <AlertTriangle size={13} className="text-rose-600" />
                <span>Bal: {formatCurrency(remainingBalance)}</span>
              </span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>

          {isActionable && (
            <button
              type="button"
              onClick={handleCompleteEvent}
              disabled={completingEvent}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{completingEvent ? "Finalizing..." : "Mark Event Completed"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      footer={modalFooter}
      className="manager-event-modal sm:max-w-xl md:max-w-2xl lg:max-w-[740px] max-sm:inset-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:border-0 w-full"
      bodyClassName="p-3.5 sm:p-5 space-y-4 max-sm:pb-6"
    >
      {/* 1. TOP HEADER & EVENT DETAILS (Never overlaps client details) */}
      <header className="border-b border-slate-100 pb-3 space-y-2.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-slate-600 active:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-snug break-words">
              {eventName}
            </h1>
            <span className="shrink-0">
              <Badge status={booking.status || (isCompleted ? "Completed" : "confirmed")} />
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Client & Booking Reference Subtitle */}
        <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
          <span>
            Client: <strong className="text-slate-900 font-semibold">{clientName}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            Ref: <span className="font-mono font-medium text-slate-700">{referenceCode}</span>
          </span>
          {clientPhone && (
            <>
              <span className="text-slate-300">·</span>
              <a
                href={`tel:${clientPhone}`}
                className="text-[#4c81e0] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <Phone size={11} /> {clientPhone}
              </a>
            </>
          )}
          {clientEmail && (
            <>
              <span className="text-slate-300 hidden md:inline">·</span>
              <a
                href={`mailto:${clientEmail}`}
                className="text-[#4c81e0] hover:underline hidden md:inline-flex items-center gap-1 font-medium"
              >
                <Mail size={11} /> {clientEmail}
              </a>
            </>
          )}
        </div>

        {/* Schedule, Date, Venue Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs text-slate-700 border-t border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarIcon size={14} className="text-[#4c81e0] shrink-0" />
            <span className="font-medium truncate">{eventDateStr}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={14} className="text-[#4c81e0] shrink-0" />
            <span className="font-medium truncate">{eventTimeStr}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={14} className="text-[#4c81e0] shrink-0" />
            <span className="font-medium truncate" title={venueAddress}>
              <span className="text-slate-400 mr-1">Venue:</span>
              {venueAddress}
              {guestCount > 0 && <span className="text-slate-400 ml-1">({guestCount} pax)</span>}
            </span>
          </div>
        </div>

        {/* Outstanding Balance Banner if Applicable */}
        {remainingBalance > 0 && (
          <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs flex items-center justify-between gap-2 text-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Banknote size={15} className="text-[#4c81e0] shrink-0" />
              <span className="truncate">
                {isCashElected ? (
                  <>Client elected <strong>Cash on Event Day</strong>: Balance of <strong>{formatCurrency(remainingBalance)}</strong></>
                ) : (
                  <>Outstanding Balance: <strong>{formatCurrency(remainingBalance)}</strong></>
                )}
              </span>
            </div>
            <span className="shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-800">
              {isCashElected ? "Collect On-Site" : "Pending"}
            </span>
          </div>
        )}
      </header>

      {/* 2. STAFF ATTENDANCE SECTION */}
      <section aria-label="Staff Attendance" className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={16} className="text-[#4c81e0] shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Staff Attendance</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500">
              {staffStats.recorded} of {staffStats.total} staff marked
            </span>
            <button
              type="button"
              onClick={() => setStaffSectionCollapsed(!staffSectionCollapsed)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={staffSectionCollapsed ? "Expand Staff Attendance" : "Collapse Staff Attendance"}
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${staffSectionCollapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>
        </div>

        {/* Section Content */}
        {!staffSectionCollapsed && (
          <div className="space-y-2.5">
            {/* Batch Action when unrecorded staff exist */}
            {isActionable && staffAttendanceList.length > 0 && staffStats.notRecorded > 0 && (
              <div className="flex items-center justify-between gap-2 pt-0.5 pb-1">
                <span className="text-[11px] text-slate-500">
                  {staffStats.notRecorded} staff member{staffStats.notRecorded === 1 ? "" : "s"} not marked
                </span>
                <button
                  type="button"
                  onClick={handleMarkAllStaffPresent}
                  disabled={savingStaffIndex !== null}
                  className="inline-flex min-h-[30px] items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check size={13} className="text-emerald-700" />
                  <span>Mark All Present</span>
                </button>
              </div>
            )}

            {/* Empty state */}
            {staffAttendanceList.length === 0 ? (
              <div className="p-4 text-center space-y-1 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-700">No staff crew assigned to this event.</p>
                <p className="text-[11px] text-slate-500">Staff assignments are set up in the reservations workspace.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                {visibleStaff.map((member, idx) => {
                  const status = member.attendance_status || "not_recorded";
                  const isPresent = status === "present";
                  const isLate = status === "late";
                  const isAbsent = status === "absent";
                  const isSavingThis = savingStaffIndex === idx || savingStaffIndex === -1;
                  const isExpanded = expandedStaffIndex === idx;

                  // Initials for avatar
                  const initials = member.name
                    ? member.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "ST";

                  return (
                    <div
                      key={member._id || idx}
                      className={`p-3 transition-colors ${
                        isExpanded ? "bg-slate-50/70" : "bg-white hover:bg-slate-50/30"
                      }`}
                    >
                      {/* Compact Staff Row */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Avatar + Staff Name & Role */}
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPresent
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : isLate
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : isAbsent
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {isSavingThis ? (
                              <Loader2 size={13} className="animate-spin text-slate-600" />
                            ) : (
                              initials
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 block truncate">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {member.role || "Staff"}
                              {member.check_in_time && (isPresent || isLate) && (
                                <span className="ml-1.5 text-slate-600 font-mono">
                                  · {member.check_in_time}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge & Action Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Distinct Status Pill */}
                          {isPresent && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Present
                            </span>
                          )}
                          {isLate && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4c81e0]" />
                              Late
                            </span>
                          )}
                          {isAbsent && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Absent
                            </span>
                          )}
                          {!isPresent && !isLate && !isAbsent && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Not Marked
                            </span>
                          )}

                          {/* Action Button */}
                          {isActionable && (
                            <button
                              type="button"
                              onClick={() => handleToggleStaffDetails(idx)}
                              disabled={isSavingThis}
                              className="px-3 py-1.5 min-h-[34px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {status === "not_recorded" ? "Mark Attendance" : "Change"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Remarks Preview (if saved and row not expanded) */}
                      {member.attendance_notes && !isExpanded && (
                        <p className="text-[11px] text-slate-500 pl-10.5 pt-1 truncate">
                          Notes / Work Area: <span className="text-slate-700">{member.attendance_notes}</span>
                        </p>
                      )}

                      {/* Expanded Mobile/Desktop Drawer Form (Compact & Proportional) */}
                      {isExpanded && isActionable && (
                        <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-900 text-xs">
                              Record Attendance for {member.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelStaffEdit(idx)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Status Selector */}
                          <div className="space-y-1">
                            <label htmlFor={`staff-status-${idx}`} className="text-[11px] font-bold text-slate-600 block">
                              Attendance Status
                            </label>
                            <div className="relative">
                              <select
                                id={`staff-status-${idx}`}
                                value={staffDetailsDraft.attendance_status}
                                onChange={(e) =>
                                  setStaffDetailsDraft((d) => ({ ...d, attendance_status: e.target.value }))
                                }
                                className="w-full h-8 pl-2.5 pr-8 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4c81e0] focus:border-[#4c81e0] cursor-pointer appearance-none"
                              >
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent">Absent</option>
                                <option value="not_recorded">Not Marked</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-2 pointer-events-none text-slate-500" />
                            </div>
                          </div>

                          {/* Arrival Time & Notes (Compact) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label htmlFor={`staff-time-${idx}`} className="text-[11px] font-bold text-slate-600 block">
                                Arrival Time <span className="font-normal text-slate-400">(optional)</span>
                              </label>
                              <div className="relative">
                                <Clock size={13} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
                                <input
                                  id={`staff-time-${idx}`}
                                  type="text"
                                  placeholder="e.g. 2:15 PM"
                                  value={staffDetailsDraft.check_in_time}
                                  onChange={(e) =>
                                    setStaffDetailsDraft((d) => ({ ...d, check_in_time: e.target.value }))
                                  }
                                  className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-xs placeholder:text-slate-400 placeholder:leading-none focus:outline-none focus:ring-1 focus:ring-[#4c81e0] focus:border-[#4c81e0]"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-2 space-y-1">
                              <label htmlFor={`staff-note-${idx}`} className="text-[11px] font-bold text-slate-600 block">
                                Notes / Work Area <span className="font-normal text-slate-400">(optional)</span>
                              </label>
                              <input
                                id={`staff-note-${idx}`}
                                type="text"
                                placeholder="e.g. Food station, hall setup..."
                                value={staffDetailsDraft.attendance_notes}
                                onChange={(e) =>
                                  setStaffDetailsDraft((d) => ({ ...d, attendance_notes: e.target.value }))
                                }
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-xs placeholder:text-slate-400 placeholder:leading-none focus:outline-none focus:ring-1 focus:ring-[#4c81e0] focus:border-[#4c81e0]"
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleCancelStaffEdit(idx)}
                              className="min-h-[32px] px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveStaffDetails(idx)}
                              disabled={isSavingThis}
                              className="min-h-[32px] px-4 py-1 rounded-lg bg-[#4c81e0] text-white text-xs font-bold hover:bg-[#3d6ec7] active:bg-[#325cb0] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {isSavingThis ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* View all staff toggle on mobile */}
                {staffAttendanceList.length > 3 && !showAllStaffMobile && (
                  <button
                    type="button"
                    onClick={() => setShowAllStaffMobile(true)}
                    className="w-full py-2.5 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50/50 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <span>View All Staff ({staffAttendanceList.length - 3} more)</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                )}

                {staffAttendanceList.length > 3 && showAllStaffMobile && (
                  <button
                    type="button"
                    onClick={() => setShowAllStaffMobile(false)}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50/50 hover:bg-slate-100 flex items-center justify-center gap-1 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <span>Show Less</span>
                    <ChevronUp size={13} className="text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. BOOKING ITEMS & SERVICES OVERVIEW */}
      <section aria-label="Booking Items & Services" className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Boxes size={16} className="text-[#4c81e0] shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Booking Items &amp; Services</h2>
          </div>

          <button
            type="button"
            onClick={() => setViewAllBookingItems(!viewAllBookingItems)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <span>{viewAllBookingItems ? "Hide Items" : "View All Items"}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${viewAllBookingItems ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-0.5">
            <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1">
              <Layers size={12} className="text-[#4c81e0]" /> Package
            </span>
            <strong className="font-bold text-slate-900 block truncate">
              {booking.package_id?.name || booking.package_name_snapshot || "Standard Package"}
            </strong>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-0.5">
            <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1">
              <Utensils size={12} className="text-[#4c81e0]" /> Menu
            </span>
            <strong className="font-bold text-slate-900 block truncate">
              {totalDishesCount} items
            </strong>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-0.5">
            <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1">
              <PackageCheck size={12} className="text-[#4c81e0]" /> Setup &amp; Equipment
            </span>
            <strong className="font-bold text-slate-900 block truncate">
              {equipmentList.length} items
            </strong>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-0.5">
            <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1">
              <Sparkles size={12} className="text-[#4c81e0]" /> Add-Ons
            </span>
            <strong className="font-bold text-slate-900 block truncate">
              {addonsCount} items
            </strong>
          </div>
        </div>

        {/* Expanded Detailed Breakdown */}
        {viewAllBookingItems && (
          <div className="pt-2 border-t border-slate-100">
            <BookingScopeInclusionsView
              booking={booking}
              menuCategories={menuCategories}
            />
          </div>
        )}
      </section>

      {/* 4. EQUIPMENT CHECK SECTION */}
      <section aria-label="Equipment Check" className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3.5">
        {/* Header line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <PackageCheck size={16} className="text-[#4c81e0] shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Equipment Check</h2>
          </div>

          {/* Progress count */}
          <div className="text-xs font-semibold text-slate-500">
            {equipmentStats.checkedTotal} of {equipmentStats.total} items checked
          </div>
        </div>

        {/* Progress Bar & Summary Count Pills */}
        {equipmentList.length > 0 && (
          <div className="space-y-2">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              {equipmentStats.verifiedOk > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(equipmentStats.verifiedOk / equipmentStats.total) * 100}%` }}
                />
              )}
              {equipmentStats.issues > 0 && (
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${(equipmentStats.issues / equipmentStats.total) * 100}%` }}
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                {equipmentStats.verifiedOk} OK
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                {equipmentStats.issues} Problem{equipmentStats.issues === 1 ? "" : "s"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                {equipmentStats.pending} Pending
              </span>
            </div>
          </div>
        )}

        {/* Segmented Switch Buttons: Equipment Manifest vs Menu & Inclusions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveSubView("equipment")}
            className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              activeSubView === "equipment"
                ? "bg-[#4c81e0] text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Equipment Manifest
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView("booking")}
            className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
              activeSubView === "booking"
                ? "bg-[#4c81e0] text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Menu &amp; Inclusions
          </button>
        </div>

        {/* Active View: Equipment Manifest */}
        {activeSubView === "equipment" && (
          <div className="space-y-3">
            {/* Simple clear instructions without em dashes */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Check each item. Mark OK if everything is returned and in good condition. Report a problem if anything is missing or damaged.
              </p>

              {isActionable && equipmentStats.pending > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllPendingOk}
                  disabled={savingItemIndex !== null}
                  className="shrink-0 inline-flex min-h-[30px] items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check size={13} className="text-emerald-700" />
                  <span>Mark All OK</span>
                </button>
              )}
            </div>

            {/* Equipment Items List */}
            {equipmentList.length === 0 ? (
              <div className="p-4 text-center space-y-1 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-700">No equipment items for this booking.</p>
                <p className="text-[11px] text-slate-500">Reusable catering items and furniture will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {equipmentList.map((item, idx) => {
                  const status = item.verification_status || "pending";
                  const isPending = status === "pending";
                  const isVerifiedOk = status === "verified_ok";
                  const isIssueRecorded = status === "issue_recorded";
                  const isSavingThis = savingItemIndex === idx || savingItemIndex === -1;
                  const isEditingThis = editingItemIndex === idx;

                  return (
                    <div
                      key={item._id || idx}
                      className={`p-3 rounded-xl border transition-all space-y-2 ${
                        isIssueRecorded
                          ? "bg-rose-50/20 border-rose-200"
                          : isVerifiedOk
                          ? "bg-white border-slate-200/90"
                          : "bg-white border-slate-200/90"
                      }`}
                    >
                      {/* Name, Expected Quantity, and Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                            {item.name}
                          </strong>
                          <span className="text-xs text-slate-500">
                            Expected back: <strong className="text-slate-800 font-semibold">{item.quantity_booked} units</strong>
                          </span>
                        </div>

                        {/* Distinct Status Badge (No em dash) */}
                        <div className="shrink-0">
                          {isVerifiedOk && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                              Checked OK
                            </span>
                          )}
                          {isIssueRecorded && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                              Problem Reported
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                              Not Checked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Problem note highlight or Checked OK note */}
                      {isIssueRecorded && item.notes && !isEditingThis && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/70 text-xs text-rose-900 leading-relaxed">
                          <span className="font-semibold block text-rose-800 text-[10.5px] uppercase tracking-wider mb-0.5">
                            Note:
                          </span>
                          <p className="font-medium">{item.notes}</p>
                        </div>
                      )}

                      {isVerifiedOk && item.notes && !isEditingThis && (
                        <p className="text-xs text-slate-600 italic">
                          Note: {item.notes}
                        </p>
                      )}

                      {/* Action buttons based on status */}
                      {isActionable && !isEditingThis && (
                        <div className="pt-0.5">
                          {/* State 1: Not checked */}
                          {isPending && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkItemOk(idx)}
                                disabled={isSavingThis}
                                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {isSavingThis ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={14} className="text-emerald-600" />
                                )}
                                <span>Mark as OK</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenReportIssue(idx)}
                                disabled={isSavingThis}
                                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-400 text-rose-700 hover:bg-rose-50 active:bg-rose-100 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <AlertTriangle size={14} className="text-rose-600" />
                                <span>Report a Problem</span>
                              </button>
                            </div>
                          )}

                          {/* State 2: Checked: OK */}
                          {isVerifiedOk && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleReviseItem(idx)}
                                disabled={isSavingThis}
                                className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReportIssue(idx)}
                                disabled={isSavingThis}
                                className="min-h-[34px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <Edit3 size={12} />
                                <span>Edit Note</span>
                              </button>
                            </div>
                          )}

                          {/* State 3: Problem reported */}
                          {isIssueRecorded && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenReportIssue(idx)}
                                disabled={isSavingThis}
                                className="min-h-[34px] px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <Edit3 size={12} />
                                <span>Edit Note</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMarkItemOk(idx)}
                                disabled={isSavingThis}
                                className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-[#4c81e0] hover:bg-[#3d6ec7] active:bg-[#325cb0] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {isSavingThis ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                <span>Mark as OK</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline Report Problem / Edit Note Drawer (Compact default height 2-3 lines) */}
                      {isEditingThis && (
                        <div className="p-2.5 sm:p-3 bg-slate-50/90 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <AlertTriangle size={14} className="text-rose-600" />
                              <span>Problem or Note for {item.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelIssueEdit(idx)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Category buttons */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600 block">
                              Issue Type
                            </span>
                            <div className="flex items-center gap-2">
                              {["missing", "damaged", "other"].map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setItemIssueDraft((d) => ({ ...d, category: cat }))}
                                  className={`px-2.5 py-1 rounded-lg border text-xs capitalize font-semibold transition-all cursor-pointer ${
                                    itemIssueDraft.category === cat
                                      ? "bg-rose-50 text-rose-900 border-rose-300 shadow-2xs font-bold"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Note textarea: Compact default height around 2 to 3 lines */}
                          <div className="space-y-1">
                            <label htmlFor={`issue-note-${idx}`} className="text-[11px] font-bold text-slate-600 block">
                              Note / Details <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                              id={`issue-note-${idx}`}
                              rows={2}
                              placeholder="e.g. 2 chairs missing, 1 table scratched..."
                              value={itemIssueDraft.note}
                              onChange={(e) => setItemIssueDraft((d) => ({ ...d, note: e.target.value }))}
                              className="w-full min-h-[52px] max-h-[88px] rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 placeholder:text-xs placeholder:text-slate-400 placeholder:leading-snug focus:outline-none focus:ring-1 focus:ring-[#4c81e0] focus:border-[#4c81e0] leading-snug"
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => handleCancelIssueEdit(idx)}
                              className="min-h-[32px] px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveIssue(idx)}
                              disabled={isSavingThis || !itemIssueDraft.note.trim()}
                              className="min-h-[32px] px-3.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {isSavingThis ? "Saving..." : "Save Note"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active View: Menu & Inclusions */}
        {activeSubView === "booking" && (
          <div className="pt-1">
            <BookingScopeInclusionsView
              booking={booking}
              menuCategories={menuCategories}
            />
          </div>
        )}
      </section>
    </Modal>
  );
}

// Sub-component for clean, mobile-first rendering of Booking Items & Services
function BookingScopeInclusionsView({ booking, menuCategories }) {
  return (
    <div className="space-y-3.5 text-xs">
      {/* Catering Package Details */}
      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
              Catering Package
            </span>
            <strong className="text-sm font-bold text-slate-900 block">
              {booking.package_id?.name || booking.package_name_snapshot || "Custom Catering Selection"}
            </strong>
          </div>
          {booking.service_type && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200">
              {booking.service_type}
            </span>
          )}
        </div>

        {booking.package_id?.description && (
          <p className="text-xs text-slate-600 leading-relaxed">
            {booking.package_id.description}
          </p>
        )}

        {/* Package Inclusions */}
        {Array.isArray(booking.package_inclusions) && booking.package_inclusions.length > 0 && (
          <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 block">
              Package Inclusions ({booking.package_inclusions.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {booking.package_inclusions.map((inc, i) => (
                <div key={i} className="flex items-start gap-1.5 p-1.5 rounded-lg bg-white border border-slate-200/80">
                  <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug text-slate-800">{inc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu Dish Selections */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Utensils size={14} className="text-[#4c81e0]" />
            <span>Menu Dishes</span>
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {booking.menu_items?.length || 0} Total
          </span>
        </div>

        {/* Dietary note if present */}
        {(booking.dietary_restrictions || booking.allergies || booking.special_requests) && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5 text-xs text-slate-800">
            {booking.allergies && <p>Allergies: <strong>{booking.allergies}</strong></p>}
            {booking.dietary_restrictions && <p>Dietary: <strong>{booking.dietary_restrictions}</strong></p>}
            {booking.special_requests && <p>Special Requests: <em>{booking.special_requests}</em></p>}
          </div>
        )}

        {Object.keys(menuCategories).length === 0 ? (
          <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
            No dishes listed.
          </p>
        ) : (
          <div className="space-y-2.5">
            {Object.entries(menuCategories).map(([category, dishes]) => (
              <div key={category} className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">
                  {category} ({dishes.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {dishes.map((dish, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {dish.name || dish.dish_id?.name || "Dish Item"}
                        </span>
                        {dish.note && (
                          <span className="text-[10.5px] text-slate-500 block truncate">
                            {dish.note}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200 shrink-0 text-slate-700">
                        {dish.quantity ? `${dish.quantity} ${dish.unit || 'portions'}` : "Included"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup & Logistics */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Layers size={14} className="text-[#4c81e0]" />
          <span>Setup Specifications</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 block">Theme &amp; Style</span>
            <p className="text-slate-900 font-semibold">{booking.event_theme || "Standard Classic"}</p>
            {Array.isArray(booking.event_palette) && booking.event_palette.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {booking.event_palette.map((color, i) => (
                  <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10.5px]">
                    <span className="h-2 w-2 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-mono text-slate-700">{color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 block">Delivery &amp; Logistics</span>
            <p className="text-slate-900 font-semibold capitalize">{booking.delivery_method || "Setup on Site"}</p>
            <p className="text-slate-600">{booking.venue_type || "Venue TBA"}</p>
          </div>
        </div>

        {booking.custom_setup_notes && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong className="block text-slate-900 mb-0.5">Custom Setup Notes:</strong>
            <p className="whitespace-pre-wrap">{booking.custom_setup_notes}</p>
          </div>
        )}
      </div>

      {/* Add-on Services */}
      {(booking.service_items?.length > 0 || booking.additional_charges?.length > 0) && (
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#4c81e0]" />
            <span>Add-Ons</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(booking.service_items || []).map((srv, idx) => (
              <div key={`srv-${idx}`} className="p-2 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="font-bold text-slate-900 block">{srv.name}</span>
                  {srv.note && <span className="text-[10.5px] text-slate-500 block">{srv.note}</span>}
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700">
                  Qty: {srv.quantity || 1}
                </span>
              </div>
            ))}

            {(booking.additional_charges || []).map((chg, idx) => (
              <div key={`chg-${idx}`} className="p-2 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-2 shadow-2xs">
                <span className="font-bold text-slate-900">{chg.name || chg.label || "Additional Charge"}</span>
                {chg.amount && (
                  <span className="text-[11px] font-semibold text-slate-700">{formatCurrency(chg.amount)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
