import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import CustomerQuotationModal from "../../components/customer/CustomerQuotationModal";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import RecordCard from "../../components/customer/portal/RecordCard";
import DetailGrid from "../../components/customer/portal/DetailGrid";
import PortalToolbar from "../../components/customer/portal/PortalToolbar";
import EmptyState from "../../components/customer/portal/EmptyState";
import LoadingState from "../../components/customer/portal/LoadingState";
import StateNotice from "../../components/customer/portal/StateNotice";
import {
  inquiryStatusGroup,
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
  serviceIcon,
} from "../../components/customer/portal/statusMeta";
import {
  ACTION_PAY_SECONDARY,
  ACTION_MESSAGE,
  ACTION_DANGER,
} from "../../components/customer/portal/actionStyles";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEventDateTime, formatShortDate } from "../../utils/format";
import {
  FileText,
  MessageSquare,
  ArrowRight,
  Plus,
  Eye,
  CreditCard,
  FileCheck2,
  XCircle,
} from "lucide-react";

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  // Modal State for viewing Quotation
  const [selectedInquiryForModal, setSelectedInquiryForModal] = useState(null);
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [quotationVersions, setQuotationVersions] = useState([]);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Cancel Dialog State
  const [cancellingInquiry, setCancellingInquiry] = useState(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const res = await CustomerAPI.getInquiries();
      setInquiries(res.data || []);
    } catch (err) {
      notify("Failed to load inquiries.", "error");
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  useRealTimeRefresh(fetchInquiries);

  const counts = useMemo(() => ({
    all: inquiries.length,
    quote_ready: inquiries.filter((i) => inquiryStatusGroup(i) === "quote_ready").length,
    under_review: inquiries.filter((i) => inquiryStatusGroup(i) === "under_review").length,
    accepted: inquiries.filter((i) => inquiryStatusGroup(i) === "accepted").length,
    closed: inquiries.filter((i) => inquiryStatusGroup(i) === "closed").length,
  }), [inquiries]);

  // Filtered list
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      // 1. Status Filter
      if (statusTab !== "all" && inquiryStatusGroup(inq) !== statusTab) return false;

      // 2. Service Type Filter
      if (serviceTypeFilter !== "all" && resolveServiceType(inq) !== serviceTypeFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (inq.reference || "").toLowerCase();
        const type = (inq.event_type || "").toLowerCase();
        const name = `${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.toLowerCase();
        const city = (inq.municipality || inq.province || "").toLowerCase();

        return ref.includes(q) || type.includes(q) || name.includes(q) || city.includes(q);
      }

      return true;
    });
  }, [inquiries, statusTab, serviceTypeFilter, searchQuery]);

  const isFiltered = Boolean(searchQuery.trim()) || statusTab !== "all" || serviceTypeFilter !== "all";

  // Open Quotation Modal
  const openQuotationView = async (inquiry) => {
    try {
      setIsLoadingQuotation(true);
      setSelectedInquiryForModal(inquiry);
      const res = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]); // highest/latest version
        setQuotationVersions(quotes); // every saved version, for the change comparison
        setIsQuotationModalOpen(true);
      } else {
        notify("No formal quotation details found for this inquiry.", "error");
      }
    } catch (err) {
      notify("Failed to retrieve quotation details.", "error");
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  // Open Chat
  const handleOpenChat = async (inquiryId) => {
    try {
      const conversation = await createConversation({ booking_id: inquiryId });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (err) {
      notify("Could not initiate chat at this moment.", "error");
    }
  };

  // Start Inquiry Deposit Checkout
  const startInquiryCheckout = async (inq) => {
    try {
      notify("Generating checkout session for deposit payment...", "info");
      const qRes = await CustomerAPI.getQuotationsForInquiry(inq._id);
      const quotes = qRes.data || [];
      const latestQuote = quotes[0];
      const depositVal = Number(latestQuote?.deposit_amount) > 0 ? Number(latestQuote.deposit_amount) : Number(inq.total_price || 0);

      if (depositVal <= 0) {
        notify("Deposit amount has not been set yet.", "error");
        return;
      }

      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        inquiry_id: inq._id,
        amount: depositVal,
        payment_type: "deposit"
      });

      if (checkoutRes.data?.checkout_url) {
        notify("Redirecting to PayMongo payment checkout...", "success");
        window.location.assign(checkoutRes.data.checkout_url);
      } else {
        notify("Could not generate payment checkout URL.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start deposit payment checkout.", "error");
    }
  };

  // Handle Cancel Inquiry
  const handleCancelInquiry = async () => {
    if (!cancellingInquiry) return;
    try {
      setIsSubmittingCancel(true);
      await CustomerAPI.cancelInquiry(cancellingInquiry._id);
      notify("Inquiry has been cancelled.", "info");
      setCancellingInquiry(null);
      fetchInquiries();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to cancel inquiry.", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const renderInquiry = (inq) => {
    const group = inquiryStatusGroup(inq);
    const status = inquiryStatusMeta(inq);
    const serviceType = resolveServiceType(inq);
    const refCode = inq.reference || `INQ-${inq._id.substring(0, 6).toUpperCase()}`;
    const isQuotationReady = inq.status === "Quotation Sent";
    const isAccepted = inq.status === "Quote Accepted" || inq.status === "Converted to Booking";
    const isPending = ["Pending Review", "Under Review"].includes(inq.status);
    const isClosed = group === "closed";
    const location = inq.municipality || inq.province || inq.venue_type || "Location to be confirmed";

    // The money column only earns its place once there is a real number in it;
    // an un-priced request says everything it needs to via its status.
    const amount = inq.total_price
      ? { label: isAccepted ? "Accepted quote" : "Quoted total", value: formatCurrency(inq.total_price), tone: isAccepted ? "success" : "neutral" }
      : inq.budget_range && !isClosed
        ? { label: "Your budget", value: inq.budget_range, tone: "neutral" }
        : null;

    // Exactly one primary action per state.
    const primaryAction = isQuotationReady ? (
      <Button onClick={() => openQuotationView(inq)} disabled={isLoadingQuotation} className="w-full sm:w-auto">
        <Eye className="h-4 w-4" /> Review &amp; accept quote
      </Button>
    ) : isAccepted ? (
      <Button
        onClick={() => navigate(`/customer/bookings/${inq.converted_booking_id || inq._id}`)}
        className="w-full sm:w-auto"
      >
        <ArrowRight className="h-4 w-4" /> Go to booking
      </Button>
    ) : null;

    // Paying the deposit matters enough to stay visible, but must not compete
    // with the primary step.
    const secondaryAction = isAccepted ? (
      <Button
        variant="outline"
        onClick={() => startInquiryCheckout(inq)}
        className={cn("w-full sm:w-auto", ACTION_PAY_SECONDARY)}
      >
        <CreditCard className="h-4 w-4" /> Pay deposit
      </Button>
    ) : null;

    const secondaryActions = (
      <>
        {!isQuotationReady && !isClosed && inq.total_price > 0 && (
          <Button variant="outline" size="sm" onClick={() => openQuotationView(inq)} disabled={isLoadingQuotation}>
            <FileCheck2 className="h-4 w-4" /> View quotation
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => handleOpenChat(inq._id)} className={ACTION_MESSAGE}>
          <MessageSquare className="h-4 w-4" /> Message us
        </Button>

        {isPending && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCancellingInquiry(inq)}
            className={cn(ACTION_DANGER, "sm:ml-auto")}
          >
            <XCircle className="h-4 w-4" /> Cancel request
          </Button>
        )}
      </>
    );

    const address = [inq.street, inq.barangay, inq.municipality, inq.province, inq.zip_code]
      .filter(Boolean)
      .join(", ");

    const details = (
      <div className="space-y-5">
        <DetailGrid
          title="Request details"
          items={[
            { label: "Reference number", value: refCode, mono: true },
            { label: "Submitted", value: formatShortDate(inq.createdAt) },
            { label: "Package", value: inq.package_id?.name || "Custom quote" },
            { label: "Contact person", value: `${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.trim() || "—" },
            { label: "Contact details", value: [inq.contact_email, inq.contact_phone].filter(Boolean).join(" · ") },
            inq.landmark && { label: "Landmark", value: inq.landmark },
          ]}
        />

        <DetailGrid
          title="Venue and notes"
          className="border-t border-border pt-4"
          items={[
            { label: "Venue address", value: address || location, wide: true },
            { label: "Special requests", value: inq.special_requests || "None", wide: true },
            inq.dietary_requirements && { label: "Dietary needs", value: inq.dietary_requirements, wide: true },
          ]}
        />
      </div>
    );

    return (
      <RecordCard
        key={inq._id}
        icon={serviceIcon(serviceType)}
        title={recordTitle(inq)}
        status={{ tone: status.tone, label: status.label, icon: status.icon }}
        meta={[
          formatEventDateTime(inq.event_date, inq.start_time),
          inq.guest_count ? `${inq.guest_count} guests` : null,
          serviceType,
          location,
        ]}
        amount={amount}
        notice={status.notice}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        details={details}
        secondaryActions={secondaryActions}
        expanded={expandedId === inq._id}
        onToggle={() => setExpandedId(expandedId === inq._id ? null : inq._id)}
        quiet={isClosed}
      />
    );
  };

  return (
    <CustomerDashboardLayout
      title="My Inquiries"
      subtitle="See where each quote request stands and what happens next."
      actions={
        <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>
          <Plus className="h-4 w-4" /> Request a quote
        </Button>
      }
    >
      {/* What needs your attention, in one sentence */}
      {!loading && counts.quote_ready > 0 && (
        <StateNotice tone="info" icon={FileCheck2} title="Your quote is ready." className="mb-6">
          {counts.quote_ready === 1
            ? "One request has a quote waiting for your review."
            : `${counts.quote_ready} requests have quotes waiting for your review.`}{" "}
          {statusTab !== "quote_ready" && (
            <button
              type="button"
              onClick={() => setStatusTab("quote_ready")}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Show them
            </button>
          )}
        </StateNotice>
      )}

      <PortalToolbar
        className="mb-6"
        activeSegment={statusTab}
        onSegmentChange={setStatusTab}
        segments={[
          { id: "all", label: "All", count: counts.all },
          { id: "quote_ready", label: "Quote ready", count: counts.quote_ready, tone: "info" },
          { id: "under_review", label: "Under review", count: counts.under_review, tone: "warning" },
          { id: "accepted", label: "Accepted", count: counts.accepted, tone: "success" },
          { id: "closed", label: "Closed", count: counts.closed, tone: "neutral" },
        ]}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search events or places",
          label: "Search inquiries",
        }}
        filter={{
          label: "Service:",
          value: serviceTypeFilter,
          onChange: setServiceTypeFilter,
          options: [
            { id: "all", label: "All services" },
            ...SERVICE_TYPES.map((type) => ({ id: type, label: type })),
          ],
        }}
      />

      {/* Inquiry List */}
      <div className="space-y-4">
        {loading ? (
          <LoadingState label="Loading your quote requests" />
        ) : filteredInquiries.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={isFiltered ? "No requests match your filters" : "No quote requests yet"}
            description={
              isFiltered
                ? "Try a different filter or clear your search to see all your requests."
                : "Tell us about your event and we'll send you a tailored catering quote."
            }
            action={
              isFiltered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusTab("all");
                    setServiceTypeFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}>
                  <Plus className="h-4 w-4" /> Request a quote
                </Button>
              )
            }
          />
        ) : (
          filteredInquiries.map(renderInquiry)
        )}
      </div>

      {/* Quotation Viewer Modal */}
      {isQuotationModalOpen && activeQuotation && (
        <CustomerQuotationModal
          open={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          quotation={activeQuotation}
          versions={quotationVersions}
          inquiry={selectedInquiryForModal}
          onUpdated={fetchInquiries}
        />
      )}

      {/* Cancel Inquiry Confirmation */}
      <Dialog open={!!cancellingInquiry} onOpenChange={(open) => !open && setCancellingInquiry(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription className="pt-2">
              We'll stop working on{" "}
              <strong className="text-foreground">
                {cancellingInquiry ? recordTitle(cancellingInquiry) : "this request"}
              </strong>
              {cancellingInquiry?.reference ? ` (${cancellingInquiry.reference})` : ""}. This cannot be undone, but you
              can always send a new request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellingInquiry(null)} disabled={isSubmittingCancel}>
              Keep request
            </Button>
            <Button variant="destructive" onClick={handleCancelInquiry} disabled={isSubmittingCancel}>
              {isSubmittingCancel ? "Cancelling…" : "Yes, cancel it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
