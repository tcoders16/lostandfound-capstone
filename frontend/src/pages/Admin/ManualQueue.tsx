// src/pages/Admin/ManualQueue.tsx
// Admin page: claims with no AI match — manually browse found items and link

import { useState, useEffect } from "react";
import { getManualQueue, getAllItems, manuallyLinkClaim, type ManualQueueItem } from "../../lib/api";

const T = {
  green:   "#006341",
  teal:    "#00d492",
  navy:    "#1c2b39",
  surface: "#f5f7f9",
  white:   "#ffffff",
  border:  "#dde2e7",
  red:     "#dc2626",
  amber:   "#d97706",
  muted:   "#6b7280",
  text:    "#111827",
};

/* ── tiny helpers ─────────────────────────────────────────────────────── */
function Badge({ label, colour }: { label: string; colour: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: 99,
      fontSize: 10,
      fontFamily: "'Chakra Petch',sans-serif",
      fontWeight: 700,
      letterSpacing: ".05em",
      textTransform: "uppercase",
      background: colour + "22",
      color: colour,
      border: `1px solid ${colour}44`,
    }}>
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div style={{
      textAlign: "center", padding: "72px 24px",
      background: T.white, borderRadius: 16,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 14,
        background: "#f0f9f4",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 17, color: T.navy, marginBottom: 6 }}>
        Manual queue is clear
      </p>
      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.muted }}>
        All lost item reports have been matched or are under AI review.
      </p>
    </div>
  );
}

/* ── item picker modal ────────────────────────────────────────────────── */
function ItemPickerModal({
  claim,
  allItems,
  onLink,
  onClose,
}: {
  claim:    ManualQueueItem;
  allItems: any[];
  onLink:   (foundItemId: string, notes: string) => Promise<void>;
  onClose:  () => void;
}) {
  const [search, setSearch]   = useState("");
  const [notes,  setNotes]    = useState("");
  const [chosen, setChosen]   = useState<string | null>(null);
  const [busy,   setBusy]     = useState(false);
  const [err,    setErr]       = useState("");

  const filtered = allItems.filter(it => {
    const q = search.toLowerCase();
    return !q
      || (it.description || "").toLowerCase().includes(q)
      || (it.locationName || "").toLowerCase().includes(q)
      || (it.attributes?.category || "").toLowerCase().includes(q)
      || (it.attributes?.color || "").toLowerCase().includes(q)
      || (it.filename || "").toLowerCase().includes(q);
  });

  async function submit() {
    if (!chosen) return;
    setBusy(true); setErr("");
    try {
      await onLink(chosen, notes);
      onClose();
    } catch (e: any) {
      setErr(e.message || "Failed to link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 800,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 801,
        width: "min(680px,96vw)",
        maxHeight: "88vh",
        background: T.white,
        borderRadius: 20,
        boxShadow: "0 24px 80px rgba(0,0,0,.22)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 2 }}>
              Manually Link Item
            </p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.muted }}>
              Claim: <strong>{claim.claimId}</strong> — {claim.name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Claim summary */}
        <div style={{
          margin: "14px 24px 0",
          background: "#fffbf0",
          border: `1px solid #fde68a`,
          borderRadius: 10,
          padding: "12px 16px",
        }}>
          <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, letterSpacing: ".06em", color: T.amber, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>
            Rider's description
          </p>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.text, lineHeight: 1.55 }}>
            {claim.description}
          </p>
          {claim.locationName && (
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted, marginTop: 4 }}>
              Station: {claim.locationName}
            </p>
          )}
        </div>

        {/* Search bar */}
        <div style={{ padding: "14px 24px 0" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search found items by description, colour, station…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${T.border}`,
              fontFamily: "'Inter',sans-serif", fontSize: 13,
              color: T.text, outline: "none",
            }}
          />
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px" }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", padding: "32px 0", fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.muted }}>
              No items match your search.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((item: any) => {
                const isSelected = chosen === (item.itemId || item._id);
                return (
                  <button
                    key={item.itemId || item._id}
                    onClick={() => setChosen(item.itemId || item._id)}
                    style={{
                      width: "100%", textAlign: "left",
                      background: isSelected ? "#f0f9f4" : T.surface,
                      border: `1.5px solid ${isSelected ? T.green : T.border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 600, fontSize: 13, color: T.navy, marginBottom: 3 }}>
                          {item.attributes?.category ? `[${item.attributes.category}] ` : ""}
                          {item.description || item.attributes?.summary || item.filename || "Unnamed item"}
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {item.locationName && (
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>
                              📍 {item.locationName}
                            </span>
                          )}
                          {item.attributes?.color && (
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>
                              {item.attributes.color}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: T.green, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin notes + confirm */}
        <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${T.border}` }}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional admin notes (reason for manual link)…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${T.border}`,
              fontFamily: "'Inter',sans-serif", fontSize: 13,
              resize: "none", color: T.text, outline: "none",
              marginBottom: 12,
            }}
          />
          {err && (
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.red, marginBottom: 8 }}>{err}</p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: 10,
              border: `1.5px solid ${T.border}`, background: "none",
              fontFamily: "'Inter',sans-serif", fontSize: 13, cursor: "pointer",
              color: T.text,
            }}>
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!chosen || busy}
              style={{
                flex: 1, padding: "10px 20px", borderRadius: 10,
                background: chosen ? T.green : T.border,
                border: "none", color: "#fff",
                fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 13,
                cursor: chosen ? "pointer" : "default",
                opacity: busy ? .6 : 1,
                transition: "background .15s",
              }}
            >
              {busy ? "Linking…" : "Confirm Manual Link"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Claim card ───────────────────────────────────────────────────────── */
function ClaimCard({
  claim,
  allItems,
  onLinked,
}: {
  claim:    ManualQueueItem;
  allItems: any[];
  onLinked: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [linked,     setLinked]     = useState(false);

  async function doLink(foundItemId: string, notes: string) {
    await manuallyLinkClaim({ claimId: claim.claimId, foundItemId, notes });
    setLinked(true);
    onLinked();
  }

  const chatQ = claim.session?.questionsAsked ?? 0;
  const score  = claim.session?.currentScore ?? 0;

  return (
    <>
      <div style={{
        background: T.white,
        border: `1px solid ${linked ? T.green : T.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        transition: "border-color .2s",
      }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 14, color: T.navy }}>
                {claim.name}
              </p>
              {linked
                ? <Badge label="Linked — pending admin review" colour={T.green} />
                : <Badge label="Awaiting manual match" colour={T.amber} />
              }
            </div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>
              {claim.claimId} · {claim.phone} {claim.email ? `· ${claim.email}` : ""}
            </p>
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted, textAlign: "right" }}>
            {new Date(claim.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Description */}
        <div style={{
          background: "#fffbf0", border: "1px solid #fde68a",
          borderRadius: 10, padding: "10px 14px", marginBottom: 12,
        }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.text, lineHeight: 1.55 }}>
            {claim.description}
          </p>
          {claim.locationName && (
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted, marginTop: 4 }}>
              Station: {claim.locationName}
            </p>
          )}
        </div>

        {/* Chat stats */}
        {chatQ > 0 && (
          <div style={{
            display: "flex", gap: 16, padding: "8px 14px",
            background: T.surface, borderRadius: 8, marginBottom: 12,
          }}>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: T.muted, marginBottom: 2 }}>Questions asked</p>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 14, color: T.navy }}>{chatQ}</p>
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: T.muted, marginBottom: 2 }}>Best AI score</p>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 14, color: score >= 0.6 ? T.amber : T.muted }}>
                {Math.round(score * 100)}%
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: T.muted, marginBottom: 2 }}>Chat session</p>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 12, color: T.muted }}>
                {claim.session?.status ?? "—"}
              </p>
            </div>
          </div>
        )}

        {/* Action */}
        {!linked && (
          <button
            onClick={() => setShowPicker(true)}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10,
              background: T.navy, border: "none",
              fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 12,
              color: "#fff", cursor: "pointer", letterSpacing: ".04em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            Browse & Link Found Item Manually
          </button>
        )}
      </div>

      {showPicker && (
        <ItemPickerModal
          claim={claim}
          allItems={allItems}
          onLink={doLink}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function ManualQueue() {
  const [claims,   setClaims]   = useState<ManualQueueItem[]>([]);
  const [items,    setItems]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState("");
  const [refreshN, setRefreshN] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([getManualQueue(), getAllItems()])
      .then(([q, i]) => {
        setClaims(q.claims);
        setItems(i.items ?? []);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [refreshN]);

  return (
    <div>
      {/* Page header */}
      <div style={{ padding: "32px 36px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 22, color: T.navy, marginBottom: 4 }}>
              Manual Match Queue
            </h1>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.muted }}>
              Lost item reports where AI couldn't find a match. Manually browse found items and link them.
            </p>
          </div>
          <button
            onClick={() => setRefreshN(n => n + 1)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9,
              border: `1.5px solid ${T.border}`, background: T.white,
              fontFamily: "'Inter',sans-serif", fontSize: 13, cursor: "pointer", color: T.navy,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.5-4M20 15a8 8 0 01-14.5 4"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", gap: 20, marginTop: 20, marginBottom: 28,
          padding: "14px 20px", background: T.white,
          border: `1px solid ${T.border}`, borderRadius: 12,
        }}>
          <div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>Awaiting review</p>
            <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 22, color: T.navy }}>
              {loading ? "—" : claims.length}
            </p>
          </div>
          <div style={{ width: 1, background: T.border }} />
          <div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>Found items available</p>
            <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 22, color: T.green }}>
              {loading ? "—" : items.length}
            </p>
          </div>
          <div style={{ width: 1, background: T.border }} />
          <div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>Match method</p>
            <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 12, color: T.muted, marginTop: 4 }}>
              Human-reviewed
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 36px 48px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 140, borderRadius: 14,
                background: "linear-gradient(90deg,#eee 25%,#f5f5f5 50%,#eee 75%)",
                backgroundSize: "400% 100%",
                animation: "shimmer 1.4s ease infinite",
              }} />
            ))}
          </div>
        ) : err ? (
          <div style={{
            padding: "20px 24px", background: "#fde8e8",
            border: "1px solid #fca5a5", borderRadius: 12,
          }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.red }}>{err}</p>
          </div>
        ) : claims.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {claims.map(c => (
              <ClaimCard
                key={c.claimId}
                claim={c}
                allItems={items}
                onLinked={() => setRefreshN(n => n + 1)}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
