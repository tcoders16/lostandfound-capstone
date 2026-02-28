// src/pages/Admin/UploadItem.tsx
import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadAndAnalyseFile } from "../../lib/api";
import { IconUpload, IconPin, IconX, IconCheck } from "../../components/admin/AdminIcons";

const CACHE_VER = "v2";
const cacheKey  = (id: string) => `review-attrs:${CACHE_VER}:${id}`;

const T = {
  navy:   "#1c2b39",
  green:  "#006341",
  muted:  "#546478",
  light:  "#8695a4",
  border: "#e8ecf0",
  surface:"#f5f6f7",
  white:  "#ffffff",
  red:    "#dc2626",
  amber:  "#d97706",
};

const GO_STATIONS = [
  "Union Station","Bloor GO","Danforth GO","Scarborough GO","Eglinton GO",
  "Agincourt GO","Milliken GO","Unionville GO","Markham GO","Mount Joy GO",
  "Stouffville GO","Lincolnville GO","Old Cummer GO","Oriole GO","Richmond Hill GO",
  "Langstaff GO","Rutherford GO","Maple GO","King City GO","Aurora GO",
  "Newmarket GO","East Gwillimbury GO","Bradford GO","Barrie South GO","Allandale Waterfront GO",
  "Kipling GO","Dixie GO","Cooksville GO","Erindale GO","Streetsville GO",
  "Meadowvale GO","Lisgar GO","Brampton GO","Mount Pleasant GO","Georgetown GO",
  "Acton GO","Guelph Central GO","Kitchener GO","Port Credit GO","Clarkson GO",
  "Oakville GO","Bronte GO","Appleby GO","Burlington GO","Aldershot GO",
  "Hamilton GO","West Harbour GO","Exhibition GO","Mimico GO","Long Branch GO",
  "Port Union GO","Rouge Hill GO","Ajax GO","Whitby GO","Oshawa GO",
];

/* ── drag-drop image upload zone ─────────────────────────────── */
function ImageZone({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [drag,   setDrag]   = useState(false);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  function accept(f: File) {
    if (!f.type.startsWith("image/")) return;
    onChange(f);
  }

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) accept(f); }}
      style={{
        position: "relative",
        borderRadius: 12,
        border: `2px dashed ${drag ? T.green : file ? T.green : T.border}`,
        background: drag ? "#e8f4ef" : file ? "#f0f9f4" : T.surface,
        minHeight: file ? 220 : 160,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: file ? "default" : "pointer",
        overflow: "hidden",
        transition: "border-color .18s, background .18s",
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f); }} />

      {!file ? (
        <div style={{ textAlign: "center", padding: "28px 20px" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e8f4ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <IconUpload size={22} color={T.green} />
          </div>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 600, color: T.navy, margin: "0 0 4px" }}>
            {drag ? "Drop to upload" : "Drag & drop or click to upload"}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.light, margin: 0 }}>JPG, PNG, HEIC — one clear photo</p>
        </div>
      ) : (
        <>
          <img
            src={previewUrl!}
            alt="preview"
            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
            onLoad={() => previewUrl && URL.revokeObjectURL(previewUrl)}
          />
          {/* remove button */}
          <button
            onClick={e => { e.stopPropagation(); onChange(null); }}
            style={{
              position: "absolute", top: 10, right: 10,
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(0,0,0,.55)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <IconX size={13} color="#fff" />
          </button>
          {/* filename overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,.6))",
            padding: "20px 12px 10px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <IconCheck size={12} color="#00d492" />
            <span style={{ fontSize: 11, color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
              {file.name} · {(file.size/1024).toFixed(0)} KB
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── labelled field ──────────────────────────────────────────── */
function FieldWrap({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 600, color: T.navy, letterSpacing: ".04em", marginBottom: 4, textTransform: "uppercase" as const }}>
        {label}
      </label>
      {hint && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.light, margin: "0 0 8px" }}>{hint}</p>}
      {children}
      {error && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.red, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </p>
      )}
    </div>
  );
}

function inputStyle(focus: boolean, hasError?: boolean): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box",
    padding: "10px 13px", borderRadius: 9,
    border: `1.5px solid ${hasError ? T.red : focus ? T.green : T.border}`,
    outline: "none", fontSize: 13, color: T.navy,
    fontFamily: "'Inter', sans-serif",
    background: T.white, transition: "border-color .15s",
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function UploadItem() {
  const nav = useNavigate();

  const [image,    setImage]    = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [desc,     setDesc]     = useState("");

  const [touched,     setTouch]     = useState<{ image?: boolean; location?: boolean }>({});
  const [submitting,  setSubmitting] = useState(false);
  const [error,       setError]     = useState<string | null>(null);
  const [locFocus,    setLocFocus]   = useState(false);
  const [descFocus,   setDescFocus]  = useState(false);

  const errors = useMemo(() => ({
    image:    !image        ? "Please upload a photo of the item."                  : "",
    location: !location.trim() ? "Enter the station where the item was found." : "",
  }), [image, location]);

  const isValid = !errors.image && !errors.location;

  async function handleExtract() {
    setTouch({ image: true, location: true });
    setError(null);
    if (!isValid || !image) return;
    try {
      setSubmitting(true);
      const res    = await uploadAndAnalyseFile(image);
      const itemId = res.file?.filename ?? `${Date.now()}`;
      try { sessionStorage.setItem(cacheKey(itemId), JSON.stringify(res.analysis ?? {})); } catch { /* non-fatal */ }
      nav("/admin/review", {
        state: {
          image, location: location.trim(), desc: desc.trim(),
          itemId, imageUrl: res.file?.url, status: "analysed",
          extracted: {
            brand: (res.analysis as any)?.brand,
            model: (res.analysis as any)?.model,
            color: (res.analysis as any)?.color,
            text:  (res.analysis as any)?.text,
          },
        },
      });
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "28px 28px 100px", maxWidth: 720, fontFamily: "'Inter', sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: T.green, marginBottom: 6 }}>
          Item Intake · Step 1 of 2
        </p>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 6px", letterSpacing: "-.02em" }}>
          Log a Found Item
        </h1>
        <p style={{ fontSize: 13, color: T.muted, margin: 0, maxWidth: 500, lineHeight: 1.6 }}>
          Upload a clear photo. Our AI will extract the item's attributes automatically — you'll review and confirm before saving.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.red }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </div>
      )}

      {/* Card */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 26px", display: "flex", flexDirection: "column", gap: 24, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>

        {/* Image upload */}
        <FieldWrap
          label="Item Photo"
          hint="One clear, well-lit photo gives the best AI extraction results."
          error={touched.image ? errors.image : ""}
        >
          <ImageZone file={image} onChange={f => { setImage(f); setTouch(t => ({ ...t, image: true })); }} />
        </FieldWrap>

        {/* Location */}
        <FieldWrap
          label="Location Found"
          hint="Station or stop where the item was handed in."
          error={touched.location ? errors.location : ""}
        >
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <IconPin size={14} color={locFocus ? T.green : T.light} />
            </div>
            <input
              list="go-stations-list"
              type="text"
              value={location}
              placeholder="e.g., Oakville GO"
              onFocus={() => setLocFocus(true)}
              onBlur={() => { setLocFocus(false); setTouch(t => ({ ...t, location: true })); }}
              onChange={e => setLocation(e.target.value)}
              style={{ ...inputStyle(locFocus, !!(touched.location && errors.location)), paddingLeft: 36 }}
            />
            <datalist id="go-stations-list">
              {GO_STATIONS.map(s => <option value={s} key={s} />)}
            </datalist>
          </div>
        </FieldWrap>

        {/* Description */}
        <FieldWrap
          label="Short Description"
          hint="Optional — any details the AI might miss (e.g., initials on the case, broken zip)."
        >
          <textarea
            rows={3}
            value={desc}
            maxLength={240}
            placeholder='e.g., "Black Logitech mouse, scratch on right side, USB-C cable attached"'
            onFocus={() => setDescFocus(true)}
            onBlur={() => setDescFocus(false)}
            onChange={e => setDesc(e.target.value)}
            style={{
              ...inputStyle(descFocus),
              resize: "vertical", lineHeight: 1.55,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
            <span style={{ fontSize: 10.5, color: desc.length > 200 ? T.amber : T.light }}>
              {desc.length} / 240
            </span>
          </div>
        </FieldWrap>

      </div>

      {/* Sticky footer action bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 220, right: 0, zIndex: 20,
        background: "rgba(245,246,247,.92)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.border}`,
        padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 600, color: T.navy, margin: 0 }}>
            Step 1 of 2
          </p>
          <p style={{ fontSize: 11, color: T.light, margin: 0 }}>
            Upload → AI Extract → Review &amp; Confirm
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => nav(-1)}
            style={{
              padding: "9px 18px", borderRadius: 9,
              background: T.white, border: `1.5px solid ${T.border}`,
              fontSize: 13, fontWeight: 600, color: T.muted,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "border-color .15s, color .15s",
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = T.navy; e.currentTarget.style.color = T.navy; }}
            onMouseOut={e  => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
          >
            Cancel
          </button>
          <button
            disabled={submitting}
            onClick={handleExtract}
            style={{
              padding: "9px 22px", borderRadius: 9,
              background: submitting ? "#4d9e82" : (!isValid && Object.keys(touched).length > 0) ? "#9ec9b8" : T.green,
              border: "none",
              fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", gap: 8,
              transition: "background .15s",
            }}
            onMouseOver={e => { if (!submitting) e.currentTarget.style.background = "#004d30"; }}
            onMouseOut={e  => { if (!submitting) e.currentTarget.style.background = T.green; }}
          >
            {submitting ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin .7s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6-8.485"/>
                </svg>
                Extracting…
              </>
            ) : (
              <>
                <IconUpload size={13} color="#fff" />
                Extract &amp; Review
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
