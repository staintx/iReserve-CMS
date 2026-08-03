import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import useAuth from "../hooks/useAuth";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import ForgotPassword from "../pages/auth/ForgotPassword";

import ResetPassword from "../pages/auth/ResetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";

import Landing from "../pages/customer/Landing";

import CustomCheckout from "../pages/customer/payments/CustomCheckout";

import CustomerBookings from "../pages/customer/CustomerBookings";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerPayments from "../pages/customer/CustomerPayments";
import CustomerMessages from "../pages/customer/CustomerMessages";
import CustomerMessageThread from "../pages/customer/CustomerMessageThread";
import CustomerEventDashboard from "../pages/customer/CustomerEventDashboard";
import CustomerProfile from "../pages/customer/CustomerProfile";
import Packages from "../pages/customer/Packages";
import PackageDetails from "../pages/customer/PackageDetails";
import Menu from "../pages/customer/Menu";
import Gallery from "../pages/customer/Gallery";

import BookingWizard from "../pages/customer/booking/BookingWizard";
import BookingSuccess from "../pages/customer/booking/BookingSuccess";

import QuoteWizard from "../pages/customer/quote/QuoteWizard";

import AdminDashboard from "../pages/admin/AdminDashboard";

import AdminPayments from "../pages/admin/AdminPayments";
import AdminRefunds from "../pages/admin/AdminRefunds";
import AdminCustomers from "../pages/admin/AdminCustomers";
import AdminReservations from "../pages/admin/AdminReservations";
import AdminBookingsHistory from "../pages/admin/AdminBookingsHistory";
import AdminCalendar from "../pages/admin/AdminCalendar";
import AdminBookingWizard from "../pages/admin/AdminBookingWizard";
import AdminPackages from "../pages/admin/AdminPackages";
import AdminInventory from "../pages/admin/AdminInventory";
import AdminMenu from "../pages/admin/AdminMenu";
import AdminStaff from "../pages/admin/AdminStaff";
import AdminAnalytics from "../pages/admin/AdminAnalytics";
import AdminBusinessInfo from "../pages/admin/AdminBusinessInfo";
import AdminAuditLogs from "../pages/admin/AdminAuditLogs";
import AdminBookingDetails from "../pages/admin/AdminBookingDetails";
import AdminProfile from "../pages/admin/AdminProfile";
import AdminOcular from "../pages/admin/AdminOcular";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import ManagerBookings from "../pages/manager/ManagerBookings";
import ManagerStaff from "../pages/manager/ManagerStaff";
import ManagerMessagesList from "../pages/manager/ManagerMessagesList";
import ManagerMessagesChat from "../pages/manager/ManagerMessagesChat";
import StaffDashboard from "../pages/staff/StaffDashboard";

const adminRoles = ["admin"];
const managerRoles = ["manager"];
const adminOnly = ["admin"];
const adminManagerOnly = ["admin", "manager"];
const staffRoles = ["staff"];

export default function AppRoutes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isStaff = user?.role === "staff";

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route
          path="/"
          element={isAdmin ? <Navigate to={isManager ? "/manager/dashboard" : "/admin/dashboard"} /> : (isStaff ? <Navigate to="/staff/dashboard" /> : <Landing />)}
        />
        <Route
          path="/packages"
          element={isAdmin ? <Navigate to={isManager ? "/manager/dashboard" : "/admin/dashboard"} /> : (isStaff ? <Navigate to="/staff/dashboard" /> : <Packages />)}
        />
        <Route
          path="/packages/:id"
          element={isAdmin ? <Navigate to={isManager ? "/manager/dashboard" : "/admin/dashboard"} /> : (isStaff ? <Navigate to="/staff/dashboard" /> : <PackageDetails />)}
        />
        <Route
          path="/menu"
          element={isAdmin ? <Navigate to={isManager ? "/manager/dashboard" : "/admin/dashboard"} /> : (isStaff ? <Navigate to="/staff/dashboard" /> : <Menu />)}
        />
        <Route
          path="/gallery"
          element={isAdmin ? <Navigate to={isManager ? "/manager/dashboard" : "/admin/dashboard"} /> : (isStaff ? <Navigate to="/staff/dashboard" /> : <Gallery />)}
        />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Booking & Quote (protected) */}
        <Route path="/customer/home" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/book" element={<ProtectedRoute><BookingWizard /></ProtectedRoute>} />
        <Route path="/customer/booking-success" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />

        <Route path="/customer/bookings" element={<ProtectedRoute><CustomerBookings /></ProtectedRoute>} />
        <Route path="/customer/bookings/:id" element={<ProtectedRoute><CustomerEventDashboard /></ProtectedRoute>} />
        <Route path="/customer/checkout" element={<ProtectedRoute><CustomCheckout /></ProtectedRoute>} />
        <Route path="/customer/payments" element={<ProtectedRoute><CustomerPayments /></ProtectedRoute>} />
        <Route path="/customer/messages" element={<ProtectedRoute><CustomerMessages /></ProtectedRoute>} />
        <Route path="/customer/messages/:id" element={<ProtectedRoute><CustomerMessageThread /></ProtectedRoute>} />
        <Route path="/customer/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />

        <Route path="/customer/quote" element={<ProtectedRoute><QuoteWizard /></ProtectedRoute>} />

        {/* Admin (protected by role) */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={adminOnly}><AdminDashboard /></ProtectedRoute>} />

        <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={adminOnly}><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/refunds" element={<ProtectedRoute allowedRoles={adminOnly}><AdminRefunds /></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={adminOnly}><AdminCustomers /></ProtectedRoute>} />
        <Route path="/admin/bookings/reservations" element={<ProtectedRoute allowedRoles={adminOnly}><AdminReservations /></ProtectedRoute>} />
        <Route path="/admin/bookings/ocular" element={<ProtectedRoute allowedRoles={adminOnly}><AdminOcular /></ProtectedRoute>} />
        <Route path="/admin/bookings/new" element={<ProtectedRoute allowedRoles={adminOnly}><AdminBookingWizard /></ProtectedRoute>} />
        <Route path="/admin/bookings/:id/details" element={<ProtectedRoute allowedRoles={adminOnly}><AdminBookingDetails /></ProtectedRoute>} />
        <Route path="/admin/bookings/history" element={<ProtectedRoute allowedRoles={adminOnly}><AdminBookingsHistory /></ProtectedRoute>} />
        <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={adminOnly}><AdminCalendar /></ProtectedRoute>} />
        <Route path="/admin/packages" element={<ProtectedRoute allowedRoles={adminManagerOnly}><AdminPackages /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute allowedRoles={adminManagerOnly}><AdminMenu /></ProtectedRoute>} />
        <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={adminOnly}><AdminInventory /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={adminOnly}><AdminStaff /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={adminOnly}><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/business-info" element={<ProtectedRoute allowedRoles={adminOnly}><AdminBusinessInfo /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={adminOnly}><AdminAuditLogs /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={adminOnly}><AdminProfile /></ProtectedRoute>} />

        {/* Manager (protected by role) */}
        <Route path="/manager/dashboard" element={<ProtectedRoute allowedRoles={managerRoles}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/manager/bookings" element={<ProtectedRoute allowedRoles={managerRoles}><ManagerBookings /></ProtectedRoute>} />
        <Route path="/manager/staff" element={<ProtectedRoute allowedRoles={managerRoles}><ManagerStaff /></ProtectedRoute>} />
        <Route path="/manager/messages" element={<ProtectedRoute allowedRoles={managerRoles}><ManagerMessagesList /></ProtectedRoute>} />
        <Route path="/manager/messages/:id" element={<ProtectedRoute allowedRoles={managerRoles}><ManagerMessagesChat /></ProtectedRoute>} />

        {/* Staff (protected by role) */}
        <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={staffRoles}><StaffDashboard /></ProtectedRoute>} />

        <Route path="*" element={isAdmin ? <Navigate to={isManager ? "/manager/dashboard" : "/admin/dashboard"} /> : (isStaff ? <Navigate to="/staff/dashboard" /> : <Landing />)} />
      </Routes>
    </BrowserRouter>
  );
}