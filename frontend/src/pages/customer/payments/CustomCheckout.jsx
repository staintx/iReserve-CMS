import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import useToast from "../../../hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ShieldCheck, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [paymentError, setPaymentError] = useState("");
  
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
    setPaymentError("");

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
        navigate(`/customer/bookings/${bookingId}?status=success`);
      } else {
        setPaymentError("Payment is pending or failed. Please check your account or try a different method.");
        setProcessing(false);
      }
    } catch (error) {
      setPaymentError(error.response?.data?.message || "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <h2 className="text-xl font-medium text-muted-foreground font-serif">Initializing secure payment...</h2>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-xl mx-auto px-4 py-12">
        <Card className="border-border shadow-md overflow-hidden">
          <CardHeader className="text-center pb-8 border-b border-border bg-muted/30">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold font-serif text-foreground">Secure Checkout</CardTitle>
            <CardDescription>Complete your {paymentType} payment securely</CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 sm:p-8">
            <div className="text-center p-6 bg-accent/5 rounded-2xl border border-accent/20 mb-8">
              <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-2">Total Amount to Pay</p>
              <h1 className="text-4xl font-bold text-foreground">₱{Number(amount).toLocaleString()}</h1>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Select Payment Method</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Button 
                    variant={selectedMethod === 'gcash' ? 'default' : 'outline'}
                    className={cn("h-14 font-semibold", selectedMethod === 'gcash' && "bg-primary text-primary-foreground")}
                    onClick={() => setSelectedMethod("gcash")}
                  >
                    GCash
                  </Button>
                  <Button 
                    variant={selectedMethod === 'paymaya' ? 'default' : 'outline'}
                    className={cn("h-14 font-semibold", selectedMethod === 'paymaya' && "bg-primary text-primary-foreground")}
                    onClick={() => setSelectedMethod("paymaya")}
                  >
                    Maya
                  </Button>
                  <Button 
                    variant={selectedMethod === 'card' ? 'default' : 'outline'}
                    className={cn("h-14 font-semibold flex items-center gap-2", selectedMethod === 'card' && "bg-primary text-primary-foreground")}
                    onClick={() => setSelectedMethod("card")}
                  >
                    <CreditCard className="w-4 h-4" /> Card
                  </Button>
                </div>
              </div>

              {paymentError && (
                <div className="flex gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="text-sm font-bold block mb-1">Payment Failed</strong>
                    <p className="text-sm opacity-90">{paymentError}</p>
                  </div>
                </div>
              )}

              {selectedMethod === "card" && (
                <div className="grid grid-cols-2 gap-4 p-5 bg-muted/20 border border-border rounded-xl">
                  <div className="col-span-2 space-y-2">
                    <Label>Name on Card</Label>
                    <Input placeholder="John Doe" value={cardDetails.name} onChange={e => setCardDetails({...cardDetails, name: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Card Number</Label>
                    <Input placeholder="0000 0000 0000 0000" value={cardDetails.card_number} onChange={e => setCardDetails({...cardDetails, card_number: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exp Month</Label>
                    <Input placeholder="MM" maxLength="2" value={cardDetails.exp_month} onChange={e => setCardDetails({...cardDetails, exp_month: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exp Year</Label>
                    <Input placeholder="YY" maxLength="2" value={cardDetails.exp_year} onChange={e => setCardDetails({...cardDetails, exp_year: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>CVC</Label>
                    <Input placeholder="123" maxLength="4" value={cardDetails.cvc} onChange={e => setCardDetails({...cardDetails, cvc: e.target.value})} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 p-6 sm:p-8 bg-muted/10 border-t border-border">
            <Button 
              className="w-full h-14 text-base font-bold bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handlePay} 
              disabled={processing}
            >
              {processing && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {processing ? "Processing Securely..." : paymentError ? `Retry Payment (₱${Number(amount).toLocaleString()})` : `Pay ₱${Number(amount).toLocaleString()}`}
            </Button>

            <Button 
              variant="outline"
              className="w-full h-12 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/customer/bookings", { replace: true })} 
              disabled={processing}
            >
              Cancel & Pay Later
            </Button>

            <p className="text-center mt-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Secured by PayMongo
            </p>
          </CardFooter>
        </Card>
      </div>
    </CustomerLayout>
  );
}
