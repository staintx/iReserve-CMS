import React from "react";
import { ShieldAlert, Info } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TTextarea,
  SectionTitle,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";
import LiveEstimate from "../components/LiveEstimate";

export default function StepDietaryNeeds({
  form,
  setForm,
  totalPrice,
  depositAmount,
  depositPercentage,
  selectedPaymentOption,
  setSelectedPaymentOption,
}) {
  return (
    <StepShell
      aside={
        <LiveEstimate
          form={form}
          totalPrice={totalPrice}
          depositAmount={depositAmount}
          depositPercentage={depositPercentage}
          selectedPaymentOption={selectedPaymentOption}
          setSelectedPaymentOption={setSelectedPaymentOption}
        />
      }
    >
      <SH
        title="Dietary Needs"
        sub="Let us know about allergies or restrictions so our kitchen can plan safely."
      />

      <Card className="p-4 sm:p-5">
        <SectionTitle icon={ShieldAlert}>Allergies &amp; restrictions</SectionTitle>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Allergies and Intolerances (Optional)"
            hint="Nut, seafood, dairy, gluten — anything we should avoid."
          >
            <TTextarea
              placeholder="Nut allergies, seafood allergies, lactose intolerance, etc."
              value={form.allergies || ""}
              onChange={(val) => setForm({ ...form, allergies: val })}
              rows={5}
            />
          </Field>

          <Field
            label="Dietary Restrictions (Optional)"
            hint="Vegetarian, halal, low-sodium, or religious requirements."
          >
            <TTextarea
              placeholder="Vegetarian guests, halal preparation, no pork, etc."
              value={form.dietary_restrictions || ""}
              onChange={(val) =>
                setForm({ ...form, dietary_restrictions: val })
              }
              rows={5}
            />
          </Field>
        </div>

        <InfoNote icon={Info} className="mt-4">
          We cannot guarantee an allergen-free kitchen, but our team will take
          every reasonable precaution for the needs you list here.
        </InfoNote>
      </Card>
    </StepShell>
  );
}
