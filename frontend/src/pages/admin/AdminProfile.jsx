import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import { User, Lock, Save, ShieldCheck } from "lucide-react";

export default function AdminProfile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    address: ""
  });
  const [security, setSecurity] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    AdminAPI.getProfile().then((res) => {
      setForm((prev) => ({ ...prev, ...res.data }));
    });
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await AdminAPI.updateProfile({
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        phone: form.phone || "",
        address: form.address || ""
      });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!security.current_password || !security.new_password || !security.confirm_password) {
      return toast.error("All password fields are required");
    }
    if (security.new_password !== security.confirm_password) {
      return toast.error("New passwords do not match");
    }
    if (security.new_password.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }
    
    setIsLoading(true);
    try {
      await AdminAPI.changePassword({
        current_password: security.current_password,
        new_password: security.new_password
      });
      toast.success("Password changed successfully!");
      setSecurity({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Account Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your profile details and security preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto w-full">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 ${
              activeTab === "profile"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "text-slate-600 hover:bg-white hover:shadow-soft"
            }`}
          >
            <User className="w-5 h-5" />
            <span>Public Profile</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 ${
              activeTab === "security"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                : "text-slate-600 hover:bg-white hover:shadow-soft"
            }`}
          >
            <Lock className="w-5 h-5" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-soft border border-slate-100">
          
          {activeTab === "profile" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink-900">Profile Information</h2>
                  <p className="text-sm text-slate-500">Update your personal details and how we can reach you.</p>
                </div>
              </div>

              <form onSubmit={saveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input
                      className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      value={form.full_name || ""}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Username</label>
                    <input
                      className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      value={form.username || ""}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="e.g. janedoe"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input
                      className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. jane@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <input
                      className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. +63 912 345 6789"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink-900">Security & Password</h2>
                  <p className="text-sm text-slate-500">Ensure your account is using a strong, unique password.</p>
                </div>
              </div>

              <form onSubmit={savePassword} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Current Password</label>
                  <input
                    className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    type="password"
                    value={security.current_password}
                    onChange={(e) => setSecurity({ ...security, current_password: e.target.value })}
                    placeholder="Enter your current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">New Password</label>
                  <input
                    className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    type="password"
                    value={security.new_password}
                    onChange={(e) => setSecurity({ ...security, new_password: e.target.value })}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
                  <input
                    className="input w-full bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    type="password"
                    value={security.confirm_password}
                    onChange={(e) => setSecurity({ ...security, confirm_password: e.target.value })}
                    placeholder="Type your new password again"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {isLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
}
