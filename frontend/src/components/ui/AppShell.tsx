// src/components/ui/AppShell.tsx
// GO Transit Canada-style header + footer + page shell
import { Link, NavLink } from "react-router-dom";

/* ── brand colours ──────────────────────────────────────────── */
const GREEN  = "#006341";
const NAVY   = "#1c2b39";
const WHITE  = "#ffffff";

/* ── GO mark ─────────────────────────────────────────────────── */
function GoMark({ size = 38 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * .22),
      background: GREEN,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontWeight: 800, fontSize: size * .4,
        color: WHITE, letterSpacing: "-.03em", lineHeight: 1,
      }}>
        GO
      </span>
    </div>
  );
}

/* ── top header ──────────────────────────────────────────────── */
function Header() {
  return (
    <header style={{
      background: WHITE,
      borderBottom: `2px solid ${GREEN}`,
      position: "sticky", top: 0, zIndex: 50,
    }}>
      {/* ── thin service-status bar (real GO Transit has this) ── */}
      <div style={{
        background: NAVY,
        padding: "5px 0",
        fontSize: 11, color: "rgba(255,255,255,.6)",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
        letterSpacing: ".02em",
      }}>
        Metrolinx · GO Transit Lost &amp; Found Service — Ontario
      </div>

      {/* ── main nav bar ── */}
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 1.5rem",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <GoMark />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700, fontSize: 16, color: NAVY,
              letterSpacing: "-.01em",
            }}>
              Lost &amp; Found
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10, color: "#8695a4",
              fontWeight: 500, letterSpacing: ".07em",
              textTransform: "uppercase" as const,
            }}>
              GO Transit
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavLink
            to="/report-lost"
            style={({ isActive }) => ({
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600, fontSize: 13,
              color: isActive ? WHITE : NAVY,
              padding: "8px 18px", borderRadius: 8,
              textDecoration: "none",
              background: isActive ? GREEN : "transparent",
              border: `1.5px solid ${isActive ? GREEN : "transparent"}`,
              transition: "background .15s, color .15s, border-color .15s",
            })}
            onMouseOver={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.getAttribute("aria-current")) {
                el.style.background = "#e8f4ef";
                el.style.color = GREEN;
              }
            }}
            onMouseOut={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.getAttribute("aria-current")) {
                el.style.background = "transparent";
                el.style.color = NAVY;
              }
            }}
          >
            Report Lost Item
          </NavLink>

          <Link
            to="/admin/login"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500, fontSize: 12,
              color: "#8695a4",
              padding: "8px 12px", borderRadius: 8,
              textDecoration: "none",
              transition: "color .15s",
            }}
            onMouseOver={e => { e.currentTarget.style.color = NAVY; }}
            onMouseOut={e  => { e.currentTarget.style.color = "#8695a4"; }}
          >
            Staff Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ── footer ──────────────────────────────────────────────────── */
function Footer() {
  const YEAR = new Date().getFullYear();

  return (
    <footer style={{ background: NAVY, color: WHITE }}>
      {/* ── main footer grid ── */}
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "52px 1.5rem 40px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "40px 60px",
      }}>
        {/* Brand column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <GoMark size={40} />
            <div>
              <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, color: WHITE, lineHeight: 1.2 }}>
                Lost &amp; Found
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".07em", textTransform: "uppercase" as const }}>
                GO Transit
              </div>
            </div>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.65, maxWidth: 240, margin: 0 }}>
            Helping riders recover lost belongings across the GO Transit network in Ontario.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: ".1em", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
            For Riders
          </h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Report a Lost Item", to: "/report-lost" },
              { label: "How It Works",       to: "/#how-it-works" },
              { label: "Why items are secure", to: "/#security" },
            ].map(l => (
              <li key={l.to}>
                <Link to={l.to} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13, color: "rgba(255,255,255,.6)",
                  textDecoration: "none", transition: "color .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.color = WHITE; }}
                onMouseOut={e  => { e.currentTarget.style.color = "rgba(255,255,255,.6)"; }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Staff */}
        <div>
          <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: ".1em", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
            For Staff
          </h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Admin Login",      to: "/admin/login" },
              { label: "Log a Found Item", to: "/admin/upload" },
              { label: "Review Matches",   to: "/admin/confirm" },
            ].map(l => (
              <li key={l.to}>
                <Link to={l.to} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13, color: "rgba(255,255,255,.6)",
                  textDecoration: "none", transition: "color .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.color = WHITE; }}
                onMouseOut={e  => { e.currentTarget.style.color = "rgba(255,255,255,.6)"; }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: ".1em", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
            Contact
          </h4>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
              Customer Service<br />
              <strong style={{ color: "rgba(255,255,255,.8)", letterSpacing: ".02em" }}>1-888-GET-ON-GO</strong>
            </li>
            <li style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
              Mon – Fri: 6 AM – 10 PM<br />
              Sat – Sun: 7 AM – 10 PM
            </li>
          </ul>
        </div>
      </div>

      {/* ── copyright bar ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,.08)",
        padding: "16px 1.5rem",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between",
          gap: 12,
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,.3)", margin: 0 }}>
            {YEAR} Metrolinx · GO Transit. All rights reserved.
          </p>
          <nav style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Accessibility", "Terms of Use"].map(l => (
              <a key={l} href="#" style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11, color: "rgba(255,255,255,.3)",
                textDecoration: "none", transition: "color .15s",
              }}
              onMouseOver={e => { e.currentTarget.style.color = "rgba(255,255,255,.7)"; }}
              onMouseOut={e  => { e.currentTarget.style.color = "rgba(255,255,255,.3)"; }}
              >
                {l}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* ── shell ───────────────────────────────────────────────────── */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface)" }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
