import { useEffect, useState, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import {
  User,
  Lock,
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Phone,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Shield,
  Layers,
  Info
} from "lucide-react";
import PasswordRequirements from "../../components/auth/PasswordRequirements";
import { describePasswordGap } from "../../components/auth/passwordPolicy";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "@/lib/utils";

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'security' | 'permissions'
  
  const [initialForm, setInitialForm] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    email: "",
    username: "",
    phone: ""
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    email: "",
    username: "",
    phone: ""
  });

  const [security, setSecurity] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [isDataFetching, setIsDataFetching] = useState(true);
  const [visible, setVisible] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false
  });
  
  const { notify } = useToast();

  const loadProfile = useCallback(async () => {
    try {
      setIsDataFetching(true);
      const res = await AdminAPI.getProfile();
      if (res.data) {
        const data = res.data;
        const firstName = data.first_name || (data.full_name ? data.full_name.split(" ")[0] : "");
        const lastName = data.last_name || (data.full_name && data.full_name.includes(" ") ? data.full_name.split(" ").slice(1).join(" ") : "");
        
        const populated = {
          first_name: firstName,
          last_name: lastName,
          full_name: data.full_name || [firstName, lastName].filter(Boolean).join(" "),
          email: data.email || "",
          username: data.username || "",
          phone: data.phone || ""
        };

        setForm(populated);
        setInitialForm(populated);
        updateUser(data);
      }
    } catch (err) {
      console.error("Failed to load admin profile:", err);
    } finally {
      setIsDataFetching(false);
    }
  }, [updateUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);


  const isFormDirty =
    form.first_name !== initialForm.first_name ||
    form.last_name !== initialForm.last_name ||
    form.username !== initialForm.username ||
    form.email !== initialForm.email ||
    form.phone !== initialForm.phone;

  const handleNameChange = (key, value) => {
    const updated = { ...form, [key]: value };
    const first = key === "first_name" ? value : form.first_name;
    const last = key === "last_name" ? value : form.last_name;
    updated.full_name = [first.trim(), last.trim()].filter(Boolean).join(" ");
    setForm(updated);
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const saveProfile = async (e) => {
    if (e) e.preventDefault();
    
    if (!form.first_name.trim() && !form.full_name.trim()) {
      return notify("First name or full name is required", "error");
    }

    if (!form.email.trim()) {
      return notify("Email address is required", "error");
    }

    setIsProfileLoading(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name: form.full_name.trim() || [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(" "),
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        phone: form.phone.trim()
      };

      const res = await AdminAPI.updateProfile(payload);
      if (res.data) {
        updateUser(res.data);
        setInitialForm({
          first_name: res.data.first_name || payload.first_name,
          last_name: res.data.last_name || payload.last_name,
          full_name: res.data.full_name || payload.full_name,
          email: res.data.email || payload.email,
          username: res.data.username || payload.username,
          phone: res.data.phone || payload.phone
        });
      }
      notify("Profile updated successfully!", "success");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const savePassword = async (e) => {
    if (e) e.preventDefault();
    if (!security.current_password || !security.new_password || !security.confirm_password) {
      return notify("All password fields are required", "error");
    }
    if (security.new_password !== security.confirm_password) {
      return notify("New passwords do not match", "error");
    }
    const passwordGap = describePasswordGap(security.new_password);
    if (passwordGap) {
      return notify(passwordGap, "error");
    }

    setIsSecurityLoading(true);
    try {
      await AdminAPI.changePassword({
        current_password: security.current_password,
        new_password: security.new_password
      });
      notify("Password changed successfully!", "success");
      setSecurity({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      notify(err.response?.data?.message || "Failed to change password", "error");
    } finally {
      setIsSecurityLoading(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Active Member";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Account &amp; Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Administrator Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your personal details and account security preferences.
            </p>
          </div>
        </div>


        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-2 sm:gap-4 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <User className="w-4 h-4" />
            <span>Personal Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === "security"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <KeyRound className="w-4 h-4" />
            <span>Security &amp; Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === "permissions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Role &amp; Privileges</span>
          </button>
        </div>

        {/* Tab 1: Personal Information */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-border shadow-xs">
                <CardHeader className="border-b border-border bg-muted/20 pb-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold">Personal Details</CardTitle>
                      <CardDescription>
                        Update your name, username, email address, and phone number.
                      </CardDescription>
                    </div>
                    {isFormDirty && (
                      <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={saveProfile} className="space-y-6">
                    {/* Name Fields (First & Last) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-first-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="admin-first-name"
                          value={form.first_name}
                          onChange={(e) => handleNameChange("first_name", e.target.value)}
                          placeholder="e.g. Maria"
                          disabled={isDataFetching || isProfileLoading}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-last-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Last Name
                        </Label>
                        <Input
                          id="admin-last-name"
                          value={form.last_name}
                          onChange={(e) => handleNameChange("last_name", e.target.value)}
                          placeholder="e.g. Santos"
                          disabled={isDataFetching || isProfileLoading}
                        />
                      </div>
                    </div>

                    {/* Username & Contact Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Username
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                            @
                          </span>
                          <Input
                            id="admin-username"
                            className="pl-7"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            placeholder="janedoe"
                            disabled={isDataFetching || isProfileLoading}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">Unique handle for chat and system logs.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Contact Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="admin-phone"
                            className="pl-9"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="e.g. +63 912 345 6789"
                            disabled={isDataFetching || isProfileLoading}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">For direct contact and urgent operational alerts.</p>
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Email Address <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="admin-email"
                          type="email"
                          className="pl-9"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="admin@example.com"
                          disabled={isDataFetching || isProfileLoading}
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Used for security alerts and system login.</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                      {isFormDirty && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={resetForm}
                          disabled={isProfileLoading}
                          className="flex items-center gap-2 text-muted-foreground"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Discard
                        </Button>
                      )}

                      <Button
                        type="submit"
                        disabled={isProfileLoading || !isFormDirty}
                        className="flex items-center gap-2 min-w-[140px]"
                      >
                        <Save className="w-4 h-4" />
                        {isProfileLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Summary Card */}
            <div className="space-y-6">
              <Card className="border-border shadow-xs">
                <CardHeader className="border-b border-border bg-muted/20 pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Account Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-muted-foreground">Account Role</span>
                    <span className="font-semibold text-foreground capitalize">{user?.role || "admin"}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-muted-foreground">Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-muted-foreground">Email Verification</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-semibold text-foreground">{memberSince}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Security Hint */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Profile Security</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keeping your contact details up to date ensures you receive critical booking reminders, customer inquiries, and financial notices instantly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-border shadow-xs">
                <CardHeader className="border-b border-border bg-muted/20 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Change Password</CardTitle>
                      <CardDescription>
                        Ensure your administrator account uses a strong, resilient password.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={savePassword} className="space-y-5 max-w-lg">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-current-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Current Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-current-password"
                          type={visible.current_password ? "text" : "password"}
                          className="pr-10"
                          value={security.current_password}
                          onChange={(e) => setSecurity({ ...security, current_password: e.target.value })}
                          placeholder="Enter your current password"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVisible((v) => ({ ...v, current_password: !v.current_password }))}
                          aria-label={visible.current_password ? "Hide current password" : "Show current password"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        >
                          {visible.current_password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-new-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        New Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-new-password"
                          type={visible.new_password ? "text" : "password"}
                          className="pr-10"
                          value={security.new_password}
                          onChange={(e) => setSecurity({ ...security, new_password: e.target.value })}
                          placeholder="Choose a strong new password"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVisible((v) => ({ ...v, new_password: !v.new_password }))}
                          aria-label={visible.new_password ? "Hide new password" : "Show new password"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        >
                          {visible.new_password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {security.new_password && (
                        <div className="pt-2">
                          <PasswordRequirements value={security.new_password} />
                        </div>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-confirm-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Confirm New Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-confirm-password"
                          type={visible.confirm_password ? "text" : "password"}
                          className="pr-10"
                          value={security.confirm_password}
                          onChange={(e) => setSecurity({ ...security, confirm_password: e.target.value })}
                          placeholder="Re-enter your new password"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVisible((v) => ({ ...v, confirm_password: !v.confirm_password }))}
                          aria-label={visible.confirm_password ? "Hide confirm password" : "Show confirm password"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        >
                          {visible.confirm_password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {security.confirm_password && security.new_password !== security.confirm_password && (
                        <p className="text-xs text-destructive font-medium">Passwords do not match yet.</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex items-center justify-end">
                      <Button
                        type="submit"
                        disabled={isSecurityLoading || !security.current_password || !security.new_password || !security.confirm_password}
                        className="flex items-center gap-2 min-w-[160px] bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <Lock className="w-4 h-4" />
                        {isSecurityLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Security Checklist Card */}
            <div className="space-y-6">
              <Card className="border-border shadow-xs">
                <CardHeader className="border-b border-border bg-muted/20 pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Security Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Avoid reusing passwords from other personal or work services.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>All password changes and authentication attempts are logged in the System Audit Log.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 3: System Role & Privileges */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            <Card className="border-border shadow-xs">
              <CardHeader className="border-b border-border bg-muted/20 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Administrator Privileges</CardTitle>
                    <CardDescription>
                      Overview of your active system permissions and role capabilities across iReserve CMS.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      title: "Bookings & Reservations",
                      desc: "Create, modify, accept revisions, assign staff, schedule oculars, and cancel events.",
                      active: true
                    },
                    {
                      title: "Financials & Payments",
                      desc: "Verify incoming customer payments, issue official receipts, and approve refunds.",
                      active: true
                    },
                    {
                      title: "Catalog & Pricing",
                      desc: "Manage packages, catering menu items, add-ons, and run AI-assisted PDF extractions.",
                      active: true
                    },
                    {
                      title: "Inventory & Equipment",
                      desc: "Track physical stock, assign items to bookings, verify equipment returns, and inspect logs.",
                      active: true
                    },
                    {
                      title: "Staff & Team Management",
                      desc: "Invite managers, staff members, configure roles, and inspect shift schedules.",
                      active: true
                    },
                    {
                      title: "Audit & System Logs",
                      desc: "Access full immutable audit trail of system activities, logins, and status transitions.",
                      active: true
                    }
                  ].map((perm, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground">{perm.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Granted
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {perm.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
