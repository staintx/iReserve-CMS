import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, Edit3, Trash2, Calendar } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import StaffModal from "../../components/admin/ui/StaffModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";

export default function AdminStaff() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activeStaff, setActiveStaff] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getStaff()
      .then((res) => setStaff(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load staff", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const positions = useMemo(() => {
    const distinct = Array.from(new Set(staff.map((s) => s.position).filter(Boolean)));
    return ["all", ...distinct];
  }, [staff]);

  const filtered = staff.filter(s => {
    const matchSearch = !search || (s.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = filter === "all" || s.position === filter;
    return matchSearch && matchRole;
  });

  const initials = (name) => (name || "?").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleOpenModal = (member = null) => {
    setActiveStaff(member);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveStaff(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteStaff(id)
      .then(() => {
        notify("Staff member deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete staff member", "error"));
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Staff Management</h2>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Calendar size={13} /> View Schedule</Btn>
            <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> Add Staff</Btn>
          </div>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-[#9CA3AF]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="bg-transparent text-sm focus:outline-none flex-1"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="bg-gray-100 text-[#6B7280] text-xs font-semibold px-3 py-1.5 rounded-xl border-none focus:ring-0 outline-none capitalize"
              >
                {positions.map(r => (
                  <option key={r} value={r}>{r === "all" ? "All Positions" : r}</option>
                ))}
              </select>
            </div>
            <Btn variant="secondary" size="sm"><Filter size={13} /> Filters</Btn>
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Staff Member","Position","Contact","Events Handled","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading staff...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No staff found.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">
                          {initials(s.full_name)}
                        </div>
                        <span className="text-sm font-semibold text-[#111]">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{s.position || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{s.phone || s.email || "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111] text-center">{s.events_handled || 0}</td>
                    <td className="px-4 py-3"><Badge status={s.is_active ? "available" : "off"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleOpenModal(s)} className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Edit3 size={13} /></button>
                        <button onClick={() => setCancelTarget(s)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      {showModal && (
        <StaffModal
          staff={activeStaff}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Staff Member"
          message={`Are you sure you want to delete "${cancelTarget.full_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}
