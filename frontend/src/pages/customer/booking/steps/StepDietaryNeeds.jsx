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
    <StepShell width="medium">
      <SH
        title="Allergies & Dietary Needs"
        sub="Both are optional. Anything you write here goes to our kitchen."
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Allergies"
            hint="Ingredients that must not touch the food at all."
          >
            <TTextarea
              placeholder="e.g. Two guests have a severe peanut allergy"
              value={form.allergies || ""}
              onChange={(val) => setForm({ ...form, allergies: val })}
              rows={4}
            />
          </Field>

          <Field
            label="Dietary restrictions"
            hint="Preferences, and religious or medical requirements."
          >
            <TTextarea
              placeholder="e.g. 5 vegetarian guests, no pork, halal preparation"
              value={form.dietary_restrictions || ""}
              onChange={(val) => setForm({ ...form, dietary_restrictions: val })}
              rows={4}
            />
          </Field>
        </div>

        <InfoNote icon={Info} tone="warn" className="mt-4">
          Our kitchen is not allergen free and we cannot guarantee no cross
          contact, but we take every reasonable precaution for what you list
          here.
        </InfoNote>
      </Card>
    </StepShell>
  );
}
