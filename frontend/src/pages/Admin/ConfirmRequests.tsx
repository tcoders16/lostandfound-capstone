// src/pages/Admin/ConfirmRequests.tsx
import { useEffect, useState, useCallback } from "react";
import {
  IconRefresh, IconCheck, IconX,
  IconUser, IconPin, IconMatch,
  IconBox, IconChevronDown,
} from "../../components/admin/AdminIcons";

const API_BASE =
  (import.meta as any).env?.VITE_BACKEND_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

type MatchStatus = "pending_review" | "approved" | "rejected";

interface PendingMatch {
  matchId:          string;
  claimId:          string;
  riderName:        string;
  riderPhone:       string;
  riderEmail?:      string;
  riderAddress?:    string;
  riderDescription: string;
  riderLocation?:   string;
  foundItemId:      string;
  foundFilename?:   string;
  foundDescription?: string;
  foundLocation?:   string;
  foundAttributes?: Record<string, string>;
  matchScore:       number;
  status:           MatchStatus;
  adminNotes?:      string;
  createdAt:        string;
}

interface ManualClaim {
  claimId:       string;
  description:   string;
  locationName?: string;
  name:          string;
  phone:         string;
  email?:        string;
  address?:      string;
  createdAt:     string;
}

/* ── design tokens ──────────────────────────────────────────── */
const T = {
  navy:    "#1c2b39",
  green:   "#006341",
  amber:   "#d97706",
  red:     "#dc2626",
  blue:    "#2563eb",
  border:  "#e8ecf0",
  surface: "#f5f6f7",
  muted:   "#546478",
  light:   "#8695a4",
  white:   "#ffffff",
};

/* ── toast ──────────────────────────────────────────────────── */
function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      background: T.navy, color: "#fff",
      padding: "12px 18px", borderRadius: 10,
      fontSize: 13, fontWeight: 500,
      boxShadow: "0 8px 24px rgba(0,0,0,.18)",
      fontFamily: "'Inter', sans-serif",
      display: "flex", alignItems: "center", gap: 9,
      animation: "fadeUp .25s ease",
      maxWidth: 340,
    }}>
      <IconCheck size={14} color="#00b371" />
      {msg}
    </div>
  );
}

/* ── confidence bar ─────────────────────────────────────────── */
function ConfidenceBar({ score }: { score: number }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 90 ? T.green : pct >= 80 ? T.amber : T.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
          AI Confidence
        </span>
        <span style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 18, fontWeight: 700, color, lineHeight: 1,
        }}>
          {pct}<span style={{ fontSize: 12 }}>%</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: T.surface, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 999,
          width: `${pct}%`, background: color,
          transition: "width .6s cubic-bezier(.22,.68,0,1.2)",
        }} />
      </div>
      <p style={{ fontSize: 10.5, color: T.light, margin: 0 }}>
        {pct >= 90 ? "Very high confidence — likely the same item"
          : pct >= 80 ? "High confidence — probable match, verify visually"
          : "Moderate — review carefully"}
      </p>
    </div>
  );
}

/* ── attribute chip ─────────────────────────────────────────── */
function Chip({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: ".03em",
      background: "#e8f4ef", color: T.green,
      padding: "3px 9px", borderRadius: 999,
      textTransform: "capitalize",
    }}>{label}</span>
  );
}

/* ── match card ─────────────────────────────────────────────── */
function MatchCard({
  match, onApprove, onReject,
}: {
  match: PendingMatch;
  onApprove: (m: PendingMatch, notes: string) => Promise<void>;
  onReject:  (m: PendingMatch, notes: string) => Promise<void>;
}) {
  const [notes,   setNotes]  = useState("");
  const [busy,    setBusy]   = useState(false);
  const [expand,  setExpand] = useState(true);

  const imgSrc = match.foundFilename
    ? `${API_BASE}/upload/${match.foundFilename}`
    : null;

  const attr = match.foundAttributes ?? {};
  const date = new Date(match.createdAt).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  });

  /* resolved cards — compact */
  if (match.status !== "pending_review") {
    const approved = match.status === "approved";
    return (
      <div style={{
        background: T.white, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 12,
        opacity: .65,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: approved ? "#e8f4ef" : "#fef2f2",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {approved
            ? <IconCheck size={14} color={T.green} />
            : <IconX     size={14} color={T.red} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.navy, margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {match.riderName}
          </p>
          <p style={{ fontSize: 11, color: T.light, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {match.riderDescription.slice(0, 70)}{match.riderDescription.length > 70 ? "…" : ""}
          </p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
          background: approved ? "#e8f4ef" : "#fef2f2",
          color: approved ? T.green : T.red,
          padding: "4px 10px", borderRadius: 999, flexShrink: 0,
        }}>
          {approved ? "APPROVED" : "REJECTED"}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: T.white, border: `1.5px solid ${T.amber}44`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 2px 10px rgba(217,119,6,.06)",
    }}>
      {/* card header */}
      <button
        onClick={() => setExpand(e => !e)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          padding: "14px 18px", background: T.surface,
          border: "none", borderBottom: `1px solid ${T.border}`,
          cursor: "pointer", textAlign: "left", gap: 12,
        }}
      >
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
          background: "#fef3c7", color: T.amber,
          padding: "3px 9px", borderRadius: 999, flexShrink: 0,
        }}>
          NEEDS REVIEW
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13, fontWeight: 600, color: T.navy, flex: 1, minWidth: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {match.riderName} — {match.riderDescription.slice(0, 55)}{match.riderDescription.length > 55 ? "…" : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.light }}>{date}</span>
          <IconChevronDown
            size={15} color={T.light}
          />
        </div>
      </button>

      {expand && (
        <div style={{ padding: "18px 20px" }}>
          {/* Confidence */}
          <div style={{ marginBottom: 20 }}>
            <ConfidenceBar score={match.matchScore} />
          </div>

          {/* Side-by-side comparison */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14, marginBottom: 18,
          }}>
            {/* Rider side */}
            <div style={{
              borderRadius: 10, padding: 16,
              background: "#fffbf0",
              border: "1px solid #fde68a",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <IconUser size={13} color={T.amber} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: T.amber, textTransform: "uppercase" }}>
                  Rider's Description
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.navy, margin: "0 0 8px", lineHeight: 1.45 }}>
                {match.riderDescription}
              </p>
              {match.riderLocation && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <IconPin size={11} color={T.muted} />
                  <span style={{ fontSize: 11, color: T.muted }}>{match.riderLocation}</span>
                </div>
              )}
              <div style={{ paddingTop: 10, borderTop: "1px solid #fde68a" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.light, letterSpacing: ".04em", marginBottom: 5 }}>CONTACT</p>
                <p style={{ fontSize: 12, color: T.navy, margin: "0 0 2px", fontWeight: 600 }}>{match.riderName}</p>
                <p style={{ fontSize: 11, color: T.muted, margin: "0 0 2px" }}>{match.riderPhone}</p>
                {match.riderEmail   && <p style={{ fontSize: 11, color: T.muted, margin: "0 0 2px" }}>{match.riderEmail}</p>}
                {match.riderAddress && <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{match.riderAddress}</p>}
              </div>
            </div>

            {/* Found item side */}
            <div style={{
              borderRadius: 10, overflow: "hidden",
              background: "#f0f9f4",
              border: "1px solid #bbdece",
            }}>
              {imgSrc && (
                <img
                  src={imgSrc} alt="Found item"
                  style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
                />
              )}
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <IconBox size={13} color={T.green} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: T.green, textTransform: "uppercase" }}>
                    Found Item
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.navy, margin: "0 0 6px" }}>
                  {match.foundDescription || "Found Item"}
                </p>
                {match.foundLocation && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <IconPin size={11} color={T.muted} />
                    <span style={{ fontSize: 11, color: T.muted }}>{match.foundLocation}</span>
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {attr.category  && <Chip label={attr.category} />}
                  {attr.color     && <Chip label={attr.color} />}
                  {attr.brand     && <Chip label={attr.brand} />}
                  {attr.condition && <Chip label={attr.condition} />}
                </div>
              </div>
            </div>
          </div>

          {/* Admin notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              color: T.muted, marginBottom: 6, letterSpacing: ".03em",
              textTransform: "uppercase",
            }}>
              Admin Notes
              <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 4, color: T.light }}>
                — optional, included in email to rider
              </span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Item is in good condition. Please bring your GO card."
              style={{
                width: "100%", resize: "vertical",
                padding: "10px 12px", borderRadius: 8,
                border: `1.5px solid ${T.border}`, outline: "none",
                fontSize: 13, color: T.navy,
                fontFamily: "'Inter', sans-serif",
                background: "#fff",
                transition: "border-color .15s",
              }}
              onFocus={e  => { e.target.style.borderColor = T.green; }}
              onBlur={e   => { e.target.style.borderColor = T.border; }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onReject(match, notes).finally(() => setBusy(false)); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", borderRadius: 8,
                background: "#fff", border: `1.5px solid ${T.border}`,
                fontSize: 13, fontWeight: 600, color: T.muted,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "border-color .15s, color .15s",
                opacity: busy ? .6 : 1,
              }}
              onMouseOver={e => { if (!busy) { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; } }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
            >
              <IconX size={13} color="currentColor" />
              Not a Match
            </button>

            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onApprove(match, notes).finally(() => setBusy(false)); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 20px", borderRadius: 8, flex: 1,
                justifyContent: "center",
                background: busy ? "#4d9e82" : T.green,
                border: "none",
                fontSize: 13, fontWeight: 600, color: "#fff",
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "background .15s",
              }}
              onMouseOver={e => { if (!busy) e.currentTarget.style.background = "#004d30"; }}
              onMouseOut={e  => { if (!busy) e.currentTarget.style.background = T.green; }}
            >
              <IconCheck size={13} color="#fff" />
              {busy ? "Processing…" : `Approve${match.riderEmail ? " & Email Rider" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── filter tab ─────────────────────────────────────────────── */
function FilterTab({
  label, count, active, onClick,
}: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 8,
        background: active ? T.navy : T.white,
        border: `1.5px solid ${active ? T.navy : T.border}`,
        fontSize: 12, fontWeight: 600,
        color: active ? "#fff" : T.muted,
        cursor: "pointer", fontFamily: "'Inter', sans-serif",
        transition: "all .15s",
      }}
    >
      {label}
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: active ? "rgba(255,255,255,.2)" : T.surface,
        color: active ? "#fff" : T.light,
        padding: "1px 6px", borderRadius: 999,
      }}>
        {count}
      </span>
    </button>
  );
}

/* ── skeleton ───────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`,
      borderRadius: 12, height: 80,
      animation: "pulse 1.5s ease-in-out infinite",
      opacity: .6,
    }} />
  );
}

/* ── empty state ────────────────────────────────────────────── */
function EmptyState({ filterStatus }: { filterStatus: string }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "56px 32px",
      textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "#e8f4ef",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <IconMatch size={22} color={T.green} />
      </div>
      <p style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 15, fontWeight: 700, color: T.navy, margin: "0 0 8px",
      }}>
        {filterStatus === "pending_review" ? "No Pending Matches" : `No ${filterStatus.replace("_", " ")} Matches`}
      </p>
      <p style={{ fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>
        {filterStatus === "pending_review"
          ? "When a rider reports a lost item and the AI finds a match at\u00a0\u226580% confidence, it appears here for review."
          : "Nothing in this category yet."}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function ConfirmRequests() {
  const [matches,      setMatches]      = useState<PendingMatch[]>([]);
  const [manualClaims, setManualClaims] = useState<ManualClaim[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [toast,        setToast]        = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | MatchStatus>("pending_review");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [resMatches, resManual] = await Promise.all([
        fetch(`${API_BASE}/api/claims/matches`),
        fetch(`${API_BASE}/api/claims/manual`),
      ]);
      const dataMatches = await resMatches.json();
      const dataManual  = resManual.ok ? await resManual.json() : { claims: [] };
      setMatches(dataMatches.matches ?? []);
      setManualClaims(dataManual.claims ?? []);
    } catch {
      setError("Unable to load matches. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function handleApprove(match: PendingMatch, notes: string) {
    const res = await fetch(`${API_BASE}/api/claims/matches/${match.matchId}/approve`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      const d = await res.json();
      showToast(d.message || "Match approved and rider notified.");
      setMatches(prev => prev.map(m =>
        m.matchId === match.matchId ? { ...m, status: "approved" } : m
      ));
    } else {
      showToast("Failed to approve — please try again.");
    }
  }

  async function handleReject(match: PendingMatch, notes: string) {
    const res = await fetch(`${API_BASE}/api/claims/matches/${match.matchId}/reject`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      showToast("Match rejected.");
      setMatches(prev => prev.map(m =>
        m.matchId === match.matchId ? { ...m, status: "rejected" } : m
      ));
    } else {
      showToast("Failed to reject — please try again.");
    }
  }

  async function handleManual(claim: ManualClaim, action: "approve" | "reject") {
    const res = await fetch(`${API_BASE}/api/claims/${claim.claimId}/manual/${action}`, { method: "POST" });
    if (res.ok) {
      showToast(`Manual claim ${action}d.`);
      setManualClaims(prev => prev.filter(c => c.claimId !== claim.claimId));
    } else {
      showToast(`Failed to ${action} manual claim.`);
    }
  }

  const pendingCount  = matches.filter(m => m.status === "pending_review").length;
  const approvedCount = matches.filter(m => m.status === "approved").length;
  const rejectedCount = matches.filter(m => m.status === "rejected").length;

  const filtered = filterStatus === "all"
    ? matches
    : matches.filter(m => m.status === filterStatus);


  return (
    <div style={{ padding: "26px 28px", maxWidth: 900, fontFamily: "'Inter', sans-serif" }}>
      <Toast msg={toast} />

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 20, fontWeight: 700, color: T.navy,
            margin: "0 0 5px", letterSpacing: "-.02em",
          }}>
            AI Match Review
          </h1>
          <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.5, maxWidth: 520 }}>
            Items where the AI found a description-to-found-item match at or above 80% confidence.
            Approve to send an email notification to the rider.
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 14px", borderRadius: 8,
            background: T.white, border: `1.5px solid ${T.border}`,
            fontSize: 12, fontWeight: 600, color: T.muted,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = T.navy; e.currentTarget.style.color = T.navy; }}
          onMouseOut={e  => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
        >
          <IconRefresh size={13} color="currentColor" />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12, marginBottom: 20,
      }}>
        {[
          { label: "Pending Review", value: pendingCount, color: T.amber, bg: "#fffbf0", border: "#fde68a" },
          { label: "Approved",       value: approvedCount, color: T.green, bg: "#f0f9f4", border: "#bbdece" },
          { label: "Rejected",       value: rejectedCount, color: T.muted, bg: T.surface,  border: T.border },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 10, padding: "14px 16px", textAlign: "center",
          }}>
            <p style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 24, fontWeight: 700, color: s.color,
              margin: "0 0 2px", lineHeight: 1,
            }}>
              {s.value}
            </p>
            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["all",            "All",      matches.length],
          ["pending_review", "Pending",  pendingCount],
          ["approved",       "Approved", approvedCount],
          ["rejected",       "Rejected", rejectedCount],
        ] as const).map(([v, l, c]) => (
          <FilterTab
            key={v}
            label={l}
            count={c}
            active={filterStatus === v}
            onClick={() => setFilterStatus(v as any)}
          />
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, padding: "20px 22px", textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: T.red, margin: "0 0 12px" }}>{error}</p>
          <button onClick={load} style={{
            padding: "8px 16px", borderRadius: 8,
            background: T.white, border: `1.5px solid ${T.border}`,
            fontSize: 12, fontWeight: 600, color: T.navy,
            cursor: "pointer",
          }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState filterStatus={filterStatus} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(m => (
            <MatchCard
              key={m.matchId}
              match={m}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Manual review queue */}
      {!loading && manualClaims.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:12, letterSpacing:".08em", color:T.navy, marginBottom:10 }}>
            Manual Review Needed
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {manualClaims.map(c => (
              <div key={c.claimId} style={{
                background: T.white,
                border: `1px dashed ${T.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e8f4ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconUser size={16} color={T.green} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin:0, fontWeight:700, color:T.navy }}>{c.name}</p>
                  <p style={{ margin:"2px 0 6px", color:T.muted, fontSize:12 }}>{c.description}</p>
                  <p style={{ margin:0, color:T.light, fontSize:11 }}>
                    {c.locationName && <>📍 {c.locationName} · </>}
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => handleManual(c, "approve")} className="btn btn-primary btn-sm">Approve</button>
                  <button onClick={() => handleManual(c, "reject")} className="btn btn-ghost btn-sm">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
