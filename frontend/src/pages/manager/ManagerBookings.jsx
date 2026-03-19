import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManagerAPI } from "../../api/manager";
import ManagerLayout from "../../components/layout/ManagerLayout";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";

const TAB_OPTIONS = ["pending", "upcoming", "completed"];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "TBD");
const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

const buildEquipmentList = (booking) => {
  const items = [];
  if (Array.isArray(booking.service_items) && booking.service_items.length > 0) {
    booking.service_items.forEach((item) => items.push(item.name));
  }
  if (Array.isArray(booking.additional_services) && booking.additional_services.length > 0) {
    booking.additional_services.forEach((item) => items.push(item));
  }
  return Array.from(new Set(items.filter(Boolean)));
};

export default function ManagerBookings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [detail, setDetail] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignment, setAssignment] = useState({
    headCook: "",
    servers: [""],
    setupCrew: ["", ""],
    assistants: [""],
    extraAssistants: [{ name: "", phone: "" }]
  });
  const [note, setNote] = useState("");
  const { notify } = useToast();

  const loadBookings = () => {
    ManagerAPI.getBookings(tab).then((res) => setBookings(res.data));
  };

  const loadStaff = () => {
    ManagerAPI.getStaff().then((res) => setStaff(res.data));
  };

  useEffect(() => {
    loadBookings();
  }, [tab]);

  useEffect(() => {
    loadStaff();
  }, []);

  const staffMap = useMemo(() => {
    const map = {};
    staff.forEach((person) => {
      map[person._id] = person;
    });
    return map;
  }, [staff]);

  const openDetails = (booking) => {
    ManagerAPI.getBooking(booking._id).then((res) => setDetail(res.data));
  };

  const openAssign = (booking) => {
    setAssignTarget(booking);
    setAssignment({
      headCook: "",
      servers: [""],
      setupCrew: ["", ""],
      assistants: [""],
      extraAssistants: [{ name: "", phone: "" }]
    });
  };

  const addAssignmentSlot = (key) => {
    setAssignment((prev) => ({
      ...prev,
      [key]: [...prev[key], ""]
    }));
  };

  const addExtraAssistant = () => {
    setAssignment((prev) => ({
      ...prev,
      extraAssistants: [...prev.extraAssistants, { name: "", phone: "" }]
    }));
  };

  const updateAssignment = (key, index, value) => {
    setAssignment((prev) => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateExtraAssistant = (index, field, value) => {
    setAssignment((prev) => {
      const next = prev.extraAssistants.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return { ...prev, extraAssistants: next };
    });
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

    ManagerAPI.assignStaff(assignTarget._id, { staff_assignments: staffAssignments })
      .then(() => {
        notify("Staff assignment saved.", "success");
        setAssignTarget(null);
        loadBookings();
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Failed to assign staff.", "error");
      });
  };

  const submitNote = () => {
    if (!detail || !note.trim()) return;
    ManagerAPI.addNote(detail._id, { note: note.trim() })
      .then((res) => {
        setDetail((prev) => ({ ...prev, manager_notes: res.data }));
        setNote("");
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to add note.", "error"));
  };

  const toggleEquipment = (name, returned) => {
    if (!detail) return;
    ManagerAPI.updateEquipment(detail._id, { name, returned })
      .then((res) => setDetail((prev) => ({ ...prev, equipment_returns: res.data })))
      .catch((err) => notify(err.response?.data?.message || "Failed to update equipment.", "error"));
  };

  const markCompleted = () => {
    if (!detail) return;
    ManagerAPI.markCompleted(detail._id)
      .then((res) => {
        setDetail(res.data);
        loadBookings();
        notify("Event marked as completed.", "success");
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to update event.", "error"));
  };

  const renderBookingCard = (booking) => (
    <div key={booking._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink-900">{booking.customer_id?.full_name || "Customer"}</h3>
          <p className="text-xs text-slate-500">{booking.inquiry_id?.reference || booking._id}</p>
        </div>
        <span className="chip">{booking.event_type || "Event"}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Event</div>
          <div className="font-medium text-ink-900">{booking.event_type || "Event"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Date</div>
          <div className="font-medium text-ink-900">{formatDate(booking.event_date)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {tab === "pending" && (
          <button className="btn" type="button" onClick={() => openAssign(booking)}>Assign Staff Now</button>
        )}
        <button className="btn-outline" type="button" onClick={() => openDetails(booking)}>
          View Details
        </button>
      </div>
    </div>
  );

  const equipmentItems = detail ? buildEquipmentList(detail) : [];

  const equipmentStatus = (name) => {
    const entry = detail?.equipment_returns?.find((item) => item.name === name);
    return entry?.returned || false;
  };

  return (
    <ManagerLayout onCalendar={() => navigate("/manager/dashboard")}>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">My Assigned Events</h1>
        <p className="mt-2 text-sm text-slate-500">View all events assigned to you</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-full bg-white p-2 shadow-soft">
        {TAB_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === option ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
            }`}
            onClick={() => setTab(option)}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6">
        {bookings.length === 0 && (
          <div className="panel">
            <p className="text-sm text-slate-500">No {tab} events yet.</p>
          </div>
        )}
        {bookings.map(renderBookingCard)}
      </div>

      {assignTarget && (
        <Modal title="Staff Assignment" onClose={() => setAssignTarget(null)}>
          <div className="space-y-6 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap justify-between gap-4 text-xs text-slate-600">
                <div>
                  <div className="font-semibold text-ink-900">Customer</div>
                  <div>{assignTarget.customer_id?.full_name || "Customer"}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink-900">Date</div>
                  <div>{formatDate(assignTarget.event_date)}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink-900">Service Type</div>
                  <span className="chip">{assignTarget.event_type || "Event"}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kitchen Staff</div>
              <div className="mt-2 rounded-2xl border border-slate-200 p-3">
                <label className="text-xs font-semibold text-slate-500">Assign Head Cook</label>
                <select
                  className="mt-2"
                  value={assignment.headCook}
                  onChange={(event) => setAssignment((prev) => ({ ...prev, headCook: event.target.value }))}
                >
                  <option value="">Select Head Cook</option>
                  {staff.map((person) => (
                    <option key={person._id} value={person._id}>{person.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Servers</div>
              <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
                {assignment.servers.map((value, index) => (
                  <select
                    key={`server-${index}`}
                    value={value}
                    onChange={(event) => updateAssignment("servers", index, event.target.value)}
                  >
                    <option value="">Select Server</option>
                    {staff.map((person) => (
                      <option key={person._id} value={person._id}>{person.full_name}</option>
                    ))}
                  </select>
                ))}
                <button className="btn-outline" type="button" onClick={() => addAssignmentSlot("servers")}>+</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Setup Crew</div>
              <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
                {assignment.setupCrew.map((value, index) => (
                  <select
                    key={`setup-${index}`}
                    value={value}
                    onChange={(event) => updateAssignment("setupCrew", index, event.target.value)}
                  >
                    <option value="">Select Setup Crew</option>
                    {staff.map((person) => (
                      <option key={person._id} value={person._id}>{person.full_name}</option>
                    ))}
                  </select>
                ))}
                <button className="btn-outline" type="button" onClick={() => addAssignmentSlot("setupCrew")}>+</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assistants</div>
              <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
                {assignment.assistants.map((value, index) => (
                  <select
                    key={`assistant-${index}`}
                    value={value}
                    onChange={(event) => updateAssignment("assistants", index, event.target.value)}
                  >
                    <option value="">Select Assistant</option>
                    {staff.map((person) => (
                      <option key={person._id} value={person._id}>{person.full_name}</option>
                    ))}
                  </select>
                ))}
                <button className="btn-outline" type="button" onClick={() => addAssignmentSlot("assistants")}>+</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Extra Assistants</div>
              <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
                {assignment.extraAssistants.map((item, index) => (
                  <div key={`extra-${index}`} className="grid gap-2 sm:grid-cols-2">
                    <input
                      placeholder="Name"
                      value={item.name}
                      onChange={(event) => updateExtraAssistant(index, "name", event.target.value)}
                    />
                    <input
                      placeholder="Contact Number"
                      value={item.phone}
                      onChange={(event) => updateExtraAssistant(index, "phone", event.target.value)}
                    />
                  </div>
                ))}
                <button className="btn-outline" type="button" onClick={addExtraAssistant}>+</button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button className="btn-outline" type="button" onClick={() => setAssignTarget(null)}>Cancel</button>
              <button className="btn" type="button" onClick={submitAssignment}>Finalize &amp; Dispatch Team</button>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal title="Event Details" onClose={() => setDetail(null)}>
          <div className="space-y-6 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contact Information</div>
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Name</div>
                  <div className="font-medium">{detail.contact_first_name} {detail.contact_last_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Phone</div>
                  <div className="font-medium">{detail.contact_phone || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Email</div>
                  <div className="font-medium">{detail.contact_email || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Preferred Contact</div>
                  <div className="font-medium">{detail.contact_method || "-"}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Event Details</div>
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Event Type</div>
                  <div className="font-medium">{detail.event_type || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Event Date</div>
                  <div className="font-medium">{formatDate(detail.event_date)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Start Time</div>
                  <div className="font-medium">{detail.start_time || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Duration</div>
                  <div className="font-medium">{detail.duration_hours ? `${detail.duration_hours} hours` : "-"}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Venue Information</div>
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Venue Type</div>
                  <div className="font-medium">{detail.venue_type || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Location</div>
                  <div className="font-medium">{detail.municipality || "-"}, {detail.province || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Contact Person</div>
                  <div className="font-medium">{detail.venue_contact_name || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Contact Number</div>
                  <div className="font-medium">{detail.venue_contact_phone || "-"}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Menu Options</div>
              <div className="mt-2 space-y-2">
                {(detail.menu_items || []).map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">Notes: {item.note || "-"}</div>
                    </div>
                    <div className="text-sm font-semibold text-ink-900">{formatMoney(item.price)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Additional Services</div>
              <div className="mt-2 space-y-2">
                {(detail.service_items || []).map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">Quantity: {item.quantity || 0}</div>
                    </div>
                    <div className="text-sm font-semibold text-ink-900">{formatMoney(item.price)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payment Information</div>
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Selected Package</span>
                  <span className="font-medium">{detail.package_id?.name || "-"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total Amount</span>
                  <span className="font-semibold text-ink-900">{formatMoney(detail.total_price)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-medium">{detail.payment_method || "-"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="chip">{detail.payment_status || "pending"}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assigned Staff</div>
              <div className="mt-2 space-y-2">
                {(detail.staff_assignments || []).length === 0 && (
                  <p className="text-xs text-slate-500">No staff assigned yet.</p>
                )}
                {(detail.staff_assignments || []).map((assignment, index) => (
                  <div key={`${assignment.role}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                    <div>
                      <div className="font-medium">{assignment.name || assignment.user_id?.full_name || "Staff"}</div>
                      <div className="text-xs text-slate-500">{assignment.role}</div>
                    </div>
                    <span className="chip">Assigned</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Event Notes &amp; Incident Reports</div>
              <div className="mt-2 space-y-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <textarea
                    rows={3}
                    placeholder="Add a note..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <div className="mt-2 text-right">
                    <button className="btn" type="button" onClick={submitNote}>Add Note</button>
                  </div>
                </div>
                {(detail.manager_notes || []).map((entry, index) => (
                  <div key={`note-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</div>
                    <div className="mt-1 text-sm text-ink-900">{entry.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Equipment Return Checklist</div>
              <div className="mt-2 space-y-2">
                {equipmentItems.length === 0 && (
                  <p className="text-xs text-slate-500">No equipment items recorded.</p>
                )}
                {equipmentItems.map((item) => {
                  const isReturned = equipmentStatus(item);
                  return (
                    <label key={item} className={`flex items-center justify-between rounded-2xl border p-3 ${
                      isReturned ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}>
                      <div>
                        <div className="font-medium">{item}</div>
                        <div className="text-xs text-slate-500">{isReturned ? "Returned" : "Not yet returned"}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isReturned}
                        onChange={(event) => toggleEquipment(item, event.target.checked)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <button className="btn-outline" type="button" onClick={() => setDetail(null)}>Close</button>
              {detail.status !== "completed" && (
                <button className="btn" type="button" onClick={markCompleted}>Mark Event as Completed</button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </ManagerLayout>
  );
}
