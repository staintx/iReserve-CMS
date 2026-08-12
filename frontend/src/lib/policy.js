/**
 * Short-form policy points, drawn from the Terms rendered by
 * `components/policy/PolicyDocs.jsx`. Kept alongside that document rather than
 * written independently, so a summary can never say something the full text
 * does not.
 *
 * The deposit figure is passed in from BusinessInfo.deposit_percentage — the
 * same value the backend charges — rather than hardcoded.
 */
export const policyHighlights = (depositPercentage = 20) => [
  {
    title: `A ${depositPercentage}% deposit reserves your date`,
    body: "Your date is held once you accept the quotation and pay the deposit. The balance is due the day before the event.",
  },
  {
    title: "Deposits are non-refundable",
    body: "If you cancel after paying, the deposit is forfeited and cannot be transferred to another date.",
  },
];
