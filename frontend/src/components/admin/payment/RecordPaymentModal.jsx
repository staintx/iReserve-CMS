import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  X, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Upload, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  User, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Building2,
  ChevronDown
} from "lucide-react";
import Btn from "../ui/Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function RecordPaymentModal({
  isOpen,
  onClose,
  bookings = [],
  payments = [],
  depositPercentage = 20,
  onPaymentRecorded,
  fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH"),
  formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"),
  getStatusBadgeLabel = (s) => (["approved", "paid", "succeeded"].includes(String(s || "").toLowerCase()) ? "Paid" : "Pending"),
}) {
  const { notify } = useToast();

  // Selected booking & search state
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Form inputs
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("deposit");
  const [method, setMethod] = useState("cash");
  const [status, setStatus] = useState("approved");
  const [notes, setNotes] = useState("");

  // Proof file state (upload deferred to form submission)
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Loading state
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens / closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBookingId("");
      setSearchQuery("");
      setIsDropdownOpen(false);
      setAmount("");
      setPaymentType("deposit");
      setMethod("cash");
      setStatus("approved");
      setNotes("");
      if (proofPreview) URL.revokeObjectURL(proofPreview);
      setProofFile(null);
      setProofPreview(null);
    }
  }, [isOpen]);

  // Clean up object URL when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  // Handle clicking outside searchable selector
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to get booking financial calculations
  const getBookingFinancials = (booking) => {
    if (!booking) return { totalPrice: 0, bPaid: 0, remaining: 0, requiredDeposit: 0, isDepositSatisfied: false, isFullyPaid: false, depositRemainder: 0 };
    
    const totalPrice = Number(booking.total_price) || 0;
    const bPaid = payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && getStatusBadgeLabel(p.status) === "Paid")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const remaining = Math.max(0, totalPrice - bPaid);
    const requiredDeposit = Number(booking.deposit_amount) > 0 
      ? Number(booking.deposit_amount) 
      : Math.round(totalPrice * (depositPercentage / 100));

    const isDepositSatisfied = bPaid >= requiredDeposit;
    const isFullyPaid = remaining <= 0;
    const depositRemainder = Math.max(0, requiredDeposit - bPaid);

    return {
      totalPrice,
      bPaid,
      remaining,
      requiredDeposit,
      isDepositSatisfied,
      isFullyPaid,
      depositRemainder
    };
  };

  // Currently selected booking
  const selectedBooking = useMemo(() => {
    return bookings.find((b) => String(b._id) === String(selectedBookingId)) || null;
  }, [bookings, selectedBookingId]);

  // Financials of the selected booking
  const currentFinancials = useMemo(() => {
    return getBookingFinancials(selectedBooking);
  }, [selectedBooking, payments, depositPercentage]);

  // Filter bookings for searchable selector
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();

    return bookings.filter((b) => {
      const ref = String(b.reference || "").toLowerCase();
      const first = String(b.contact_first_name || "").toLowerCase();
      const last = String(b.contact_last_name || "").toLowerCase();
      const fullName = `${first} ${last}`.trim();
      const custName = String(b.customer_id?.full_name || "").toLowerCase();
      const eventType = String(b.event_type || "").toLowerCase();
      const email = String(b.contact_email || b.customer_id?.email || "").toLowerCase();
      const dateFormatted = formatDate(b.event_date).toLowerCase();
      const rawDate = String(b.event_date || "").toLowerCase();

      return (
        ref.includes(q) ||
        fullName.includes(q) ||
        custName.includes(q) ||
        eventType.includes(q) ||
        email.includes(q) ||
        dateFormatted.includes(q) ||
        rawDate.includes(q)
      );
    });
  }, [bookings, searchQuery]);

  // Selecting a booking from dropdown
  const handleSelectBooking = (booking) => {
    setSelectedBookingId(booking._id);
    setIsDropdownOpen(false);
    setSearchQuery("");

    const { remaining, requiredDeposit, isDepositSatisfied, isFullyPaid, depositRemainder } = getBookingFinancials(booking);

    if (isFullyPaid) {
      setPaymentType("additional");
      setAmount("");
    } else if (isDepositSatisfied) {
      setPaymentType("balance");
      setAmount(remaining > 0 ? String(remaining) : "");
    } else {
      setPaymentType("deposit");
      setAmount(depositRemainder > 0 ? String(Math.min(depositRemainder, remaining)) : String(remaining));
    }
  };

  // Milestone change handler with smart amount response
  const handleMilestoneChange = (newType) => {
    setPaymentType(newType);
    if (!selectedBooking) return;

    const { remaining, requiredDeposit, isDepositSatisfied, isFullyPaid, depositRemainder, totalPrice } = currentFinancials;

    if (newType === "deposit") {
      if (isDepositSatisfied || isFullyPaid) {
        setAmount("");
      } else {
        setAmount(depositRemainder > 0 ? String(Math.min(depositRemainder, remaining)) : String(remaining));
      }
    } else if (newType === "balance") {
      if (isFullyPaid) {
        setAmount("");
      } else {
        setAmount(remaining > 0 ? String(remaining) : "");
      }
    } else if (newType === "full") {
      if (isFullyPaid) {
        setAmount("");
      } else {
        setAmount(remaining > 0 ? String(remaining) : String(totalPrice));
      }
    } else if (newType === "additional") {
      setAmount("");
    }
  };

  // Live updated remaining balance calculation
  const enteredAmountNum = parseFloat(amount) || 0;
  const newRemainingBalance = useMemo(() => {
    if (!selectedBooking) return 0;
    if (paymentType === "additional") return currentFinancials.remaining;
    return Math.max(0, currentFinancials.remaining - enteredAmountNum);
  }, [selectedBooking, paymentType, currentFinancials.remaining, enteredAmountNum]);

  // Proof File handlers
  const handleFilePicked = (file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      notify("Please upload a valid image (JPG, PNG, WEBP, GIF) or PDF document.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("File size exceeds the 5MB limit.", "error");
      return;
    }

    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(file);
    setProofPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const handleRemoveFile = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBooking) {
      notify("Please select a target booking.", "error");
      return;
    }

    if (!enteredAmountNum || enteredAmountNum <= 0) {
      notify("Please enter a valid payment amount greater than zero.", "error");
      return;
    }

    if (currentFinancials.isFullyPaid && paymentType !== "additional") {
      notify("This booking is already fully paid. Please choose 'Additional Charge' to record supplementary fees.", "error");
      return;
    }

    if (paymentType === "deposit" && currentFinancials.isDepositSatisfied) {
      notify("The required deposit for this booking is already satisfied. Please select 'Final Balance' or another milestone.", "error");
      return;
    }

    setSubmitting(true);

    try {
      let uploadedProofUrl = undefined;

      // Upload proof file only upon submission
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        const uploadRes = await AdminAPI.uploadPaymentProof(formData);
        uploadedProofUrl = uploadRes.data?.url;
      }

      // Record payment with exact existing business schema
      await AdminAPI.createPayment({
        booking_id: selectedBooking._id,
        customer_id: selectedBooking.customer_id?._id || selectedBooking.customer_id || "",
        amount: enteredAmountNum,
        payment_type: paymentType,
        method: method,
        proof_url: uploadedProofUrl,
        status: status,
      });

      notify("Payment recorded successfully!", "success");
      if (onPaymentRecorded) onPaymentRecorded();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to record payment. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#16264A]">
              Record Manual Payment
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter onsite or offline payment with accurate balance reconciliation
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* 1. Target Booking Searchable Selector */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>
                Target Booking <span className="text-red-500">*</span>
              </span>
              {selectedBooking && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBookingId("");
                    setIsDropdownOpen(true);
                  }}
                  className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Change Booking
                </button>
              )}
            </label>

            {!selectedBooking ? (
              <div className="relative">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search booking reference, customer name, or event date..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!isDropdownOpen) setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full text-xs sm:text-sm pl-9 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Dropdown Popover */}
                {isDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-30 divide-y divide-gray-50"
                  >
                    {filteredBookings.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">
                        No bookings found matching "{searchQuery}"
                      </div>
                    ) : (
                      filteredBookings.map((b) => {
                        const fin = getBookingFinancials(b);
                        const custName = `${b.contact_first_name || ""} ${b.contact_last_name || ""}`.trim() || b.customer_id?.full_name || "Guest Customer";
                        return (
                          <div
                            key={b._id}
                            onClick={() => handleSelectBooking(b)}
                            className="p-2.5 hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-between gap-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {b.reference || `BK-${b._id.slice(-6).toUpperCase()}`}
                                </span>
                                <span className="text-xs font-semibold text-gray-900 truncate">
                                  {custName}
                                </span>
                                {b.event_type && (
                                  <span className="text-[11px] text-gray-500">
                                    • {b.event_type}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} />
                                  {formatDate(b.event_date)}
                                </span>
                                <span>
                                  Total: <strong className="text-gray-600 font-medium">{fmt(fin.totalPrice)}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {fin.isFullyPaid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 size={10} /> Fully Paid
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Bal: {fmt(fin.remaining)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Booking Display Card */
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary bg-white px-2 py-0.5 rounded border border-primary/20 shadow-2xs">
                      {selectedBooking.reference || `BK-${selectedBooking._id.slice(-6).toUpperCase()}`}
                    </span>
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {`${selectedBooking.contact_first_name || ""} ${selectedBooking.contact_last_name || ""}`.trim() || selectedBooking.customer_id?.full_name || "Guest Customer"}
                    </span>
                    {selectedBooking.event_type && (
                      <span className="text-xs text-gray-600 font-medium">
                        ({selectedBooking.event_type})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar size={12} />
                      {formatDate(selectedBooking.event_date)}
                    </span>
                    {selectedBooking.contact_phone && (
                      <span>• {selectedBooking.contact_phone}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {currentFinancials.isFullyPaid ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Fully Paid
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                      Remaining: {fmt(currentFinancials.remaining)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Compact Financial Context Breakdown */}
          {selectedBooking && (
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-center">
                <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block">
                  Booking Total
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 block">
                  {fmt(currentFinancials.totalPrice)}
                </span>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block">
                  Amount Paid
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 block">
                  {fmt(currentFinancials.bPaid)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase block">
                  Remaining Balance
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#16264A] mt-0.5 block">
                  {fmt(currentFinancials.remaining)}
                </span>
              </div>
            </div>
          )}

          {/* 3. Milestone & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Milestone Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Milestone Type <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentType}
                onChange={(e) => handleMilestoneChange(e.target.value)}
                disabled={!selectedBooking || submitting}
                className="w-full text-xs sm:text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option 
                  value="deposit" 
                  disabled={currentFinancials.isFullyPaid || currentFinancials.isDepositSatisfied}
                >
                  Deposit (Downpayment) {currentFinancials.isDepositSatisfied ? "— Satisfied" : ""}
                </option>
                <option 
                  value="balance" 
                  disabled={currentFinancials.isFullyPaid}
                >
                  Final Balance {currentFinancials.isFullyPaid ? "— Fully Paid" : ""}
                </option>
                <option 
                  value="full" 
                  disabled={currentFinancials.isFullyPaid}
                >
                  Full Payment {currentFinancials.isFullyPaid ? "— Fully Paid" : ""}
                </option>
                <option value="additional">Additional Charge</option>
              </select>

              {/* Milestone contextual helper */}
              {selectedBooking && paymentType === "deposit" && currentFinancials.isDepositSatisfied && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Required deposit of {fmt(currentFinancials.requiredDeposit)} is already paid.
                </p>
              )}
              {selectedBooking && currentFinancials.isFullyPaid && paymentType !== "additional" && (
                <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> Booking is fully settled. Only additional charges can be recorded.
                </p>
              )}
            </div>

            {/* Amount Field */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Amount (₱) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                  ₱
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder={paymentType === "additional" ? "e.g. 1500" : "0.00"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!selectedBooking || submitting}
                  className="w-full text-xs sm:text-sm pl-7 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-gray-50 transition-all font-mono"
                />
              </div>

              {/* Quick Amount Suggestion Chips */}
              {selectedBooking && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {!currentFinancials.isFullyPaid && currentFinancials.remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(currentFinancials.remaining))}
                      className="text-[10px] font-medium text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                    >
                      Balance ({fmt(currentFinancials.remaining)})
                    </button>
                  )}
                  {!currentFinancials.isDepositSatisfied && currentFinancials.depositRemainder > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.min(currentFinancials.depositRemainder, currentFinancials.remaining)))}
                      className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                    >
                      Deposit ({fmt(Math.min(currentFinancials.depositRemainder, currentFinancials.remaining))})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4. Live Updated Remaining Balance Banner */}
          {selectedBooking && enteredAmountNum > 0 && (
            <div className="p-2.5 rounded-xl border text-xs transition-all">
              {paymentType === "additional" ? (
                <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50/60 p-1 rounded">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>
                    Recording an additional charge payment of <strong>{fmt(enteredAmountNum)}</strong>. (Tracked on top of base booking).
                  </span>
                </div>
              ) : enteredAmountNum > currentFinancials.remaining ? (
                <div className="flex items-center gap-2 text-amber-800 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                  <div>
                    <span>
                      Entered amount exceeds remaining balance by <strong>{fmt(enteredAmountNum - currentFinancials.remaining)}</strong>.
                    </span>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      New Balance: <strong>₱0</strong> (Overpayment recorded)
                    </div>
                  </div>
                </div>
              ) : newRemainingBalance === 0 && currentFinancials.remaining > 0 ? (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200 font-medium">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <span>
                    ✓ This payment will <strong>fully settle</strong> the booking balance ({fmt(currentFinancials.remaining)} → ₱0).
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-gray-700 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500 font-medium">
                    Updated Balance after payment:
                  </span>
                  <span className="font-bold text-[#16264A]">
                    {fmt(currentFinancials.remaining)} → {fmt(newRemainingBalance)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 5. Method & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={submitting}
                className="w-full text-xs sm:text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="cash">Cash Onsite</option>
                <option value="bank">Bank Transfer</option>
                <option value="gcash">GCash</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Initial Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={submitting}
                className="w-full text-xs sm:text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="approved">Approved (Paid)</option>
                <option value="pending">Pending Verification</option>
              </select>
            </div>
          </div>

          {/* 6. Practical Proof Upload Control */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Proof of Payment (Optional)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => handleFilePicked(e.target.files?.[0])}
              disabled={submitting}
            />

            {!proofFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  handleFilePicked(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-colors ${
                  isDraggingFile 
                    ? "border-primary bg-primary/5" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-1.5">
                  <Upload size={15} />
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  Click to browse or drop receipt file here
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  JPG, PNG, WEBP, or PDF up to 5MB (Uploaded upon save)
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {proofPreview ? (
                    <img
                      src={proofPreview}
                      alt="Proof Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
                      {proofFile.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {(proofFile.size / 1024).toFixed(0)} KB • Ready for upload
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200/60 transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={submitting}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Btn
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Btn>
            <Btn
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !selectedBooking}
              className="min-w-[120px]"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" /> Saving...
                </span>
              ) : (
                "Save Payment"
              )}
            </Btn>
          </div>

        </form>
      </div>
    </div>
  );
}
