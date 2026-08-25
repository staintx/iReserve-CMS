import { useEffect, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import { User, Mail, Phone, MapPin, Lock, ShieldCheck, CreditCard, Save, Eye, EyeOff } from "lucide-react";
import PasswordRequirements from "../../components/auth/PasswordRequirements";
import { describePasswordGap } from "../../components/auth/passwordPolicy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

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
        address: form.address
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
    // Same policy the sign-up and reset screens enforce.
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
    <CustomerDashboardLayout
      title="Profile Settings"
      subtitle="Manage your account information and preferences"
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Left Column: Personal Info */}
        <div className="flex-1 space-y-8">

          {/* Personal Settings Card */}
          <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-5 flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#2C4B8A]/10 flex items-center justify-center text-[#2C4B8A] shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold font-sans text-slate-900">Personal Details</CardTitle>
                <CardDescription className="text-xs text-slate-500">Update your public profile and contact information</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={save} className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
                    </Label>
                    <Input
                      placeholder="e.g. Jane Doe"
                      value={form.full_name || ""}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Username
                    </Label>
                    <Input
                      placeholder="e.g. janedoe99"
                      value={form.username || ""}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                    </Label>
                    <Input
                      placeholder="jane@example.com"
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                    </Label>
                    <Input
                      placeholder="+1 (555) 000-0000"
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Alternative Phone
                    </Label>
                    <Input
                      placeholder="+1 (555) 111-1111"
                      value={form.alt_phone || ""}
                      onChange={(e) => setForm({ ...form, alt_phone: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address
                    </Label>
                    <textarea
                      className="flex min-h-[90px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]/20 focus-visible:border-[#2C4B8A] resize-y"
                      placeholder="123 Main St, City, Country"
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isLoading} className="bg-[#2C4B8A] hover:bg-[#203766] text-white font-semibold text-xs rounded-lg">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {isLoading ? "Saving Details..." : "Save Details"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security */}
        <div className="w-full lg:w-[400px] space-y-8">

          {/* Security Card */}
          <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-5 flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold font-sans text-slate-900">Security</CardTitle>
                <CardDescription className="text-xs text-slate-500">Update your account password</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={savePassword} className="p-6 sm:p-8 space-y-5">
                {[
                  { key: "current", label: "Current Password", placeholder: "Enter current password", autoComplete: "current-password" },
                  { key: "next", label: "New Password", placeholder: "Choose a new password", autoComplete: "new-password" },
                  { key: "confirm", label: "Confirm Password", placeholder: "Repeat new password", autoComplete: "new-password" }
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`profile-${field.key}`} className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" /> {field.label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`profile-${field.key}`}
                        className="pr-11"
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
                        aria-pressed={visible[field.key]}
                        className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {visible[field.key] ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                    {field.key === "next" && security.next && (
                      <PasswordRequirements value={security.next} className="pt-1" />
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <Button type="submit" disabled={isSecurityLoading} className="w-full bg-rose-600 hover:bg-rose-700 text-white" size="lg">
                    <Lock className="w-4 h-4 mr-2" />
                    {isSecurityLoading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Payment Methods Card */}
          <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-5 flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold font-sans text-slate-900">Payment Methods</CardTitle>
                <CardDescription className="text-xs text-slate-500">Saved payment methods and receipts</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 tracking-wider">
                    GCash
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Digital Payment & Bank Transfer</div>
                    <div className="text-[11px] text-slate-500">Supported for all bookings</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
