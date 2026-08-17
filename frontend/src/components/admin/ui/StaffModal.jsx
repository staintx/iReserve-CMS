import React, { useState, useEffect } from "react";
import { X, ShieldCheck, UserCheck } from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function StaffModal({ staff, defaultRole = "staff", onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    role: defaultRole,
    position: "",
    is_active: true
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        full_name: staff.full_name || "",
        email: staff.email || "",
        phone: staff.phone || "",
        username: staff.username || "",
        password: "",
        role: staff.role || defaultRole,
        position: staff.position || "",
        is_active: staff.is_active !== false
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        role: defaultRole
      }));
    }
  }, [staff, defaultRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      notify("Please provide a name and email", "error");
      return;
    }
    if (!staff && !formData.password.trim()) {
      notify("Please provide a password for the new account", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        username: formData.username || undefined,
        role: formData.role || "staff",
        position: formData.position,
        is_active: formData.is_active
      };
      if (formData.password) payload.password = formData.password;

      if (staff && staff._id) {
        await AdminAPI.updateStaff(staff._id, payload);
        notify(`${formData.role === "manager" ? "Manager" : "Staff member"} updated successfully`, "success");
      } else {
        await AdminAPI.createStaff(payload);
        notify(`${formData.role === "manager" ? "Manager" : "Staff member"} created successfully`, "success");
      }
      onSave();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to save account", "error");
    } finally {
      setLoading(false);
    }
  };

  const isManagerRole = formData.role === "manager";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-foreground text-lg">
              {staff 
                ? `Edit ${isManagerRole ? "Manager" : "Staff"} Account` 
                : isManagerRole 
                ? "Create Manager Account" 
                : "Create Staff Account"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isManagerRole 
                ? "Manager accounts can coordinate bookings, assign staff, and oversee events" 
                : "Staff accounts can view assigned events and log checklists/reports"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Account Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "manager" })}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  isManagerRole 
                    ? "border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20" 
                    : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                }`}
              >
                <ShieldCheck className={isManagerRole ? "text-amber-600" : "text-gray-400"} size={18} />
                <div>
                  <div className="text-xs font-bold">Event Manager</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Lead coordinator</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "staff" })}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  !isManagerRole 
                    ? "border-primary-500 bg-primary-50/70 text-primary-950 ring-2 ring-primary-500/20" 
                    : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                }`}
              >
                <UserCheck className={!isManagerRole ? "text-primary-600" : "text-gray-400"} size={18} />
                <div>
                  <div className="text-xs font-bold">Staff Member</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Crew, Cook, Server</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. Patricia Lee"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Position / Job Title</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder={isManagerRole ? "e.g. Senior Event Coordinator" : "e.g. Head Cook, Server, Setup Crew"}
              value={formData.position}
              onChange={e => setFormData({ ...formData, position: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="name@email.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="+63 900 000 0000"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Username</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="optional username"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {staff ? "New Password" : "Password"} {!staff && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder={staff ? "Leave blank to keep" : "Set login password"}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Account Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              value={formData.is_active ? "active" : "inactive"}
              onChange={e => setFormData({ ...formData, is_active: e.target.value === "active" })}
            >
              <option value="active">Active (Permitted to log in)</option>
              <option value="inactive">Inactive / Disabled</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : staff ? "Save Changes" : `Create ${isManagerRole ? "Manager" : "Staff"} Account`}
          </Btn>
        </div>
      </div>
    </div>
  );
}
