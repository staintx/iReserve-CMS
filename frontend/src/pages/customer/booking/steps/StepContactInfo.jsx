import { useEffect, useState } from "react";
import { User, Phone, Info } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TInput,
  SectionTitle,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);
const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());
const isValidPhone = (value) => /^09\d{9}$/.test(sanitizePhone(value));

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
    case "contact_phone": {
      if (!trimmed) return "Primary phone number is required.";
      const digits = sanitizePhone(trimmed);
      if (digits.length < 11) {
        return "Phone number must be exactly 11 digits (e.g. 09123456789).";
      }
      if (!digits.startsWith("09")) {
        return "Phone number must start with 09 (e.g. 09123456789).";
      }
      return /^09\d{9}$/.test(digits)
        ? ""
        : "Enter a valid 11-digit Philippine mobile number starting with 09.";
    }
    case "contact_alt_phone": {
      if (!trimmed) return "";
      const digits = sanitizePhone(trimmed);
      if (digits.length < 11) {
        return "Alternative phone number must be exactly 11 digits (e.g. 09123456789).";
      }
      if (!digits.startsWith("09")) {
        return "Alternative phone number must start with 09 (e.g. 09123456789).";
      }
      return /^09\d{9}$/.test(digits)
        ? ""
        : "Enter a valid 11-digit Philippine mobile number starting with 09.";
    }
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

  const handlePhoneChange = (field, rawValue) => {
    const sanitized = sanitizePhone(rawValue);
    handleFieldChange(field, sanitized);
  };

  const handlePhoneKeyDown = (e) => {
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhonePaste = (e, field) => {
    e.preventDefault();
    const pasteData = e.clipboardData?.getData("text") || "";
    const sanitized = sanitizePhone(pasteData);
    handlePhoneChange(field, sanitized);
  };

  const handleFieldBlur = (field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: getFieldError(field, form[field]),
    }));
  };

  const primaryPhoneFilled = !!form.contact_phone?.trim();

  return (
    <StepShell width="medium">
      <SH
        title="Contact Information"
        sub="How can we reach you about this booking?"
      />

      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Who to contact */}
          <div>
            <SectionTitle icon={User}>Contact person</SectionTitle>
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Field
                  label="First Name"
                  required
                  error={errors.contact_first_name}
                >
                  <TInput
                    placeholder="Juan"
                    value={form.contact_first_name || ""}
                    onChange={(val) =>
                      handleFieldChange("contact_first_name", val)
                    }
                    onBlur={() => handleFieldBlur("contact_first_name")}
                    required
                    hasError={!!errors.contact_first_name}
                  />
                </Field>
                <Field
                  label="Last Name"
                  required
                  error={errors.contact_last_name}
                >
                  <TInput
                    placeholder="Dela Cruz"
                    value={form.contact_last_name || ""}
                    onChange={(val) =>
                      handleFieldChange("contact_last_name", val)
                    }
                    onBlur={() => handleFieldBlur("contact_last_name")}
                    required
                    hasError={!!errors.contact_last_name}
                  />
                </Field>
              </div>

              <Field
                label="Email Address"
                required
                error={errors.contact_email}
                hint="Your quotation and updates are sent here."
              >
                <TInput
                  type="email"
                  placeholder="juan@example.com"
                  value={form.contact_email || ""}
                  onChange={(val) => handleFieldChange("contact_email", val)}
                  onBlur={() => handleFieldBlur("contact_email")}
                  required
                  hasError={!!errors.contact_email}
                />
              </Field>
            </div>
          </div>

          {/* Phone numbers */}
          <div>
            <SectionTitle icon={Phone}>Phone numbers</SectionTitle>
            <div className="space-y-3.5">
              <Field
                label="Primary Phone"
                required
                error={errors.contact_phone}
                hint="Philippine mobile number, e.g. 09123456789."
              >
                <TInput
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  placeholder="09123456789"
                  value={form.contact_phone || ""}
                  onChange={(val) => handlePhoneChange("contact_phone", val)}
                  onKeyDown={handlePhoneKeyDown}
                  onPaste={(e) => handlePhonePaste(e, "contact_phone")}
                  onBlur={() => handleFieldBlur("contact_phone")}
                  required
                  hasError={!!errors.contact_phone}
                />
              </Field>

              <Field
                label="Alternative Phone"
                error={errors.contact_alt_phone}
                hint={
                  primaryPhoneFilled
                    ? "Optional backup contact number, e.g. 09123456789."
                    : undefined
                }
              >
                <TInput
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  placeholder={
                    primaryPhoneFilled ? "09123456789 (Optional)" : "Enter primary phone first"
                  }
                  value={form.contact_alt_phone || ""}
                  onChange={(val) => handlePhoneChange("contact_alt_phone", val)}
                  onKeyDown={handlePhoneKeyDown}
                  onPaste={(e) => handlePhonePaste(e, "contact_alt_phone")}
                  onBlur={() => handleFieldBlur("contact_alt_phone")}
                  disabled={!primaryPhoneFilled}
                  hasError={!!errors.contact_alt_phone}
                />
              </Field>

              <InfoNote icon={Info}>
                Fields marked <span className="font-semibold text-red-500">*</span>{" "}
                are required. We only use these details to coordinate your event.
              </InfoNote>
            </div>
          </div>
        </div>
      </Card>
    </StepShell>
  );
}
