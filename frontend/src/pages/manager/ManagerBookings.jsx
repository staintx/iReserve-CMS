import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import Modal from "../../components/common/Modal";
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
        return (
          <div>
            <div className="text-sm font-bold text-foreground">{b.event_type || "Event"}</div>
            <div className="text-xs text-muted-foreground">{custName} • REF: <span className="font-mono">{b.reference || b._id?.slice(-6).toUpperCase()}</span></div>
          </div>
        );
      }
    },
    {
      key: "date",
      header: "Date & Time",
      render: (b) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">
            {b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
          </div>
          <div className="text-muted-foreground">{b.start_time || "Time TBA"}</div>
        </div>
      )
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
        return (
          <div>
            {count === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertCircle size={11} /> Unassigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
        return (
          <div className="flex items-center gap-1.5">
            <Btn variant="secondary" size="xs" onClick={() => openDetails(b)} title="View full event details">
              <Eye size={13} /> View
            </Btn>
            {hasStaff ? (
              <Btn 
                variant="secondary" 
                size="xs" 
                onClick={() => openAssign(b)}
                className="text-foreground hover:bg-muted font-semibold border-border flex items-center gap-1 cursor-pointer"
                title="Edit dispatched staff team"
              >
                <UserCheck size={13} className="text-primary" /> Edit Staff
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl sm:text-3xl font-bold text-foreground">
              Assigned Bookings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Review event specifications, build staff teams, and monitor execution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" onClick={() => navigate("/manager/staff")}>
              <Users size={14} /> Staff Availability
            </Btn>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-muted/60 border border-border rounded-xl w-fit">
          {[
            { id: "pending", label: "Pending Staffing", icon: Clock },
            { id: "upcoming", label: "Upcoming Events", icon: Calendar },
            { id: "completed", label: "Completed", icon: CheckCircle2 }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  tab === item.id 
                    ? "bg-card text-foreground shadow-2xs border border-border" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={13} className={tab === item.id ? "text-primary" : "text-muted-foreground"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter / Search toolbar */}
        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by client, event type, or reference..."
          />
        </AdminCard>

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(b) => b._id}
            loading={loading}
            emptyTitle={`No ${tab} bookings found.`}
            emptyHint="Assigned events from Admin will appear here."
            onRowClick={(b) => openDetails(b)}
            minWidth="750px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Staff Assignment Modal */}
        {assignTarget && (
          <Modal 
            title={`Assign Staff Team — ${assignTarget.event_type || "Event"}`} 
            onClose={() => setAssignTarget(null)}
            className="max-w-2xl"
          >
            <div className="space-y-5 text-xs sm:text-sm">
              <div className="p-3 bg-muted/60 border border-border rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-foreground">{assignTarget.customer_id?.full_name || "Customer"}</div>
                  <div className="text-muted-foreground">
                    Target Date: <strong className="text-foreground">{assignTarget.event_date ? new Date(assignTarget.event_date).toLocaleDateString() : "TBD"}</strong>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                  {assignTarget.start_time || "Time TBA"}
                </span>
              </div>

              {/* Head Cook */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Head Cook / Chef</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Kitchen Lead</span>
                </label>
                <select
                  value={assignment.headCook}
                  onChange={(e) => setAssignment({ ...assignment, headCook: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border bg-card text-xs font-semibold focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="">-- Select Head Cook --</option>
                  {staff.map((person) => (
                    <option key={person._id} value={person._id}>
                      {person.full_name} {person.availability_status && person.availability_status !== "Available" ? `(${person.availability_status})` : "✓"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Servers */}
              <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Servers / Waitstaff</label>
                  <button
                    type="button"
                    onClick={() => addAssignmentSlot("servers")}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Server Slot
                  </button>
                </div>

                <div className="space-y-2">
                  {assignment.servers.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={val}
                        onChange={(e) => updateAssignment("servers", idx, e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
                      >
                        <option value="">-- Select Server #{idx + 1} --</option>
                        {staff.map((person) => (
                          <option key={person._id} value={person._id}>
                            {person.full_name} {person.availability_status && person.availability_status !== "Available" ? `(${person.availability_status})` : "✓"}
                          </option>
                        ))}
                      </select>
                      {assignment.servers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAssignmentSlot("servers", idx)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup Crew */}
              <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Setup &amp; Logistics Crew</label>
                  <button
                    type="button"
                    onClick={() => addAssignmentSlot("setupCrew")}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Crew Slot
                  </button>
                </div>

                <div className="space-y-2">
                  {assignment.setupCrew.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={val}
                        onChange={(e) => updateAssignment("setupCrew", idx, e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
                      >
                        <option value="">-- Select Setup Crew #{idx + 1} --</option>
                        {staff.map((person) => (
                          <option key={person._id} value={person._id}>
                            {person.full_name} {person.availability_status && person.availability_status !== "Available" ? `(${person.availability_status})` : "✓"}
                          </option>
                        ))}
                      </select>
                      {assignment.setupCrew.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAssignmentSlot("setupCrew", idx)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Assistants & Extra Crew */}
              <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Extra Support / Assistants</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addAssignmentSlot("assistants")}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + System Staff
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={addExtraAssistant}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + On-Call / External
                    </button>
                  </div>
                </div>

                {assignment.assistants.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={val}
                      onChange={(e) => updateAssignment("assistants", idx, e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground"
                    >
                      <option value="">-- Select Assistant #{idx + 1} --</option>
                      {staff.map((person) => (
                        <option key={person._id} value={person._id}>
                          {person.full_name} {person.availability_status && person.availability_status !== "Available" ? `(${person.availability_status})` : "✓"}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAssignmentSlot("assistants", idx)}
                      className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {assignment.extraAssistants.map((extra, idx) => (
                  <div key={`extra-${idx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/50">
                    <input
                      placeholder="External Assistant Name"
                      value={extra.name}
                      onChange={(e) => updateExtraAssistant(idx, "name", e.target.value)}
                      className="p-2 rounded-lg border border-border bg-card text-xs text-foreground"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        placeholder="Contact Phone #"
                        value={extra.phone}
                        onChange={(e) => updateExtraAssistant(idx, "phone", e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-border bg-card text-xs text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => removeExtraAssistant(idx)}
                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Btn variant="secondary" onClick={() => setAssignTarget(null)} disabled={submittingAssign}>
                  Cancel
                </Btn>
                <Btn 
                  variant="primary" 
                  onClick={submitAssignment} 
                  disabled={submittingAssign}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {submittingAssign ? "Dispatching..." : "Finalize & Dispatch Team"}
                </Btn>
              </div>
            </div>
          </Modal>
        )}

        {/* Event Detail Modal */}
        {detail && (
          <Modal 
            title={`Event Specifications — ${detail.event_type || "Event"}`} 
            onClose={() => setDetail(null)} 
            className="max-w-3xl"
          >
            <div className="space-y-5 text-xs sm:text-sm max-h-[75vh] overflow-y-auto pr-1">
              {/* Header Status & Reference Bar */}
              <div className="p-3 bg-muted/60 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
              <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
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
                <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Calendar size={13} className="text-primary" /> Date &amp; Time
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {detail.event_date ? new Date(detail.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                  </div>
                  <div className="text-xs text-muted-foreground">{detail.start_time || "Time TBA"} ({detail.duration_hours || 4} hrs)</div>
                </div>

                <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Users size={13} className="text-primary" /> Guests &amp; Package
                  </div>
                  <div className="text-sm font-bold text-foreground">{detail.guest_count || 0} Guests</div>
                  <div className="text-xs text-muted-foreground truncate">{detail.package_id?.name || detail.package_name_snapshot || "Custom Catering Package"}</div>
                </div>

                <div className="p-3.5 bg-card border border-border rounded-xl space-y-1">
                  <div className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <MapPin size={13} className="text-primary" /> Venue Location
                  </div>
                  <div className="text-sm font-bold text-foreground">{detail.venue_type || "Venue"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[detail.street, detail.barangay, detail.municipality].filter(Boolean).join(", ") || "Location TBA"}
                  </div>
                </div>
              </div>

              {/* Menu & Selected Dishes */}
              <div className="space-y-2 p-4 bg-card border border-border rounded-xl">
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
                      <div key={idx} className="p-2.5 bg-muted/40 border border-border rounded-lg flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-foreground text-xs">{item.name}</div>
                          {item.note && <div className="text-[11px] text-muted-foreground">{item.note}</div>}
                        </div>
                        {item.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-card border border-border text-muted-foreground shrink-0">
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
                <div className="space-y-2 p-4 bg-card border border-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" /> Add-on Services &amp; Event Styling
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(detail.service_items || []).map((srv, idx) => (
                      <div key={`srv-${idx}`} className="p-2.5 bg-muted/40 border border-border rounded-lg flex items-center justify-between text-xs">
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
                      <div key={`chg-${idx}`} className="p-2.5 bg-muted/40 border border-border rounded-lg flex items-center justify-between text-xs">
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
                <div className="space-y-3.5 p-4 bg-card border border-border rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
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
                        className={`p-3 rounded-lg border flex flex-col justify-between gap-2 text-xs transition-colors ${
                          eq.missing > 0 
                            ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" 
                            : eq.damaged > 0 
                              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" 
                              : "bg-muted/40 border-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-bold text-foreground truncate" title={eq.name}>
                              {eq.name}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-card border border-border text-foreground shrink-0">
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
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between flex-wrap gap-1.5">
                          <div>
                            {eq.missing > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                <AlertTriangle size={11} className="text-rose-600 dark:text-rose-400" />
                                Missing
                              </span>
                            ) : eq.damaged > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                                Damaged
                              </span>
                            ) : eq.hasVerified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                                Returned Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border">
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
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 px-2 py-0.5 rounded border border-primary/20 transition-colors"
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
                  <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-3 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="managerEquipmentConfirm"
                          checked={managerConfirmed}
                          onChange={(e) => setManagerConfirmed(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          Double-check and confirm equipment counted by staff
                        </span>
                      </label>

                      {detail.equipment_manager_verified?.confirmed && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                          <CheckCircle2 size={12} />
                          Confirmed by {detail.equipment_manager_verified.confirmed_by?.full_name || "Manager"}{" "}
                          {detail.equipment_manager_verified.confirmed_at ? `on ${new Date(detail.equipment_manager_verified.confirmed_at).toLocaleDateString()}` : ""}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Additional Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add manager verification remarks, supplier loss claims, or missing equipment follow-ups..."
                        value={managerEquipmentNotes}
                        onChange={(e) => setManagerEquipmentNotes(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:ring-1 focus:ring-primary resize-y"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Btn
                        variant="primary"
                        size="xs"
                        onClick={handleSaveEquipmentVerification}
                        disabled={submittingVerifyEquipment}
                        className="flex items-center gap-1.5 font-bold cursor-pointer"
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
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" /> Dietary Restrictions &amp; Client Requests
                  </h4>
                  <div className="space-y-1.5 text-amber-950">
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
              <div className="space-y-2 p-4 bg-card border border-border rounded-xl">
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
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck size={13} /> Edit Assignments
                  </button>
                </div>

                {(!detail.staff_assignments || detail.staff_assignments.length === 0) ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                    <span>No staff assigned yet. Click Edit Assignments to dispatch your team.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = detail;
                        setDetail(null);
                        openAssign(target);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs shrink-0 cursor-pointer"
                    >
                      Assign Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {detail.staff_assignments.map((assignment, idx) => (
                      <div key={idx} className="p-2.5 bg-muted/40 border border-border rounded-lg flex items-center justify-between text-xs">
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
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText size={14} className="text-primary" /> Coordinator Operations Briefing Notes
                </h4>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Log an event briefing note or update..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex justify-end">
                    <Btn variant="primary" size="xs" onClick={submitNote} disabled={!note.trim()}>
                      Add Note
                    </Btn>
                  </div>

                  {(detail.event_manager_notes || []).map((entry, idx) => (
                    <div key={idx} className="p-2.5 bg-muted/40 border border-border rounded-lg text-xs">
                      <div className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</div>
                      <div className="mt-0.5 text-foreground">{entry.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Btn variant="secondary" onClick={() => setDetail(null)}>Close</Btn>
              </div>
            </div>
          </Modal>
        )}

        {/* Staff Item Note Modal */}
        {staffNoteModal && (
          <Modal
            title={`Staff Item Notes — ${staffNoteModal.itemName}`}
            onClose={() => setStaffNoteModal(null)}
            className="max-w-md"
          >
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
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
              <div className="flex justify-end">
                <Btn variant="secondary" size="xs" onClick={() => setStaffNoteModal(null)}>
                  Close
                </Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ManagerLayout>
  );
}
