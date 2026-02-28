// src/components/admin/AdminShell.tsx
import type { ReactElement } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth";
import {
  IconDashboard, IconUpload, IconBox,
  IconMatch, IconArrowLeft, IconLogout, IconFilter,
} from "./AdminIcons";

/* ── design tokens (matched to index.css) ─────────────────────── */
const T = {
  navy:       "#1c2b39",
  navy2:      "#162231",
  green:      "#006341",
  greenHover: "#00533a",
  white:      "#ffffff",
  dim:        "rgba(255,255,255,.45)",
  dimHover:   "rgba(255,255,255,.75)",
  hover:      "rgba(255,255,255,.07)",
  active:     "rgba(0,99,65,.28)",
  border:     "rgba(255,255,255,.08)",
  label:      "rgba(255,255,255,.22)",
};

/* ── nav item type ────────────────────────────────────────────── */
interface NavItem {
  to:    string;
  label: string;
  icon:  (p: { size?: number; color?: string }) => ReactElement;
  end?:  boolean;
}

const ITEMS_NAV: NavItem[] = [
  { to: "/admin",             label: "Dashboard",   icon: IconDashboard, end: true },
  { to: "/admin/upload",      label: "Intake Item",  icon: IconUpload },
  { to: "/admin/found-items", label: "Found Items",  icon: IconBox },
];

const CLAIMS_NAV: NavItem[] = [
  { to: "/admin/confirm",       label: "AI Match Review", icon: IconMatch },
  { to: "/admin/manual-queue",  label: "Manual Queue",    icon: IconFilter },
];

/* ── section header ──────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 700, letterSpacing: ".12em",
      textTransform: "uppercase", color: T.label,
      padding: "20px 14px 6px",
      fontFamily: "'Chakra Petch', sans-serif",
    }}>
      {label}
    </p>
  );
}

/* ── nav link ─────────────────────────────────────────────────── */
function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      style={({ isActive }) => ({
        display:        "flex",
        alignItems:     "center",
        gap:            10,
        padding:        "9px 14px",
        borderRadius:   8,
        margin:         "1px 8px",
        textDecoration: "none",
        fontFamily:     "'Inter', sans-serif",
        fontSize:       13,
        fontWeight:     isActive ? 600 : 400,
        color:          isActive ? T.white : T.dim,
        background:     isActive ? T.active : "transparent",
        transition:     "background .15s, color .15s",
        position:       "relative" as const,
        borderLeft:     isActive ? `2px solid ${T.green}` : "2px solid transparent",
      })}
      onMouseOver={e => {
        const el = e.currentTarget;
        if (!el.getAttribute("aria-current")) {
          el.style.background = T.hover;
          el.style.color = T.dimHover;
        }
      }}
      onMouseOut={e => {
        const el = e.currentTarget;
        if (!el.getAttribute("aria-current")) {
          el.style.background = "transparent";
          el.style.color = T.dim;
        }
      }}
    >
      {({ isActive }) => (
        <>
          <Icon size={15} color={isActive ? T.green : "rgba(255,255,255,.45)"} />
          <span style={{ lineHeight: 1 }}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ── GO mark SVG ─────────────────────────────────────────────── */
function GoMark() {
  return (
    <div style={{
      width: 36, height: 36,
      background: T.green,
      borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontWeight: 800, fontSize: 15,
        color: "#fff", letterSpacing: "-.03em",
        lineHeight: 1,
      }}>GO</span>
    </div>
  );
}

/* ── sidebar ─────────────────────────────────────────────────── */
function Sidebar() {
  const { logout } = useAuth();
  const nav = useNavigate();

  function handleLogout() { logout(); nav("/admin/login"); }

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: T.navy2,
      height: "100vh", position: "sticky", top: 0,
      overflowY: "auto",
      borderRight: `1px solid ${T.border}`,
    }}>
      {/* Brand */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "18px 16px 16px",
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <GoMark />
        <div>
          <p style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 700, color: T.white,
            lineHeight: 1.2, letterSpacing: "-.01em",
          }}>Admin Portal</p>
          <p style={{ fontSize: 10, color: T.label, letterSpacing: ".04em", marginTop: 1 }}>
            LOST &amp; FOUND
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, paddingBottom: 8 }}>
        <SectionLabel label="Items" />
        {ITEMS_NAV.map(item => <SideLink key={item.to} item={item} />)}

        <SectionLabel label="Claims" />
        {CLAIMS_NAV.map(item => <SideLink key={item.to} item={item} />)}
      </nav>

      {/* Bottom actions */}
      <div style={{
        padding: "8px", borderTop: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <Link
          to="/"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px", borderRadius: 8, margin: "1px 0",
            fontSize: 12, color: T.dim,
            textDecoration: "none", fontFamily: "'Inter', sans-serif",
            transition: "background .15s, color .15s",
          }}
          onMouseOver={e => { e.currentTarget.style.background = T.hover; e.currentTarget.style.color = T.dimHover; }}
          onMouseOut={e  => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; }}
        >
          <IconArrowLeft size={13} color="rgba(255,255,255,.4)" />
          <span>Public Site</span>
        </Link>

        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "9px 14px", borderRadius: 8, margin: "1px 0",
            fontSize: 12, color: "rgba(220,80,80,.75)",
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", textAlign: "left",
            transition: "background .15s, color .15s",
          }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(220,80,80,.08)"; e.currentTarget.style.color = "rgba(220,80,80,1)"; }}
          onMouseOut={e  => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(220,80,80,.75)"; }}
        >
          <IconLogout size={13} color="currentColor" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

/* ── top bar ─────────────────────────────────────────────────── */
function TopBar() {
  const location = useLocation();

  const PAGE_LABELS: Record<string, string> = {
    "/admin":             "Dashboard",
    "/admin/upload":      "Intake Item",
    "/admin/found-items": "Found Items",
    "/admin/confirm":     "AI Match Review",
    "/admin/review":      "Review Preview",
  };
  const pageLabel = PAGE_LABELS[location.pathname] ?? "Admin";

  return (
    <header style={{
      height: 52,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px",
      background: "#fff",
      borderBottom: "1px solid #e8ecf0",
      flexShrink: 0,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <p style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 13, fontWeight: 600, color: "#1c2b39",
        letterSpacing: "-.01em",
      }}>
        {pageLabel}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%", background: "#006341",
        }} />
        <p style={{ fontSize: 11, color: "#8695a4", fontFamily: "'Inter', sans-serif" }}>
          GO Transit · Admin
        </p>
      </div>
    </header>
  );
}

/* ── shell ───────────────────────────────────────────────────── */
export default function AdminShell() {
  const { touch } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex",
        background: "#f5f6f7",
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseMove={touch}
      onClick={touch}
      onKeyDown={touch}
    >
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
