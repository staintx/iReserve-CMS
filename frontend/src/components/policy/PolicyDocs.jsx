import PolicyRenderer from "./PolicyRenderer";
import { DEFAULT_POLICIES } from "./defaultPolicies";
import useBusinessInfo from "../../hooks/useBusinessInfo";

/**
 * Dynamic policy content components for customer portals.
 * Reads published policy texts from BusinessInfo.policies, with fallback to standard defaults.
 */

export function TermsContent({ content, businessInfo: provided }) {
  const businessInfo = useBusinessInfo(provided);
  const termsText =
    content ||
    businessInfo?.policies?.terms?.content ||
    DEFAULT_POLICIES.terms.content;

  return <PolicyRenderer content={termsText} />;
}

export function PrivacyContent({ content, businessInfo: provided }) {
  const businessInfo = useBusinessInfo(provided);
  const privacyText =
    content ||
    businessInfo?.policies?.privacy?.content ||
    DEFAULT_POLICIES.privacy.content;

  return <PolicyRenderer content={privacyText} />;
}

export function CancellationContent({ content, businessInfo: provided }) {
  const businessInfo = useBusinessInfo(provided);
  const cancellationText =
    content ||
    businessInfo?.policies?.cancellation?.content ||
    DEFAULT_POLICIES.cancellation.content;

  return <PolicyRenderer content={cancellationText} />;
}
