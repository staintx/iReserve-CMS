import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import useAuth from "../hooks/useAuth";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ForgotPasswordSent from "../pages/auth/ForgotPasswordSent";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";

import Landing from "../pages/customer/Landing";
import CustomerInquiries from "../pages/customer/CustomerInquiries";
import CustomerBookings from "../pages/customer/CustomerBookings";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerPayments from "../pages/customer/CustomerPayments";
import CustomerMessages from "../pages/customer/CustomerMessages";
import CustomerMessageThread from "../pages/customer/CustomerMessageThread";
import CustomerProfile from "../pages/customer/CustomerProfile";
import Packages from "../pages/customer/Packages";
import PackageDetails from "../pages/customer/PackageDetails";
import Menu from "../pages/customer/Menu";
import Gallery from "../pages/customer/Gallery";

import BookingWizard from "../pages/customer/booking/BookingWizard";
import BookingSuccess from "../pages/customer/booking/BookingSuccess";

import QuoteWizard from "../pages/customer/quote/QuoteWizard";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminInquiries from "../pages/admin/AdminInquiries";
import AdminPaymentApprovals from "../pages/admin/AdminPaymentApprovals";
import AdminMessagesList from "../pages/admin/AdminMessagesList";
import AdminMessagesChat from "../pages/admin/AdminMessagesChat";
import AdminGallery from "../pages/admin/AdminGallery";
import AdminBookingsActive from "../pages/admin/AdminBookingsActive";
import AdminBookingsHistory from "../pages/admin/AdminBookingsHistory";
import AdminBookingsCalendar from "../pages/admin/AdminBookingsCalendar";
import AdminPackages from "../pages/admin/AdminPackages";
import AdminMenu from "../pages/admin/AdminMenu";
import AdminInventory from "../pages/admin/AdminInventory";
import AdminManagers from "../pages/admin/AdminManagers";
import AdminStaff from "../pages/admin/AdminStaff";
import AdminReports from "../pages/admin/AdminReports";
import AdminRatings from "../pages/admin/AdminRatings";
import AdminBusinessInfo from "../pages/admin/AdminBusinessInfo";
import AdminSystemLogs from "../pages/admin/AdminSystemLogs";

const adminRoles = ["admin", "manager", "staff"];
const managerRoles = ["admin", "manager"];
const adminOnly = ["admin"];

export default function AppRoutes() {
  const { user } = useAuth();
  const isAdmin = adminRoles.includes(user?.role);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Landing />} />
        <Route path="/packages" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Packages />} />
        <Route path="/packages/:id" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <PackageDetails />} />
        <Route path="/menu" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Menu />} />
        <Route path="/gallery" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Gallery />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password/sent" element={<ForgotPasswordSent />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Booking & Quote (protected) */}
        <Route path="/customer/home" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/book" element={<ProtectedRoute><BookingWizard /></ProtectedRoute>} />
        <Route path="/customer/booking-success" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />
        <Route path="/customer/inquiries" element={<ProtectedRoute><CustomerInquiries /></ProtectedRoute>} />
        <Route path="/customer/bookings" element={<ProtectedRoute><CustomerBookings /></ProtectedRoute>} />
        <Route path="/customer/payments" element={<ProtectedRoute><CustomerPayments /></ProtectedRoute>} />
        <Route path="/customer/messages" element={<ProtectedRoute><CustomerMessages /></ProtectedRoute>} />
        <Route path="/customer/messages/:id" element={<ProtectedRoute><CustomerMessageThread /></ProtectedRoute>} />
        <Route path="/customer/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />

        <Route path="/customer/quote" element={<ProtectedRoute><QuoteWizard /></ProtectedRoute>} />

        {/* Admin (protected by role) */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={adminRoles}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/inquiries" element={<ProtectedRoute allowedRoles={managerRoles}><AdminInquiries /></ProtectedRoute>} />
        <Route path="/admin/payment-approvals" element={<ProtectedRoute allowedRoles={managerRoles}><AdminPaymentApprovals /></ProtectedRoute>} />
        <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={adminRoles}><AdminMessagesList /></ProtectedRoute>} />
        <Route path="/admin/messages/:id" element={<ProtectedRoute allowedRoles={adminRoles}><AdminMessagesChat /></ProtectedRoute>} />
        <Route path="/admin/gallery" element={<ProtectedRoute allowedRoles={managerRoles}><AdminGallery /></ProtectedRoute>} />
        <Route path="/admin/bookings/active" element={<ProtectedRoute allowedRoles={adminRoles}><AdminBookingsActive /></ProtectedRoute>} />
        <Route path="/admin/bookings/history" element={<ProtectedRoute allowedRoles={adminRoles}><AdminBookingsHistory /></ProtectedRoute>} />
        <Route path="/admin/bookings/calendar" element={<ProtectedRoute allowedRoles={adminRoles}><AdminBookingsCalendar /></ProtectedRoute>} />
        <Route path="/admin/packages" element={<ProtectedRoute allowedRoles={adminOnly}><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute allowedRoles={adminOnly}><AdminMenu /></ProtectedRoute>} />
        <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={adminOnly}><AdminInventory /></ProtectedRoute>} />
        <Route path="/admin/managers" element={<ProtectedRoute allowedRoles={adminOnly}><AdminManagers /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={adminOnly}><AdminStaff /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={managerRoles}><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/ratings" element={<ProtectedRoute allowedRoles={adminOnly}><AdminRatings /></ProtectedRoute>} />
        <Route path="/admin/business-info" element={<ProtectedRoute allowedRoles={adminOnly}><AdminBusinessInfo /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={adminOnly}><AdminSystemLogs /></ProtectedRoute>} />

        <Route path="*" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Landing />} />
      </Routes>
    </BrowserRouter>
  );
}