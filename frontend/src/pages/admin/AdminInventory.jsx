import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import AdminInventoryForm from "../../components/forms/AdminInventoryForm";
import useToast from "../../hooks/useToast";

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ available: true });
  const [activeView, setActiveView] = useState("card");
  const [bookings, setBookings] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { notify } = useToast();

  const load = () => AdminAPI.getInventory().then((res) => setItems(Array.isArray(res.data) ? res.data : []));
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      if (form._id) {
        await AdminAPI.updateInventory(form._id, form);
        notify("Inventory item updated.", "success");
      } else {
        await AdminAPI.createInventory(form);
        notify("Inventory item created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "We could not save the inventory item. Please try again.", "error");
      return;
    }
    setShow(false);
    setForm({ available: true });
    load();
  };

  const edit = (i) => { setForm(i); setShow(true); };
  const remove = (id) =>
    AdminAPI.deleteInventory(id)
      .then(() => {
        notify("Inventory item deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not delete the inventory item. Please try again.", "error"));
  const toggleAvailability = (item) =>
    AdminAPI.updateInventory(item._id, { ...item, available: !item.available })
      .then(() => {
        notify(item.available ? "Inventory item disabled." : "Inventory item enabled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not update the inventory item. Please try again.", "error"));

  const mockItems = [
    { _id: "mock-1", item_name: "Couch", quantity: 10, category: "Event Setup & Furniture", available: true },
    { _id: "mock-2", item_name: "Balloon", quantity: 100, category: "Event Setup & Furniture", available: true },
    { _id: "mock-3", item_name: "Cake Table", quantity: 80, category: "Event Setup & Furniture", available: true },
    { _id: "mock-4", item_name: "Round Table", quantity: 50, category: "Event Setup & Furniture", available: true },
    { _id: "mock-5", item_name: "Monoblock Chairs", quantity: 300, category: "Event Setup & Furniture", available: true },

    { _id: "mock-6", item_name: "Food Warmer", quantity: 50, category: "Dining & Services Inventory", available: true },
    { _id: "mock-7", item_name: "Serving Spoons", quantity: 300, category: "Dining & Services Inventory", available: true },
    { _id: "mock-8", item_name: "Plates", quantity: 300, category: "Dining & Services Inventory", available: true },
    { _id: "mock-9", item_name: "Glasses", quantity: 300, category: "Dining & Services Inventory", available: true },
    { _id: "mock-10", item_name: "Ice Cooler", quantity: 20, category: "Dining & Services Inventory", available: true },

    { _id: "mock-11", item_name: "Standee", quantity: 5, category: "Adds On", available: true },
    { _id: "mock-12", item_name: "Candy Corner", quantity: 5, category: "Adds On", available: true },
    { _id: "mock-13", item_name: "Host", quantity: 5, category: "Adds On", available: true },
    { _id: "mock-14", item_name: "Clown", quantity: 5, category: "Adds On", available: true },
    { _id: "mock-15", item_name: "Cake", quantity: 10, category: "Adds On", available: true }
  ];

  const list = items.length > 0 ? items : mockItems;

  const viewGroups = [
    { key: "Event Setup & Furniture", title: "Event Setup & Furniture" },
    { key: "Dining & Services Inventory", title: "Dining & Services Inventory" },
    { key: "Adds On", title: "Adds On" }
  ];

  const normalizeCategory = (value) => {
    const c = String(value || "").toLowerCase();
    if (c.includes("event") || c.includes("furniture") || c.includes("setup")) return "Event Setup & Furniture";
    if (c.includes("dining") || c.includes("service") || c.includes("services")) return "Dining & Services Inventory";
    if (c.includes("add")) return "Adds On";
    return "Adds On";
  };

  const grouped = useMemo(() => {
    const bucket = {
      "Event Setup & Furniture": [],
      "Dining & Services Inventory": [],
      "Adds On": []
    };
    list.forEach((item) => {
      const key = normalizeCategory(item.category);
      bucket[key].push(item);
    });
    return bucket;
  }, [list]);

  useEffect(() => {
    if (activeView !== "calendar") return;
    if (bookings.length > 0) return;
    AdminAPI.getBookings()
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBookings([]));
  }, [activeView, bookings.length]);

  const monthLabel = useMemo(() => {
    try {
      return calendarMonth.toLocaleString(undefined, { month: "long", year: "numeric" });
    } catch {
      return "";
    }
  }, [calendarMonth]);

  const days = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const start = new Date(year, month, 1);
    const startWeekday = start.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const dayNumber = i - startWeekday + 1;
      if (dayNumber < 1 || dayNumber > lastDay) {
        cells.push(null);
      } else {
        cells.push(new Date(year, month, dayNumber));
      }
    }
    return cells;
  }, [calendarMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    bookings.forEach((b) => {
      if (!b?.event_date) return;
      const d = new Date(b.event_date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== year || d.getMonth() !== month) return;

      const day = d.getDate();
      const name = [b.contact_first_name, b.contact_last_name].filter(Boolean).join(" ") || "Booking";
      const listForDay = map.get(day) || [];
      listForDay.push(name);
      map.set(day, listForDay);
    });

    return map;
  }, [bookings, calendarMonth]);

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Inventory</h1>
          <p>Track equipment and supplies</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => setShow(true)}>+ Add Inventory Item</button>
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "16px" }}>
        <div className="view-toggle" aria-label="Inventory views">
          <button
            type="button"
            className={activeView === "card" ? "active" : ""}
            onClick={() => setActiveView("card")}
          >
            <span aria-hidden="true">▦</span>
            Card View
          </button>
          <button
            type="button"
            className={activeView === "calendar" ? "active" : ""}
            onClick={() => setActiveView("calendar")}
          >
            <span aria-hidden="true">📅</span>
            Calendar View
          </button>
        </div>
      </div>

      {activeView === "card" ? (
        <>
          <div className="inventory-section-title">Event Setup &amp; Needs</div>

          {viewGroups.map((g) => (
            <div key={g.key} className="inventory-group">
              <div className="inventory-group-title">{g.title}</div>
              <div className="inventory-grid">
                {grouped[g.key].map((item) => (
                  <div key={item._id} className="inventory-card">
                    <div className="inventory-card-head">
                      <div className="inventory-item-name">{item.item_name}</div>
                      <label className="switch" aria-label="Toggle availability">
                        <input
                          type="checkbox"
                          checked={item.available !== false}
                          onChange={() => (item._id?.startsWith("mock-") ? null : toggleAvailability(item))}
                          disabled={item._id?.startsWith("mock-")}
                        />
                        <span className="slider" />
                      </label>
                    </div>

                    <div className="inventory-qty">{Number(item.quantity) || 0}</div>
                    <div className="inventory-units">Units</div>

                    <div className="inventory-actions">
                      <button
                        type="button"
                        className="inv-action edit"
                        onClick={() => (item._id?.startsWith("mock-") ? null : edit(item))}
                        aria-label="Edit"
                        disabled={item._id?.startsWith("mock-")}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="inv-action delete"
                        onClick={() => (item._id?.startsWith("mock-") ? null : remove(item._id))}
                        aria-label="Delete"
                        disabled={item._id?.startsWith("mock-")}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="admin-table-wrap">
          <div className="calendar-card">
            <div className="calendar-head">
              <div className="calendar-title">Equipment Usage Calendar</div>
              <div className="calendar-nav">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <div className="calendar-month">{monthLabel}</div>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {[["Sun"], ["Mon"], ["Tue"], ["Wed"], ["Thu"], ["Fri"], ["Sat"]].map((d) => (
                <div key={d[0]} className="calendar-weekday">{d[0]}</div>
              ))}

              {days.map((date, idx) => {
                const isEmpty = !date;
                const day = date ? date.getDate() : null;
                const events = day ? eventsByDay.get(day) || [] : [];
                return (
                  <div key={idx} className={`calendar-cell ${isEmpty ? "is-empty" : ""}`.trim()}>
                    {date ? <div className="calendar-day">{day}</div> : null}
                    {events.slice(0, 2).map((name, i) => (
                      <div key={`${day}-${i}-${name}`} className="calendar-event">{name}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {show && (
        <Modal title="Add Inventory Item" onClose={() => setShow(false)} className="inventory-form-modal">
          <AdminInventoryForm
            form={form}
            setForm={setForm}
            onCancel={() => setShow(false)}
            onSubmit={submit}
            submitLabel={form._id ? "Save Changes" : "Add Item"}
          />
        </Modal>
      )}
    </AdminLayout>
  );
}