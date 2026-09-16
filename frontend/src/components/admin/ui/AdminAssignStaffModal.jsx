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
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium";

function CrewRow({ value, options, placeholder, onChange, onRemove, removeLabel }) {
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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function CrewGroup({ label, icon: Icon, addLabel, onAdd, secondaryAddLabel, onSecondaryAdd, children }) {
  return (
    <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-amber-600 shrink-0" />}
        <span>{label}</span>
      </legend>
      <div className="space-y-2">{children}</div>
      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-semibold text-amber-700 hover:border-amber-500 hover:bg-amber-50/50 transition-colors cursor-pointer shadow-2xs"
        >
          <Plus size={13} /> {addLabel}
        </button>
        {onSecondaryAdd && (
          <button
            type="button"
            onClick={onSecondaryAdd}
            className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:border-slate-400 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
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
          {person.position ? ` — ${person.position}` : ""}
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

    if (staffAssignments.length === 0) {
      notify("Please select or enter at least one crew member.", "error");
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
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  Assign Staff Team &amp; Crew
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Select and dispatch kitchen, service, setup, and support crew members for this event.
                </DialogDescription>
              </div>
              <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md shrink-0">
                {booking.reference || `BK-${String(booking._id).slice(-6).toUpperCase()}`}
              </span>
            </div>

            {/* Event Context Pill */}
            <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">{customerName}</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar size={12} className="text-amber-600" />
                  {booking.event_date ? formatEventDate(booking.event_date) : "TBD"}
                </span>
                {booking.start_time && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock size={12} className="text-amber-600" />
                    {booking.start_time}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                {booking.event_type || "Event"}
              </span>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span className="text-xs">Loading staff roster and schedule availability...</span>
              </div>
            ) : (
              <>
                {/* Past Event Notice */}
                {isPast && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Past Event — Retroactive Team Logging</p>
                      <p className="text-[11.5px] text-amber-800">
                        This event has concluded. Assignments saved here record crew attendance for payroll, equipment returns verification, and service audit.
                      </p>
                    </div>
                  </div>
                )}

                {/* No Registered Staff Fallback Notice */}
                {staffList.length === 0 && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2 shadow-2xs">
                    <HelpCircle size={15} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">No Staff Accounts Available</p>
                      <p className="text-[11.5px] text-blue-800">
                        No registered staff accounts were found. You can add external or on-call crew members using the <strong>Add on-call / external</strong> option under Extra Support below.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Head Cook / Chef */}
                <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                  <label htmlFor="admin-assign-head-cook" className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ChefHat size={13} className="text-amber-600" />
                      Head Cook / Executive Chef
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">Kitchen &amp; Culinary Lead</span>
                  </label>
                  <select
                    id="admin-assign-head-cook"
                    value={assignment.headCook}
                    onChange={(e) => setAssignment({ ...assignment, headCook: e.target.value })}
                    className={CREW_SELECT}
                  >
                    <option value="">Select head cook…</option>
                    {staffOptions}
                  </select>
                </div>

                {/* 2. Servers / Waitstaff */}
                <CrewGroup
                  label="Servers &amp; Waitstaff"
                  icon={UtensilsCrossed}
                  addLabel="Add server slot"
                  onAdd={() => addSlot("servers")}
                >
                  {assignment.servers.map((val, idx) => (
                    <CrewRow
                      key={idx}
                      value={val}
                      placeholder={`Select server #${idx + 1}…`}
                      options={staffOptions}
                      onChange={(next) => updateSlot("servers", idx, next)}
                      onRemove={assignment.servers.length > 1 ? () => removeSlot("servers", idx) : null}
                      removeLabel={`Remove server ${idx + 1}`}
                    />
                  ))}
                </CrewGroup>

                {/* 3. Setup & Logistics Crew */}
                <CrewGroup
                  label="Setup &amp; Logistics Crew"
                  icon={Wrench}
                  addLabel="Add setup crew slot"
                  onAdd={() => addSlot("setupCrew")}
                >
                  {assignment.setupCrew.map((val, idx) => (
                    <CrewRow
                      key={idx}
                      value={val}
                      placeholder={`Select setup crew #${idx + 1}…`}
                      options={staffOptions}
                      onChange={(next) => updateSlot("setupCrew", idx, next)}
                      onRemove={assignment.setupCrew.length > 1 ? () => removeSlot("setupCrew", idx) : null}
                      removeLabel={`Remove setup crew ${idx + 1}`}
                    />
                  ))}
                </CrewGroup>

                {/* 4. Extra Support / Assistants & On-Call */}
                <CrewGroup
                  label="Extra Support &amp; Assistants"
                  icon={Users}
                  addLabel="Add staff assistant slot"
                  onAdd={() => addSlot("assistants")}
                  secondaryAddLabel="Add on-call / external crew"
                  onSecondaryAdd={addExtraAssistant}
                >
                  {assignment.assistants.map((val, idx) => (
                    <CrewRow
                      key={idx}
                      value={val}
                      placeholder={`Select assistant #${idx + 1}…`}
                      options={staffOptions}
                      onChange={(next) => updateSlot("assistants", idx, next)}
                      onRemove={() => removeSlot("assistants", idx)}
                      removeLabel={`Remove assistant ${idx + 1}`}
                    />
                  ))}

                  {/* External On-Call Inputs */}
                  {assignment.extraAssistants.map((extra, idx) => (
                    <div
                      key={`extra-${idx}`}
                      className="p-2.5 rounded-lg border border-dashed border-slate-300 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>External / On-Call Crew #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeExtraAssistant(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          placeholder="Crew member full name"
                          value={extra.name}
                          onChange={(e) => updateExtraAssistant(idx, "name", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          type="tel"
                          placeholder="Contact phone number"
                          value={extra.phone}
                          onChange={(e) => updateExtraAssistant(idx, "phone", e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </CrewGroup>
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 tabular-nums">
              {selectedCrewCount === 0 ? "No crew selected yet" : `${selectedCrewCount} crew members selected`}
            </span>
            <div className="flex items-center gap-2">
              <Btn type="button" variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Btn>
              <Btn
                type="submit"
                variant="primary"
                disabled={saving || selectedCrewCount === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <UserCheck size={14} /> {isPast ? "Save Attendance" : "Dispatch Team"}
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
