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
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <h2>Initializing secure payment...</h2>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="custom-checkout-container" style={{ maxWidth: "600px", margin: "40px auto", padding: "30px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#333" }}>Secure Checkout</h2>
        <div style={{ marginBottom: "30px", padding: "15px", background: "#f8f9fa", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ margin: "0", fontSize: "16px", color: "#666" }}>Total Amount to Pay</p>
          <h1 style={{ margin: "10px 0 0", color: "#2E7D32" }}>₱{Number(amount).toLocaleString()}</h1>
        </div>

        <h4 style={{ marginBottom: "15px" }}>Select Payment Method</h4>
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button 
            style={{ flex: 1, padding: "15px", border: `2px solid ${selectedMethod === 'gcash' ? '#007bff' : '#eee'}`, borderRadius: "8px", background: selectedMethod === 'gcash' ? '#e7f1ff' : '#fff', cursor: 'pointer' }}
            onClick={() => setSelectedMethod("gcash")}
          >
            <strong style={{ color: "#005ce6" }}>GCash</strong>
          </button>
          <button 
            style={{ flex: 1, padding: "15px", border: `2px solid ${selectedMethod === 'paymaya' ? '#007bff' : '#eee'}`, borderRadius: "8px", background: selectedMethod === 'paymaya' ? '#e7f1ff' : '#fff', cursor: 'pointer' }}
            onClick={() => setSelectedMethod("paymaya")}
          >
            <strong style={{ color: "#000" }}>Maya</strong>
          </button>
          <button 
            style={{ flex: 1, padding: "15px", border: `2px solid ${selectedMethod === 'card' ? '#007bff' : '#eee'}`, borderRadius: "8px", background: selectedMethod === 'card' ? '#e7f1ff' : '#fff', cursor: 'pointer' }}
            onClick={() => setSelectedMethod("card")}
          >
            <strong>Credit Card</strong>
          </button>
        </div>

        {selectedMethod === "card" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Name on Card</label>
              <input type="text" placeholder="John Doe" style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "6px" }} value={cardDetails.name} onChange={e => setCardDetails({...cardDetails, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Card Number</label>
              <input type="text" placeholder="0000 0000 0000 0000" style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "6px" }} value={cardDetails.card_number} onChange={e => setCardDetails({...cardDetails, card_number: e.target.value})} />
            </div>
            <div style={{ display: "flex", gap: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Exp Month</label>
                <input type="text" placeholder="MM" maxLength="2" style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "6px" }} value={cardDetails.exp_month} onChange={e => setCardDetails({...cardDetails, exp_month: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Exp Year</label>
                <input type="text" placeholder="YY" maxLength="2" style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "6px" }} value={cardDetails.exp_year} onChange={e => setCardDetails({...cardDetails, exp_year: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>CVC</label>
                <input type="text" placeholder="123" maxLength="4" style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "6px" }} value={cardDetails.cvc} onChange={e => setCardDetails({...cardDetails, cvc: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={handlePay} 
          disabled={processing}
          style={{ width: "100%", padding: "16px", background: "#007bff", color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: processing ? "not-allowed" : "pointer", opacity: processing ? 0.7 : 1 }}
        >
          {processing ? "Processing Securely..." : `Pay ₱${Number(amount).toLocaleString()}`}
        </button>

        <button 
          onClick={() => navigate("/customer/bookings", { replace: true })} 
          disabled={processing}
          style={{ width: "100%", padding: "16px", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: processing ? "not-allowed" : "pointer", marginTop: "10px" }}
        >
          Cancel & Pay Later
        </button>

        <p style={{ textAlign: "center", marginTop: "15px", fontSize: "12px", color: "#888" }}>
          Payments securely processed by PayMongo
        </p>
      </div>
    </CustomerLayout>
  );
}
