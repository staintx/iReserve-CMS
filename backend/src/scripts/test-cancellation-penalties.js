const assert = require("assert");

// Self-check for cancellation penalty resolution logic
function calculateCancellationResolution({ totalPaid, refund_amount, penalty_amount, penalty_reason, cancellation_type }) {
  const hasExplicitRefund = refund_amount !== undefined && refund_amount !== null && refund_amount !== "" && !isNaN(refund_amount);
  const numRefund = hasExplicitRefund ? Math.max(0, Number(refund_amount)) : null;

  let calculatedPenalty = 0;
  if (penalty_amount !== undefined && penalty_amount !== null && !isNaN(penalty_amount)) {
    calculatedPenalty = Math.max(0, Number(penalty_amount));
  } else if (hasExplicitRefund && numRefund === 0 && totalPaid > 0) {
    calculatedPenalty = totalPaid;
  } else if (hasExplicitRefund && numRefund > 0 && totalPaid > numRefund) {
    calculatedPenalty = Math.max(0, totalPaid - numRefund);
  }

  const effectivePenaltyReason = (
    penalty_reason ||
    (cancellation_type === "no_show" ? "Customer No-Show on Event Day" : "") ||
    (cancellation_type === "breach_uncooperative" ? "Client Breach / Non-cooperation" : "") ||
    "Deposit forfeited per Cancellation & Refund Policy"
  ).trim();

  let payment_status = "pending";
  if (totalPaid > 0) {
    if (hasExplicitRefund) {
      if (numRefund > 0) {
        payment_status = "refunded";
      } else {
        payment_status = "deposit_paid";
      }
    } else {
      payment_status = "refund_requested";
    }
  }

  return {
    numRefund,
    calculatedPenalty,
    effectivePenaltyReason,
    payment_status,
  };
}

console.log("Running cancellation penalty unit checks...");

// Case 1: Customer No-Show on Event Day (100% Forfeiture)
const case1 = calculateCancellationResolution({
  totalPaid: 5000,
  refund_amount: 0,
  cancellation_type: "no_show",
});
assert.strictEqual(case1.numRefund, 0, "Case 1: Refund must be 0");
assert.strictEqual(case1.calculatedPenalty, 5000, "Case 1: 100% of 5000 must be forfeited as penalty");
assert.strictEqual(case1.payment_status, "deposit_paid", "Case 1: payment_status must NOT be marked as refunded");
assert(case1.effectivePenaltyReason.includes("No-Show"), "Case 1: reason must mention No-Show");

// Case 2: Partial refund with deposit forfeiture penalty
const case2 = calculateCancellationResolution({
  totalPaid: 15000,
  refund_amount: 10000,
  penalty_amount: 5000,
  penalty_reason: "5000 deposit forfeited per late cancellation terms",
});
assert.strictEqual(case2.numRefund, 10000, "Case 2: Refund must be 10000");
assert.strictEqual(case2.calculatedPenalty, 5000, "Case 2: Penalty must be 5000");
assert.strictEqual(case2.payment_status, "refunded", "Case 2: payment_status must be refunded");

// Case 3: Customer non-cooperation / breach
const case3 = calculateCancellationResolution({
  totalPaid: 7500,
  refund_amount: 0,
  cancellation_type: "breach_uncooperative",
});
assert.strictEqual(case3.calculatedPenalty, 7500, "Case 3: Penalty must be 7500");
assert(case3.effectivePenaltyReason.includes("Breach"), "Case 3: reason must mention Breach");

// Case 4: Sent to refund queue
const case4 = calculateCancellationResolution({
  totalPaid: 8000,
  refund_amount: undefined,
});
assert.strictEqual(case4.payment_status, "refund_requested", "Case 4: payment_status must be refund_requested");

console.log("✓ All cancellation penalty assertions passed!");
