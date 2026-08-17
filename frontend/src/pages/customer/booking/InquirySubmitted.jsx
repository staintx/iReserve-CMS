import { useEffect } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import CompletionState, {
  CompletionActions,
  CompletionRow,
  CompletionSection,
  CompletionSteps,
} from "../../../components/feedback/CompletionState";
import InlineMessage from "../../../components/feedback/InlineMessage";
import { formatCurrency } from "../../../utils/format";

/**
 * The completion state for a submitted inquiry — the milestone screen
 * the brief asks for, shared by the package booking wizard and the
 * custom quote wizard.
 *
 * Everything on this page is checked against what the backend actually
 * does. `POST /inquiries` creates an Inquiry at status "Pending Review"
 * and notifies the admins in-app. That is all it does, so this page:
 *
 *   - does NOT claim a confirmation email was sent. Nothing in the
 *     inquiry path sends mail; `sendEmail` is only wired to signup
 *     verification and password reset. The old success modal promised
 *     one, and the customer would have waited for it.
 *   - does NOT promise a response time. The old modal advertised a
 *     consultation call and a "3-5 days" proposal; neither exists in
 *     the system, and no SLA is enforced anywhere.
 *   - does say plainly that a submitted request is not a confirmed
 *     booking, because the status flow
 *     (Pending Review → Quotation Sent → Awaiting Final Confirmation)
 *     means it genuinely is not.
 *   - shows the real human reference (INQ-000123) rather than the raw
 *     Mongo _id the custom-quote modal was printing.
 *
 * Reached by navigation with router state rather than rendered as a
 * dismissible modal: it is the end of a flow, it needs a URL, and a
 * backdrop click should not be able to throw it away.
 */

// The customer-visible half of the Inquiry status flow.
const STEPS = [
  {
    title: "Request received",
    body: "Your request is in our queue with everything you filled in. Nothing further is needed from you right now.",
  },
  {
    title: "Our team reviews it",
    body: "We check your date, guest count, and what you asked for against what we can deliver, and get in touch if anything needs clarifying.",
  },
  {
    title: "You get a quotation",
    body: "We send you an itemised quotation with the deposit. You can accept it, ask for changes, or decline — the quotation stays as-is until you respond.",
  },
  {
    title: "Booking is confirmed",
    body: "Once you accept, our team gives the final confirmation and secures your date against the deposit.",
  },
];

export default function InquirySubmitted() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const reference = state?.reference;
  const kind = state?.kind === "custom" ? "custom" : "package";
  const summary = Array.isArray(state?.summary) ? state.summary.filter((row) => row?.value) : [];
  const estimate = Number(state?.estimatedTotal) || 0;

  useEffect(() => {
    document.title = "Request submitted · Caezelle's Food, Catering & Services";
  }, []);

  // Arriving here without state means a refresh or a pasted URL — there is no
  // submission to report, so send them where the real record lives instead of
  // showing an empty celebration.
  if (!state?.submitted) {
    return <Navigate to="/customer/inquiries" replace />;
  }

  return (
    <CustomerLayout>
      <CompletionState
        title={kind === "custom" ? "Quote request submitted" : "Booking request submitted"}
        lead={
          kind === "custom"
            ? "We have your request and the details you gave us. Our team will put together a quotation for your event and send it to you here."
            : "We have your request and the details you gave us. The next step is a quotation from our team, which you can accept, change, or decline."
        }
        reference={reference}
      >
        <InlineMessage tone="warning" title="This is not a confirmed booking yet">
          Your date is not held until you accept a quotation and our team gives the final
          confirmation. We will not charge you anything before then.
        </InlineMessage>

        {summary.length > 0 ? (
          <CompletionSection title="What you asked for">
            <dl>
              {summary.map((row) => (
                <CompletionRow key={row.label} label={row.label} value={row.value} />
              ))}
              {estimate > 0 ? (
                <CompletionRow label="Estimated total" value={formatCurrency(estimate)} total />
              ) : null}
            </dl>
            {estimate > 0 ? (
              <p className="fb-done__note">
                An estimate from what you selected, not a bill. The quotation our team sends is the
                figure that counts, and it may differ once we have priced your menu and add-ons.
              </p>
            ) : null}
          </CompletionSection>
        ) : null}

        <CompletionSection title="What happens next">
          <CompletionSteps steps={STEPS} current={1} />
        </CompletionSection>

        <CompletionSection title="Where to find this">
          <p className="fb-done__note" style={{ marginTop: 12 }}>
            This request lives in{" "}
            <Link to="/customer/inquiries" className="ls-textlink">
              My Inquiries
            </Link>
            , and its status updates there as we work through it. That is also where your quotation
            will appear{reference ? <> under reference {reference}</> : null} — we will not email it
            separately.
          </p>
        </CompletionSection>

        <CompletionActions>
          <button type="button" className="fb-btn fb-btn--ghost" onClick={() => navigate("/customer/home")}>
            Back to home
          </button>
          <button
            type="button"
            className="fb-btn fb-btn--primary"
            onClick={() => navigate("/customer/inquiries")}
          >
            Track this request
          </button>
        </CompletionActions>
      </CompletionState>
    </CustomerLayout>
  );
}
