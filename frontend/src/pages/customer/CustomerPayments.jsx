import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";
import useToast from "../../hooks/useToast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CreditCard, Wallet, FileText, CheckCircle2, XCircle } from "lucide-react";

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  useEffect(() => {
    const fetchAndVerify = async () => {
      try {
        const res = await CustomerAPI.getPayments();
        let data = res.data;
        
        if (searchParams.get("status") === "success") {
          let updated = false;
          for (const p of data) {
            if (p.status === "pending") {
              try {
                const vRes = await CustomerAPI.verifyPayment(p._id);
                if (vRes.data?.payment?.status === "approved") {
                  updated = true;
                }
              } catch (e) {}
            }
          }
          if (updated) {
            const fresh = await CustomerAPI.getPayments();
            data = fresh.data;
          }
        }
        setPayments(data);
      } catch (error) {
        setPayments([]);
      }
    };
    fetchAndVerify();
  }, [searchParams]);

  const paymentStatus = searchParams.get("status");

  const startPayment = async (payment) => {
    if (!payment?._id || !payment.booking_id?._id) return;

    const amount = Number(payment.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("This payment does not have a valid amount.", "error");
      return;
    }

    setPayingPaymentId(payment._id);
    navigate("/customer/checkout", {
      state: {
        bookingId: payment.booking_id._id,
        amount,
        paymentType: payment.payment_type || "deposit"
      }
    });
  };

  const totalPaid = useMemo(
    () => payments.filter(p => p.status === "approved").reduce((sum, item) => sum + (item.amount || 0), 0),
    [payments]
  );
  
  const pendingPayments = useMemo(() => {
    // Get all pending payments
    const pending = payments.filter((p) => p.status === "pending");
    // Group by booking to avoid spam of abandoned checkouts
    const uniquePending = [];
    const seenBookings = new Set();
    
    for (const p of pending) {
      const bookingId = p.booking_id?._id || p.booking_id;
      if (!seenBookings.has(bookingId)) {
        seenBookings.add(bookingId);
        uniquePending.push(p);
      }
    }
    return uniquePending;
  }, [payments]);

  const upcomingDue = useMemo(
    () => pendingPayments.reduce((sum, item) => sum + (item.amount || 0), 0),
    [pendingPayments]
  );

  const completedTransactions = useMemo(
    () => payments.filter(p => p.status !== "pending"),
    [payments]
  );

  return (
    <CustomerDashboardLayout
      title="Payment History"
      subtitle="Track your payments and transactions"
    >
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">PayMongo payment completed. Your transaction will update shortly.</p>
        </div>
      )}
      
      {paymentStatus === "cancelled" && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">PayMongo checkout was cancelled.</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
              <h3 className="text-2xl font-bold text-foreground">{formatCurrency(totalPaid)}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming Payments</p>
              <h3 className="text-2xl font-bold text-foreground">{formatCurrency(upcomingDue)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bookings</p>
              <h3 className="text-2xl font-bold text-foreground">{new Set(payments.map((p) => p.booking_id?._id || p.booking_id)).size || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-2">
              {pendingPayments.map((p) => (
                <div key={p._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div>
                    <h4 className="font-bold text-foreground">{p.booking_id?.event_type || "Event Booking"}</h4>
                    <div className="text-sm text-muted-foreground mt-1">Booking Ref: {p.booking_id?._id || p.booking_id}</div>
                    <div className="text-sm text-muted-foreground">Type: <span className="capitalize">{p.payment_type || "deposit"}</span></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <strong className="text-xl text-foreground">{formatCurrency(p.amount)}</strong>
                    <Button
                      onClick={() => startPayment(p)}
                      disabled={payingPaymentId === p._id}
                    >
                      {payingPaymentId === p._id ? "Opening..." : "Pay Now"}
                    </Button>
                  </div>
                </div>
              ))}
              {pendingPayments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No upcoming payments due at this time.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerPaymentsTable payments={completedTransactions} formatCurrency={formatCurrency} />
          </CardContent>
        </Card>
      </div>
    </CustomerDashboardLayout>
  );
}
