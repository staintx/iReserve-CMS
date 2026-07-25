import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import useToast from "../../../hooks/useToast";

export default function CustomCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [bookingId, setBookingId] = useState(location.state?.bookingId);
  const [amount, setAmount] = useState(location.state?.amount);
  const [paymentType, setPaymentType] = useState(location.state?.paymentType || "deposit");
  
  const [intentId, setIntentId] = useState(null);
  const [clientKey, setClientKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [selectedMethod, setSelectedMethod] = useState("gcash"); // gcash, paymaya, card
  
  // Card Details Form
  const [cardDetails, setCardDetails] = useState({
    name: "",
    card_number: "",
    exp_month: "",
    exp_year: "",
    cvc: ""
  });

  useEffect(() => {
    if (!bookingId || !amount) {
      notify("Missing payment details. Redirecting...", "error");
      navigate("/customer/bookings");
      return;
    }

    CustomerAPI.createPaymentIntent({
      booking_id: bookingId,
      amount: amount,
      payment_type: paymentType
    }).then(res => {
      setIntentId(res.data.intent_id);
      setClientKey(res.data.client_key);
      setLoading(false);
    }).catch(err => {
      notify(err.response?.data?.message || "Failed to initialize payment", "error");
      navigate("/customer/bookings");
    });
  }, [bookingId, amount, paymentType, navigate, notify]);

  const handlePay = async () => {
    if (!intentId) return;
    setProcessing(true);

    try {
      let details = {};
      if (selectedMethod === "card") {
        if (!cardDetails.name || !cardDetails.card_number || !cardDetails.exp_month || !cardDetails.exp_year || !cardDetails.cvc) {
          notify("Please fill in all card details", "error");
          setProcessing(false);
          return;
        }
        details = {
          card_number: cardDetails.card_number.replace(/\s/g, ''),
          exp_month: parseInt(cardDetails.exp_month),
          exp_year: parseInt(cardDetails.exp_year),
          cvc: cardDetails.cvc
        };
      }

      const res = await CustomerAPI.processPaymentIntent({
        intent_id: intentId,
        payment_method_type: selectedMethod,
        details: selectedMethod === "card" ? details : undefined,
        billing: selectedMethod === "card" ? { name: cardDetails.name, email: "customer@example.com" } : undefined
      });

      const { status, next_action_url } = res.data;

      if (next_action_url) {
        window.location.href = next_action_url;
      } else if (status === "succeeded") {
        notify("Payment successful!", "success");
        navigate("/customer/payments?status=success");
      } else {
        notify("Payment is pending or failed. Check your payments dashboard.", "info");
        navigate("/customer/payments");
      }
    } catch (error) {
      notify(error.response?.data?.message || "Payment failed", "error");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="booking-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <h2>Initializing secure payment...</h2>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="booking-page" style={{ maxWidth: "600px", margin: "40px auto" }}>
        <div className="booking-card">
          <div className="booking-card-header" style={{ textAlign: "center", justifyContent: "center" }}>
            <h3 style={{ margin: 0 }}>Secure Checkout</h3>
          </div>
          
          <div style={{ marginBottom: "30px", padding: "20px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0", fontSize: "0.875rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Total Amount to Pay</p>
            <h1 style={{ margin: "10px 0 0", color: "#0f172a", fontSize: "2.5rem" }}>₱{Number(amount).toLocaleString()}</h1>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <h4 style={{ marginBottom: "16px", color: "#334155", fontSize: "1rem", fontWeight: 600 }}>Select Payment Method</h4>
            <div className="grid sm:grid-cols-3" style={{ gap: "12px" }}>
              <button 
                type="button"
                className={selectedMethod === 'gcash' ? 'btn' : 'btn-outline'}
                onClick={() => setSelectedMethod("gcash")}
                style={{ padding: "12px", height: "auto" }}
              >
                GCash
              </button>
              <button 
                type="button"
                className={selectedMethod === 'paymaya' ? 'btn' : 'btn-outline'}
                onClick={() => setSelectedMethod("paymaya")}
                style={{ padding: "12px", height: "auto" }}
              >
                Maya
              </button>
              <button 
                type="button"
                className={selectedMethod === 'card' ? 'btn' : 'btn-outline'}
                onClick={() => setSelectedMethod("card")}
                style={{ padding: "12px", height: "auto" }}
              >
                Credit Card
              </button>
            </div>
          </div>

          {selectedMethod === "card" && (
            <div className="booking-grid" style={{ marginBottom: "30px" }}>
              <label className="field span-2">
                <span>Name on Card</span>
                <input type="text" placeholder="John Doe" value={cardDetails.name} onChange={e => setCardDetails({...cardDetails, name: e.target.value})} />
              </label>
              <label className="field span-2">
                <span>Card Number</span>
                <input type="text" placeholder="0000 0000 0000 0000" value={cardDetails.card_number} onChange={e => setCardDetails({...cardDetails, card_number: e.target.value})} />
              </label>
              <label className="field">
                <span>Exp Month</span>
                <input type="text" placeholder="MM" maxLength="2" value={cardDetails.exp_month} onChange={e => setCardDetails({...cardDetails, exp_month: e.target.value})} />
              </label>
              <label className="field">
                <span>Exp Year</span>
                <input type="text" placeholder="YY" maxLength="2" value={cardDetails.exp_year} onChange={e => setCardDetails({...cardDetails, exp_year: e.target.value})} />
              </label>
              <label className="field">
                <span>CVC</span>
                <input type="text" placeholder="123" maxLength="4" value={cardDetails.cvc} onChange={e => setCardDetails({...cardDetails, cvc: e.target.value})} />
              </label>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
            <button 
              className="btn"
              onClick={handlePay} 
              disabled={processing}
              style={{ padding: "16px", fontSize: "1.1rem" }}
            >
              {processing ? "Processing Securely..." : `Pay ₱${Number(amount).toLocaleString()}`}
            </button>

            <button 
              className="btn-outline"
              onClick={() => navigate("/customer/bookings", { replace: true })} 
              disabled={processing}
              style={{ padding: "16px", fontSize: "1.1rem" }}
            >
              Cancel & Pay Later
            </button>
          </div>

          <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.75rem", color: "#94a3b8" }}>
            Payments securely processed by PayMongo
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
}
