import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { INACTIVITY_MS, useAuth } from "../../store/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { token, role, lastActive, touch, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  // capture user activity to keep session alive
  useEffect(() => {
    const bump = () => touch();
    const vis = () => { if (document.visibilityState === "visible") touch(); };
    window.addEventListener("mousemove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("click", bump, true);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("click", bump, true);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [touch]);

  // check auth + inactivity every 5s
  useEffect(() => {
    const tick = setInterval(() => {
      const expired = Date.now() - lastActive > INACTIVITY_MS;
      if (!token || role !== "admin" || expired) {
        if (expired) logout();
        nav("/admin/login", {
          replace: true,
          state: { from: loc.pathname, reason: expired ? "timeout" : "auth" },
        });
      }

      
    }, 5000);
    return () => clearInterval(tick);
  }, [token, role, lastActive, nav, loc, logout]);

  // If logged in and not expired, render children (no blocking of /admin/upload or /admin/review)
  return <>{children}</>;
}