// src/pages/RiderSearch.tsx
import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../components/ui/AppShell";
import { searchItems, submitLostItemReport, type SearchResult } from "../lib/api";

const API_BASE =
  (import.meta as any).env?.VITE_BACKEND_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

// ── Search result card ──────────────────────────────────────────────────────
function ResultCard({ result, onClaim }: { result: SearchResult; onClaim: (r: SearchResult) => void }) {
  const m = result.metadata;
  const matchPct = Math.round((result.score ?? 0) * 100);
  const imgSrc = m.filename ? `${API_BASE}/upload/${m.filename}` : null;

  return (
    <div className="card card-hover p-0 overflow-hidden flex flex-col sm:flex-row gap-0">
      {/* Image */}
      <div className="sm:w-36 w-full h-36 sm:h-auto shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={m.description || "Found item"} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-4 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-base" style={{ color: "var(--go-navy)" }}>
              {m.description || m.summary || "Found Item"}
            </h3>
            <span className="badge badge-green shrink-0">
              {matchPct}% match
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            {m.locationName && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {m.locationName}
              </span>
            )}
            {m.category && <span className="badge badge-navy">{m.category}</span>}
            {m.color    && <span className="badge badge-navy">{m.color}</span>}
            {m.brand    && <span className="badge badge-navy">{m.brand}</span>}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => onClaim(result)} className="btn btn-primary btn-sm">
            This is mine — Claim Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Claim modal ─────────────────────────────────────────────────────────────
function ClaimModal({
  result,
  onClose,
  onSuccess,
}: {
  result: SearchResult;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr]   = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      // Save claim to MongoDB via API
      await submitLostItemReport({
        description: result.metadata.description || result.metadata.summary || result.id,
        locationName: result.metadata.locationName,
        name, phone, address: addr, email,
      });
      // Also mirror to localStorage so admin ConfirmRequests still works
      localStorage.setItem(`claim-${result.id}`, JSON.stringify({
        itemId: result.id,
        description: result.metadata.description || "",
        locationName: result.metadata.locationName || "",
        filename: result.metadata.filename,
        name, phone, address: addr, email,
        createdAt: new Date().toISOString(),
        status: "pending",
      }));
      onSuccess();
    } catch (e: any) {
      setErr(e.message || "Failed to submit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(28,43,57,.5)", backdropFilter: "blur(4px)" }}>
      <div className="card w-full max-w-md p-6 fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--go-navy)" }}>Claim This Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="rounded-lg p-3 mb-4" style={{ background: "var(--go-green-light)", border: "1px solid var(--green-100)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--go-green)" }}>
            "{result.metadata.description || result.metadata.summary || "Found item"}"
          </p>
          {result.metadata.locationName && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Found at: {result.metadata.locationName}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="input-label">Full Name *</label>
            <input required className="input" placeholder="Jane Smith"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Phone Number *</label>
            <input required type="tel" className="input" placeholder="416-555-0100"
              value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Email Address</label>
            <input type="email" className="input" placeholder="jane@example.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Mailing Address</label>
            <input className="input" placeholder="123 Main St, Toronto, ON"
              value={addr} onChange={e => setAddr(e.target.value)} />
          </div>

          {err && (
            <p className="text-sm rounded-lg p-2" style={{ background: "var(--red-50)", color: "var(--red-500)" }}>
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-primary flex-1">
              {busy ? "Submitting…" : "Submit Claim"}
            </button>
          </div>
        </form>

        <p className="text-xs mt-3" style={{ color: "var(--text-light)" }}>
          Please bring a valid photo ID to the GO Transit Lost &amp; Found office to collect your item.
        </p>
      </div>
    </div>
  );
}

// ── Success modal ────────────────────────────────────────────────────────────
function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(28,43,57,.5)", backdropFilter: "blur(4px)" }}>
      <div className="card w-full max-w-sm p-8 text-center fade-up">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: "var(--go-green-light)" }}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#006341" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--go-navy)" }}>Claim Submitted!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Our team will review your claim and contact you within 2 business days.
          Please bring your <strong>valid photo ID</strong> to the nearest GO Transit Lost &amp; Found office.
        </p>
        <button onClick={onClose} className="btn btn-primary w-full">Done</button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RiderSearch() {
  const [sp, setSp]               = useSearchParams();
  const [query, setQuery]         = useState(sp.get("q") || "");
  const [inputVal, setInputVal]   = useState(sp.get("q") || "");
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState("");
  const [claimTarget, setClaimTarget] = useState<SearchResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search if URL has ?q=
  useEffect(() => {
    const q = sp.get("q") || "";
    if (q && q !== query) {
      setQuery(q);
      setInputVal(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  async function runSearch(q: string) {
    setHasSearched(true);
    setMessage("");
    setResults([]);

    const wordCount = q.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 4) {
      setMessage("Please describe your item in more detail (at least 4 words).");
      return;
    }

    setLoading(true);
    try {
      const data = await searchItems(q);
      setResults(data);
      if (data.length === 0) setMessage(`No matches found for "${q}". Try different keywords.`);
    } catch {
      setMessage("Search unavailable right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputVal.trim();
    if (!q) { setMessage("Please describe what you lost."); return; }
    setSp(q ? { q } : {});
    setQuery(q);
    runSearch(q);
  }

  return (
    <AppShell>
      {/* Page header */}
      <div style={{ background: "var(--go-navy)", paddingBottom: "2.5rem" }}>
        <div className="container mx-auto px-6 pt-10" style={{ maxWidth: 1120 }}>
          <h1 className="text-3xl font-bold text-white mb-2">Search Found Items</h1>
          <p className="text-white/65 text-sm mb-6">
            Describe what you lost in plain language — our AI will find the closest matches.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch}
                className="flex gap-2 p-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,.1)", backdropFilter: "blur(10px)",
                         border: "1px solid rgba(255,255,255,.18)", maxWidth: 680 }}>
            <input
              type="search"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder='e.g., "navy blue Samsung phone, cracked screen, Oakville GO"'
              className="flex-1 bg-transparent text-white placeholder-white/40 px-3 text-sm outline-none"
              autoComplete="off"
              aria-label="Describe your lost item"
            />
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm shrink-0">
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                </svg>
              )}
              {loading ? "Searching…" : "Search"}
            </button>
          </form>
          <p className="text-white/45 text-xs mt-2 ml-1">
            Tip: include the item colour, brand, and station where you lost it for better results.
          </p>
        </div>
      </div>

      {/* Results body */}
      <div className="container mx-auto px-6 py-8" style={{ maxWidth: 1120 }}>
        {/* Message */}
        {message && !loading && (
          <div className="rounded-lg px-4 py-3 text-sm mb-6"
               style={{ background: "var(--amber-50)", color: "var(--amber-500)",
                        border: "1px solid #fde68a" }}>
            {message}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-4 h-36 animate-pulse"
                   style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div>
            <p className="text-sm mb-4 font-medium" style={{ color: "var(--text-muted)" }}>
              {results.length} match{results.length !== 1 ? "es" : ""} found for
              <span className="font-semibold" style={{ color: "var(--go-navy)" }}> "{query}"</span>
            </p>
            <div className="space-y-3">
              {results.map(r => (
                <ResultCard key={r.id} result={r} onClaim={setClaimTarget} />
              ))}
            </div>

            {/* Not found prompt */}
            <div className="mt-8 rounded-xl p-5 text-center"
                 style={{ background: "var(--white)", border: "1px dashed var(--border)" }}>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
                Don't see your item? File a lost item report and we'll notify you if it turns up.
              </p>
              <a href="/report-lost" className="btn btn-secondary btn-sm">
                Report Lost Item →
              </a>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasSearched && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: "var(--go-green-light)" }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#006341" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--go-navy)" }}>
              Describe what you lost
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Use the search bar above — the more detail you give, the better the results.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {claimTarget && !showSuccess && (
        <ClaimModal
          result={claimTarget}
          onClose={() => setClaimTarget(null)}
          onSuccess={() => { setClaimTarget(null); setShowSuccess(true); }}
        />
      )}
      {showSuccess && (
        <SuccessModal onClose={() => setShowSuccess(false)} />
      )}
    </AppShell>
  );
}
