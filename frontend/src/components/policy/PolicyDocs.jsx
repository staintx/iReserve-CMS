/**
 * Single source for the customer-facing Terms and Privacy text.
 *
 * The booking wizard and the custom-quote wizard both have to show these, and
 * previously each carried its own abridged copy that had already drifted apart.
 * Wording here is the fuller of the two originals, unchanged except that the
 * deposit percentage now reads from BusinessInfo instead of being hardcoded —
 * the same value the backend charges (payment.controller.js).
 */

const H = ({ children }) => (
  <h4 className="mb-2 text-base font-bold text-[#1E293B]">{children}</h4>
);

export function TermsContent({ depositPercentage = 20 }) {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-[#64748B]">
      <section>
        <H>Booking &amp; Reservation</H>
        <p>
          All bookings are subject to availability. A reservation is only
          considered confirmed once the client has provided the necessary event
          details and paid the required deposit.
        </p>
      </section>
      <section>
        <H>Payment Terms</H>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Deposit:</strong> A {depositPercentage}% down payment is
            required to reserve the date.
          </li>
          <li>
            <strong>Final Payment:</strong> The remaining balance must be paid a
            day before the event date.
          </li>
        </ul>
      </section>
      <section>
        <H>Cancellation &amp; Refund Policy</H>
        <p className="font-medium text-red-600">
          IMPORTANT: All deposits made are non-refundable and non-transferable.
          If a booking is canceled by the client for any reason, the deposit will
          be forfeited to cover administrative costs and lost business
          opportunities.
        </p>
      </section>
      <section>
        <H>Lost or Damaged Equipment</H>
        <p>
          The client is responsible for the safekeeping of all catering equipment
          and materials provided during the event. The client will be billed and
          held financially responsible for the replacement cost of any items that
          are lost, missing, or damaged during the event.
        </p>
      </section>
      <section>
        <H>Liability</H>
        <p>
          Caezelle&apos;s Catering Service is not responsible for any delays or
          failures in performance due to circumstances beyond our control (e.g.,
          natural disasters, extreme weather, or government restrictions).
        </p>
      </section>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-[#64748B]">
      <section>
        <H>Data Collection</H>
        <p>
          We collect personal information such as your name, contact number,
          email address, and event details to facilitate your booking and provide
          our services.
        </p>
      </section>
      <section>
        <H>Use of Information</H>
        <p>
          Your data is used strictly for: processing your catering orders and
          payments, communicating regarding event logistics, and improving our
          system&apos;s user experience.
        </p>
      </section>
      <section>
        <H>Data Security</H>
        <p>
          We implement secure protocols to protect your information from
          unauthorized access. We do not sell or share your personal data with
          third-party marketers.
        </p>
      </section>
      <section>
        <H>Consent</H>
        <p>
          By using this system and paying the deposit, you agree to the
          collection of your data and acknowledge the No-Refund Policy stated in
          our Terms and Conditions.
        </p>
      </section>
    </div>
  );
}

// The short-form summary of the Terms above lives in `lib/policy.js`, so this
// file exports only components (and stays fast-refresh friendly).
