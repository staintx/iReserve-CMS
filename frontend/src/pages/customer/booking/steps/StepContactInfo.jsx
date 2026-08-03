import { useEffect, useState } from "react";
import { Card, SH, FL, TInput } from "../components/BookingSharedUI";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_REGEX = /^(?:63|0)?9\d{9}$/;

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
const isValidPhone = (value) => PHONE_DIGITS_REGEX.test(normalizePhone(value));

const getFieldError = (field, value) => {
  const trimmed = String(value || "").trim();

  switch (field) {
    case "contact_first_name":
      return trimmed ? "" : "First name is required.";
    case "contact_last_name":
      return trimmed ? "" : "Last name is required.";
    case "contact_email":
      if (!trimmed) return "Email address is required.";
      return isValidEmail(trimmed) ? "" : "Enter a valid email address.";
    case "contact_phone":
      if (!trimmed) return "Primary phone is required.";
      return isValidPhone(trimmed) ? "" : "Enter a valid Philippine mobile number.";
    case "contact_alt_phone":
      if (!trimmed) return "";
      return isValidPhone(trimmed) ? "" : "Enter a valid Philippine mobile number.";
    default:
      return "";
  }
};

export default function StepContactInfo({ form, setForm }) {
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!form.contact_phone?.trim() && form.contact_alt_phone) {
      setForm((prev) => ({ ...prev, contact_alt_phone: "" }));
      setErrors((prev) => ({ ...prev, contact_alt_phone: "" }));
    }
  }, [form.contact_phone, form.contact_alt_phone, setForm]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: getFieldError(field, value) }));
    }

    if (field === "contact_phone" && !value.trim()) {
      setForm((prev) => ({ ...prev, contact_alt_phone: "" }));
      setErrors((prev) => ({ ...prev, contact_alt_phone: "" }));
    }
  };

  const handleFieldBlur = (field) => {
    setErrors((prev) => ({ ...prev, [field]: getFieldError(field, form[field]) }));
  };

  const primaryPhoneFilled = !!form.contact_phone?.trim();

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <SH title="Contact Information" sub="How can we reach you regarding your booking?" />

      <Card className="p-6 sm:p-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FL>First Name *</FL>
              <TInput
                placeholder="Juan"
                value={form.contact_first_name || ""}
                onChange={(val) => handleFieldChange("contact_first_name", val)}
                onBlur={() => handleFieldBlur("contact_first_name")}
                required
                hasError={!!errors.contact_first_name}
              />
              {errors.contact_first_name && (
                <p className="text-xs text-destructive mt-1">{errors.contact_first_name}</p>
              )}
            </div>
            <div>
              <FL>Last Name *</FL>
              <TInput
                placeholder="Dela Cruz"
                value={form.contact_last_name || ""}
                onChange={(val) => handleFieldChange("contact_last_name", val)}
                onBlur={() => handleFieldBlur("contact_last_name")}
                required
                hasError={!!errors.contact_last_name}
              />
              {errors.contact_last_name && (
                <p className="text-xs text-destructive mt-1">{errors.contact_last_name}</p>
              )}
            </div>
          </div>

          <div>
            <FL>Email Address *</FL>
            <TInput
              type="email"
              placeholder="juan@example.com"
              value={form.contact_email || ""}
              onChange={(val) => handleFieldChange("contact_email", val)}
              onBlur={() => handleFieldBlur("contact_email")}
              required
              hasError={!!errors.contact_email}
            />
            {errors.contact_email && (
              <p className="text-xs text-destructive mt-1">{errors.contact_email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FL>Primary Phone *</FL>
              <TInput
                placeholder="(+63) 900 000 0000"
                value={form.contact_phone || ""}
                onChange={(val) => handleFieldChange("contact_phone", val)}
                onBlur={() => handleFieldBlur("contact_phone")}
                required
                hasError={!!errors.contact_phone}
              />
              {errors.contact_phone && (
                <p className="text-xs text-destructive mt-1">{errors.contact_phone}</p>
              )}
            </div>
            <div>
              <FL>Alternative Phone</FL>
              <TInput
                placeholder={primaryPhoneFilled ? "Optional" : "Enter primary phone first"}
                value={form.contact_alt_phone || ""}
                onChange={(val) => handleFieldChange("contact_alt_phone", val)}
                onBlur={() => handleFieldBlur("contact_alt_phone")}
                disabled={!primaryPhoneFilled}
                hasError={!!errors.contact_alt_phone}
              />
              {errors.contact_alt_phone && (
                <p className="text-xs text-destructive mt-1">{errors.contact_alt_phone}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
