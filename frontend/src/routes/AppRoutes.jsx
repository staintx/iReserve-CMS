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
import CustomerHome from "../pages/customer/CustomerHome";
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
        <Route path="/customer/home" element={<ProtectedRoute><CustomerHome /></ProtectedRoute>} />
        <Route path="/customer/book" element={<ProtectedRoute><BookingWizard /></ProtectedRoute>} />
        <Route path="/customer/booking-success" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />

        <Route path="/customer/quote" element={<ProtectedRoute><QuoteWizard /></ProtectedRoute>} />

        {/* Admin (protected by role) */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={adminRoles}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/inquiries" element={<ProtectedRoute allowedRoles={adminRoles}><AdminInquiries /></ProtectedRoute>} />
        <Route path="/admin/payment-approvals" element={<ProtectedRoute allowedRoles={adminRoles}><AdminPaymentApprovals /></ProtectedRoute>} />
        <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={adminRoles}><AdminMessagesList /></ProtectedRoute>} />
        <Route path="/admin/messages/:id" element={<ProtectedRoute allowedRoles={adminRoles}><AdminMessagesChat /></ProtectedRoute>} />
        <Route path="/admin/gallery" element={<ProtectedRoute allowedRoles={adminRoles}><AdminGallery /></ProtectedRoute>} />
        <Route path="/admin/bookings/active" element={<ProtectedRoute allowedRoles={adminRoles}><AdminBookingsActive /></ProtectedRoute>} />
        <Route path="/admin/bookings/history" element={<ProtectedRoute allowedRoles={adminRoles}><AdminBookingsHistory /></ProtectedRoute>} />
        <Route path="/admin/packages" element={<ProtectedRoute allowedRoles={adminRoles}><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute allowedRoles={adminRoles}><AdminMenu /></ProtectedRoute>} />
        <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={adminRoles}><AdminInventory /></ProtectedRoute>} />
        <Route path="/admin/managers" element={<ProtectedRoute allowedRoles={adminRoles}><AdminManagers /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={adminRoles}><AdminStaff /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={adminRoles}><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/ratings" element={<ProtectedRoute allowedRoles={adminRoles}><AdminRatings /></ProtectedRoute>} />
        <Route path="/admin/business-info" element={<ProtectedRoute allowedRoles={adminRoles}><AdminBusinessInfo /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={adminRoles}><AdminSystemLogs /></ProtectedRoute>} />

        <Route path="*" element={isAdmin ? <Navigate to="/admin/dashboard" /> : <Landing />} />
      </Routes>
    </BrowserRouter>
  );
}