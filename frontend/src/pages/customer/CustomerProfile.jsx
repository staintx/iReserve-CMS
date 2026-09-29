import { useEffect, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import ProfileOtpModal from "../../components/auth/ProfileOtpModal";
import { User, Mail, Phone, MapPin, Lock, Save, Eye, EyeOff, CheckCircle2, Shield } from "lucide-react";
import PasswordRequirements from "../../components/auth/PasswordRequirements";
import { describePasswordGap } from "../../components/auth/passwordPolicy";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "@/lib/utils";
import { maskEmail, maskPhone } from "@/lib/privacyMask";

export default function CustomerProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    email: "",
    username: "",
    phone: "",
    alt_phone: ""
  });
  const [security, setSecurity] = useState({ current: "", next: "", confirm: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpError, setOtpError] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });

  // UI Privacy States
  const [isEmailMasked, setIsEmailMasked] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isPhoneMasked, setIsPhoneMasked] = useState(true);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [isAltPhoneMasked, setIsAltPhoneMasked] = useState(true);
  const [altPhoneFocused, setAltPhoneFocused] = useState(false);

  const { notify } = useToast();

  useEffect(() => {
    CustomerAPI.getProfile().then((res) => {
      if (res.data) {
        const data = res.data;
        const firstName =
          (data.first_name || "").trim() ||
          (data.full_name ? data.full_name.split(" ")[0] : "");
        const lastName =
          (data.last_name || "").trim() ||
          (data.full_name && data.full_name.includes(" ")
            ? data.full_name.split(" ").slice(1).join(" ")
            : "");

        setForm({
          first_name: firstName,
          last_name: lastName,
          full_name:
            data.full_name || [firstName, lastName].filter(Boolean).join(" "),
          email: data.email || "",
          username: data.username || "",
          phone: data.phone || "",
          alt_phone: data.alt_phone || ""
        });
        updateUser(res.data);
      }
    });
  }, [updateUser]);

  const handleNameChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const first = key === "first_name" ? value : prev.first_name;
      const last = key === "last_name" ? value : prev.last_name;
      next.full_name = [first.trim(), last.trim()].filter(Boolean).join(" ");
      return next;
    });
  };

  const save = async (e) => {
    if (e) e.preventDefault();
    if (!form.first_name.trim() && !form.full_name.trim()) {
      return notify("First name or full name is required", "error");
    }
    const emailToSubmit = isEditingEmail ? newEmail.trim().toLowerCase() : form.email.trim().toLowerCase();
    if (!emailToSubmit) {
      return notify("Email address is required", "error");
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      full_name:
        form.full_name.trim() ||
        [form.first_name.trim(), form.last_name.trim()]
          .filter(Boolean)
          .join(" "),
      email: emailToSubmit,
      username: form.username.trim(),
      phone: form.phone.trim(),
      alt_phone: form.alt_phone.trim()
    };

    setIsLoading(true);
    try {
      const res = await CustomerAPI.requestProfileOtp();
      setMaskedEmail(res.data?.masked_email || user?.email || "");
      setPendingPayload(payload);
      setOtpError("");
      setIsOtpModalOpen(true);
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] ||
        err.response?.data?.message ||
        "Failed to send verification code. Please try again.";
      notify(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    if (!pendingPayload) return;
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await CustomerAPI.updateProfile({
        ...pendingPayload,
        otp: otpCode
      });
      if (res.data) {
        updateUser(res.data);
        setForm((prev) => ({
          ...prev,
          email: res.data.email || pendingPayload.email
        }));
        setIsEditingEmail(false);
      }
      setIsOtpModalOpen(false);
      setPendingPayload(null);
      notify("Profile updated successfully!", "success");
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] ||
        err.response?.data?.message ||
        "Verification failed. Please check the code and try again.";
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    const res = await CustomerAPI.requestProfileOtp();
    if (res.data?.masked_email) {
      setMaskedEmail(res.data.masked_email);
    }
    notify("A new verification code was sent to your email.", "info");
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
      <div className="h-[calc(100vh-3.5rem)] w-full bg-[#F8FAFC] flex flex-col font-sans antialiased overflow-hidden">
        {/* Contained Top Page Header - Matches Customer Portal visual scale & hierarchy */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Profile Settings
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Manage your personal information, contact details, and account security
            </p>
          </div>
        </div>

        {/* Content Body: Balanced 2-Column Desktop Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-start justify-center [scrollbar-width:thin]">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Card: Personal Details */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#4C81E0]/10 border border-[#4C81E0]/15 flex items-center justify-center text-[#4C81E0] shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight font-sans">
                    Personal Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your public name and primary contact details
                  </p>
                </div>
              </div>

              <form onSubmit={save} className="p-5 sm:p-6 space-y-4">
                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      First Name
                    </Label>
                    <Input
                      placeholder="e.g. Eduardo"
                      value={form.first_name || ""}
                      onChange={(e) => handleNameChange("first_name", e.target.value)}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-xl h-9 focus:border-[#4C81E0] focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Last Name
                    </Label>
                    <Input
                      placeholder="e.g. Ramos"
                      value={form.last_name || ""}
                      onChange={(e) => handleNameChange("last_name", e.target.value)}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-xl h-9 focus:border-[#4C81E0] focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Row 2: Username & Email Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Username
                    </Label>
                    <Input
                      placeholder="e.g. eduardoramos"
                      value={form.username || ""}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-slate-900 rounded-xl h-9 focus:border-[#4C81E0] focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Email Address
                      </Label>
                      {!isEditingEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewEmail(form.email);
                            setIsEditingEmail(true);
                          }}
                          className="text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {isEditingEmail ? (
                      <div className="space-y-1.5 animate-in fade-in-50">
                        <div className="relative">
                          <Input
                            placeholder="new.email@example.com"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-white border-[#4C81E0] text-xs text-slate-900 rounded-xl h-9 pr-16 focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setIsEditingEmail(false)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-0.5 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#4C81E0] shrink-0" />
                          Changing email will require email verification.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-xs text-slate-800 truncate tracking-tight">
                            {isEmailMasked ? maskEmail(form.email) : form.email}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Verified
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEmailMasked((prev) => !prev)}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0 ml-1 transition-colors"
                          aria-label={isEmailMasked ? "Show full email" : "Mask email"}
                        >
                          {isEmailMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Primary Phone & Alternative Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Primary Phone
                      </Label>
                      {form.phone && (
                        <button
                          type="button"
                          onClick={() => setIsPhoneMasked((m) => !m)}
                          className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                        >
                          {isPhoneMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{isPhoneMasked ? "Show" : "Hide"}</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="09123456789"
                        value={
                          isPhoneMasked && !phoneFocused && form.phone
                            ? maskPhone(form.phone)
                            : form.phone || ""
                        }
                        onFocus={() => setPhoneFocused(true)}
                        onBlur={() => setPhoneFocused(false)}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="bg-white border-slate-200 text-xs text-slate-900 rounded-xl h-9 font-mono focus:border-[#4C81E0] focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Alternative Phone
                      </Label>
                      {form.alt_phone && (
                        <button
                          type="button"
                          onClick={() => setIsAltPhoneMasked((m) => !m)}
                          className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                        >
                          {isAltPhoneMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{isAltPhoneMasked ? "Show" : "Hide"}</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="09123456789 (Optional)"
                        value={
                          isAltPhoneMasked && !altPhoneFocused && form.alt_phone
                            ? maskPhone(form.alt_phone)
                            : form.alt_phone || ""
                        }
                        onFocus={() => setAltPhoneFocused(true)}
                        onBlur={() => setAltPhoneFocused(false)}
                        onChange={(e) => setForm({ ...form, alt_phone: e.target.value })}
                        className="bg-white border-slate-200 text-xs text-slate-900 rounded-xl h-9 font-mono focus:border-[#4C81E0] focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#4C81E0] hover:bg-[#3B6EC6] text-white font-bold text-xs rounded-xl h-9 px-4.5 cursor-pointer shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isLoading ? "Saving..." : "Save Details"}</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Card: Security & Password */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#4C81E0]/10 border border-[#4C81E0]/15 flex items-center justify-center text-[#4C81E0] shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight font-sans">
                    Security &amp; Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your account password
                  </p>
                </div>
              </div>

              <form onSubmit={savePassword} className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {[
                    { key: "current", label: "Current Password", placeholder: "Enter current password", autoComplete: "current-password" },
                    { key: "next", label: "New Password", placeholder: "Choose a new password", autoComplete: "new-password" },
                    { key: "confirm", label: "Confirm Password", placeholder: "Repeat new password", autoComplete: "new-password" }
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={`profile-${field.key}`} className="text-xs font-semibold text-slate-700">
                        {field.label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`profile-${field.key}`}
                          className="pr-9 bg-white border-slate-200 text-xs text-slate-900 rounded-xl h-9 focus:border-[#4C81E0] focus:ring-2 focus:ring-[#4C81E0]/10 shadow-2xs"
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
                          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                        >
                          {visible[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {field.key === "next" && security.next && (
                        <PasswordRequirements value={security.next} className="pt-1" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 mt-2">
                  <Button
                    type="submit"
                    disabled={isSecurityLoading}
                    className="w-full bg-[#4C81E0] hover:bg-[#3B6EC6] text-white font-bold text-xs rounded-xl h-9 cursor-pointer shadow-xs transition-all active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isSecurityLoading ? "Updating..." : "Update Password"}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA OTP Confirmation Modal */}
      <ProfileOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => {
          if (!isVerifyingOtp) {
            setIsOtpModalOpen(false);
            setOtpError("");
          }
        }}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        maskedEmail={maskedEmail}
        loading={isVerifyingOtp}
        error={otpError}
        setError={setOtpError}
      />
    </CustomerDashboardLayout>
  );
}
