import { extractPolicySections } from "../components/policy/policyFormat.js";

/**
 * Short-form policy points and invoice policy terms.
 * Sourced dynamically from BusinessInfo so customer forms and invoices
 * reflect business settings without hardcoded drift.
 */
export const policyHighlights = (depositPercentage = 20, policies = null) => {
  const cancellationContent = policies?.cancellation?.content;
  let cancellationRule = "If you cancel after paying, the deposit is forfeited and cannot be transferred to another date.";

  if (cancellationContent) {
    const sections = extractPolicySections(cancellationContent);
    if (sections.length > 0 && sections[0].body) {
      cancellationRule = sections[0].body.slice(0, 160) + (sections[0].body.length > 160 ? "…" : "");
    }
  }

  return [
    {
      title: `A ${depositPercentage}% deposit reserves your date`,
      body: "Your date is held once you accept the quotation and pay the deposit online. The remaining balance is due the same day after your event has been completed (payable online or in cash to your event manager).",
    },
    {
      title: "Deposits & Cancellation Rule",
      body: cancellationRule,
    },
  ];
};

export const getInvoicePolicies = (businessInfo = {}) => {
  const depositPct = Number(businessInfo?.deposit_percentage ?? businessInfo?.depositPercentage) || 20;
  const businessName = businessInfo?.business_name || businessInfo?.name || "Caezelle's Food, Catering & Services";
  const policies = businessInfo?.policies || {};

  const termsContent = policies.terms?.content;
  const cancellationContent = policies.cancellation?.content;

  const termsSections = extractPolicySections(termsContent);
  const cancellationSections = extractPolicySections(cancellationContent);

  // If the admin has configured and published policy content, dynamically construct invoice policies from it
  if (termsSections.length > 0 || cancellationSections.length > 0) {
    const items = [];

    // 1. Terms sections (take up to 3 major operational terms: booking confirmation, payment schedule, equipment)
    for (const section of termsSections) {
      if (items.length >= 3) break;
      items.push({
        title: section.title,
        body: section.body,
      });
    }

    // 2. Cancellation & Refund section (authoritative cancellation rule)
    if (cancellationSections.length > 0) {
      items.push({
        title: cancellationSections[0].title || "Cancellation & Refund Policy",
        body: cancellationSections[0].body,
      });
    }

    return items;
  }

  // Standard fallback
  return [
    {
      title: "Reservation Deposit",
      body: `A ${depositPct}% deposit is required to secure the date and reserve kitchen preparation capacity.`,
    },
    {
      title: "Cancellation & Refund Policy",
      body: "Reservation deposits are non-refundable and non-transferable. Cancellations and date rescheduling must be submitted at least 14 days prior to event date.",
    },
    {
      title: "Balance Settlement",
      body: "Remaining balance is payable the same day after the event is completed (online via portal or cash to on-site manager).",
    },
    {
      title: "Equipment & Tableware Care",
      body: "Client is financially responsible for the safekeeping and replacement value of all catering wares and equipment provided on site.",
    },
  ];
};

