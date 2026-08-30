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
  Sparkles,
  PackageCheck,
  DollarSign
} from "lucide-react";

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
 * platform's own wheel or list — searchable, one-handed, and already
 * familiar — where a custom listbox would reimplement all of that worse
 * inside a sheet that is itself already scrolling. What it needed was a
 * real touch target: these were 2px-padded rows about 30px tall.
 */
const CREW_SELECT =
  "w-full min-h-[44px] sm:min-h-0 rounded-lg border border-border bg-card px-2.5 py-2 " +
  "text-xs font-medium text-foreground outline-none transition-shadow " +
  "focus:ring-2 focus:ring-primary/40";

/** One crew slot: a picker and, when the slot is removable, its remove button. */
function CrewRow({ value, placeholder, options, onChange, onRemove, removeLabel }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className={CREW_SELECT + " flex-1 min-w-0"}
      >
        <option value="">{placeholder}</option>
        {options}
      </select>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive cursor-pointer sm:h-9 sm:w-9"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

/**
 * A role's group of slots. "Add" was an 11px underlined text link — the
 * smallest possible target for the control this form is built around — so
 * it is now a bordered button on its own line under the slots, where it
 * reads as "one more of these" rather than competing with the group label.
 */
function CrewGroup({ label, addLabel, onAdd, secondaryAddLabel, onSecondaryAdd, children }) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-2.5 sm:p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wider text-foreground">
        {label}
      </legend>
      <div className="space-y-2">{children}</div>
      <div className="flex flex-col gap-2 pt-0.5 sm:flex-row">
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-card text-[12px] font-bold text-primary transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
        >
          <Plus size={13} /> {addLabel}
        </button>
        {onSecondaryAdd && (
          <button
            type="button"
            onClick={onSecondaryAdd}
            className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-card text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground cursor-pointer"
          >
            <Plus size={13} /> {secondaryAddLabel}
          </button>
        )}
      </div>
    </fieldset>
  );
}

export default function ManagerBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();

  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
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
            const hasStaff = Array.isArray(b.staff_assignments) && b.staff_assignments.length > 0;
            if (action === "assign" || (!hasStaff && action !== "view")) {
              openAssign(b);
            } else {
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
    ManagerAPI.getBooking(booking._id).then((res) => {
      const b = res.data;
      setDetail(b);
      setManagerConfirmed(Boolean(b?.equipment_manager_verified?.confirmed));
      setManagerEquipmentNotes(b?.equipment_manager_verified?.additional_notes || "");
    });
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

    if (staffAssignments.length === 0) {
      notify("Please assign at least one staff member.", "error");
      return;
    }

    setSubmittingAssign(true);
    ManagerAPI.assignStaff(assignTarget._id, { staff_assignments: staffAssignments })
      .then(() => {
        notify("Staff assigned and team dispatched successfully!", "success");
        setAssignTarget(null);
        loadBookings();
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not assign staff. Please try again.", "error");
      })
      .finally(() => setSubmittingAssign(false));
  };

  const handleMarkCompleted = (bookingId) => {
    setSubmittingComplete(true);
    ManagerAPI.markCompleted(bookingId)
      .then(() => {
        notify("Event marked as completed successfully!", "success");
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-foreground">{b.event_type || "Event"}</span>
              {isPast && !isCompleted && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800">
                  <AlertTriangle size={10} /> Event Passed
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
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  <AlertCircle size={11} /> Unassigned (Passed)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  <AlertCircle size={11} /> Unassigned
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={11} /> {count} Staff Dispatched
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "status",
      header: "Booking Status",
      render: (b) => <Badge status={b.status} />
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (b) => {
        const hasStaff = Array.isArray(b.staff_assignments) && b.staff_assignments.length > 0;
        const isCompleted = ["completed", "Completed"].includes(b.status);
        const isPast = isPastDate(b.event_date);

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Btn variant="secondary" size="xs" onClick={() => openDetails(b)} title="View full event details">
              <Eye size={13} /> View
            </Btn>
            {!isCompleted && isPast && (
              <Btn
                variant="primary"
                size="xs"
                onClick={() => setCompleteTarget(b)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"
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
                className="text-foreground hover:bg-muted font-semibold border-border flex items-center gap-1 cursor-pointer"
                title={isPast ? "Edit retroactive staff assignments" : "Edit dispatched staff team"}
              >
                <UserCheck size={13} className="text-primary" /> Edit Staff
              </Btn>
            ) : isPast ? (
              <Btn 
                variant="secondary" 
                size="xs" 
                onClick={() => openAssign(b)}
                className="text-foreground hover:bg-muted font-medium border-border flex items-center gap-1 cursor-pointer"
                title="Log past staff assignments retroactively"
              >
                <UserPlus size={13} /> Log Staff
              </Btn>
            ) : (
              <Btn 
                variant="primary" 
                size="xs" 
                onClick={() => openAssign(b)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1 cursor-pointer"
                title="Assign Staff Team"
              >
                <UserPlus size={13} /> Assign
              </Btn>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <ManagerLayout>
      <div className="space-y-4">
        <PageHeader
          title="Assigned Bookings"
          description="Review event specifications, build staff teams, and monitor execution"
          actions={
            <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/staff")}>
              <Users size={14} /> Staff Roster
            </Btn>
          }
        />

        {/* The tab strip and the search field are the two controls a manager
            touches between every card they read, so on a phone they ride the
            top of the scroll container instead of scrolling away with the
            page header above them. */}
        <div className="portal-sticky -mx-3 space-y-2.5 bg-background/95 px-3 pb-2.5 pt-0.5 backdrop-blur md:static md:mx-0 md:space-y-4 md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none">
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
            itself opens the event — the old layout spent a 50% column on a
            "View Details" button that repeated the tap the card should
            already have carried, leaving the actual decision (does this
            event have a crew?) sharing the other half. Now the staffing
            state is the loudest thing on the card, and the single action is
            the one that state calls for. */}
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
                  [b.venue_type, b.barangay, b.municipality].filter(Boolean).join(", ") || "Venue TBA";

                const crew = hasStaff
                  ? {
                      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
                      icon: CheckCircle2,
                      text: b.staff_assignments.length + " crew dispatched",
                    }
                  : isPast
                    ? {
                        className: "border-rose-300 bg-rose-50 text-rose-900",
                        icon: AlertTriangle,
                        text: "Unassigned — event passed",
                      }
                    : {
                        className: "border-amber-300 bg-amber-50 text-amber-900",
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
                                <span className="inline-flex items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
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
                          <Calendar size={13} className="shrink-0 text-primary" />
                          <span className="font-semibold text-foreground">{eventDate}</span>
                          <span>· {b.start_time || "Time TBA"}</span>
                        </span>

                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <MapPin size={13} className="shrink-0" />
                          <span className="truncate">{locationStr}</span>
                        </span>

                        <span className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <span className={"inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-bold " + crew.className}>
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
                            onClick={() => setCompleteTarget(b)}
                            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[13px] font-bold text-white shadow-2xs transition-colors hover:bg-emerald-700 cursor-pointer portal-press"
                          >
                            <CheckCircle2 size={15} />
                            Mark Completed
                          </button>
                        ) : hasStaff ? (
                          <button
                            type="button"
                            onClick={() => openAssign(b)}
                            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted cursor-pointer portal-press"
                          >
                            <UserCheck size={15} className="text-primary" />
                            Edit Staff Team
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openAssign(b)}
                            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 text-[13px] font-bold text-white shadow-2xs transition-colors hover:bg-amber-700 cursor-pointer portal-press"
                          >
                            <UserPlus size={15} />
                            Dispatch Staff
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
            minWidth="750px"
            /* Between 1024px and the table's own min-width the row scrolls,
               and the actions column was the first thing pushed off screen —
               the one column the row is being read for. */
            pinLastColumn
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Staff Assignment Modal.
            The form is long — a head cook, then any number of servers, setup
            crew and assistants — and its Save button used to sit at the end
            of it inside a dialog that had no scroll region, so on a phone the
            manager could fill the whole team in and never reach the control
            that dispatched it. The action now lives in the sheet's pinned
            footer, where it is visible from the first select onward and
            reports how many people are currently selected. */}
        {assignTarget && (
          <Modal
            title={`Assign Staff Team — ${assignTarget.event_type || "Event"}`}
            onClose={() => setAssignTarget(null)}
            className="sm:max-w-2xl"
            footer={
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11.5px] font-medium text-muted-foreground tabular-nums">
                  {selectedCrewCount === 0
                    ? "No one selected yet"
                    : `${selectedCrewCount} assigned`}
                </span>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" onClick={() => setAssignTarget(null)} disabled={submittingAssign}>
                    Cancel
                  </Btn>
                  <Btn
                    variant="primary"
                    onClick={submitAssignment}
                    disabled={submittingAssign}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    {submittingAssign
                      ? "Saving…"
                      : isPastDate(assignTarget.event_date)
                        ? "Save Records"
                        : "Dispatch Team"}
                  </Btn>
                </div>
              </div>
            }
          >
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-bold text-foreground">
                    {assignTarget.customer_id?.full_name || "Customer"}
                  </div>
                  <div className="text-muted-foreground">
                    Target date:{" "}
                    <strong className="text-foreground">
                      {assignTarget.event_date ? new Date(assignTarget.event_date).toLocaleDateString() : "TBD"}
                    </strong>
                  </div>
                </div>
                <span className="shrink-0 rounded border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[11px] font-bold text-primary">
                  {assignTarget.start_time || "Time TBA"}
                </span>
              </div>

              {isPastDate(assignTarget.event_date) && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-2xs dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <div className="font-bold">Past event — retroactive staff logging</div>
                    <div className="text-[11.5px] leading-relaxed">
                      This event took place on{" "}
                      <strong>
                        {new Date(assignTarget.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </strong>
                      . Assignments saved here record crew participation for historical, payroll and inventory-returns audit.
                    </div>
                  </div>
                </div>
              )}

              {/* Head Cook */}
              <div className="space-y-1.5">
                <label htmlFor="assign-head-cook" className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground">
                  <span>Head Cook / Chef</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Kitchen lead</span>
                </label>
                <select
                  id="assign-head-cook"
                  value={assignment.headCook}
                  onChange={(e) => setAssignment({ ...assignment, headCook: e.target.value })}
                  className={CREW_SELECT}
                >
                  <option value="">Select head cook…</option>
                  {staffOptions}
                </select>
              </div>

              <CrewGroup
                label="Servers / Waitstaff"
                addLabel="Add server"
                onAdd={() => addAssignmentSlot("servers")}
              >
                {assignment.servers.map((val, idx) => (
                  <CrewRow
                    key={idx}
                    value={val}
                    placeholder={`Select server #${idx + 1}…`}
                    options={staffOptions}
                    onChange={(next) => updateAssignment("servers", idx, next)}
                    onRemove={assignment.servers.length > 1 ? () => removeAssignmentSlot("servers", idx) : null}
                    removeLabel={`Remove server ${idx + 1}`}
                  />
                ))}
              </CrewGroup>

              <CrewGroup
                label="Setup & Logistics Crew"
                addLabel="Add crew"
                onAdd={() => addAssignmentSlot("setupCrew")}
              >
                {assignment.setupCrew.map((val, idx) => (
                  <CrewRow
                    key={idx}
                    value={val}
                    placeholder={`Select setup crew #${idx + 1}…`}
                    options={staffOptions}
                    onChange={(next) => updateAssignment("setupCrew", idx, next)}
                    onRemove={assignment.setupCrew.length > 1 ? () => removeAssignmentSlot("setupCrew", idx) : null}
                    removeLabel={`Remove setup crew ${idx + 1}`}
                  />
                ))}
              </CrewGroup>

              <CrewGroup
                label="Extra Support / Assistants"
                addLabel="Add assistant"
                onAdd={() => addAssignmentSlot("assistants")}
                secondaryAddLabel="Add on-call / external"
                onSecondaryAdd={addExtraAssistant}
              >
                {assignment.assistants.map((val, idx) => (
                  <CrewRow
                    key={idx}
                    value={val}
                    placeholder={`Select assistant #${idx + 1}…`}
                    options={staffOptions}
                    onChange={(next) => updateAssignment("assistants", idx, next)}
                    onRemove={() => removeAssignmentSlot("assistants", idx)}
                    removeLabel={`Remove assistant ${idx + 1}`}
                  />
                ))}

                {assignment.extraAssistants.map((extra, idx) => (
                  <div
                    key={`extra-${idx}`}
                    className="space-y-2 rounded-md border border-dashed border-border bg-card p-2"
                  >
                    <input
                      placeholder="External assistant name"
                      value={extra.name}
                      onChange={(e) => updateExtraAssistant(idx, "name", e.target.value)}
                      className="h-11 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground sm:h-auto sm:py-2"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        inputMode="tel"
                        placeholder="Contact phone number"
                        value={extra.phone}
                        onChange={(e) => updateExtraAssistant(idx, "phone", e.target.value)}
                        className="h-11 flex-1 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground sm:h-auto sm:py-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeExtraAssistant(idx)}
                        aria-label={`Remove external assistant ${idx + 1}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive cursor-pointer sm:h-9 sm:w-9"
                      >
                        <Trash2 size={15} />
                      </button>
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
            title={`Event Specifications — ${detail.event_type || "Event"}`} 
            onClose={() => setDetail(null)} 
            className="sm:max-w-3xl"
            footer={
              <div className="flex items-center justify-between gap-2">
                {!['completed', 'Completed'].includes(detail.status) ? (
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const target = detail;
                      setDetail(null);
                      setCompleteTarget(target);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 size={14} /> Mark as Completed
                  </Btn>
                ) : (
                  <span className="text-[11.5px] font-semibold text-emerald-700">Event completed</span>
                )}
                <Btn variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Btn>
              </div>
            }
          >
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Header Status & Reference Bar */}
              <div className="p-3 bg-muted/40 border border-border/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    REF: <span className="font-mono text-primary font-bold">{detail.reference || detail._id?.slice(-6).toUpperCase()}</span>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <Badge status={detail.status || "confirmed"} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    Payment: <strong className="text-foreground uppercase">{detail.payment_status?.replace(/_/g, " ") || "Deposit Paid"}</strong>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(detail.total_price || detail.total_cost)}
                  </span>
                </div>
              </div>

              {/* Client & Contact Information */}
              <div className="p-3.5 bg-card border border-border/80 rounded-lg space-y-2 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Client Name:</span>
                    <div className="font-bold text-foreground">{detail.contact_first_name} {detail.contact_last_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Contact Phone:</span>
                    <div className="font-bold text-foreground">{detail.contact_phone || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email Address:</span>
                    <div className="font-bold text-foreground truncate">{detail.contact_email || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Preferred Contact:</span>
                    <div className="font-bold text-foreground">{detail.contact_method || "Email"}</div>
                  </div>
                </div>
              </div>

              {/* Event Schedule & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-card border border-border/80 rounded-lg space-y-1 shadow-2xs">
                  <div className="text-[10.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Calendar size={13} className="text-primary" /> Date &amp; Time
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {detail.event_date ? new Date(detail.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                  </div>
                  <div className="text-xs text-muted-foreground">{detail.start_time || "Time TBA"} ({detail.duration_hours || 4} hrs)</div>
                </div>

                <div className="p-3 bg-card border border-border/80 rounded-lg space-y-1 shadow-2xs">
                  <div className="text-[10.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Users size={13} className="text-primary" /> Guests &amp; Package
                  </div>
                  <div className="text-sm font-bold text-foreground">{detail.guest_count || 0} Guests</div>
                  <div className="text-xs text-muted-foreground truncate">{detail.package_id?.name || detail.package_name_snapshot || "Custom Catering Package"}</div>
                </div>

                <div className="p-3 bg-card border border-border/80 rounded-lg space-y-1 shadow-2xs">
                  <div className="text-[10.5px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <MapPin size={13} className="text-primary" /> Venue Location
                  </div>
                  <div className="text-sm font-bold text-foreground">{detail.venue_type || "Venue"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[detail.street, detail.barangay, detail.municipality].filter(Boolean).join(", ") || "Location TBA"}
                  </div>
                </div>
              </div>

              {/* Menu & Selected Dishes */}
              <div className="space-y-2 p-3.5 bg-card border border-border/80 rounded-lg shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Utensils size={14} className="text-primary" /> Catering Menu &amp; Selected Dishes
                  </h4>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {(detail.menu_items || []).length} Dishes Selected
                  </span>
                </div>

                {(!detail.menu_items || detail.menu_items.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Package menu items will follow standard catering specifications or chef recommendations.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {detail.menu_items.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-muted/30 border border-border/80 rounded-lg flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-foreground text-xs">{item.name}</div>
                          {item.note && <div className="text-[11px] text-muted-foreground">{item.note}</div>}
                        </div>
                        {item.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-card border border-border/80 text-muted-foreground shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add-ons & Service Items */}
              {((detail.service_items && detail.service_items.length > 0) || (detail.additional_charges && detail.additional_charges.length > 0)) && (
                <div className="space-y-2 p-3.5 bg-card border border-border/80 rounded-lg shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" /> Add-on Services &amp; Event Styling
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(detail.service_items || []).map((srv, idx) => (
                      <div key={`srv-${idx}`} className="p-2.5 bg-muted/30 border border-border/80 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-foreground">{srv.name}</div>
                          {srv.note && <div className="text-[11px] text-muted-foreground">{srv.note}</div>}
                        </div>
                        {srv.quantity > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            Qty: {srv.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                    {(detail.additional_charges || []).map((chg, idx) => (
                      <div key={`chg-${idx}`} className="p-2.5 bg-muted/30 border border-border/80 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-foreground">{chg.label}</div>
                          {chg.reason && <div className="text-[11px] text-muted-foreground">{chg.reason}</div>}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {formatMoney(chg.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dispatched Equipment & Verification */}
              {mergedEquipmentList.length > 0 && (
                <div className="space-y-3 p-3.5 bg-card border border-border/80 rounded-lg shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <PackageCheck size={14} className="text-primary" /> Dispatched Equipment &amp; Staff Count Verification
                    </h4>
                    <span className="text-xs text-muted-foreground font-medium">
                      {mergedEquipmentList.length} Total Gear Types
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {mergedEquipmentList.map((eq, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2.5 rounded-lg border flex flex-col justify-between gap-2 text-xs transition-colors shadow-2xs ${
                          eq.missing > 0 
                            ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" 
                            : eq.damaged > 0 
                              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" 
                              : "bg-muted/30 border-border/80"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-bold text-foreground truncate" title={eq.name}>
                              {eq.name}
                            </span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-card border border-border/80 text-foreground shrink-0">
                              {eq.booked} units
                            </span>
                          </div>
                          {eq.category && (
                            <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                              {eq.category}
                            </span>
                          )}

                          {eq.hasVerified ? (
                            <div className="mt-2 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Returned Safe:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{eq.returned} units</span>
                              </div>
                              {eq.damaged > 0 && (
                                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                                  <span>Damaged:</span>
                                  <span className="font-bold">{eq.damaged} units</span>
                                </div>
                              )}
                              {eq.missing > 0 && (
                                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                                  <span>Missing Count:</span>
                                  <span className="font-bold">{eq.missing} units</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-muted-foreground italic">
                              Staff return count not yet logged.
                            </div>
                          )}
                        </div>

                        {/* Status & Notes row */}
                        <div className="pt-1.5 border-t border-border/60 flex items-center justify-between flex-wrap gap-1.5">
                          <div>
                            {eq.missing > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                <AlertTriangle size={11} className="text-rose-600 dark:text-rose-400" />
                                Missing
                              </span>
                            ) : eq.damaged > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                                Damaged
                              </span>
                            ) : eq.hasVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                                Returned Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border">
                                <Clock size={11} />
                                Pending Count
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
                              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 transition-colors"
                              title="View staff notes for this item"
                            >
                              <FileText size={11} />
                              <span>View Notes</span>
                            </button>
                          ) : (
                            eq.missing > 0 && (
                              <span className="text-[10px] text-muted-foreground italic">No staff note</span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manager Confirmation Checkbox & Additional Notes */}
                  <div className="p-3 bg-muted/20 border border-border/80 rounded-lg space-y-2.5 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* The whole row is the target: a 16px checkbox on a
                          phone is a coin toss, and this one commits the
                          manager's sign-off on the equipment count. */}
                      <label
                        htmlFor="managerEquipmentConfirm"
                        className="flex min-h-[44px] flex-1 cursor-pointer select-none items-center gap-3 rounded-md py-1 sm:min-h-0"
                      >
                        <input
                          type="checkbox"
                          id="managerEquipmentConfirm"
                          checked={managerConfirmed}
                          onChange={(e) => setManagerConfirmed(e.target.checked)}
                          className="h-5 w-5 shrink-0 cursor-pointer rounded border-border text-primary focus:ring-primary sm:h-4 sm:w-4"
                        />
                        <span className="text-xs font-bold text-foreground">
                          Double-check and confirm equipment counted by staff
                        </span>
                      </label>

                      {detail.equipment_manager_verified?.confirmed && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                          <CheckCircle2 size={11} />
                          Confirmed by {detail.equipment_manager_verified.confirmed_by?.full_name || "Manager"}{" "}
                          {detail.equipment_manager_verified.confirmed_at ? `on ${new Date(detail.equipment_manager_verified.confirmed_at).toLocaleDateString()}` : ""}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Additional Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add manager verification remarks, supplier loss claims, or missing equipment follow-ups..."
                        value={managerEquipmentNotes}
                        onChange={(e) => setManagerEquipmentNotes(e.target.value)}
                        className="w-full p-2 text-xs rounded-md border border-border bg-card text-foreground focus:ring-1 focus:ring-primary resize-y"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Btn
                        variant="primary"
                        size="xs"
                        onClick={handleSaveEquipmentVerification}
                        disabled={submittingVerifyEquipment}
                        className="flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <PackageCheck size={13} />
                        <span>{submittingVerifyEquipment ? "Saving Verification..." : "Save Equipment Verification"}</span>
                      </Btn>
                    </div>
                  </div>
                </div>
              )}

              {/* Dietary Requirements & Special Requests */}
              {(detail.dietary_restrictions || detail.allergies || detail.special_requests || detail.notes) && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-lg space-y-1.5 text-xs shadow-2xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" /> Dietary Restrictions &amp; Client Requests
                  </h4>
                  <div className="space-y-1 text-amber-950">
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
                      <div><strong>Notes:</strong> {detail.notes}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff Team */}
              <div className="space-y-2 p-3.5 bg-card border border-border/80 rounded-lg shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users size={14} className="text-primary" /> Assigned Staff Team
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detail;
                      setDetail(null);
                      openAssign(target);
                    }}
                    className="flex min-h-[38px] items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5 cursor-pointer sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:hover:underline"
                  >
                    <UserCheck size={13} /> Edit team
                  </button>
                </div>

                {(!detail.staff_assignments || detail.staff_assignments.length === 0) ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                    <span>No staff assigned yet. Click Edit Assignments to dispatch your team.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = detail;
                        setDetail(null);
                        openAssign(target);
                      }}
                      className="min-h-[40px] shrink-0 rounded-md bg-amber-600 px-3 text-xs font-bold text-white transition-colors hover:bg-amber-700 cursor-pointer sm:min-h-0 sm:py-1"
                    >
                      Assign Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {detail.staff_assignments.map((assignment, idx) => (
                      <div key={idx} className="p-2 bg-muted/30 border border-border/80 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-foreground">{assignment.name || assignment.user_id?.full_name || "Staff Member"}</div>
                          <div className="text-[11px] text-muted-foreground">{assignment.role || "Staff"}</div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Assigned
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Notes */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText size={14} className="text-primary" /> Coordinator Operations Briefing Notes
                </h4>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Log an event briefing note or update..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2 text-xs rounded-md border border-border bg-card text-foreground focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-end">
                    <Btn variant="primary" size="xs" onClick={submitNote} disabled={!note.trim()}>
                      Add Note
                    </Btn>
                  </div>

                  {(detail.event_manager_notes || []).map((entry, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/30 border border-border/80 rounded-lg text-xs">
                      <div className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</div>
                      <div className="mt-0.5 text-foreground">{entry.note}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Modal>
        )}

        {/* Staff Item Note Modal */}
        {staffNoteModal && (
          <Modal
            title={`Staff Item Notes — ${staffNoteModal.itemName}`}
            onClose={() => setStaffNoteModal(null)}
            className="sm:max-w-md"
            footer={
              <div className="flex justify-end">
                <Btn variant="secondary" size="sm" onClick={() => setStaffNoteModal(null)}>Close</Btn>
              </div>
            }
          >
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200 pb-1.5 border-b border-amber-200/60 dark:border-amber-800/60">
                  <span>Logged by: {staffNoteModal.staffName || "Staff Member"}</span>
                  {staffNoteModal.verifiedAt && (
                    <span>{new Date(staffNoteModal.verifiedAt).toLocaleString()}</span>
                  )}
                </div>
                <p className="text-xs text-amber-950 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                  {staffNoteModal.notes}
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* Mark Completed Confirmation Dialog */}
        {completeTarget && (
          <ConfirmDialog
            title="Complete Catering Event"
            message={`Are you sure you want to mark booking ${completeTarget.reference || completeTarget._id?.slice(-6).toUpperCase()} (${completeTarget.event_type || "Event"}) as Completed? This will transition the booking to Completed status.`}
            confirmText={submittingComplete ? "Completing..." : "Mark Completed"}
            cancelText="Cancel"
            tone="confirm"
            onConfirm={() => handleMarkCompleted(completeTarget._id)}
            onCancel={() => setCompleteTarget(null)}
          />
        )}
      </div>
    </ManagerLayout>

  );
}
