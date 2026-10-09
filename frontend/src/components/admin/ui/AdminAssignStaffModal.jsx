import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  ChefHat,
  UtensilsCrossed,
  Wrench,
  HelpCircle
} from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../ui/dialog";
import { formatEventDate } from "../../../utils/format";

const CREW_SELECT =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0] shadow-2xs font-medium";

function CrewRow({ value, options, placeholder, onChange, onRemove, removeLabel }) {
  const isAssigned = Boolean(value);
  return (
    <div className={`flex items-center gap-2 p-1 rounded-lg transition-colors ${isAssigned ? "bg-[#D6E4F7]/20 border border-[#4C81E0]/25" : "bg-white border border-slate-200"}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className={CREW_SELECT + " flex-1 min-w-0 border-0 shadow-none bg-transparent focus:ring-0"}
      >
        <option value="">{placeholder}</option>
        {options}
      </select>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-[#64748B] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function CrewGroup({ label, count, icon: Icon, addLabel, onAdd, secondaryAddLabel, onSecondaryAdd, children }) {
  return (
    <fieldset className="space-y-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5">
      <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1E293B] flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-[#4C81E0] shrink-0" />}
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-[10px] font-semibold text-[#64748B] bg-slate-200/70 px-1.5 py-0.2 rounded">
            {count}
          </span>
        )}
      </legend>
      <div className="space-y-2">{children}</div>
      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#4C81E0]/40 bg-white text-xs font-semibold text-[#4C81E0] hover:bg-[#D6E4F7]/25 transition-colors cursor-pointer shadow-2xs"
        >
          <Plus size={13} /> {addLabel}
        </button>
        {onSecondaryAdd && (
          <button
            type="button"
            onClick={onSecondaryAdd}
            className="flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-semibold text-[#64748B] hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} /> {secondaryAddLabel}
          </button>
        )}
      </div>
    </fieldset>
  );
}

export default function AdminAssignStaffModal({ booking, open, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const [assignment, setAssignment] = useState({
    headCook: "",
    servers: [""],
    setupCrew: ["", ""],
    assistants: [""],
    extraAssistants: []
  });

  // Load available staff and initialize form from booking
  useEffect(() => {
    if (!open || !booking) return;

    // 1. Initialize assignment form from booking.staff_assignments
    const existing = Array.isArray(booking.staff_assignments) ? booking.staff_assignments : [];
    const headCook =
      existing.find((a) => a.role === "Head Cook")?.user_id?._id ||
      existing.find((a) => a.role === "Head Cook")?.user_id ||
      "";
    const servers = existing
      .filter((a) => a.role === "Server")
      .map((a) => a.user_id?._id || a.user_id || "");
    const setupCrew = existing
      .filter((a) => a.role === "Setup Crew")
      .map((a) => a.user_id?._id || a.user_id || "");
    const assistants = existing
      .filter((a) => a.role === "Assistant" && (a.user_id?._id || a.user_id))
      .map((a) => a.user_id?._id || a.user_id);
    const extraAssistants = existing
      .filter((a) => a.role === "Assistant" && !a.user_id && a.name)
      .map((a) => ({ name: a.name, phone: a.phone || "" }));

    setAssignment({
      headCook: headCook || "",
      servers: servers.length > 0 ? servers : [""],
      setupCrew: setupCrew.length > 0 ? setupCrew : ["", ""],
      assistants: assistants.length > 0 ? assistants : [""],
      extraAssistants: extraAssistants
    });

    // 2. Fetch staff availability
    setLoading(true);
    const params = booking.event_date ? { event_date: booking.event_date } : {};
    
    // Attempt getStaffAvailability first, fallback to getStaff
    const fetchPromise = AdminAPI.getStaffAvailability
      ? AdminAPI.getStaffAvailability(params)
      : AdminAPI.getStaff();

    fetchPromise
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStaffList(list.filter((s) => s.role === "staff" || !s.role || s.role === "manager"));
      })
      .catch(() => {
        // Fallback to standard staff list
        AdminAPI.getStaff()
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            setStaffList(list);
          })
          .catch(() => setStaffList([]));
      })
      .finally(() => setLoading(false));
  }, [open, booking]);

  const staffMap = useMemo(() => {
    const map = {};
    staffList.forEach((person) => {
      map[person._id] = person;
    });
    return map;
  }, [staffList]);

  // Options list for dropdowns
  const staffOptions = useMemo(
    () =>
      staffList.map((person) => (
        <option key={person._id} value={person._id}>
          {person.full_name}
          {person.position ? ` - ${person.position}` : ""}
          {person.availability_status && person.availability_status !== "Available"
            ? ` (${person.availability_status})`
            : ""}
        </option>
      )),
    [staffList]
  );

  const selectedCrewCount = useMemo(() => {
    const picked = [
      assignment.headCook,
      ...assignment.servers,
      ...assignment.setupCrew,
      ...assignment.assistants
    ].filter(Boolean).length;
    const external = assignment.extraAssistants.filter((e) => e.name || e.phone).length;
    return picked + external;
  }, [assignment]);

  // Helpers to mutate slots
  const addSlot = (key) => {
    setAssignment((prev) => ({
      ...prev,
      [key]: [...prev[key], ""]
    }));
  };

  const removeSlot = (key, index) => {
    setAssignment((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, idx) => idx !== index)
    }));
  };

  const updateSlot = (key, index, value) => {
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

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!booking) return;

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
      notify("Please select or enter at least one crew member.", "error");
      return;
    }

    if (["completed", "Completed"].includes(booking?.status)) {
      notify("This booking has already been completed and is read-only.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await AdminAPI.assignStaff(booking._id, { staff_assignments: staffAssignments });
      notify("Staff team assigned and dispatched successfully!", "success");
      if (onSave) {
        onSave(res.data?.booking || res.data);
      }
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to assign staff team.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  const isPast = booking.event_date && new Date(booking.event_date) < new Date();
  const customerName =
    booking.customer_id?.full_name ||
    `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.trim() ||
    "Customer";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#4C81E0]" />
                  Assign Staff: {booking.event_type || "Catering Event"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748B] mt-0.5">
                  Select and assign kitchen, service, setup, and support crew members for this event.
                </DialogDescription>
              </div>
              <span className="font-mono text-xs font-bold text-[#4C81E0] bg-[#D6E4F7]/40 border border-[#4C81E0]/25 px-2.5 py-1 rounded-md shrink-0">
                {booking.reference || `BK-${String(booking._id).slice(-6).toUpperCase()}`}
              </span>
            </div>

            {/* Event Context Pill */}
            <div className="mt-2.5 p-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-[#1E293B]">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1E293B]">{customerName}</span>
                <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                  <Calendar size={12} className="text-[#4C81E0]" />
                  {booking.event_date ? formatEventDate(booking.event_date) : "TBD"}
                </span>
                {booking.start_time && (
                  <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                    <Clock size={12} className="text-[#4C81E0]" />
                    {booking.start_time}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] bg-slate-200/60 px-2 py-0.5 rounded">
                {booking.event_type || "Event"}
              </span>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#4C81E0]" />
                <span className="text-xs">Loading staff roster and schedule availability...</span>
              </div>
            ) : (
              <>
                {/* Past Event Notice */}
                {isPast && (
                  <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">Past Event</p>
                      <p className="text-[11.5px] text-amber-800">
                        Staff assignments are being recorded for this completed event.
                      </p>
                    </div>
                  </div>
                )}

                {/* No Registered Staff Fallback Notice */}
                {staffList.length === 0 && (
                  <div className="p-3 rounded-lg bg-[#D6E4F7]/30 border border-[#4C81E0]/30 text-xs text-[#1E293B] flex items-start gap-2.5 shadow-2xs">
                    <HelpCircle size={15} className="text-[#4C81E0] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-[#1E293B]">No Staff Accounts Available</p>
                      <p className="text-[11.5px] text-[#64748B]">
                        No registered staff accounts were found. You can add external or on-call crew members using the <strong>Add External Staff</strong> option under Support Staff below.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Head Cook / Chef */}
                <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                  <label htmlFor="admin-assign-head-cook" className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#1E293B]">
                    <span className="flex items-center gap-1.5">
                      <ChefHat size={13} className="text-[#4C81E0]" />
                      Head Cook
                    </span>
                    <span className="text-[10px] font-normal text-[#64748B]">Kitchen &amp; Culinary Lead</span>
                  </label>
                  <select
                    id="admin-assign-head-cook"
                    value={assignment.headCook}
                    onChange={(e) => setAssignment({ ...assignment, headCook: e.target.value })}
                    className={CREW_SELECT}
                  >
                    <option value="">Select head cook...</option>
                    {staffOptions}
                  </select>
                </div>

                {/* 2. Service Staff */}
                <CrewGroup
                  label="Service Staff"
                  count={assignment.servers.filter(Boolean).length}
                  icon={UtensilsCrossed}
                  addLabel="Add Service Staff"
                  onAdd={() => addSlot("servers")}
                >
                  {assignment.servers.map((val, idx) => (
                    <CrewRow
                      key={idx}
                      value={val}
                      placeholder={`Select service staff #${idx + 1}...`}
                      options={staffOptions}
                      onChange={(next) => updateSlot("servers", idx, next)}
                      onRemove={assignment.servers.length > 1 ? () => removeSlot("servers", idx) : null}
                      removeLabel={`Remove service staff ${idx + 1}`}
                    />
                  ))}
                </CrewGroup>

                {/* 3. Setup Staff */}
                <CrewGroup
                  label="Setup Staff"
                  count={assignment.setupCrew.filter(Boolean).length}
                  icon={Wrench}
                  addLabel="Add Setup Staff"
                  onAdd={() => addSlot("setupCrew")}
                >
                  {assignment.setupCrew.map((val, idx) => (
                    <CrewRow
                      key={idx}
                      value={val}
                      placeholder={`Select setup staff #${idx + 1}...`}
                      options={staffOptions}
                      onChange={(next) => updateSlot("setupCrew", idx, next)}
                      onRemove={assignment.setupCrew.length > 1 ? () => removeSlot("setupCrew", idx) : null}
                      removeLabel={`Remove setup staff ${idx + 1}`}
                    />
                  ))}
                </CrewGroup>

                {/* 4. Support Staff */}
                <CrewGroup
                  label="Support Staff"
                  count={assignment.assistants.filter(Boolean).length + assignment.extraAssistants.filter((e) => e.name || e.phone).length}
                  icon={Users}
                  addLabel="Add Support Staff"
                  onAdd={() => addSlot("assistants")}
                  secondaryAddLabel="Add External Staff"
                  onSecondaryAdd={addExtraAssistant}
                >
                  {assignment.assistants.map((val, idx) => (
                    <CrewRow
                      key={idx}
                      value={val}
                      placeholder={`Select support staff #${idx + 1}...`}
                      options={staffOptions}
                      onChange={(next) => updateSlot("assistants", idx, next)}
                      onRemove={() => removeSlot("assistants", idx)}
                      removeLabel={`Remove support staff ${idx + 1}`}
                    />
                  ))}

                  {/* External On-Call Inputs */}
                  {assignment.extraAssistants.map((extra, idx) => (
                    <div
                      key={`extra-${idx}`}
                      className="p-2.5 rounded-lg border border-dashed border-[#4C81E0]/30 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#1E293B]">
                        <span>External Staff Member #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeExtraAssistant(idx)}
                          className="text-[#64748B] hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          placeholder="Staff member full name"
                          value={extra.name}
                          onChange={(e) => updateExtraAssistant(idx, "name", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                        />
                        <input
                          type="tel"
                          placeholder="Contact phone number"
                          value={extra.phone}
                          onChange={(e) => updateExtraAssistant(idx, "phone", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#4C81E0]"
                        />
                      </div>
                    </div>
                  ))}
                </CrewGroup>
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-3 sm:p-4 border-t border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] tabular-nums">
              {selectedCrewCount === 0 ? "No staff selected yet" : `${selectedCrewCount} staff member${selectedCrewCount === 1 ? "" : "s"} selected`}
            </span>
            <div className="flex items-center gap-2">
              <Btn type="button" variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Btn>
              <Btn
                type="submit"
                variant="primary"
                disabled={saving || selectedCrewCount === 0}
                className="bg-[#4C81E0] hover:bg-[#3b6ec9] text-white font-bold gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <UserCheck size={14} /> Save Staff Assignment
                  </>
                )}
              </Btn>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
