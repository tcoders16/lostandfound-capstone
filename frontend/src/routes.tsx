// src/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

// Public / Rider
import Home           from "./pages/Home";
import LostItemReport from "./pages/LostItemReport";

// Admin
import AdminLogin        from "./pages/Admin/AdminLogin";
import AdminDashboard    from "./pages/Admin/AdminDashboard";
import UploadItem        from "./pages/Admin/UploadItem";
import ReviewPreview     from "./pages/Admin/ReviewPreview";
import ConfirmRequests   from "./pages/Admin/ConfirmRequests";
import FoundItems        from "./pages/Admin/FoundItems";
import ManualQueue       from "./pages/Admin/ManualQueue";
import AdminShell        from "./components/admin/AdminShell";
import AdminGuard        from "./components/admin/AdminGuard";

export const router = createBrowserRouter([
  // Public rider-facing — ONLY home and report
  { path: "/",            element: <Home /> },
  { path: "/report-lost", element: <LostItemReport /> },

  // Redirect any old search URL
  { path: "/search",      element: <Navigate to="/report-lost" replace /> },
  { path: "/rider/login", element: <Navigate to="/"             replace /> },

  // Admin login (outside guard/shell)
  { path: "/admin/login", element: <AdminLogin /> },

  // Admin area — guarded
  {
    path: "/admin",
    element: (
      <AdminGuard>
        <AdminShell />
      </AdminGuard>
    ),
    children: [
      { index: true,               element: <AdminDashboard /> },
      { path: "upload",            element: <UploadItem /> },
      { path: "review",            element: <ReviewPreview /> },
      { path: "confirm",           element: <ConfirmRequests /> },
      { path: "found-items",       element: <FoundItems /> },
      { path: "manual-queue",      element: <ManualQueue /> },
    ],
  },

  // Fallback
  { path: "*", element: <Navigate to="/" replace /> },
]);
