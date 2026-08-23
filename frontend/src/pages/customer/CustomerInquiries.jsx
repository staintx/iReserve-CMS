import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import CustomerQuotationModal from "../../components/customer/CustomerQuotationModal";
import CustomerInquiryEditModal from "../../components/customer/CustomerInquiryEditModal";
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
  Pencil,
  Clock,
} from "lucide-react";

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const location = useLocation();
  // Set by the booking wizard on a successful submit. The flow used to end on
  // a bare list with only a toast, so a customer who missed it had no
  // confirmation that anything had been received.
  const submittedReference = location.state?.submittedReference;
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

  // Edit Details Modal State
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [loadingEditInquiryId, setLoadingEditInquiryId] = useState(null);

  // The list only carries a summary (package name/type, no menu items, no
  // add-ons) — the edit modal needs the full document, populated the same way
  // the admin's own detail view is, so the customer sees everything they
  // originally submitted rather than a partial reflection of it.
  const openEditModal = async (inq) => {
    try {
      setLoadingEditInquiryId(inq._id);
      const res = await CustomerAPI.getInquiryById(inq._id);
      setEditingInquiry(res.data);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load your request details.", "error");
    } finally {
      setLoadingEditInquiryId(null);
    }
  };

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

  // Automatic real-time confirmation on return from PayMongo checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const paymentId = params.get("payment_id");

    if (paymentStatus === "success" && paymentId) {
      const verify = async () => {
        try {
          notify("Confirming your payment with the payment gateway...", "info");
          await CustomerAPI.verifyPayment(paymentId);
          notify("Deposit payment confirmed in real time! Your booking is locked.", "success");
          fetchInquiries();
        } catch (err) {
          console.error("Payment auto-verification error:", err);
          fetchInquiries();
        }
      };
      verify();
      navigate(location.pathname, { replace: true });
    } else if (paymentStatus === "cancelled") {
      notify("Payment checkout was cancelled.", "warning");
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  useRealTimeRefresh(fetchInquiries);

  const isRecentInquiry = (inq) => {
    if (!inq.createdAt && !inq.updatedAt) return false;
    const t = new Date(inq.createdAt || inq.updatedAt).getTime();
    return (Date.now() - t) <= (7 * 24 * 60 * 60 * 1000); // Created or updated within 7 days
  };

  const isNewlySubmitted = (inq) => {
    if (!inq.createdAt) return false;
    const t = new Date(inq.createdAt).getTime();
    return (Date.now() - t) <= (48 * 60 * 60 * 1000); // Submitted within last 48 hours
  };

  const counts = useMemo(() => ({
    all: inquiries.length,
    recent: inquiries.filter(isRecentInquiry).length,
    quote_ready: inquiries.filter((i) => inquiryStatusGroup(i) === "quote_ready").length,
    under_review: inquiries.filter((i) => inquiryStatusGroup(i) === "under_review").length,
    accepted: inquiries.filter((i) => inquiryStatusGroup(i) === "accepted").length,
    closed: inquiries.filter((i) => inquiryStatusGroup(i) === "closed").length,
  }), [inquiries]);

  // Filtered list
  const filteredInquiries = useMemo(() => {
    const list = inquiries.filter((inq) => {
      // 1. Status / Recent Filter
      if (statusTab === "recent") {
        if (!isRecentInquiry(inq)) return false;
      } else if (statusTab !== "all" && inquiryStatusGroup(inq) !== statusTab) {
        return false;
      }

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

    // Always sort newest inquiries first by database creation/update date
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
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
      const conversation = await createConversation({ inquiry_id: inquiryId });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (err) {
      notify("Could not initiate chat at this moment.", "error");
    }
  };

  // Start Inquiry Deposit Checkout
  const startInquiryCheckout = async (inq) => {
    try {
      const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
      const isDepositPaid = inq.payment_status === "deposit_paid" || inq.payment_status === "fully_paid" || inq.is_deposit_paid === true || ["confirmed", "deposit_paid"].includes((inq.status || "").toLowerCase());

      if (isConverted || isDepositPaid) {
        notify("The deposit payment for this inquiry has already been completed.", "info");
        if (inq.converted_booking_id) {
          navigate(`/customer/bookings/${inq.converted_booking_id}`);
        }
        return;
      }

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
    const isConverted = inq.status === "Converted to Booking" || Boolean(inq.converted_booking_id);
    const isDepositPaid = inq.payment_status === "deposit_paid" || inq.payment_status === "fully_paid" || inq.is_deposit_paid === true || ["confirmed", "deposit_paid"].includes((inq.status || "").toLowerCase());
    const isAccepted = ["Quote Accepted", "Awaiting Final Confirmation"].includes(inq.status) || isConverted;
    const canPayDeposit = !isConverted && !isDepositPaid && (
      ["Quotation Sent", "Quote Accepted", "Awaiting Final Confirmation"].includes(inq.status) &&
      Number(inq.total_price) > 0 &&
      !["Cancelled", "Quote Rejected", "Expired"].includes(inq.status)
    );
    const isPending = ["Pending Review", "Under Review"].includes(inq.status);
    const isClosed = group === "closed";
    const isEditable = ["Pending Review", "Under Review"].includes(inq.status);
    const location = inq.municipality || inq.province || inq.venue_type || "Location to be confirmed";

    // The money column only earns its place once there is a real number in it;
    // an un-priced request says everything it needs to via its status.
    const amount = inq.total_price
      ? { label: isAccepted ? "Accepted quote" : "Quoted total", value: formatCurrency(inq.total_price), tone: isAccepted ? "success" : "neutral" }
      : inq.budget_range && !isClosed
        ? { label: "Your budget", value: inq.budget_range, tone: "neutral" }
        : null;

    // Primary action per state
    const primaryAction = isConverted ? (
      <Button
        onClick={() => navigate(`/customer/bookings/${inq.converted_booking_id}`)}
        className="w-full sm:w-auto"
      >
        <ArrowRight className="h-4 w-4" /> Go to booking
      </Button>
    ) : isQuotationReady ? (
      <Button onClick={() => openQuotationView(inq)} disabled={isLoadingQuotation} className="w-full sm:w-auto">
        <Eye className="h-4 w-4" /> Review &amp; accept quote
      </Button>
    ) : canPayDeposit ? (
      <Button
        onClick={() => startInquiryCheckout(inq)}
        className={cn("w-full sm:w-auto", ACTION_PAY_SECONDARY)}
      >
        <CreditCard className="h-4 w-4" /> Pay deposit
      </Button>
    ) : isDepositPaid ? (
      <Button
        variant="outline"
        onClick={() => openQuotationView(inq)}
        disabled={isLoadingQuotation}
        className="w-full sm:w-auto border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> View paid quote
      </Button>
    ) : null;

    const secondaryAction = isEditable ? (
      <Button
        variant="outline"
        onClick={() => openEditModal(inq)}
        disabled={loadingEditInquiryId === inq._id}
        className="w-full sm:w-auto"
      >
        <Pencil className="h-4 w-4" />
        {loadingEditInquiryId === inq._id ? "Loading…" : "Edit details"}
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
          title="Event details"
          items={[
            { label: "Event date & time", value: formatEventDateTime(inq.event_date, inq.start_time) },
            { label: "Duration", value: inq.duration_hours ? `${inq.duration_hours} hours` : null },
            { label: "Guest count", value: inq.guest_count ? `${inq.guest_count} guests` : null },
            { label: "Service type", value: serviceType },
            { label: "Theme", value: inq.event_theme || null },
            { label: "Color palette", value: (inq.event_palette || []).filter(Boolean).join(", ") || null },
            { label: "Delivery method", value: inq.delivery_method ? inq.delivery_method.charAt(0).toUpperCase() + inq.delivery_method.slice(1) : null },
          ]}
        />

        <DetailGrid
          title="Request details"
          className="border-t border-border pt-4"
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
            inq.allergies && { label: "Allergies", value: inq.allergies, wide: true },
            inq.dietary_restrictions && { label: "Dietary restrictions", value: inq.dietary_restrictions, wide: true },
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
        isNew={isNewlySubmitted(inq)}
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
      {new URLSearchParams(location.search).get("payment") === "cancelled" && (
        <StateNotice
          tone="warning"
          icon={Clock}
          title="Payment not completed."
          className="mb-6"
        >
          Your deposit checkout was cancelled. You can click <strong>&quot;Pay deposit&quot;</strong> on your inquiry card whenever you are ready to complete your payment and confirm your booking.
        </StateNotice>
      )}

      {new URLSearchParams(location.search).get("payment") === "success" && (
        <StateNotice
          tone="success"
          icon={FileCheck2}
          title="Deposit payment verified &amp; booking confirmed!"
          className="mb-6"
        >
          Thank you! Your deposit payment was approved and your inquiry has been converted into a confirmed booking. You can track all event details under <strong>My Bookings</strong>.
        </StateNotice>
      )}

      {submittedReference !== undefined && (
        <StateNotice
          tone="success"
          icon={FileCheck2}
          title="Request sent — nothing has been charged."
          className="mb-6"
        >
          {submittedReference ? (
            <>
              Your reference is{" "}
              <strong className="font-semibold">{submittedReference}</strong>.{" "}
            </>
          ) : null}
          Our team is pricing your event now. We&apos;ll email your quotation and
          it will appear here for you to review — accepting it and paying the
          deposit is what reserves your date.
        </StateNotice>
      )}

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
          { id: "recent", label: "Recent", count: counts.recent, tone: "info" },
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

      {/* Edit Inquiry Details Modal */}
      <CustomerInquiryEditModal
        open={!!editingInquiry}
        inquiry={editingInquiry}
        onClose={() => setEditingInquiry(null)}
        onSaved={fetchInquiries}
      />

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
