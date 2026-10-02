import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import PageHeader from "../../components/admin/ui/PageHeader";
import SegmentedTabs from "../../components/admin/ui/SegmentedTabs";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";
import { 
  Eye, 
  UserPlus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Package, 
  FileText,
  Plus,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  Utensils,
  Layers,
  ClipboardList,
  PackageCheck,
  DollarSign,
  ChefHat,
  UtensilsCrossed,
  Wrench,
  HelpCircle,
  Building2,
  CalendarDays,
  CreditCard,
  Receipt,
  ShieldCheck,
  Printer
} from "lucide-react";
import { formatEventDate, initialsOf } from "../../utils/format";
import { recordTitle } from "../../components/customer/portal/statusMeta";

const formatMoney = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const isPastDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

/**
 * Native `<select>` is deliberate for crew pickers. On a phone it opens the
 * platform native wheel or list (searchable, one-handed, and already familiar)
 * where a custom listbox would reimplement all of that worse inside a sheet
 * that is itself already scrolling.
 */
const CREW_SELECT =
  "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-all " +
  "hover:border-slate-300 focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0] shadow-2xs";

/** One crew slot: a picker and, when the slot is removable, its remove button. */
function CrewRow({ value, placeholder, options, onChange, onRemove, removeLabel, staffInfo }) {
  const isConflict = Boolean(
    staffInfo &&
    staffInfo.availability_status &&
    staffInfo.availability_status !== "Available"
  );
  const isAssigned = Boolean(value);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
          className={`${CREW_SELECT} flex-1 min-w-0 ${
            isConflict
              ? "border-amber-400 ring-1 ring-amber-400/30"
              : isAssigned
              ? "border-[#4C81E0]/40 bg-slate-50/50"
              : "border-slate-200"
          }`}
        >
          <option value="">{placeholder}</option>
          {options}
        </select>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            title={removeLabel}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {isConflict && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
          <AlertTriangle size={12} className="shrink-0 text-amber-600" />
          <span>Notice: {staffInfo.full_name} is marked as <strong>{staffInfo.availability_status}</strong> on this date.</span>
        </div>
      )}
    </div>
  );
}

/**
 * A role's group of slots with icon, hint, clean dashed add buttons, and card framing.
 */
function CrewGroup({ label, icon: Icon, hint, addLabel, onAdd, secondaryAddLabel, onSecondaryAdd, count, children }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
              <Icon size={13} />
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">{label}</span>
            {hint && <span className="text-[11px] font-normal text-[#64748B] ml-1.5 hidden sm:inline">{hint}</span>}
          </div>
        </div>
        {count !== undefined && (
          <span className={`text-[11px] font-semibold tabular-nums ${count > 0 ? "text-emerald-700" : "text-[#64748B]"}`}>
            {count > 0 ? `${count} assigned` : "0 assigned"}
          </span>
        )}
      </div>
      {hint && <div className="text-[11px] text-[#64748B] sm:hidden">{hint}</div>}
      <div className="space-y-2 pt-1">{children}</div>
      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#4C81E0]/40 bg-white text-xs font-semibold text-[#4C81E0] transition-all hover:border-[#4C81E0] hover:bg-[#D6E4F7]/20 cursor-pointer shadow-2xs"
        >
          <Plus size={13} /> {addLabel}
        </button>
        {onSecondaryAdd && (
          <button
            type="button"
            onClick={onSecondaryAdd}
            className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-white text-xs font-semibold text-[#64748B] transition-all hover:border-[#4C81E0] hover:text-[#1E293B] hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Plus size={13} /> {secondaryAddLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ManagerBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();

  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [collectCashOnComplete, setCollectCashOnComplete] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [assignment, setAssignment] = useState({
    headCook: "",
    servers: [""],
    setupCrew: ["", ""],
    assistants: [""],
    extraAssistants: []
  });
  const [note, setNote] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Manager Equipment Verification States
  const [managerConfirmed, setManagerConfirmed] = useState(false);
  const [managerEquipmentNotes, setManagerEquipmentNotes] = useState("");
  const [submittingVerifyEquipment, setSubmittingVerifyEquipment] = useState(false);
  const [staffNoteModal, setStaffNoteModal] = useState(null);

  const loadBookings = () => {
    setLoading(true);
    ManagerAPI.getBookings(tab)
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load assigned bookings.", "error"))
      .finally(() => setLoading(false));
  };

  const loadStaff = (eventDate = null) => {
    const params = eventDate ? { event_date: eventDate } : {};
    ManagerAPI.getStaff(params)
      .then((res) => setStaff(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStaff([]));
  };

  useEffect(() => {
    loadBookings();
  }, [tab]);

  useEffect(() => {
    loadStaff();
  }, []);

  // Handle URL redirect query params / notification states
  useEffect(() => {
    const bookingId = searchParams.get("booking_id") || location.state?.booking_id || location.state?.openBookingId;
    const action = searchParams.get("action") || location.state?.action;
    const statusParam = searchParams.get("status");
    if (statusParam && ["pending", "upcoming", "completed"].includes(statusParam.toLowerCase())) {
      setTab(statusParam.toLowerCase());
    }

    if (bookingId) {
      ManagerAPI.getBooking(bookingId)
        .then((res) => {
          const b = res.data;
          if (b) {
            if (action === "assign") {
              setDetail(null);
              openAssign(b);
            } else {
              setAssignTarget(null);
              setDetail(b);
              setManagerConfirmed(Boolean(b.equipment_manager_verified?.confirmed));
              setManagerEquipmentNotes(b.equipment_manager_verified?.additional_notes || "");
            }
          }
        })
        .catch(() => {});
    }
  }, [location.search, location.state]);

  const staffMap = useMemo(() => {
    const map = {};
    staff.forEach((person) => {
      map[person._id] = person;
    });
    return map;
  }, [staff]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const custName = b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`;
      const searchMatch = !search ||
        custName.toLowerCase().includes(search.toLowerCase()) ||
        (b.event_type || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.reference || "").toLowerCase().includes(search.toLowerCase()) ||
        (b.venue_type || "").toLowerCase().includes(search.toLowerCase());
      return searchMatch;
    });
  }, [bookings, search]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // One <option> list, built once and reused by every crew picker instead of
  // being re-mapped inside each of the four render loops.
  const staffOptions = useMemo(
    () =>
      staff.map((person) => (
        <option key={person._id} value={person._id}>
          {person.full_name}
          {person.availability_status && person.availability_status !== 'Available'
            ? ' (' + person.availability_status + ')'
            : ''}
        </option>
      )),
    [staff]
  );

  // Shown in the assign sheet footer. On a phone the selected slots scroll
  // out of view long before the Save button, so the count is the only way to
  // confirm the team is complete without scrolling back up through it.
  const selectedCrewCount = useMemo(() => {
    const picked = [
      assignment.headCook,
      ...assignment.servers,
      ...assignment.setupCrew,
      ...assignment.assistants,
    ].filter(Boolean).length;
    const external = assignment.extraAssistants.filter((e) => e.name || e.phone).length;
    return picked + external;
  }, [assignment]);

  const openDetails = (booking) => {
    const bId = booking?._id || booking;
    setAssignTarget(null);
    ManagerAPI.getBooking(bId).then((res) => {
      const b = res.data;
      setDetail(b);
      setManagerConfirmed(Boolean(b?.equipment_manager_verified?.confirmed));
      setManagerEquipmentNotes(b?.equipment_manager_verified?.additional_notes || "");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("booking_id", bId);
        next.set("action", "view");
        return next;
      }, { replace: true });
    });
  };

  const closeDetails = () => {
    setDetail(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("booking_id");
      next.delete("action");
      return next;
    }, { replace: true });
  };

  const handleSaveEquipmentVerification = () => {
    if (!detail) return;
    setSubmittingVerifyEquipment(true);
    ManagerAPI.verifyEquipment(detail._id, {
      confirmed: managerConfirmed,
      additional_notes: managerEquipmentNotes
    })
      .then((res) => {
        notify(res.data?.message || "Equipment verification saved successfully.", "success");
        setDetail((prev) => ({
          ...prev,
          equipment_manager_verified: res.data?.equipment_manager_verified
        }));
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not save equipment verification.", "error");
      })
      .finally(() => setSubmittingVerifyEquipment(false));
  };

  const mergedEquipmentList = useMemo(() => {
    if (!detail) return [];
    const returns = Array.isArray(detail.equipment_returns) ? detail.equipment_returns : [];
    const inventory = Array.isArray(detail.inventory_items) ? detail.inventory_items : [];

    if (returns.length > 0) {
      return returns.map((ret) => {
        const invItem = inventory.find(
          (inv) => String(inv.inventory_id?._id || inv.inventory_id) === String(ret.inventory_id?._id || ret.inventory_id)
        );
        const booked = Number(ret.quantity_booked ?? invItem?.quantity ?? 1);
        const returned = Number(ret.quantity_returned ?? 0);
        const damaged = Number(ret.quantity_damaged ?? 0);
        const hasVerified = Boolean(ret.verified_at);
        const missing = hasVerified ? Math.max(0, booked - (returned + damaged)) : 0;

        return {
          _id: ret._id,
          inventory_id: ret.inventory_id,
          name: ret.name || ret.inventory_id?.item_name || ret.inventory_id?.name || invItem?.name || "Equipment Item",
          category: ret.inventory_id?.category || invItem?.inventory_id?.category || invItem?.category || "",
          booked,
          returned,
          damaged,
          missing,
          hasVerified,
          notes: ret.notes || "",
          verifiedBy: ret.verified_by?.full_name || "Staff",
          verifiedAt: ret.verified_at
        };
      });
    }

    return inventory.map((inv) => ({
      _id: inv._id,
      inventory_id: inv.inventory_id,
      name: inv.name || inv.inventory_id?.item_name || inv.inventory_id?.name || "Equipment Item",
      category: inv.inventory_id?.category || inv.category || "",
      booked: Number(inv.quantity ?? 1),
      returned: 0,
      damaged: 0,
      missing: 0,
      hasVerified: false,
      notes: "",
      verifiedBy: "",
      verifiedAt: null
    }));
  }, [detail]);

  const openAssign = (booking) => {
    setDetail(null);
    setAssignTarget(booking);
    loadStaff(booking.event_date);
    
    // If booking already has assignments, preload them
    const existing = booking.staff_assignments || [];
    const headCook = existing.find((a) => a.role === "Head Cook")?.user_id?._id || existing.find((a) => a.role === "Head Cook")?.user_id || "";
    const servers = existing.filter((a) => a.role === "Server").map((a) => a.user_id?._id || a.user_id || "");
    const setupCrew = existing.filter((a) => a.role === "Setup Crew").map((a) => a.user_id?._id || a.user_id || "");
    const assistants = existing.filter((a) => a.role === "Assistant" && (a.user_id?._id || a.user_id)).map((a) => a.user_id?._id || a.user_id);
    const extraAssistants = existing.filter((a) => a.role === "Assistant" && !a.user_id && a.name).map((a) => ({ name: a.name, phone: a.phone || "" }));

    setAssignment({
      headCook: headCook || "",
      servers: servers.length > 0 ? servers : [""],
      setupCrew: setupCrew.length > 0 ? setupCrew : ["", ""],
      assistants: assistants.length > 0 ? assistants : [""],
      extraAssistants: extraAssistants
    });

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("booking_id", booking._id);
      next.set("action", "assign");
      return next;
    }, { replace: true });
  };

  const closeAssign = () => {
    setAssignTarget(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("booking_id");
      next.delete("action");
      return next;
    }, { replace: true });
  };

  const addAssignmentSlot = (key) => {
    setAssignment((prev) => ({
      ...prev,
      [key]: [...prev[key], ""]
    }));
  };

  const removeAssignmentSlot = (key, index) => {
    setAssignment((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, idx) => idx !== index)
    }));
  };

  const updateAssignment = (key, index, value) => {
    setAssignment((prev) => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const addExtraAssistant = () => {
    setAssignment((prev) => ({
      ...prev,
      extraAssistants: [...prev.extraAssistants, { name: "", phone: "" }]
    }));
  };

  const updateExtraAssistant = (index, field, value) => {
    setAssignment((prev) => {
      const next = prev.extraAssistants.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return { ...prev, extraAssistants: next };
    });
  };

  const removeExtraAssistant = (index) => {
    setAssignment((prev) => ({
      ...prev,
      extraAssistants: prev.extraAssistants.filter((_, idx) => idx !== index)
    }));
  };

  const submitAssignment = () => {
    if (!assignTarget) return;

    const staffAssignments = [];

    if (assignment.headCook) {
      staffAssignments.push({
        role: "Head Cook",
        user_id: assignment.headCook,
        name: staffMap[assignment.headCook]?.full_name,
        phone: staffMap[assignment.headCook]?.phone
      });
    }

    assignment.servers.filter(Boolean).forEach((id) => {
      staffAssignments.push({
        role: "Server",
        user_id: id,
        name: staffMap[id]?.full_name,
        phone: staffMap[id]?.phone
      });
    });

    assignment.setupCrew.filter(Boolean).forEach((id) => {
      staffAssignments.push({
        role: "Setup Crew",
        user_id: id,
        name: staffMap[id]?.full_name,
        phone: staffMap[id]?.phone
      });
    });

    assignment.assistants.filter(Boolean).forEach((id) => {
      staffAssignments.push({
        role: "Assistant",
        user_id: id,
        name: staffMap[id]?.full_name,
        phone: staffMap[id]?.phone
      });
    });

    assignment.extraAssistants
      .filter((extra) => extra.name || extra.phone)
      .forEach((extra) => {
        staffAssignments.push({
          role: "Assistant",
          name: extra.name,
          phone: extra.phone
        });
      });

    const chosenIds = [
      assignment.headCook,
      ...assignment.servers,
      ...assignment.setupCrew,
      ...assignment.assistants
    ].filter(Boolean);

    const duplicateId = chosenIds.find((id, idx) => chosenIds.indexOf(id) !== idx);
    if (duplicateId) {
      const dupName = staffMap[duplicateId]?.full_name || "A crew member";
      notify(`${dupName} cannot be assigned to multiple roles on the same event.`, "error");
      return;
    }

    if (staffAssignments.length === 0) {
      notify("Please assign at least one staff member.", "error");
      return;
    }

    setSubmittingAssign(true);
    ManagerAPI.assignStaff(assignTarget._id, { staff_assignments: staffAssignments })
      .then(() => {
        notify("Staff assignment saved successfully.", "success");
        setAssignTarget(null);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("booking_id");
          next.delete("action");
          return next;
        }, { replace: true });
        loadBookings();
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not assign staff. Please try again.", "error");
      })
      .finally(() => setSubmittingAssign(false));
  };

  const openCompleteModal = (target) => {
    setCompleteTarget(target);
    const rem = Number(target.remaining_balance ?? 0);
    const isCashPref = target.balance_payment_preference === "in_person";
    setCollectCashOnComplete(rem > 0 && isCashPref);
  };

  const handleMarkCompleted = (bookingId, collectedCash = false) => {
    setSubmittingComplete(true);
    ManagerAPI.markCompleted(bookingId, { collected_cash_balance: collectedCash })
      .then(() => {
        notify(
          collectedCash
            ? "Event marked completed and cash balance payment confirmed!"
            : "Event marked as completed successfully!",
          "success"
        );
        setCompleteTarget(null);
        setDetail(null);
        loadBookings();
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not mark event as completed.", "error");
      })
      .finally(() => setSubmittingComplete(false));
  };

  const submitNote = () => {
    if (!detail || !note.trim()) return;
    ManagerAPI.addNote(detail._id, { note: note.trim() })
      .then((res) => {
        setDetail((prev) => ({ ...prev, event_manager_notes: res.data }));
        setNote("");
        notify("Note logged.", "success");
      })
      .catch((err) => notify(err.response?.data?.message || "Could not add note.", "error"));
  };

  const columns = [
    {
      key: "event",
      header: "Event & Client",
      render: (b) => {
        const custName = b.customer_id?.full_name || `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || "Customer";
        const isPast = isPastDate(b.event_date);
        const isCompleted = ["completed", "Completed"].includes(b.status);
        return (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                {recordTitle(b)}
              </span>
              {isPast && !isCompleted && (
                <span
                  title="Event date has passed"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium tracking-tight bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0"
                >
                  <Clock size={10} className="text-rose-600" />
                  <span>Event Passed</span>
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{custName} • REF: <span className="font-mono">{b.reference || b._id?.slice(-6).toUpperCase()}</span></div>
          </div>
        );
      }
    },
    {
      key: "date",
      header: "Date & Time",
      render: (b) => {
        const isPast = isPastDate(b.event_date);
        return (
          <div className="text-xs">
            <div className={`font-semibold ${isPast ? "text-muted-foreground" : "text-foreground"}`}>
              {b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
            </div>
            <div className="text-muted-foreground">{b.start_time || "Time TBA"}</div>
          </div>
        );
      }
    },
    {
      key: "venue",
      header: "Venue / Location",
      render: (b) => (
        <div className="text-xs max-w-44 truncate">
          <div className="font-medium text-foreground truncate">{b.venue_type || "Venue"}</div>
          <div className="text-muted-foreground truncate">{[b.street, b.barangay, b.municipality].filter(Boolean).join(", ") || "Location TBA"}</div>
        </div>
      )
    },
    {
      key: "staff",
      header: "Team Assigned",
      render: (b) => {
        const count = (b.staff_assignments || []).length;
        const isPast = isPastDate(b.event_date);
        return (
          <div>
            {count === 0 ? (
              isPast ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/90 px-2 py-0.5 rounded-md">
                  <Clock size={11} className="text-rose-600" /> Unassigned (Passed)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md">
                  <AlertCircle size={11} className="text-amber-600" /> Needs Staffing
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md">
                <CheckCircle2 size={11} className="text-emerald-600" /> {count} Staff Dispatched
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "status",
      header: "Booking Status",
      render: (b) => <Badge status={b.status} className="!rounded-md" />
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      width: "275px",
      className: "w-[275px] min-w-[275px]",
      headerClassName: "w-[275px] min-w-[275px]",
      render: (b) => {
        const hasStaff = Array.isArray(b.staff_assignments) && b.staff_assignments.length > 0;
        const isCompleted = ["completed", "Completed"].includes(b.status);
        const isPast = isPastDate(b.event_date);

        return (
          <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
            <Btn variant="secondary" size="xs" onClick={() => openDetails(b)} title="View full event details" className="shrink-0">
              <Eye size={13} /> View
            </Btn>
            {!isCompleted && isPast && (
              <Btn
                variant="primary"
                size="xs"
                onClick={() => openCompleteModal(b)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                title="Mark this event as concluded and completed"
              >
                <CheckCircle2 size={13} /> Complete
              </Btn>
            )}
            {hasStaff ? (
              <Btn 
                variant="secondary" 
                size="xs" 
                onClick={() => openAssign(b)}
                className="text-foreground hover:bg-muted font-semibold border-border flex items-center gap-1 cursor-pointer shrink-0"
                title={isPast ? "Edit retroactive staff assignments" : "Edit staff assignment"}
              >
                <UserCheck size={13} className="text-[#4C81E0]" /> Edit Staff
              </Btn>
            ) : isPast ? (
              <Btn 
                variant="secondary" 
                size="xs" 
                onClick={() => openAssign(b)}
                className="text-foreground hover:bg-muted font-medium border-border flex items-center gap-1 cursor-pointer shrink-0"
                title="Log past staff assignments retroactively"
              >
                <UserPlus size={13} /> Log Staff
              </Btn>
            ) : (
              <Btn 
                variant="primary" 
                size="xs" 
                onClick={() => openAssign(b)}
                className="bg-[#4C81E0] hover:bg-[#3b6bc4] text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                title="Assign Staff"
              >
                <UserPlus size={13} /> Assign
              </Btn>
            )}
          </div>
        );
      }
    }
  ];

  const detailTotalCost = Number(detail?.total_price || detail?.total_cost || 0);
  const detailPayments = Array.isArray(detail?.payments) ? detail.payments : [];
  const detailApprovedPayments = detailPayments.filter((p) =>
    ["approved", "paid", "completed"].includes(String(p.status || "").toLowerCase().trim())
  );
  const detailTotalPaid = Number(
    detail?.total_paid !== undefined
      ? detail.total_paid
      : detailApprovedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );
  const detailRemainingBalance = Number(
    detail?.remaining_balance !== undefined
      ? detail.remaining_balance
      : Math.max(0, detailTotalCost - detailTotalPaid)
  );
  const detailPaymentStatus = detail?.payment_status || (
    detailRemainingBalance === 0 && detailTotalCost > 0
      ? "fully_paid"
      : detailTotalPaid > 0
      ? "deposit_paid"
      : "pending"
  );

  return (
    <ManagerLayout>
      <div className="space-y-4">
        <PageHeader
          title="Bookings"
          description="Review event details, build staff teams, and monitor execution"
        />

        {/* Natural search and tab filter flow without awkward sticky detachment */}
        <div className="space-y-3">
          <SegmentedTabs
            ariaLabel="Booking status"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "pending", label: "Pending Staffing", shortLabel: "Pending", icon: Clock },
              { id: "upcoming", label: "Upcoming Events", shortLabel: "Upcoming", icon: Calendar },
              { id: "completed", label: "Completed", shortLabel: "Done", icon: CheckCircle2 },
            ]}
          />

          <AdminCard className="!p-2.5 sm:!p-3.5">
            <TableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search client, event type, or reference"
            />
          </AdminCard>
        </div>

        {/* Phone and small-tablet list. A booking is one card, and the card
            itself opens the event. The staffing state is the clearest thing on the card,
            and the single action is the one that state calls for. */}
        <div className="block lg:hidden space-y-2.5">
          {loading ? (
            <AdminCard className="!p-8 text-center text-xs text-muted-foreground">
              Loading assigned bookings…
            </AdminCard>
          ) : pageRows.length === 0 ? (
            <AdminCard className="!p-8 text-center space-y-1.5">
              <p className="text-sm font-semibold text-foreground">No {tab} bookings</p>
              <p className="text-xs text-muted-foreground">
                {search
                  ? "No booking matches that search. Try a client name or a reference."
                  : "Events assigned to you by Admin will appear here."}
              </p>
            </AdminCard>
          ) : (
            <ul className="space-y-2.5 sm:grid sm:grid-cols-2 sm:gap-2.5 sm:space-y-0">
              {pageRows.map((b) => {
                const hasStaff = Array.isArray(b.staff_assignments) && b.staff_assignments.length > 0;
                const isCompleted = ["completed", "Completed"].includes(b.status);
                const isPast = isPastDate(b.event_date);
                const clientName = b.customer_id?.full_name || "Valued Client";
                const eventDate = b.event_date
                  ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "TBA";
                const locationStr =
                  [b.street, b.barangay, b.municipality].filter(Boolean).join(", ") || [b.barangay, b.municipality].filter(Boolean).join(", ") || "Venue TBA";

                const crew = hasStaff
                  ? {
                      className: "border-emerald-200/90 bg-emerald-50 text-emerald-800",
                      icon: CheckCircle2,
                      text: b.staff_assignments.length + " crew assigned",
                    }
                  : isPast
                    ? {
                        className: "border-rose-200/90 bg-rose-50 text-rose-800",
                        icon: AlertTriangle,
                        text: "Unassigned (Event passed)",
                      }
                    : {
                        className: "border-amber-200/90 bg-amber-50 text-amber-800",
                        icon: AlertCircle,
                        text: "Needs staffing",
                      };
                const CrewIcon = crew.icon;

                return (
                  <li key={b._id}>
                    <AdminCard className="!p-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => openDetails(b)}
                        className="w-full space-y-2 p-3 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-foreground">
                                {b.event_type || "Catering Event"}
                              </span>
                              {isPast && !isCompleted && (
                                <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-700">
                                  <AlertTriangle size={9} /> Passed
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {clientName} · {b.guest_count || 0} guests
                            </span>
                          </span>
                          <Badge status={b.status || "confirmed"} />
                        </span>

                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Calendar size={13} className="shrink-0 text-[#4C81E0]" />
                          <span className="font-semibold text-foreground">{eventDate}</span>
                          <span>· {b.start_time || "Time TBA"}</span>
                        </span>

                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <MapPin size={13} className="shrink-0 text-slate-400" />
                          <span className="truncate">{locationStr}</span>
                        </span>

                        <span className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold " + crew.className}>
                            <CrewIcon size={12} />
                            {crew.text}
                          </span>
                          <span className="font-mono text-[10.5px] text-muted-foreground/80">
                            REF {b.reference || b._id?.slice(-6).toUpperCase()}
                          </span>
                        </span>
                      </button>

                      <div className="border-t border-border/60 p-2">
                        {!isCompleted && isPast ? (
                          <button
                            type="button"
                            onClick={() => openCompleteModal(b)}
                            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700 cursor-pointer portal-press"
                          >
                            <CheckCircle2 size={15} />
                            Mark Completed
                          </button>
                        ) : hasStaff ? (
                          <button
                            type="button"
                            onClick={() => openAssign(b)}
                            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted cursor-pointer portal-press"
                          >
                            <UserCheck size={15} className="text-[#4C81E0]" />
                            Edit Staff
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openAssign(b)}
                            className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#4C81E0] px-3 text-[13px] font-bold text-white shadow-2xs transition-colors hover:bg-[#3b6bc4] cursor-pointer portal-press"
                          >
                            <UserPlus size={15} />
                            Assign Staff
                          </button>
                        )}
                      </div>
                    </AdminCard>
                  </li>
                );
              })}
            </ul>
          )}
          <AdminCard className="!p-0 overflow-hidden">
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
          </AdminCard>
        </div>

        {/* Desktop Data Table (hidden lg:block) */}
        <AdminCard className="hidden lg:block !p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(b) => b._id}
            loading={loading}
            emptyTitle={`No ${tab} bookings found.`}
            emptyHint="Assigned events from Admin will appear here."
            onRowClick={(b) => openDetails(b)}
            minWidth="980px"
            /* Between 1024px and the table's own min-width the row scrolls,
               and the actions column is pinned for easy access. */
            pinLastColumn
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Staff Assignment Modal */}
        {assignTarget && (
          <Modal
            title={`Assign Staff: ${assignTarget.event_type || "Catering Event"}`}
            icon={UserPlus}
            badge={
              <span className="font-mono text-xs font-semibold text-[#4C81E0] bg-[#D6E4F7]/60 border border-[#4C81E0]/20 px-2.5 py-0.5 rounded-md">
                {assignTarget.reference || assignTarget._id?.slice(-6).toUpperCase()}
              </span>
            }
            description="Select and assign kitchen, service, setup, and support crew."
            onClose={closeAssign}
            className="sm:max-w-2xl"
            footer={
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#64748B] tabular-nums">
                  {selectedCrewCount === 0
                    ? "No staff selected yet"
                    : `${selectedCrewCount} crew ${selectedCrewCount === 1 ? "member" : "members"} selected`}
                </span>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={closeAssign} disabled={submittingAssign}>
                    Cancel
                  </Btn>
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={submitAssignment}
                    disabled={submittingAssign}
                    className="flex items-center gap-1.5 font-bold bg-[#4C81E0] hover:bg-[#3b6bc4] text-white"
                  >
                    <UserCheck size={14} />
                    <span>
                      {submittingAssign
                        ? "Saving..."
                        : "Save Staff Assignment"}
                    </span>
                  </Btn>
                </div>
              </div>
            }
          >
            <div className="space-y-3.5 text-xs sm:text-sm">
              {/* Event Context Pill */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] border border-[#4C81E0]/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {initialsOf(assignTarget.customer_id?.full_name || `${assignTarget.contact_first_name || ""} ${assignTarget.contact_last_name || ""}` || "Customer")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#1E293B] truncate">
                      {assignTarget.customer_id?.full_name || `${assignTarget.contact_first_name || ""} ${assignTarget.contact_last_name || ""}`.trim() || "Customer"}
                    </div>
                    <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-[#4C81E0]" />
                        {assignTarget.event_date ? new Date(assignTarget.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-[#4C81E0]" />
                        {assignTarget.start_time || "Time TBA"}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[10.5px] font-semibold text-[#64748B] bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                  {assignTarget.event_type || "Event"}
                </span>
              </div>

              {/* Past Event Warning */}
              {isPastDate(assignTarget.event_date) && (
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-2xs">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold text-amber-900">Past Event:</span>
                    <span className="text-amber-800 text-[11.5px]">
                      Staff assignments are being recorded for this completed event.
                    </span>
                  </div>
                </div>
              )}

              {/* Head Cook */}
              <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                      <ChefHat size={13} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Head Cook</span>
                      <span className="text-[11px] font-normal text-[#64748B] ml-1.5 hidden sm:inline">Kitchen &amp; culinary lead</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold tabular-nums ${assignment.headCook ? "text-emerald-700" : "text-[#64748B]"}`}>
                    {assignment.headCook ? "1 assigned" : "Not assigned"}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] sm:hidden -mt-1">Kitchen &amp; culinary lead</div>
                <div className="pt-1">
                  <select
                    id="assign-head-cook"
                    value={assignment.headCook}
                    onChange={(e) => setAssignment({ ...assignment, headCook: e.target.value })}
                    className={`${CREW_SELECT} ${
                      staffMap[assignment.headCook]?.availability_status && staffMap[assignment.headCook]?.availability_status !== "Available"
                        ? "border-amber-400 ring-1 ring-amber-400/30"
                        : assignment.headCook
                        ? "border-[#4C81E0]/40 bg-slate-50/50"
                        : "border-slate-200"
                    }`}
                  >
                    <option value="">Select head cook...</option>
                    {staffOptions}
                  </select>
                  {staffMap[assignment.headCook]?.availability_status && staffMap[assignment.headCook]?.availability_status !== "Available" && (
                    <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                      <span>Notice: {staffMap[assignment.headCook]?.full_name} is marked as <strong>{staffMap[assignment.headCook]?.availability_status}</strong> on this date.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Staff */}
              <CrewGroup
                label="Service Staff"
                icon={UtensilsCrossed}
                hint="Floor &amp; banquet dining service"
                addLabel="Add Service Staff"
                count={assignment.servers.filter(Boolean).length}
                onAdd={() => addAssignmentSlot("servers")}
              >
                {assignment.servers.map((val, idx) => (
                  <CrewRow
                    key={idx}
                    value={val}
                    placeholder={`Select service staff #${idx + 1}...`}
                    options={staffOptions}
                    staffInfo={staffMap[val]}
                    onChange={(next) => updateAssignment("servers", idx, next)}
                    onRemove={assignment.servers.length > 1 ? () => removeAssignmentSlot("servers", idx) : null}
                    removeLabel={`Remove service staff ${idx + 1}`}
                  />
                ))}
              </CrewGroup>

              {/* Setup Staff */}
              <CrewGroup
                label="Setup Staff"
                icon={Wrench}
                hint="Physical staging &amp; gear logistics"
                addLabel="Add Setup Staff"
                count={assignment.setupCrew.filter(Boolean).length}
                onAdd={() => addAssignmentSlot("setupCrew")}
              >
                {assignment.setupCrew.map((val, idx) => (
                  <CrewRow
                    key={idx}
                    value={val}
                    placeholder={`Select setup staff #${idx + 1}...`}
                    options={staffOptions}
                    staffInfo={staffMap[val]}
                    onChange={(next) => updateAssignment("setupCrew", idx, next)}
                    onRemove={assignment.setupCrew.length > 1 ? () => removeAssignmentSlot("setupCrew", idx) : null}
                    removeLabel={`Remove setup staff ${idx + 1}`}
                  />
                ))}
              </CrewGroup>

              {/* Support Staff */}
              <CrewGroup
                label="Support Staff"
                icon={Users}
                hint="Dishwashing, runners &amp; on-call crew"
                addLabel="Add Support Staff"
                secondaryAddLabel="Add External Staff"
                count={assignment.assistants.filter(Boolean).length + assignment.extraAssistants.filter((e) => e.name || e.phone).length}
                onAdd={() => addAssignmentSlot("assistants")}
                onSecondaryAdd={addExtraAssistant}
              >
                {assignment.assistants.map((val, idx) => (
                  <CrewRow
                    key={idx}
                    value={val}
                    placeholder={`Select support staff #${idx + 1}...`}
                    options={staffOptions}
                    staffInfo={staffMap[val]}
                    onChange={(next) => updateAssignment("assistants", idx, next)}
                    onRemove={() => removeAssignmentSlot("assistants", idx)}
                    removeLabel={`Remove support staff ${idx + 1}`}
                  />
                ))}

                {assignment.extraAssistants.map((extra, idx) => (
                  <div
                    key={`extra-${idx}`}
                    className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-white p-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B]">
                      <span>External Assistant #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExtraAssistant(idx)}
                        aria-label={`Remove external assistant ${idx + 1}`}
                        className="text-[#64748B] hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        placeholder="Full name"
                        value={extra.name}
                        onChange={(e) => updateExtraAssistant(idx, "name", e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        placeholder="Contact phone number"
                        value={extra.phone}
                        onChange={(e) => updateExtraAssistant(idx, "phone", e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]"
                      />
                    </div>
                  </div>
                ))}
              </CrewGroup>
            </div>
          </Modal>
        )}

        {/* Event Detail Modal */}
        {detail && (
          <Modal 
            title={`Event Details: ${detail.event_type || "Catering Event"}`} 
            icon={ClipboardList}
            badge={<Badge status={detail.status || "confirmed"} />}
            description="Operational overview, schedule, menu specifications, and staff deployment."
            onClose={closeDetails} 
            className="sm:max-w-3xl lg:max-w-4xl"
            footer={
              <div className="flex items-center justify-between gap-2">
                {!['completed', 'Completed'].includes(detail.status) ? (
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const target = detail;
                      closeDetails();
                      openCompleteModal(target);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Mark as Completed
                  </Btn>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Event Completed
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5 cursor-pointer">
                    <Printer size={13} /> Print BEO Run Sheet
                  </Btn>
                  <Btn variant="secondary" size="sm" onClick={closeDetails}>Close</Btn>
                </div>
              </div>
            }
          >
            <div className="space-y-4 text-xs sm:text-sm">
              {/* 1. Event Overview */}
              <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-[#4C81E0] bg-[#D6E4F7]/60 border border-[#4C81E0]/20 px-2.5 py-0.5 rounded-md">
                    REF: {detail.reference || detail._id?.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-[#1E293B]">
                    {detail.event_type || "Catering Event"}
                  </span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-xs font-medium text-[#64748B]">
                    {detail.guest_count || 0} Guests
                  </span>
                  <Badge status={detail.status || "confirmed"} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight ${
                    ["fully_paid", "paid"].includes(detailPaymentStatus.toLowerCase())
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : ["deposit_paid"].includes(detailPaymentStatus.toLowerCase())
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    {detailPaymentStatus.replace(/_/g, " ")}
                  </span>
                  <span className="text-[#64748B]">•</span>
                  <span className="text-xs font-bold text-[#1E293B] font-mono">
                    {formatMoney(detailTotalCost)}
                  </span>
                  {detailRemainingBalance > 0 ? (
                    <span className="text-[11px] font-semibold text-amber-700 font-mono">
                      (Due: {formatMoney(detailRemainingBalance)})
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 font-mono">
                      (Settled)
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Date, Time, Venue, and Client */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Schedule */}
                <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#4C81E0]" /> Schedule
                  </div>
                  <div className="text-sm font-bold text-[#1E293B]">
                    {detail.event_date ? new Date(detail.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                  </div>
                  <div className="text-xs text-[#64748B] flex items-center gap-1">
                    <Clock size={12} className="text-[#4C81E0]" />
                    <span>{detail.start_time || "Time TBA"} ({detail.duration_hours || 4} hrs)</span>
                  </div>
                </div>

                {/* Venue */}
                <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#4C81E0]" /> Venue
                  </div>
                  <div className="text-sm font-bold text-[#1E293B] truncate" title={detail.venue_type || "Venue"}>
                    {detail.venue_type || "Venue"}
                  </div>
                  <div className="text-xs text-[#64748B] line-clamp-2" title={[detail.street, detail.barangay, detail.municipality].filter(Boolean).join(", ")}>
                    {[detail.street, detail.barangay, detail.municipality].filter(Boolean).join(", ") || "Location TBA"}
                  </div>
                </div>

                {/* Client */}
                <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="text-[11px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1.5">
                    <Users size={13} className="text-[#4C81E0]" /> Client
                  </div>
                  <div className="text-sm font-bold text-[#1E293B] truncate">
                    {detail.contact_first_name} {detail.contact_last_name}
                  </div>
                  <div className="text-xs text-[#64748B] space-y-0.5">
                    {detail.contact_phone ? (
                      <a href={`tel:${detail.contact_phone}`} className="flex items-center gap-1 text-[#4C81E0] hover:underline font-medium">
                        <Phone size={11} className="shrink-0" />
                        <span>{detail.contact_phone}</span>
                      </a>
                    ) : (
                      <span className="text-[#64748B]">Phone: None</span>
                    )}
                    {detail.contact_email ? (
                      <a href={`mailto:${detail.contact_email}`} className="flex items-center gap-1 text-[#4C81E0] hover:underline truncate">
                        <Mail size={11} className="shrink-0" />
                        <span className="truncate">{detail.contact_email}</span>
                      </a>
                    ) : (
                      <span className="text-[#64748B]">Email: None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Package, Services & Event Requirements */}
              <div className="space-y-3 p-3.5 bg-card border border-border/80 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                      <Utensils size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                        Package &amp; Services
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        {detail.package_id?.name || detail.package_name_snapshot || "Custom Catering Package"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B]">
                    {(detail.menu_items || []).length} {(detail.menu_items || []).length === 1 ? "Dish" : "Dishes"} Selected
                  </span>
                </div>

                {/* Menu Items */}
                {(!detail.menu_items || detail.menu_items.length === 0) ? (
                  <p className="text-xs text-[#64748B] italic py-1">
                    Package menu items will follow standard catering specifications or chef recommendations.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detail.menu_items.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg flex items-start justify-between gap-2 shadow-2xs">
                        <div>
                          <div className="font-semibold text-[#1E293B] text-xs">{item.name}</div>
                          {item.note && <div className="text-[11px] text-[#64748B] mt-0.5">{item.note}</div>}
                        </div>
                        {item.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-[#64748B] shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add-ons & Service items */}
                {((detail.service_items && detail.service_items.length > 0) || (detail.additional_charges && detail.additional_charges.length > 0)) && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                      <Layers size={12} className="text-[#4C81E0]" /> Add-on Services &amp; Event Styling
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(detail.service_items || []).map((srv, idx) => (
                        <div key={`srv-${idx}`} className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                          <div>
                            <div className="font-semibold text-[#1E293B]">{srv.name}</div>
                            {srv.note && <div className="text-[11px] text-[#64748B]">{srv.note}</div>}
                          </div>
                          {srv.quantity > 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D6E4F7]/60 text-[#4C81E0] border border-[#4C81E0]/20">
                              Qty: {srv.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                      {(detail.additional_charges || []).map((chg, idx) => (
                        <div key={`chg-${idx}`} className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                          <div>
                            <div className="font-semibold text-[#1E293B]">{chg.label}</div>
                            {chg.reason && <div className="text-[11px] text-[#64748B]">{chg.reason}</div>}
                          </div>
                          <span className="text-[11px] font-bold text-[#1E293B] font-mono">
                            {formatMoney(chg.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Event Requirements & Dietary */}
              {(detail.dietary_restrictions || detail.allergies || detail.special_requests || detail.notes) && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-xs shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" /> Event Requirements &amp; Client Notes
                  </h4>
                  <div className="space-y-1 text-amber-950 text-[11.5px] leading-relaxed">
                    {detail.dietary_restrictions && (
                      <div><strong>Dietary Needs:</strong> {detail.dietary_restrictions}</div>
                    )}
                    {detail.allergies && (
                      <div><strong>Allergies:</strong> {detail.allergies}</div>
                    )}
                    {detail.special_requests && (
                      <div><strong>Special Requests:</strong> {detail.special_requests}</div>
                    )}
                    {detail.notes && (
                      <div><strong>Client Notes:</strong> {detail.notes}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Dispatched Equipment & Verification */}
              {mergedEquipmentList.length > 0 && (
                <div className="space-y-3 p-3.5 bg-card border border-border/80 rounded-xl shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                        <PackageCheck size={13} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                          Dispatched Equipment &amp; Verification
                        </h4>
                        <p className="text-[11px] text-[#64748B]">
                          Field gear inventory counts, returns check, and manager verification.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#64748B] font-medium">
                      {mergedEquipmentList.length} Gear Types
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {mergedEquipmentList.map((eq, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2.5 rounded-lg border flex flex-col justify-between gap-2 text-xs transition-colors shadow-2xs ${
                          eq.missing > 0 
                            ? "bg-rose-50/50 border-rose-200" 
                            : eq.damaged > 0 
                              ? "bg-amber-50/50 border-amber-200" 
                              : "bg-slate-50/50 border-slate-200/80"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-semibold text-[#1E293B] truncate" title={eq.name}>
                              {eq.name}
                            </span>
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[#1E293B] shrink-0">
                              {eq.booked} units
                            </span>
                          </div>
                          {eq.category && (
                            <span className="text-[10px] text-[#64748B] block truncate mt-0.5">
                              {eq.category}
                            </span>
                          )}

                          {eq.hasVerified ? (
                            <div className="mt-2 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between text-[#64748B]">
                                <span>Returned:</span>
                                <span className="font-semibold text-emerald-700">{eq.returned} units</span>
                              </div>
                              {eq.damaged > 0 && (
                                <div className="flex items-center justify-between text-rose-700">
                                  <span>Damaged:</span>
                                  <span className="font-semibold">{eq.damaged} units</span>
                                </div>
                              )}
                              {eq.missing > 0 && (
                                <div className="flex items-center justify-between text-rose-700">
                                  <span>Missing:</span>
                                  <span className="font-semibold">{eq.missing} units</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-[#64748B] italic">
                              Staff count not logged yet.
                            </div>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-border/60 flex items-center justify-between flex-wrap gap-1.5">
                          <div>
                            {eq.missing > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <AlertTriangle size={11} className="text-rose-600" /> Missing
                              </span>
                            ) : eq.damaged > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <AlertTriangle size={11} className="text-amber-600" /> Damaged
                              </span>
                            ) : eq.hasVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 size={11} className="text-emerald-600" /> Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                          </div>

                          {eq.notes ? (
                            <button
                              type="button"
                              onClick={() => setStaffNoteModal({
                                itemName: eq.name,
                                notes: eq.notes,
                                staffName: eq.verifiedBy,
                                verifiedAt: eq.verifiedAt
                              })}
                              className="text-[11px] font-semibold text-[#4C81E0] hover:underline flex items-center gap-1 cursor-pointer bg-[#D6E4F7]/40 px-2 py-0.5 rounded border border-[#4C81E0]/20"
                              title="View staff notes for this item"
                            >
                              <FileText size={11} />
                              <span>Notes</span>
                            </button>
                          ) : (
                            eq.missing > 0 && <span className="text-[10px] text-[#64748B] italic">No note</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manager Confirmation Checkbox & Notes */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label
                        htmlFor="managerEquipmentConfirm"
                        className="flex min-h-[40px] flex-1 cursor-pointer select-none items-center gap-2.5 rounded-md py-1 sm:min-h-0"
                      >
                        <input
                          type="checkbox"
                          id="managerEquipmentConfirm"
                          checked={managerConfirmed}
                          onChange={(e) => setManagerConfirmed(e.target.checked)}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[#4C81E0] focus:ring-[#4C81E0]"
                        />
                        <span className="text-xs font-semibold text-[#1E293B]">
                          Double-check and confirm equipment counted by staff
                        </span>
                      </label>

                      {detail.equipment_manager_verified?.confirmed && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          <CheckCircle2 size={11} />
                          Confirmed by {detail.equipment_manager_verified.confirmed_by?.full_name || "Manager"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
                        Additional Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add manager verification remarks or missing gear follow-ups..."
                        value={managerEquipmentNotes}
                        onChange={(e) => setManagerEquipmentNotes(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white text-[#1E293B] focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0] resize-y outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Btn
                        variant="primary"
                        size="xs"
                        onClick={handleSaveEquipmentVerification}
                        disabled={submittingVerifyEquipment}
                        className="flex items-center gap-1.5 font-semibold bg-[#4C81E0] hover:bg-[#3b6bc4] text-white cursor-pointer"
                      >
                        <PackageCheck size={13} />
                        <span>{submittingVerifyEquipment ? "Saving..." : "Save Verification"}</span>
                      </Btn>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Payment Summary */}
              <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                      <CreditCard size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                        Payment Summary
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Booking balance, client payment history, and collection status.
                      </p>
                    </div>
                  </div>
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tight ${
                    ["fully_paid", "paid"].includes(detailPaymentStatus.toLowerCase())
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : ["deposit_paid"].includes(detailPaymentStatus.toLowerCase())
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    {detailPaymentStatus.replace(/_/g, " ")}
                  </span>
                </div>

                {/* 4 Financial Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg space-y-0.5 shadow-2xs">
                    <span className="text-[10.5px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1">
                      <DollarSign size={12} className="text-[#4C81E0]" /> Total Cost
                    </span>
                    <div className="text-base font-bold font-mono text-[#1E293B]">
                      {formatMoney(detailTotalCost)}
                    </div>
                    <div className="text-[10px] text-[#64748B] truncate">Contracted total</div>
                  </div>

                  <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg space-y-0.5 shadow-2xs">
                    <span className="text-[10.5px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Amount Paid
                    </span>
                    <div className="text-base font-bold font-mono text-emerald-600">
                      {formatMoney(detailTotalPaid)}
                    </div>
                    <div className="text-[10px] text-[#64748B] truncate">
                      {detailApprovedPayments.length} approved payment{detailApprovedPayments.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className={`p-2.5 border rounded-lg space-y-0.5 shadow-2xs ${
                    detailRemainingBalance > 0
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-emerald-50/40 border-emerald-200"
                  }`}>
                    <span className={`text-[10.5px] uppercase font-bold tracking-wider flex items-center gap-1 ${
                      detailRemainingBalance > 0 ? "text-amber-800" : "text-emerald-800"
                    }`}>
                      <Receipt size={12} /> Remaining Balance
                    </span>
                    <div className={`text-base font-bold font-mono ${
                      detailRemainingBalance > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {formatMoney(detailRemainingBalance)}
                    </div>
                    <div className={`text-[10px] truncate ${
                      detailRemainingBalance > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {detailRemainingBalance > 0 ? "Due upon completion" : "Fully settled"}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg space-y-0.5 shadow-2xs">
                    <span className="text-[10.5px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1">
                      <ShieldCheck size={12} className="text-[#4C81E0]" /> Settlement Method
                    </span>
                    <div className="text-xs font-bold text-[#1E293B] truncate pt-0.5">
                      {detail.balance_payment_preference === "in_person" ? "Cash on Event Day" : "Online Gateway"}
                    </div>
                    <div className="text-[10px] text-[#64748B] truncate">
                      {detail.balance_payment_preference === "in_person" ? "Collect balance in-person" : "Direct gateway"}
                    </div>
                  </div>
                </div>

                {/* Transactions Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                      <Receipt size={12} className="text-[#4C81E0]" /> Payment Transactions
                    </h5>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {detailPayments.length} {detailPayments.length === 1 ? "record" : "records"}
                    </span>
                  </div>

                  {detailPayments.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-[#64748B] italic text-center">
                      No payment transactions recorded for this booking.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs divide-y divide-slate-100">
                      <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        <div className="col-span-4 sm:col-span-3">Reference / ID</div>
                        <div className="col-span-3 sm:col-span-2">Type</div>
                        <div className="hidden sm:block sm:col-span-2">Method</div>
                        <div className="col-span-2 sm:col-span-2">Date</div>
                        <div className="col-span-3 sm:col-span-1 text-center">Status</div>
                        <div className="hidden sm:block sm:col-span-2 text-right">Amount</div>
                      </div>
                      {detailPayments.map((p, idx) => {
                        const isApproved = ["approved", "paid", "completed"].includes(String(p.status || "").toLowerCase().trim());
                        const isPending = String(p.status || "").toLowerCase().trim() === "pending";
                        const refCode = p.gateway_reference || p.gateway_checkout_id || `PAY-${(p._id || "").slice(-6).toUpperCase()}`;
                        return (
                          <div key={p._id || idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs hover:bg-slate-50/50 transition-colors">
                            <div className="col-span-4 sm:col-span-3 min-w-0">
                              <span className="font-mono font-semibold text-[#1E293B] block truncate" title={refCode}>
                                {refCode}
                              </span>
                              <span className="text-[10px] text-[#64748B] sm:hidden block font-mono">
                                {formatMoney(p.amount)}
                              </span>
                            </div>
                            <div className="col-span-3 sm:col-span-2">
                              <span className="capitalize font-medium text-[#1E293B] text-[11px] block truncate">
                                {p.payment_type ? p.payment_type.replace(/_/g, " ") : "Payment"}
                              </span>
                            </div>
                            <div className="hidden sm:block sm:col-span-2">
                              <span className="text-[11px] text-[#64748B] capitalize block truncate">
                                {p.method || p.gateway || "Manual"}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-2 text-[11px] text-[#64748B]">
                              {p.paid_at || p.createdAt ? new Date(p.paid_at || p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                            </div>
                            <div className="col-span-3 sm:col-span-1 text-center">
                              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}>
                                {p.status || "pending"}
                              </span>
                            </div>
                            <div className="hidden sm:block sm:col-span-2 text-right font-mono font-semibold">
                              <span className={isApproved ? "text-emerald-700" : "text-[#64748B]"}>
                                {formatMoney(p.amount)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Staff Assignment */}
              <div className="space-y-3 p-3.5 bg-card border border-border/80 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                      <UserCheck size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                        Staff Assignment
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Assigned culinary, service, setup, and support crew for this event.
                      </p>
                    </div>
                  </div>
                  {detail.staff_assignments && detail.staff_assignments.length > 0 && (
                    <Btn
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        const target = detail;
                        setDetail(null);
                        openAssign(target);
                      }}
                      className="font-semibold flex items-center gap-1.5 cursor-pointer text-[#1E293B]"
                    >
                      <UserCheck size={13} className="text-[#4C81E0]" /> Edit Staff
                    </Btn>
                  )}
                </div>

                {(!detail.staff_assignments || detail.staff_assignments.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <Users size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-[#1E293B]">No Staff Assigned</div>
                        <div className="text-[11px] text-[#64748B]">
                          Kitchen, service, setup, and support crew have not been assigned yet.
                        </div>
                      </div>
                    </div>
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const target = detail;
                        setDetail(null);
                        openAssign(target);
                      }}
                      className="flex items-center gap-1.5 shrink-0 font-bold bg-[#4C81E0] hover:bg-[#3b6bc4] text-white shadow-2xs"
                    >
                      <UserPlus size={14} /> Assign Staff
                    </Btn>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {detail.staff_assignments.map((assignment, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] border border-[#4C81E0]/20 flex items-center justify-center font-bold text-xs shrink-0">
                            {initialsOf(assignment.name || assignment.user_id?.full_name || "Staff")}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#1E293B] truncate">
                              {assignment.name || assignment.user_id?.full_name || "Staff Member"}
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate">
                              {assignment.role || "Staff"}
                              {assignment.phone ? ` • ${assignment.phone}` : ""}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          Assigned
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Incident & Shift Reports and Operations Notes */}
              <div className="space-y-3.5">
                {/* Incident & Shift Reports */}
                <div className="space-y-2 p-3.5 bg-card border border-border/80 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                        <ClipboardList size={13} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                          Incident &amp; Shift Reports
                        </h4>
                        <p className="text-[11px] text-[#64748B]">
                          Field logs and incidents submitted by dispatched crew.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#64748B]">
                      {(detail.staff_reports || []).length} {(detail.staff_reports || []).length === 1 ? "Report" : "Reports"}
                    </span>
                  </div>

                  {(!detail.staff_reports || detail.staff_reports.length === 0) ? (
                    <p className="text-xs text-[#64748B] italic py-1">
                      No incident reports or shift notes submitted by the crew for this event.
                    </p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {detail.staff_reports.map((rep, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-lg text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200/60">
                            <div className="flex items-center gap-1.5 font-semibold text-[#1E293B]">
                              <span>{rep.staff_id?.full_name || rep.staff_name || "Crew Member"}</span>
                              <span className="text-[10px] font-normal text-[#64748B] px-1.5 py-0.2 bg-white rounded border border-slate-200">
                                {rep.role || "Staff"}
                              </span>
                            </div>
                            {rep.created_at && (
                              <span className="text-[10.5px] text-[#64748B]">
                                {new Date(rep.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#1E293B] whitespace-pre-wrap leading-relaxed">
                            {rep.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Operations Notes */}
                <div className="space-y-2.5 p-3.5 bg-card border border-border/80 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                    <div className="w-6 h-6 rounded-md bg-[#D6E4F7] text-[#4C81E0] flex items-center justify-center shrink-0">
                      <FileText size={13} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                        Operations Notes
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Manager briefing notes, setup instructions, and operational log.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Add an operational briefing note or event log..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-white text-[#1E293B] focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0] outline-none shadow-2xs resize-y"
                    />
                    <div className="flex justify-end">
                      <Btn variant="primary" size="xs" onClick={submitNote} disabled={!note.trim()} className="font-semibold bg-[#4C81E0] hover:bg-[#3b6bc4] text-white">
                        Add Note
                      </Btn>
                    </div>

                    {(detail.event_manager_notes || []).map((entry, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-lg text-xs space-y-1 shadow-2xs">
                        <div className="text-[10.5px] font-medium text-[#64748B]">{new Date(entry.created_at).toLocaleString()}</div>
                        <div className="text-[#1E293B] leading-relaxed">{entry.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </Modal>
        )}

        {/* Staff Item Note Modal */}
        {staffNoteModal && (
          <Modal
            title={`Staff Item Notes: ${staffNoteModal.itemName}`}
            icon={FileText}
            onClose={() => setStaffNoteModal(null)}
            className="sm:max-w-md"
            footer={
              <div className="flex justify-end">
                <Btn variant="secondary" size="sm" onClick={() => setStaffNoteModal(null)}>Close</Btn>
              </div>
            }
          >
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#1E293B] pb-2 border-b border-slate-200/60">
                  <span>Logged by: {staffNoteModal.staffName || "Staff Member"}</span>
                  {staffNoteModal.verifiedAt && (
                    <span className="text-[#64748B] font-normal">{new Date(staffNoteModal.verifiedAt).toLocaleString()}</span>
                  )}
                </div>
                <p className="text-xs text-[#1E293B] whitespace-pre-wrap leading-relaxed">
                  {staffNoteModal.notes}
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* Mark Completed Confirmation Modal with Cash Settlement */}
        {completeTarget && (
          <Modal
            title="Complete Catering Event"
            icon={CheckCircle2}
            onClose={() => setCompleteTarget(null)}
            className="sm:max-w-md"
            footer={
              <div className="flex items-center justify-end gap-2">
                <Btn variant="secondary" size="sm" onClick={() => setCompleteTarget(null)} disabled={submittingComplete}>
                  Cancel
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={() => handleMarkCompleted(completeTarget._id, collectCashOnComplete)}
                  disabled={submittingComplete}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{submittingComplete ? "Completing..." : "Confirm & Complete"}</span>
                </Btn>
              </div>
            }
          >
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-1">
                <div className="font-bold text-foreground">
                  {completeTarget.reference || completeTarget._id?.slice(-6).toUpperCase()} : {completeTarget.event_type || "Event"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Client: {completeTarget.customer_id?.full_name || `${completeTarget.contact_first_name || ""} ${completeTarget.contact_last_name || ""}`.trim() || "Customer"} · Date: {completeTarget.event_date ? new Date(completeTarget.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                </div>
              </div>

              {Number(completeTarget.remaining_balance || 0) > 0 ? (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt size={13} className="text-amber-600 dark:text-amber-400" /> Outstanding Balance Due
                    </span>
                    <span className="text-sm font-bold font-mono text-amber-900 dark:text-amber-200">
                      {formatMoney(completeTarget.remaining_balance)}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    {completeTarget.balance_payment_preference === "in_person"
                      ? "The client selected Cash on Event Day. Please confirm if this remaining balance was collected in cash."
                      : "This booking has an uncollected balance. If received in cash on-site, check below to record and clear the balance."}
                  </p>
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={collectCashOnComplete}
                      onChange={(e) => setCollectCashOnComplete(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Confirm collected cash payment of {formatMoney(completeTarget.remaining_balance)}
                    </span>
                  </label>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>All contracted fees for this event are fully settled.</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                Completing this event closes out the schedule, verifies turnover status, and marks the catering engagement as concluded.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </ManagerLayout>

  );
}
