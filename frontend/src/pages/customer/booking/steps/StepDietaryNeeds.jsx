import React from "react";
import { Card, SH, FL, TTextarea } from "../components/BookingSharedUI";
import LiveEstimate from "../components/LiveEstimate";

export default function StepDietaryNeeds({ form, setForm, totalPrice, depositAmount, onNext, depositPercentage, selectedPaymentOption, setSelectedPaymentOption }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row max-w-6xl mx-auto py-6">
      <div className="flex-1 space-y-6">
        <SH title="Dietary Needs" sub="Please let us know of any allergies or dietary restrictions." />

        <Card className="p-6">
          <FL>Allergies and Intolerances (Optional)</FL>
          <TTextarea
            placeholder="Nut allergies, seafood allergies, lactose intolerance, etc."
            value={form.allergies || ""}
            onChange={(val) => setForm({ ...form, allergies: val })}
            rows={5}
          />
        </Card>
      </div>

      <div className="w-full lg:w-80 flex-shrink-0">
        <LiveEstimate
          form={form}
          totalPrice={totalPrice}
          depositAmount={depositAmount}
          depositPercentage={depositPercentage}
          selectedPaymentOption={selectedPaymentOption}
          setSelectedPaymentOption={setSelectedPaymentOption}
          onNext={onNext}
        />
      </div>
    </div>
  );
}
