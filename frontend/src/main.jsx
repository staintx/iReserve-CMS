import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/globals.css";
import "./styles/customer.css";
import "./styles/admin.css";
// Last, and intentionally unlayered: the feedback surfaces render in a
// body portal and must not inherit the global heading/serif rules.
import "./styles/feedback.css";
import AuthProvider from "./context/AuthContext.jsx";
import { ConfirmProvider } from "./components/feedback/ConfirmProvider.jsx";
import { Toaster } from "./components/ui/sonner.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
      <Toaster />
    </AuthProvider>
  </React.StrictMode>
);
