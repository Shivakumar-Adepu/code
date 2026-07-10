import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";
import Landing from "./routes/index";
import Login from "./routes/login";
import Register from "./routes/register";
import ForgotPassword from "./routes/forgot-password";
import AppLayout from "./routes/_app";
import Dashboard from "./routes/_app.dashboard";
import Workspace from "./routes/_app.workspace";
import ScansPage from "./routes/_app.scans";
import Reports from "./routes/_app.reports";
import Settings from "./routes/_app.settings";
import GitHub from "./routes/_app.github";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected layout wrapping internal app routes */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/scans" element={<ScansPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/github" element={<GitHub />} />
        </Route>

        {/* Catch-all redirects back to Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
