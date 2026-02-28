// src/pages/Admin/ReviewPreview.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step 2 of 2 — Admin reviews AI-extracted attributes before confirming save.
// Styled to match the rest of the admin portal (Chakra Petch + Inter,
// dark navy / GO green palette, inline styles only).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { analyseViaJson, storeAnalysedItem, type AnalyseResponse } from "../../lib/api";

/* ── design tokens (match UploadItem.tsx) ────────────────────────────── */
const T = {
  navy:     "#1c2b39",
  green:    "#006341",
  greenLt:  "#e8f4ef",
  greenBdr: "#c3e2d4",
  muted:    "#546478",
  light:    "#8695a4",
  border:   "#e8ecf0",
  surface:  "#f5f6f7",
  white:    "#ffffff",
  red:      "#dc2626",
  amber:    "#d97706",
  amberBg:  "#fef9ec",
  amberBdr: "#fde68a",
  indigo:   "#4f46e5",
  indigoBg: "#eff6ff",
  indigoBdr:"#c7d2fe",
};

/* ── helpers ─────────────────────────────────────────────────────────── */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

type Attributes = {
  category?:          string;
  brand?:             string;
  model?:             string;
  color?:             string;
  material?:          string;
  shape?:             string;
  size?:              string;
  condition?:         string;
  text?:              string;
  serialNumber?:      string;
  labels?:            string[];
  summary?:           string;
  keywords?:          string[];
  distinctiveFeatures?: string[];
  confidence?:        number;
  [k: string]: any;
};

function normalizeAttributes(res: AnalyseResponse | any, fallbackDesc: string): Attributes {
  const a = (res?.attributes ?? res?.analysis) as Attributes | undefined;
  if (!a || Object.keys(a).length === 0) {
    return { summary: fallbackDesc || "Uncategorized item", labels: [], keywords: [], distinctiveFeatures: [] };
  }
  return { ...a, summary: a.summary || fallbackDesc || "Uncategorized item" };
}

function ensureSavableAttributes(attrs: Attributes | null, desc: string): Attributes {
  if (!attrs || !attrs.summary || attrs.summary.trim().length === 0 || attrs.summary.trim().toUpperCase() === "NOT_FOUND") {
    return { summary: (desc || "Uncategorized item").trim(), keywords: [], labels: [], distinctiveFeatures: [] };
  }
  return attrs;
}

const CACHE_VER = "v2";
const cacheKey = (id: string) => `review-attrs:${CACHE_VER}:${id}`;
function loadCached(id: string): Attributes | null {
  try { const r = sessionStorage.getItem(cacheKey(id)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveCache(id: string, a: Attributes) { try { sessionStorage.setItem(cacheKey(id), JSON.stringify(a)); } catch {} }
function clearCache(id: string) { try { sessionStorage.removeItem(cacheKey(id)); } catch {} }

/* ── sub-components ──────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700,
      letterSpacing: ".14em", textTransform: "uppercase" as const,
      color: T.muted, marginBottom: 8,
    }}>
      {children}
    </p>
  );
}

function AttrChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column",
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: "6px 12px",
    }}>
      <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: T.light }}>{label}</span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: T.navy, marginTop: 2 }}>{value}</span>
    </div>
  );
}

function TagPill({ text }: { text: string }) {
  return (
    <span style={{
      display: "inline-block",
      background: T.greenLt, border: `1px solid ${T.greenBdr}`,
      borderRadius: 20, padding: "3px 10px",
      fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.green, fontWeight: 500,
    }}>
      {text}
    </span>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[180, 120, 160, 100].map(w => (
        <div key={w} style={{ height: 14, width: w, borderRadius: 6, background: "#e8ecf0", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? T.green : pct >= 60 ? T.amber : T.red;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: pct >= 80 ? T.greenLt : pct >= 60 ? T.amberBg : "#fef2f2",
      border: `1px solid ${pct >= 80 ? T.greenBdr : pct >= 60 ? T.amberBdr : "#fecaca"}`,
      borderRadius: 8, padding: "6px 14px",
    }}>
      {/* mini circular arc */}
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11" fill="none" stroke={T.border} strokeWidth="3" />
        <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 11 * pct / 100} ${2 * Math.PI * 11}`}
          strokeLinecap="round" transform="rotate(-90 14 14)" />
        <text x="14" y="18" textAnchor="middle" fill={color} style={{ fontSize: 8, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>{pct}</text>
      </svg>
      <div>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color, margin: 0 }}>{pct}% Confidence</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: T.light, margin: 0 }}>AI extraction score</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function ReviewPreview() {
  const nav = useNavigate();
  const { state } = useLocation() as {
    state?: {
      image:       File;
      location:    string;
      desc:        string;
      itemId:      string;
      imageUrl?:   string;
      storagePath?:string;
      extracted?:  { brand?: string; model?: string; color?: string; text?: string };
    };
  };

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [saveErr,  setSaveErr]  = useState<string | null>(null);
  const [attrs,    setAttrs]    = useState<Attributes | null>(null);

  const previewUrl = useMemo(() => state?.image ? URL.createObjectURL(state.image) : null, [state?.image]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!state) return;
    let mounted = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const cached = loadCached(state.itemId);
        if (cached) { if (mounted) setAttrs(cached); return; }

        const imageBase64 = await fileToBase64(state.image);
        const res = await analyseViaJson({
          itemId: state.itemId,
          imageBase64,
          description: state.desc,
          locationName: state.location,
          detail: "high",
        });
        if (!mounted) return;
        const norm = normalizeAttributes(res, state.desc);
        setAttrs(norm);
        saveCache(state.itemId, norm);
      } catch (e: any) {
        if (mounted) setErr(typeof e?.message === "string" ? e.message : "Analysis failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [state?.image, state?.itemId, state?.desc, state?.location]);

  async function handleConfirm() {
    if (!state) return;
    const safeAttrs = ensureSavableAttributes(attrs, state.desc);
    setSaveErr(null);
    try {
      setSaving(true);
      await storeAnalysedItem({
        itemId:       state.itemId,
        filename:     state.storagePath ?? state.itemId,
        url:          state.imageUrl ?? (state.storagePath ? `/uploads/${state.storagePath}` : undefined),
        locationName: state.location,
        description:  state.desc,
        attributes:   safeAttrs,
      });
      clearCache(state.itemId);
      nav("/admin/found-items");
    } catch (e: any) {
      setSaveErr(e?.message || "Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── guard: no state ───────────────────────────────────────────────── */
  if (!state) {
    return (
      <div style={{ padding: "40px 28px" }}>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "36px 32px", maxWidth: 480 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
            Nothing to Review
          </p>
          <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 10 }}>No item loaded</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.muted, marginBottom: 24 }}>
            Please upload an item first to get to the review screen.
          </p>
          <button
            onClick={() => nav("/admin/upload")}
            style={{ padding: "10px 20px", background: T.green, color: "#fff", border: "none", borderRadius: 9, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  const usedFallback = !!attrs && (
    attrs.summary === "Uncategorized item" ||
    attrs.summary?.trim().toUpperCase() === "NOT_FOUND" ||
    attrs.summary?.trim() === (state.desc || "").trim()
  );

  return (
    <>
      {/* pulse keyframes */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ padding: "0 0 100px", maxWidth: 960, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Page header ───────────────────────────────────────────── */}
        <div style={{ padding: "24px 28px 0" }}>
          {/* progress breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Upload", done: true  },
              { label: "Review & Confirm", done: false },
            ].map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <div style={{ width: 32, height: 1, background: T.green }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: s.done ? T.green : T.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {s.done
                      ? <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      : <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, color: "#fff" }}>{i+1}</span>
                    }
                  </div>
                  <span style={{
                    fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700,
                    color: s.done ? T.muted : T.navy,
                    textDecoration: s.done ? "line-through" : "none",
                  }}>
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 4px", letterSpacing: "-.02em" }}>
            Review &amp; Confirm Item
          </h1>
          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
            Verify the photo and AI-extracted details. Confirming saves the item to MongoDB and embeds it in the Pinecone vector index so it can be matched to lost item reports.
          </p>
        </div>

        {/* ── Main error banner ─────────────────────────────────────── */}
        {err && (
          <div style={{ margin: "0 28px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: T.red }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            Analysis failed: {err}
          </div>
        )}

        {/* ── Two-column layout ──────────────────────────────────────── */}
        <div style={{ padding: "0 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* LEFT: Image + location ────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Photo card */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
              <div style={{ position: "relative" }}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Found item"
                    style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
                  />
                )}
                {/* GO overlay */}
                <div style={{
                  position: "absolute", top: 12, left: 12,
                  background: "rgba(28,43,57,.7)", backdropFilter: "blur(4px)",
                  borderRadius: 6, padding: "3px 8px",
                }}>
                  <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.7)", letterSpacing: ".12em", textTransform: "uppercase" as const }}>
                    Evidence Photo
                  </span>
                </div>
              </div>

              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Location */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: T.greenLt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.green} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, color: T.light, letterSpacing: ".1em", textTransform: "uppercase" as const, margin: "0 0 2px" }}>Found At</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: T.navy, margin: 0 }}>{state.location || "—"}</p>
                  </div>
                </div>

                {/* Staff description */}
                {state.desc && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.muted} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, color: T.light, letterSpacing: ".1em", textTransform: "uppercase" as const, margin: "0 0 2px" }}>Staff Notes</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted, margin: 0, lineHeight: 1.5 }}>{state.desc}</p>
                    </div>
                  </div>
                )}

                {/* Item ID */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 10, fontWeight: 600, color: T.light, textTransform: "uppercase", letterSpacing: ".1em" }}>Item ID</span>
                  <code style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: T.muted, background: T.surface, padding: "2px 8px", borderRadius: 4 }}>
                    {state.itemId}
                  </code>
                </div>
              </div>
            </div>

            {/* Pipeline info card */}
            <div style={{ background: T.indigoBg, border: `1px solid ${T.indigoBdr}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.indigo} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#3730a3", lineHeight: 1.6, margin: 0 }}>
                <strong>On Confirm:</strong> item is saved to MongoDB and embedded with OpenAI text-embedding-3-large (3072-dim) into Pinecone — tagged <code style={{ background: "rgba(79,70,229,.12)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>type=found_item</code> so lost item reports can match against it.
              </p>
            </div>
          </div>

          {/* RIGHT: AI Analysis ────────────────────────────────────── */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px 22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: T.green, margin: 0 }}>
                  AI Analysis · GPT-4.1-mini Vision
                </p>
                <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, color: T.navy, margin: "4px 0 0" }}>
                  Extracted Attributes
                </h2>
              </div>
              {!loading && typeof attrs?.confidence === "number" && (
                <ConfidenceBadge confidence={attrs.confidence} />
              )}
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div>
                <div style={{ background: T.surface, borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.muted, margin: "0 0 10px" }}>Running AI vision analysis…</p>
                  <Skeleton />
                </div>
              </div>
            )}

            {/* Fallback warning */}
            {usedFallback && !loading && !err && (
              <div style={{ background: T.amberBg, border: `1px solid ${T.amberBdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
                AI couldn't confidently identify the item — using your staff description as the search summary. You can still confirm and save.
              </div>
            )}

            {/* Main attributes */}
            {!loading && !err && attrs && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Summary */}
                {attrs.summary && (
                  <div>
                    <SectionLabel>Summary</SectionLabel>
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.navy, lineHeight: 1.6, margin: 0 }}>
                        {attrs.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Core attribute chips */}
                {(attrs.category || attrs.brand || attrs.model || attrs.color || attrs.material || attrs.size || attrs.condition || attrs.shape) && (
                  <div>
                    <SectionLabel>Item Attributes</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {attrs.category  && <AttrChip label="Category"  value={attrs.category} />}
                      {attrs.brand     && <AttrChip label="Brand"     value={attrs.brand} />}
                      {attrs.model     && <AttrChip label="Model"     value={attrs.model} />}
                      {attrs.color     && <AttrChip label="Color"     value={attrs.color} />}
                      {attrs.material  && <AttrChip label="Material"  value={attrs.material} />}
                      {attrs.size      && <AttrChip label="Size"      value={attrs.size} />}
                      {attrs.condition && <AttrChip label="Condition" value={attrs.condition} />}
                      {attrs.shape     && <AttrChip label="Shape"     value={attrs.shape} />}
                    </div>
                  </div>
                )}

                {/* Distinctive features */}
                {!!attrs.distinctiveFeatures?.length && (
                  <div>
                    <SectionLabel>Distinctive Features</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {attrs.distinctiveFeatures.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, flexShrink: 0, marginTop: 6 }} />
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labels */}
                {!!attrs.labels?.length && (
                  <div>
                    <SectionLabel>Labels / Logos Detected</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {attrs.labels.map((l, i) => <TagPill key={i} text={l} />)}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {!!attrs.keywords?.length && (
                  <div>
                    <SectionLabel>Search Keywords</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {attrs.keywords.map((k, i) => (
                        <span key={i} style={{
                          display: "inline-block",
                          background: T.surface, border: `1px solid ${T.border}`,
                          borderRadius: 4, padding: "2px 8px",
                          fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.muted,
                        }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* OCR */}
                {attrs.text && (
                  <div>
                    <SectionLabel>OCR Text Detected</SectionLabel>
                    <div style={{
                      background: T.navy, borderRadius: 10, padding: "10px 14px",
                      fontFamily: "'Courier New', monospace", fontSize: 13, color: "#e2e8f0",
                      lineHeight: 1.6, letterSpacing: ".02em",
                    }}>
                      {attrs.text}
                    </div>
                  </div>
                )}

                {/* Serial */}
                {attrs.serialNumber && (
                  <div>
                    <SectionLabel>Serial Number</SectionLabel>
                    <code style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: T.navy, background: T.greenLt, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.greenBdr}` }}>
                      {attrs.serialNumber}
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* save error */}
        {saveErr && (
          <div style={{ margin: "16px 28px 0", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: T.red }}>
            {saveErr}
          </div>
        )}
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 220, right: 0, zIndex: 30,
        background: "rgba(245,246,247,.95)", backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.border}`, padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color: T.navy, margin: 0 }}>
            Step 2 of 2 · Review &amp; Confirm
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.light, margin: 0 }}>
            {saving ? "Saving to MongoDB + Pinecone…" : loading ? "AI is analysing the image…" : "Review extracted details then confirm"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={saving}
            onClick={() => nav(-1)}
            style={{
              padding: "9px 18px", borderRadius: 9,
              background: T.white, border: `1.5px solid ${T.border}`,
              fontSize: 13, fontWeight: 600, color: T.muted,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif", opacity: saving ? 0.5 : 1,
            }}
          >
            Back
          </button>

          <button
            disabled={loading || saving || !attrs}
            onClick={handleConfirm}
            style={{
              padding: "9px 24px", borderRadius: 9,
              background: (loading || saving || !attrs) ? "#4d9e82" : T.green,
              border: "none",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: (loading || saving || !attrs) ? "not-allowed" : "pointer",
              fontFamily: "'Chakra Petch', sans-serif",
              display: "flex", alignItems: "center", gap: 8,
              letterSpacing: ".02em",
            }}
          >
            {saving ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin .7s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6-8.485"/>
                </svg>
                Saving…
              </>
            ) : loading ? (
              "Analysing…"
            ) : (
              <>
                Confirm &amp; Save to Database
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
