import { useEffect, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import { User, Mail, Phone, MapPin, Lock, Save, Eye, EyeOff } from "lucide-react";
import PasswordRequirements from "../../components/auth/PasswordRequirements";
import { describePasswordGap } from "../../components/auth/passwordPolicy";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "@/lib/utils";

export default function CustomerProfile() {
  const { user, updateUser } = useAuth();
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
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const { notify } = useToast();

  useEffect(() => {
    CustomerAPI.getProfile().then((res) => {
      if (res.data) {
        setForm({
          full_name: res.data.full_name || "",
          email: res.data.email || "",
          username: res.data.username || "",
          phone: res.data.phone || "",
          address: res.data.address || "",
          alt_phone: res.data.alt_phone || ""
        });
        updateUser(res.data);
      }
    });
  }, [updateUser]);

  const save = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const res = await CustomerAPI.updateProfile({
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        phone: form.phone,
        address: form.address,
        alt_phone: form.alt_phone
      });
      if (res.data) {
        updateUser(res.data);
      }
      notify("Profile updated successfully!", "success");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const savePassword = async (e) => {
    if (e) e.preventDefault();
    if (!security.current || !security.next || !security.confirm) {
      return notify("All password fields are required", "error");
    }
    if (security.next !== security.confirm) {
      return notify("Your passwords don't match yet.", "error");
    }
    const passwordGap = describePasswordGap(security.next);
    if (passwordGap) {
      return notify(passwordGap, "error");
    }

    setIsSecurityLoading(true);
    try {
      await CustomerAPI.changePassword({
        current_password: security.current,
        new_password: security.next
      });
      notify("Password changed successfully!", "success");
      setSecurity({ current: "", next: "", confirm: "" });
    } catch (err) {
      notify(err.response?.data?.message || "Failed to change password", "error");
    } finally {
      setIsSecurityLoading(false);
    }
  };

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-slate-50/50 flex flex-col font-sans antialiased overflow-hidden">
        {/* Top Header Bar */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 sm:px-6 py-3.5">
          <h1 className="font-sans font-bold text-base text-slate-900 leading-tight">
            Profile Settings
          </h1>
          <p className="text-xs text-slate-500">
            Manage your personal information, contact details, and account security
          </p>
        </div>

        {/* Content Body (Single-Page Viewport) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start justify-center [scrollbar-width:thin]">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Personal Info (7 cols on lg) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
              <div className="p-3.5 px-4 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#2C4B8A]/10 flex items-center justify-center text-[#2C4B8A] shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 leading-tight font-sans">
                    Personal Details
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Update your public name and primary contact details
                  </p>
                </div>
              </div>

              <form onSubmit={save} className="p-4 sm:p-5 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Full Name
                    </Label>
                    <Input
                      placeholder="e.g. Jane Doe"
                      value={form.full_name || ""}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-md h-8.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Username
                    </Label>
                    <Input
                      placeholder="e.g. janedoe99"
                      value={form.username || ""}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-md h-8.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Email Address
                    </Label>
                    <Input
                      placeholder="jane@example.com"
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-md h-8.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Primary Phone
                    </Label>
                    <Input
                      placeholder="+63 900 000 0000"
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-md h-8.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Alternative Phone
                  </Label>
                  <Input
                    placeholder="+63 900 111 2222"
                    value={form.alt_phone || ""}
                    onChange={(e) => setForm({ ...form, alt_phone: e.target.value })}
                    className="bg-white border-slate-200 text-xs text-slate-900 rounded-md h-8.5"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Default Event &amp; Delivery Address
                  </Label>
                  <textarea
                    className="flex min-h-[64px] h-[64px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2C4B8A] focus-visible:border-[#2C4B8A] resize-none"
                    placeholder="Street, Barangay, City, Province, Zip Code"
                    value={form.address || ""}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs rounded-md h-8 px-4 cursor-pointer shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {isLoading ? "Saving..." : "Save Details"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column: Security & Credentials (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Security Card */}
              <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
                <div className="p-3.5 px-4 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-[#2C4B8A]/10 flex items-center justify-center text-[#2C4B8A] shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 leading-tight font-sans">
                      Security &amp; Password
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Update your account password
                    </p>
                  </div>
                </div>

                <form onSubmit={savePassword} className="p-4 sm:p-5 space-y-3">
                  {[
                    { key: "current", label: "Current Password", placeholder: "Enter current password", autoComplete: "current-password" },
                    { key: "next", label: "New Password", placeholder: "Choose a new password", autoComplete: "new-password" },
                    { key: "confirm", label: "Confirm Password", placeholder: "Repeat new password", autoComplete: "new-password" }
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label htmlFor={`profile-${field.key}`} className="text-[11px] font-semibold text-slate-700">
                        {field.label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`profile-${field.key}`}
                          className="pr-9 bg-white border-slate-200 text-xs text-slate-900 rounded-md h-8.5"
                          placeholder={field.placeholder}
                          type={visible[field.key] ? "text" : "password"}
                          autoComplete={field.autoComplete}
                          value={security[field.key]}
                          onChange={(e) => setSecurity({ ...security, [field.key]: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setVisible((v) => ({ ...v, [field.key]: !v[field.key] }))}
                          aria-label={visible[field.key] ? `Hide ${field.label.toLowerCase()}` : `Show ${field.label.toLowerCase()}`}
                          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {visible[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {field.key === "next" && security.next && (
                        <PasswordRequirements value={security.next} className="pt-1" />
                      )}
                    </div>
                  ))}

                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={isSecurityLoading}
                      className="w-full bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs rounded-md h-8.5 cursor-pointer shadow-2xs"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      {isSecurityLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
