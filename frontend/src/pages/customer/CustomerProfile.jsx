import { useEffect, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { User, Mail, Phone, MapPin, Lock, ShieldCheck, CreditCard, Save } from "lucide-react";

export default function CustomerProfile() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    address: "",
    alt_phone: ""
  });
  const [security, setSecurity] = useState({ current: "", next: "", confirm: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    CustomerAPI.getProfile().then((res) => {
      setForm((prev) => ({ ...prev, ...res.data }));
    });
  }, []);

  const save = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      await CustomerAPI.updateProfile({
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        phone: form.phone,
        address: form.address
      });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const savePassword = async (e) => {
    if (e) e.preventDefault();
    if (!security.current || !security.next || !security.confirm) {
      return toast.error("All password fields are required");
    }
    if (security.next !== security.confirm) {
      return toast.error("New passwords do not match");
    }
    if (security.next.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    setIsSecurityLoading(true);
    try {
      await CustomerAPI.changePassword({
        current_password: security.current,
        new_password: security.next
      });
      toast.success("Password changed successfully!");
      setSecurity({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsSecurityLoading(false);
    }
  };

  return (
    <CustomerDashboardLayout
      title="Profile Settings"
      subtitle="Manage your account information and preferences"
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Left Column: Personal Info & Payment */}
        <div className="flex-1 space-y-8">

          {/* Personal Settings Card */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 m-0">Personal Details</h3>
                <p className="text-sm text-slate-500 m-0">Update your public profile and contact information</p>
              </div>
            </div>

            <form onSubmit={save} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> Full Name
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="e.g. Jane Doe"
                    value={form.full_name || ""}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> Username
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="e.g. janedoe99"
                    value={form.username || ""}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" /> Email Address
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="jane@example.com"
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Phone Number
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Alternative Phone
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="+1 (555) 111-1111"
                    value={form.alt_phone || ""}
                    onChange={(e) => setForm({ ...form, alt_phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Address
                  </label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[100px] resize-y"
                    placeholder="123 Main St, City, Country"
                    value={form.address || ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4" />
                  {isLoading ? "Saving Details..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Security */}
        <div className="w-full lg:w-[400px] space-y-8">

          {/* Security Card */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 m-0">Security</h3>
                <p className="text-sm text-slate-500 m-0">Update your password</p>
              </div>
            </div>

            <form onSubmit={savePassword} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" /> Current Password
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter current password"
                  type="password"
                  value={security.current}
                  onChange={(e) => setSecurity({ ...security, current: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" /> New Password
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={security.next}
                  onChange={(e) => setSecurity({ ...security, next: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" /> Confirm Password
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                  placeholder="Repeat new password"
                  type="password"
                  value={security.confirm}
                  onChange={(e) => setSecurity({ ...security, confirm: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <button
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 px-6 rounded-xl shadow-md shadow-rose-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSecurityLoading}
                >
                  <Lock className="w-4 h-4" />
                  {isSecurityLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

          {/* Payment Methods Card */}
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 m-0">Payment Methods</h3>
                <p className="text-sm text-slate-500 m-0">Saved cards for faster checkout</p>
              </div>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-6 bg-slate-200 rounded flex items-center justify-center text-[10px] font-bold text-slate-600 tracking-wider">
                    VISA
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700">•••• 4242</div>
                    <div className="text-xs text-slate-500">Expires 12/25</div>
                  </div>
                </div>
                <button type="button" className="text-sm font-medium text-slate-400 hover:text-rose-600 transition-colors">
                  Remove
                </button>
              </div>

              <button
                type="button"
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                + Add New Payment Method
              </button>
            </div>
          </div>

        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
