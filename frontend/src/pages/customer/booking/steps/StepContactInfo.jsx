import { Mail, Phone, User } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";

export default function StepContactInfo({ form, setForm }) {
  const labelClass = "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="border-b border-border p-6 md:p-8">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Contact Information</h2>
        <p className="text-sm text-muted-foreground">How can we reach you regarding your booking?</p>
      </div>

      <CardContent className="p-6 md:p-8">
        <div className="max-w-2xl">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className={labelClass}>
                  <User size={14} className="text-muted-foreground" />
                  First Name *
                </Label>
                <Input
                  type="text"
                  placeholder="Juan"
                  value={form.contact_first_name}
                  onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>
                  <User size={14} className="text-muted-foreground" />
                  Last Name *
                </Label>
                <Input
                  type="text"
                  placeholder="Dela Cruz"
                  value={form.contact_last_name}
                  onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>
                <Mail size={14} className="text-muted-foreground" />
                Email Address *
              </Label>
              <Input
                type="email"
                placeholder="juan@example.com"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className={labelClass}>
                  <Phone size={14} className="text-muted-foreground" />
                  Primary Phone *
                </Label>
                <Input
                  type="text"
                  placeholder="(+63) 900 000 0000"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>
                  <Phone size={14} className="text-muted-foreground" />
                  Alternative Phone
                </Label>
                <Input
                  type="text"
                  placeholder="Optional"
                  value={form.contact_alt_phone}
                  onChange={(e) => setForm({ ...form, contact_alt_phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
