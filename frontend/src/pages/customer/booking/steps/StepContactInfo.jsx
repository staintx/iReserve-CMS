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

export default function StepContactInfo({ form, setForm, errors = {} }) {
  const [touched, setTouched] = useState({});

  const errorFor = (field) =>
    errors[field] || (touched[field] ? contactFieldError(field, form[field]) : "");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  return (
    <StepShell width="medium">
      <SH
        title="How We Reach You"
        sub="Your quotation and event updates go to these details."
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <SectionTitle icon={User}>Contact person</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                hint="We send your quotation here."
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
            <SectionTitle icon={Phone}>Phone numbers</SectionTitle>
            <div className="space-y-3">
              <Field
                label="Mobile number"
                required
                error={errorFor("contact_phone")}
                hint="Philippine mobile number. Our coordinator calls this one."
              >
                <TInput
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 0917 123 4567"
                  value={form.contact_phone || ""}
                  onChange={(val) => handleChange("contact_phone", val)}
                  onBlur={() => handleBlur("contact_phone")}
                  autoComplete="tel"
                  hasError={!!errorFor("contact_phone")}
                />
              </Field>

              <Field
                label="Backup number"
                error={errorFor("contact_alt_phone")}
                hint="Optional. Someone else we can reach on the event day."
              >
                <TInput
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 0922 987 6543"
                  value={form.contact_alt_phone || ""}
                  onChange={(val) => handleChange("contact_alt_phone", val)}
                  onBlur={() => handleBlur("contact_alt_phone")}
                  hasError={!!errorFor("contact_alt_phone")}
                />
              </Field>

              <p className="text-xs text-[#94A3B8]">
                We use these details only to coordinate your event.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </StepShell>
  );
}
