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
      return isValidPhone(trimmed)
        ? ""
        : "Enter a valid Philippine mobile number.";
    case "contact_alt_phone":
      if (!trimmed) return "";
      return isValidPhone(trimmed)
        ? ""
        : "Enter a valid Philippine mobile number.";
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
                hint="Philippine mobile number, e.g. 0917 123 4567."
              >
                <TInput
                  placeholder="(+63) 900 000 0000"
                  value={form.contact_phone || ""}
                  onChange={(val) => handleFieldChange("contact_phone", val)}
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
                    ? "Optional backup contact number."
                    : undefined
                }
              >
                <TInput
                  placeholder={
                    primaryPhoneFilled ? "Optional" : "Enter primary phone first"
                  }
                  value={form.contact_alt_phone || ""}
                  onChange={(val) => handleFieldChange("contact_alt_phone", val)}
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
