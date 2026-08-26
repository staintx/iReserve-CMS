import { useState } from "react";
import { User, Phone } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TInput,
  SectionTitle,
  StepShell,
} from "../components/BookingSharedUI";
import { contactFieldError } from "../lib/bookingRules";

const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 11);

export default function StepContactInfo({ form, setForm, errors = {} }) {
  const [touched, setTouched] = useState({});

  const errorFor = (field) =>
    errors[field] || (touched[field] ? contactFieldError(field, form[field]) : "");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (field, rawValue) => {
    const sanitized = sanitizePhone(rawValue);
    handleChange(field, sanitized);
  };

  const handlePhoneKeyDown = (e) => {
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key) ||
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

  const handleBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const primaryPhoneFilled = !!form.contact_phone?.trim();

  return (
    <StepShell width="wide">
      <SH
        title="Contact Information"
        sub="Your official quotation, itemized breakdown, and event coordination updates go to these details."
      />

      <Card className="p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <div>
            <SectionTitle icon={User}>Contact Person</SectionTitle>
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field
                  label="First name"
                  required
                  error={errorFor("contact_first_name")}
                >
                  <TInput
                    placeholder="e.g. Maria"
                    value={form.contact_first_name || ""}
                    onChange={(val) => handleChange("contact_first_name", val)}
                    onBlur={() => handleBlur("contact_first_name")}
                    autoComplete="given-name"
                    hasError={!!errorFor("contact_first_name")}
                  />
                </Field>
                <Field
                  label="Last name"
                  required
                  error={errorFor("contact_last_name")}
                >
                  <TInput
                    placeholder="e.g. Santos"
                    value={form.contact_last_name || ""}
                    onChange={(val) => handleChange("contact_last_name", val)}
                    onBlur={() => handleBlur("contact_last_name")}
                    autoComplete="family-name"
                    hasError={!!errorFor("contact_last_name")}
                  />
                </Field>
              </div>

              <Field
                label="Email address"
                required
                error={errorFor("contact_email")}
                hint="Your quotation PDF and status updates will be sent here."
              >
                <TInput
                  type="email"
                  placeholder="e.g. maria.santos@gmail.com"
                  value={form.contact_email || ""}
                  onChange={(val) => handleChange("contact_email", val)}
                  onBlur={() => handleBlur("contact_email")}
                  autoComplete="email"
                  hasError={!!errorFor("contact_email")}
                />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle icon={Phone}>Phone Numbers</SectionTitle>
            <div className="space-y-2.5">
              <Field
                label="Mobile number"
                required
                error={errorFor("contact_phone")}
                hint="Philippine mobile number (e.g. 09123456789)"
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
                  onBlur={() => handleBlur("contact_phone")}
                  autoComplete="tel"
                  hasError={!!errorFor("contact_phone")}
                />
              </Field>

              <Field
                label="Backup contact number (Optional)"
                error={errorFor("contact_alt_phone")}
                hint={
                  primaryPhoneFilled
                    ? "Alternative mobile number (e.g. 09123456789)"
                    : "Enter primary mobile number first"
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
                  onBlur={() => handleBlur("contact_alt_phone")}
                  disabled={!primaryPhoneFilled}
                  hasError={!!errorFor("contact_alt_phone")}
                />
              </Field>
            </div>
          </div>
        </div>

        <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
          Your contact information is strictly protected and used only to deliver your event quotation and coordination updates.
        </p>
      </Card>
    </StepShell>
  );
}
