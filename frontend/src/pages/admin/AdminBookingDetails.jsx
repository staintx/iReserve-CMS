import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Printer, Check, Phone, Mail, MapPin, AlertCircle, Edit, Calendar } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  // Modals state
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    guest_count: "",
    event_date: "",
    start_time: "",
    venue_type: ""
  });
  
  // Ocular Reschedule State
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");

  const loadData = () => {
    setLoading(true);
    Promise.all([
      AdminAPI.getBooking(id),
      AdminAPI.getPayments()
    ]).then(([bRes, pRes]) => {
      setBooking(bRes.data);
      setPayments(pRes.data.filter(p => p.booking_id?._id === id || p.booking_id === id));
      
      setEditForm({
        guest_count: bRes.data.guest_count || "",
        event_date: bRes.data.event_date ? new Date(bRes.data.event_date).toISOString().split('T')[0] : "",
        start_time: bRes.data.start_time || "",
        venue_type: bRes.data.venue_type || ""
      });

      if (bRes.data.ocular_visit) {
        setOcularDate(bRes.data.ocular_visit.scheduled_date ? new Date(bRes.data.ocular_visit.scheduled_date).toISOString().split('T')[0] : "");
        setOcularTime(bRes.data.ocular_visit.scheduled_time || "");
      }
    }).catch(err => {
      notify("Failed to load booking details", "error");
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout>
        <div className="p-6 min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <p className="text-gray-500">Booking not found.</p>
        </div>
      </AdminLayout>
    );
  }
  
  const TIMELINE_STEPS = ["Booking Requested", "Deposit Paid", "Approved", "Ocular Scheduled", "Staff Assigned", "Final Payment", "Ready for Event", "Completed"];
  
  let completedIdx = 0;
  if (booking.status === "completed") completedIdx = 7;
  else if (booking.status === "ongoing" || booking.status === "preparing") completedIdx = 6;
  else if (booking.payment_status === "fully_paid") completedIdx = 5;
  else if (booking.event_manager_id) completedIdx = 4;
  else if (booking.ocular_visit?.status === "scheduled") completedIdx = 3;
  else if (booking.status === "confirmed") completedIdx = 2;
  else if (booking.payment_status === "deposit_paid") completedIdx = 1;

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const customerName = booking.customer_id?.full_name || `${booking.contact_first_name} ${booking.contact_last_name}`.trim() || "Customer";
  
  const totalPaid = payments.filter(p => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handleApprove = () => {
    AdminAPI.updateBooking(booking._id, { status: "confirmed" })
      .then(() => {
        notify("Booking approved successfully.", "success");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to approve booking.", "error"));
  };

  const handleResolveChange = () => {
    AdminAPI.resolveChangeRequest(booking._id, { status: "approved" })
      .then(() => {
        notify("Change request marked as resolved.", "success");
        setShowChangeModal(false);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to resolve change request.", "error"));
  };

  const handleUpdateDetails = (e) => {
    e.preventDefault();
    AdminAPI.updateBooking(booking._id, editForm)
      .then(() => {
        notify("Booking details updated successfully.", "success");
        setShowEditModal(false);
        if (showChangeModal) setShowChangeModal(false);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to update booking.", "error"));
  };

  const handleScheduleOcular = (e) => {
    e.preventDefault();
    AdminAPI.scheduleOcular(booking._id, {
      scheduled_date: ocularDate,
      scheduled_time: ocularTime
    })
    .then(() => {
      notify("Ocular schedule updated.", "success");
      setShowRescheduleModal(false);
      loadData();
    })
    .catch(err => notify(err.response?.data?.message || "Failed to confirm ocular schedule", "error"));
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/admin/bookings/reservations")} className="text-[#6B7280] hover:text-[#111] flex items-center gap-1 text-sm transition-colors">
            <ChevronLeft size={15} /> Reservations
          </button>
          <ChevronRight size={13} className="text-[#D1D5DB]" />
          <span className="text-sm font-semibold text-[#111]">{booking.reference || booking._id}</span>
          <Badge status={booking.status} />
          <div className="ml-auto flex gap-2">
            <Btn size="sm" variant="secondary"><Printer size={13} /> Print Invoice</Btn>
            {booking.status === "pending deposit" && <Btn size="sm" variant="gold" onClick={handleApprove}><Check size={13} /> Approve Booking</Btn>}
          </div>
        </div>

        {booking.change_request?.status === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-amber-500 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-bold text-amber-800">Pending Change Request</h4>
              <p className="text-sm text-amber-700 mt-1">{booking.change_request.message}</p>
            </div>
            <Btn size="sm" variant="secondary" className="bg-white" onClick={() => setShowChangeModal(true)}>Review Request</Btn>
          </div>
        )}

        {/* Progress Timeline */}
        <AdminCard className="!p-5 overflow-x-auto">
          <p className="font-bold text-[#111] text-sm mb-4">Booking Progress</p>
          <div className="flex items-start gap-0 min-w-max pb-2">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${i <= completedIdx ? "border-[#D4AF37] bg-[#D4AF37] text-[#111]" : i === completedIdx + 1 ? "border-[#D4AF37] bg-white text-[#D4AF37]" : "border-gray-200 bg-white text-[#9CA3AF]"}`}>
                    {i <= completedIdx ? <Check size={12} /> : i + 1}
                  </div>
                  <p className={`text-[10px] font-medium mt-1.5 text-center max-w-16 leading-tight ${i <= completedIdx ? "text-[#111]" : "text-[#9CA3AF]"}`}>{step}</p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && <div className={`h-0.5 w-10 mb-5 mx-1 ${i < completedIdx ? "bg-[#D4AF37]" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer Info */}
          <AdminCard className="!p-5">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Customer Information</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold">
                {customerName.split(" ").map(n => n[0]).join("").substring(0,2)}
              </div>
              <div>
                <p className="font-bold text-[#111]">{customerName}</p>
                <p className="text-xs text-[#6B7280]">Client</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Phone size={13} className="text-[#9CA3AF]" /><span className="text-[#374151]">{booking.contact_phone || booking.customer_id?.phone || "N/A"}</span></div>
              <div className="flex items-center gap-2"><Mail size={13} className="text-[#9CA3AF]" /><span className="text-[#374151]">{booking.contact_email || booking.customer_id?.email || "N/A"}</span></div>
              <div className="flex items-center gap-2"><MapPin size={13} className="text-[#9CA3AF]" /><span className="text-[#374151]">{[booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || "N/A"}</span></div>
            </div>
          </AdminCard>

          {/* Event Info */}
          <AdminCard className="!p-5 relative">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Event Information</p>
              {!['cancelled', 'completed', 'refunded'].includes(booking.status) && (
                <button onClick={() => setShowEditModal(true)} className="text-[#6B7280] hover:text-[#D4AF37] transition-colors"><Edit size={14} /></button>
              )}
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ["Type", booking.event_type || "Event"], 
                ["Date", booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBA"], 
                ["Venue", booking.venue_type || "TBA"], 
                ["Guests", `${booking.guest_count || 0} pax`], 
                ["Theme", booking.event_theme || "None"], 
                ["Special Requests", booking.special_requests || "None"]
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-[#6B7280]">{l}</span>
                  <span className="font-semibold text-[#111] text-right">{v}</span>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Financials */}
          <AdminCard className="!p-5">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Financial Summary</p>
            <div className="space-y-2.5 text-sm mb-4">
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-[#6B7280]">Total Amount</span>
                <span className="font-semibold text-[#111]">{fmt(booking.total_price)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-[#6B7280] flex items-center gap-1.5">Amount Paid</span>
                <span className="font-semibold text-[#111]">{fmt(totalPaid)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-[#6B7280] flex items-center gap-1.5">Payment Status <Badge status={booking.payment_status} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] flex items-center gap-1.5">Balance Due</span>
                <span className="font-semibold text-[#111]">{fmt(Math.max(0, booking.total_price - totalPaid))}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              {booking.payment_status !== "fully_paid" && booking.status !== "cancelled" && (
                <Btn size="sm" variant="gold" className="w-full justify-center">Record Payment</Btn>
              )}
              {booking.status !== "cancelled" && (
                <Btn 
                  size="sm" 
                  variant="secondary" 
                  className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    const amount = window.prompt("Enter refund amount to process via PayMongo:");
                    if (amount && !isNaN(Number(amount))) {
                      AdminAPI.processRefund(booking._id, { amount: Number(amount) })
                        .then(() => {
                          notify("Refund processed successfully", "success");
                          loadData();
                        })
                        .catch(err => notify(err.response?.data?.message || "Failed to process refund", "error"));
                    }
                  }}
                >
                  Cancel & Issue Refund
                </Btn>
              )}
            </div>
          </AdminCard>
        </div>

        {/* Ocular Section */}
        {booking.ocular_visit && (booking.ocular_visit.status === "scheduled" || booking.ocular_visit.status === "requested") && (
          <div className={`border rounded-xl p-4 flex items-start gap-3 mt-5 ${booking.ocular_visit.status === "requested" ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}>
            {booking.ocular_visit.status === "requested" ? <AlertCircle className="text-blue-500 mt-0.5" size={20} /> : <Calendar className="text-emerald-500 mt-0.5" size={20} />}
            <div className="flex-1">
              <h4 className={`font-bold ${booking.ocular_visit.status === "requested" ? "text-blue-800" : "text-emerald-800"}`}>
                {booking.ocular_visit.status === "requested" ? "Ocular Visit Requested" : "Ocular Visit Scheduled"}
              </h4>
              <p className={`text-sm mt-1 ${booking.ocular_visit.status === "requested" ? "text-blue-700" : "text-emerald-700"}`}>
                Date: {new Date(booking.ocular_visit.scheduled_date || booking.ocular_visit.date).toLocaleDateString()} at {booking.ocular_visit.scheduled_time || booking.ocular_visit.time || "any time"}.
              </p>
            </div>
            <div className="flex gap-2">
              {booking.ocular_visit.status === "requested" && (
                <Btn size="sm" variant="gold" onClick={handleScheduleOcular}>
                  Confirm Schedule
                </Btn>
              )}
              {booking.ocular_visit.status === "scheduled" && (
                <Btn size="sm" variant="secondary" className="bg-white" onClick={() => setShowRescheduleModal(true)}>
                  Reschedule
                </Btn>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Booking Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateDetails}>
            <DialogHeader>
              <DialogTitle>Edit Event Information</DialogTitle>
              <DialogDescription>Modify core booking details below.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Guest Count</label>
                <Input type="number" value={editForm.guest_count} onChange={(e) => setEditForm({...editForm, guest_count: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Date</label>
                <Input type="date" value={editForm.event_date} onChange={(e) => setEditForm({...editForm, event_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input type="time" value={editForm.start_time} onChange={(e) => setEditForm({...editForm, start_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Venue Type</label>
                <Input type="text" value={editForm.venue_type} onChange={(e) => setEditForm({...editForm, venue_type: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Btn type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Btn>
              <Btn type="submit" variant="gold">Save Changes</Btn>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Change Request Modal */}
      <Dialog open={showChangeModal} onOpenChange={setShowChangeModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Customer Change Request</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 italic border border-gray-200">
              "{booking?.change_request?.message}"
            </div>
            <p className="text-sm text-gray-600">
              To resolve this request, you can explicitly update the booking details (which automatically resolves it) or simply mark it as resolved.
            </p>
          </div>
          <DialogFooter>
            <Btn variant="secondary" onClick={handleResolveChange}>Mark as Resolved</Btn>
            <Btn variant="gold" onClick={() => { setShowChangeModal(false); setShowEditModal(true); }}>Edit Booking Details</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Ocular Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleScheduleOcular}>
            <DialogHeader>
              <DialogTitle>Reschedule Ocular Visit</DialogTitle>
              <DialogDescription>Select a new date and time for the ocular visit.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={ocularDate} onChange={(e) => setOcularDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input type="time" value={ocularTime} onChange={(e) => setOcularTime(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Btn type="button" variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Btn>
              <Btn type="submit" variant="gold">Reschedule</Btn>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
