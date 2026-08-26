import { Info } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TTextarea,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";

/**
 * No estimate panel here on purpose: nothing on this step changes the price,
 * and a cost summary next to an allergy question is noise that trains people to
 * stop reading it.
 */
export default function StepDietaryNeeds({ form, setForm }) {
  return (
    <StepShell width="wide">
      <SH
        title="Allergies & Dietary Needs"
        sub="Both are optional. Any special dietary requests or allergies will be shared directly with our kitchen crew."
      />

      <Card className="p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Allergies (Optional)"
            hint="Ingredients that must not touch the food at all."
          >
            <TTextarea
              placeholder="e.g. Two guests have severe peanut / seafood allergies"
              value={form.allergies || ""}
              onChange={(val) => setForm({ ...form, allergies: val })}
              rows={3}
            />
          </Field>

          <Field
            label="Dietary restrictions (Optional)"
            hint="Dietary preferences, religious or health requirements."
          >
            <TTextarea
              placeholder="e.g. 5 vegetarian guests, no pork, or low sodium"
              value={form.dietary_restrictions || ""}
              onChange={(val) => setForm({ ...form, dietary_restrictions: val })}
              rows={3}
            />
          </Field>
        </div>

        <InfoNote icon={Info} tone="warn" className="mt-3">
          Our kitchen prepares diverse menus. We follow strict hygiene protocols, though cross-contact risk is minimized rather than fully zero.
        </InfoNote>
      </Card>
    </StepShell>
  );
}
