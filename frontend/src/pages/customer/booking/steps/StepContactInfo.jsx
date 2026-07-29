import { Card, SH, FL, TInput } from "../components/BookingSharedUI";

export default function StepContactInfo({ form, setForm }) {
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
                onChange={(val) => setForm({ ...form, contact_first_name: val })}
              />
            </div>
            <div>
              <FL>Last Name *</FL>
              <TInput
                placeholder="Dela Cruz"
                value={form.contact_last_name || ""}
                onChange={(val) => setForm({ ...form, contact_last_name: val })}
              />
            </div>
          </div>

          <div>
            <FL>Email Address *</FL>
            <TInput
              type="email"
              placeholder="juan@example.com"
              value={form.contact_email || ""}
              onChange={(val) => setForm({ ...form, contact_email: val })}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FL>Primary Phone *</FL>
              <TInput
                placeholder="(+63) 900 000 0000"
                value={form.contact_phone || ""}
                onChange={(val) => setForm({ ...form, contact_phone: val })}
              />
            </div>
            <div>
              <FL>Alternative Phone</FL>
              <TInput
                placeholder="Optional"
                value={form.contact_alt_phone || ""}
                onChange={(val) => setForm({ ...form, contact_alt_phone: val })}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
