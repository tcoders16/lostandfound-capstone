// src/pages/Home.tsx
import { Link } from "react-router-dom";
import AppShell from "../components/ui/AppShell";
import NeuralCanvas from "../components/ui/NeuralCanvas";

/* ── step card ───────────────────────────────────────────────── */
function Step({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 16, padding: "26px 22px", transition: "box-shadow .2s, transform .2s" }}
      onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 8px 28px rgba(0,99,65,.09)"; el.style.transform = "translateY(-2px)"; }}
      onMouseOut={e  => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "#e8f4ef", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#006341" }}>
          {icon}
        </div>
        <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#006341" }}>
          Step {n}
        </span>
      </div>
      <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, color: "#1c2b39", marginBottom: 8 }}>{title}</h3>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#546478", lineHeight: 1.7, margin: 0 }}>{body}</p>
    </div>
  );
}

/* ── trust check ─────────────────────────────────────────────── */
function Check({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: "#e8f4ef", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#006341" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#3d5166", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <AppShell>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "82vh", minHeight: 520, overflow: "hidden" }}>
        {/* Neural canvas — no black boxes, no flicker */}
        <NeuralCanvas
          bgColor={0x0c1825}
          nodeColor={0x007a4d}
          hubColor={0x00d492}
          edgeColor={0x004d2e}
          edgeDist={5.8}
          nodeCount={65}
        />

        {/* Gradient overlay — readable left, open right */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(100deg, rgba(12,24,37,.94) 0%, rgba(12,24,37,.65) 44%, rgba(12,24,37,.0) 100%)" }} />

        {/* Hero content */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(1.5rem, 5vw, 5rem)" }}>

          {/* Status pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,99,65,.22)", border: "1px solid rgba(0,200,130,.2)", borderRadius: 999, padding: "5px 16px", marginBottom: 24, width: "fit-content" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c882", display: "inline-block", boxShadow: "0 0 8px #00c882" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", color: "rgba(0,210,140,.9)", fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" as const }}>
              GO Transit · Lost &amp; Found
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(2.2rem, 5.5vw, 4rem)", fontWeight: 700, color: "#fff", lineHeight: 1.06, letterSpacing: "-.03em", maxWidth: 620, margin: "0 0 18px" }}>
            Lost something<br />
            on the{" "}
            <span style={{ background: "linear-gradient(130deg, #00e09e 0%, #00a870 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              GO network?
            </span>
          </h1>

          {/* Sub */}
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "rgba(255,255,255,.55)", lineHeight: 1.7, maxWidth: 440, margin: "0 0 36px" }}>
            Tell us what you lost. Our system checks every found item at every station and lets you know when there's a match — completely free.
          </p>

          {/* CTA buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 44 }}>
            <Link to="/report-lost"
              style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#006341", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, padding: "13px 26px", borderRadius: 10, textDecoration: "none", boxShadow: "0 4px 20px rgba(0,99,65,.45)", transition: "background .15s, transform .15s" }}
              onMouseOver={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#004d30"; el.style.transform = "translateY(-2px)"; }}
              onMouseOut={e  => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "#006341"; el.style.transform = "translateY(0)"; }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Report a Lost Item
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M17 8l4 4-4 4M3 12h18"/></svg>
            </Link>
            <Link to="/admin/login"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 20px", borderRadius: 10, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.6)", textDecoration: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, transition: "background .15s, color .15s" }}
              onMouseOver={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.13)"; el.style.color = "#fff"; }}
              onMouseOut={e  => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.07)"; el.style.color = "rgba(255,255,255,.6)"; }}
            >Staff Login</Link>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[{ v: "40+", l: "GO Stations" }, { v: "Free", l: "No account needed" }, { v: "< 48h", l: "Typical response" }, { v: "Secure", l: "Private & safe" }].map(s => (
              <div key={s.v} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, padding: "6px 14px" }}>
                <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, color: "#00d492", fontSize: 13 }}>{s.v}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,.38)", fontSize: 11 }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade to surface */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, pointerEvents: "none", background: "linear-gradient(to bottom, transparent, #f5f6f7)" }} />
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "72px 1.5rem", background: "#f5f6f7" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#006341", marginBottom: 12 }}>
              How It Works
            </p>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 700, color: "#1c2b39", marginBottom: 12, letterSpacing: "-.02em" }}>
              Simple steps to get your item back
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#546478", maxWidth: 500, margin: "0 auto", lineHeight: 1.65 }}>
              No account, no app download — just fill out a short form and we do the rest.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            <Step n="1" title="Describe What You Lost"
              body="Tell us the item type, colour, brand if you know it, which station you were at, and roughly when. Takes about 2 minutes."
              icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
            />
            <Step n="2" title="Our System Searches for You"
              body="We automatically check your description against every item handed in at GO stations — no need to call every lost property office yourself."
              icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
            />
            <Step n="3" title="Staff Double-Checks"
              body="When a likely match is found, a GO Transit team member reviews it to make sure it's actually your item before contacting you."
              icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
            />
            <Step n="4" title="You Get an Email"
              body="Once confirmed, we email you with instructions on where to pick up your item and what ID to bring. That's it."
              icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>}
            />
          </div>
        </div>
      </section>

      {/* ── HOW THE AI HELPS ─────────────────────────────────── */}
      <section style={{ background: "#fff", borderTop: "1px solid #e8ecf0", padding: "64px 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 56, alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#006341", marginBottom: 12 }}>
              How the AI Helps
            </p>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(1.4rem, 2.8vw, 2rem)", fontWeight: 700, color: "#1c2b39", marginBottom: 16, letterSpacing: "-.02em", lineHeight: 1.2 }}>
              Smart matching — in plain English
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#546478", lineHeight: 1.75, marginBottom: 20 }}>
              When a GO Transit staff member logs a found item, they photograph it. Our system uses that photo to automatically identify what the item is — its colour, brand, type, and condition — without anyone having to type anything in.
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#546478", lineHeight: 1.75, marginBottom: 24 }}>
              When you submit your report, your description is compared against all the items in our system. If your words are a strong match for something we have, we flag it for a staff member to review. Think of it like a really fast, really thorough search engine that understands meaning, not just exact words.
            </p>
            <Link to="/report-lost" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#006341", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, padding: "11px 22px", borderRadius: 9, textDecoration: "none" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Report Your Lost Item
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { title: "Photo Analysis",   desc: "Staff takes a photo of a found item. Our system identifies it — no manual data entry needed." },
              { title: "Smart Matching",   desc: "Your description is compared to every found item. It understands \"dark blue backpack\" and \"navy JanSport\" are probably the same thing." },
              { title: "80% Confidence",   desc: "We only flag a match when the system is highly confident. This means fewer false alerts and less wasted time." },
              { title: "Human Final Check",desc: "A real GO Transit staff member always reviews before contacting you. The AI helps — people decide." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "16px 18px", background: "#f5f6f7", borderRadius: 12, border: "1px solid #e8ecf0" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f4ef", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 800, fontSize: 12, color: "#006341" }}>{i + 1}</span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 12, fontWeight: 700, color: "#1c2b39", margin: "0 0 4px" }}>{item.title}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#546478", lineHeight: 1.55, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ────────────────────────────────────────────── */}
      <section id="security" style={{ background: "#f5f6f7", borderTop: "1px solid #e8ecf0", padding: "60px 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#006341", marginBottom: 12 }}>
              Why items are not shown publicly
            </p>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(1.4rem, 2.8vw, 2rem)", fontWeight: 700, color: "#1c2b39", marginBottom: 16, letterSpacing: "-.02em", lineHeight: 1.2 }}>
              Your property is kept safe
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#546478", lineHeight: 1.75 }}>
              Showing found items publicly — like photos of wallets or laptops — would let anyone claim them fraudulently. Instead, we only contact the person whose report best matches what was found, and only after a staff member confirms it.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Check text="Items are never shown in a public gallery" />
            <Check text="Only riders with a matching report are contacted" />
            <Check text="Staff review every match before an email is sent" />
            <Check text="You'll need valid photo ID to pick up your item" />
            <Check text="All personal information is kept private and secure" />
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      <section style={{ background: "#1c2b39" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between", padding: "48px 1.5rem" }}>
          <div>
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 6, letterSpacing: "-.01em" }}>
              Ready to find your item?
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>
              Takes 2 minutes. Free. No account required.
            </p>
          </div>
          <Link to="/report-lost" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#006341", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, padding: "14px 28px", borderRadius: 10, textDecoration: "none", boxShadow: "0 4px 18px rgba(0,99,65,.4)", flexShrink: 0 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Report a Lost Item
          </Link>
        </div>
      </section>

    </AppShell>
  );
}
