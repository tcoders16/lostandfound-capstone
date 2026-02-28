// src/pages/Admin/FoundItems.tsx  — Admin-only grid of all found items
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllItems } from "../../lib/api";
import { IconBox, IconFilter, IconPlus, IconPin, IconCalendar } from "../../components/admin/AdminIcons";

const API_BASE =
  (import.meta as any).env?.VITE_BACKEND_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

const CATEGORIES = ["All", "Electronics", "Clothing", "Accessory", "Document", "Bag", "Other"];

const T = {
  navy:   "#1c2b39",
  green:  "#006341",
  muted:  "#546478",
  light:  "#8695a4",
  border: "#e8ecf0",
  surface:"#f5f6f7",
  white:  "#ffffff",
};

/* ── item card ──────────────────────────────────────────────── */
function ItemCard({ item }: { item: any }) {
  const [hover, setHover] = useState(false);
  const attr   = item.attributes ?? {};
  const imgSrc = item.filename ? `${API_BASE}/upload/${item.filename}` : null;
  const cat    = attr.category ?? "item";
  const date   = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      style={{
        background: T.white,
        border: `1px solid ${hover ? "#9ec9b8" : T.border}`,
        borderRadius: 12, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "border-color .18s, box-shadow .18s, transform .18s",
        boxShadow: hover ? "0 6px 18px rgba(0,99,65,.10)" : "0 1px 4px rgba(0,0,0,.05)",
        transform: hover ? "translateY(-2px)" : "none",
        cursor: "default",
      }}
    >
      {/* image */}
      <div style={{ position: "relative", height: 148, background: T.surface, overflow: "hidden" }}>
        {imgSrc ? (
          <img
            src={imgSrc} alt={item.description || "Found item"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
              transform: hover ? "scale(1.04)" : "scale(1)", transition: "transform .25s" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconBox size={40} color="#c8ced5" />
          </div>
        )}
        {/* category badge */}
        <span style={{
          position: "absolute", top: 8, left: 8,
          fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
          background: T.navy + "cc", color: "#fff",
          padding: "3px 8px", borderRadius: 999,
          textTransform: "capitalize",
          backdropFilter: "blur(4px)",
        }}>
          {cat}
        </span>
      </div>

      {/* content */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <h3 style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 12, fontWeight: 600, color: T.navy,
          margin: 0, lineHeight: 1.35,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.description || attr.summary || "Found Item"}
        </h3>

        {/* chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {attr.color     && <Chip label={attr.color} />}
          {attr.brand     && <Chip label={attr.brand} />}
          {attr.condition && <Chip label={attr.condition} variant="neutral" />}
        </div>

        {/* meta */}
        <div style={{ marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${T.surface}` }}>
          {item.locationName && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <IconPin size={10} color={T.light} />
              <span style={{ fontSize: 10.5, color: T.muted, fontWeight: 500 }}>{item.locationName}</span>
            </div>
          )}
          {date && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <IconCalendar size={10} color={T.light} />
              <span style={{ fontSize: 10, color: T.light }}>{date}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, variant = "green" }: { label: string; variant?: "green" | "neutral" }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600, letterSpacing: ".02em",
      background: variant === "green" ? "#e8f4ef" : T.surface,
      color:      variant === "green" ? T.green    : T.muted,
      padding: "2px 7px", borderRadius: 999,
      textTransform: "capitalize",
    }}>{label}</span>
  );
}

/* ── skeleton ───────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`,
      borderRadius: 12, overflow: "hidden", height: 240,
    }}>
      <div style={{ height: 148, background: T.surface, animation: "pulse 1.4s ease infinite" }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 12, background: T.surface, borderRadius: 4, marginBottom: 8, animation: "pulse 1.4s ease infinite" }} />
        <div style={{ height: 10, background: T.surface, borderRadius: 4, width: "60%", animation: "pulse 1.4s ease infinite" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function FoundItems() {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [cat,     setCat]     = useState("All");
  const [search,  setSearch]  = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getAllItems();
        setItems(data.items ?? []);
      } catch {
        setError("Unable to load found items. Check backend connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let out = items;
    if (cat !== "All") {
      out = out.filter(i => (i.attributes?.category ?? "").toLowerCase() === cat.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(i =>
        (i.description         ?? "").toLowerCase().includes(q) ||
        (i.attributes?.summary ?? "").toLowerCase().includes(q) ||
        (i.locationName        ?? "").toLowerCase().includes(q) ||
        (i.attributes?.brand   ?? "").toLowerCase().includes(q) ||
        (i.attributes?.color   ?? "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [items, cat, search]);

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 20, fontWeight: 700, color: T.navy,
            margin: "0 0 4px", letterSpacing: "-.02em",
          }}>
            Found Items
          </h1>
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
            All items currently in the system — admin access only.
          </p>
        </div>
        <Link to="/admin/upload" style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "9px 16px", borderRadius: 8,
          background: T.green, color: "#fff", textDecoration: "none",
          fontSize: 12, fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}>
          <IconPlus size={13} color="#fff" />
          Log New Item
        </Link>
      </div>

      {/* Filters bar */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 12, marginBottom: 20, flexWrap: "wrap",
      }}>
        {/* Category filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <IconFilter size={13} color={T.light} />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "5px 12px", borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                  background: cat === c ? T.navy : T.white,
                  color: cat === c ? "#fff" : T.muted,
                  border: `1.5px solid ${cat === c ? T.navy : T.border}`,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  transition: "all .12s",
                }}
                onMouseOver={e => { if (cat !== c) { e.currentTarget.style.borderColor = T.navy; e.currentTarget.style.color = T.navy; } }}
                onMouseOut={e  => { if (cat !== c) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; } }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 7,
          padding: "8px 12px", borderRadius: 8,
          background: T.white, border: `1.5px solid ${searchFocused ? T.green : T.border}`,
          transition: "border-color .15s", minWidth: 220,
        }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24"
               stroke={T.light} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              background: "transparent", border: "none", outline: "none",
              fontSize: 12, color: T.navy, flex: 1,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.light, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      {!loading && !error && (
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
          <strong style={{ color: T.navy }}>{filtered.length}</strong> item{filtered.length !== 1 ? "s" : ""}
          {(cat !== "All" || search) && (
            <button
              onClick={() => { setCat("All"); setSearch(""); }}
              style={{
                marginLeft: 8, fontSize: 11, color: T.green, fontWeight: 600,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* Grid */}
      {loading && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {[1,2,3,4,5,6,7,8].map(i => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, padding: "24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {filtered.map(item => (
            <ItemCard key={item.itemId || item._id || item.id} item={item} />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          background: T.white, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: "56px 32px", textAlign: "center",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: T.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <IconBox size={22} color={T.light} />
          </div>
          <p style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 14, fontWeight: 700, color: T.navy, margin: "0 0 8px",
          }}>
            {items.length === 0 ? "No Items Yet" : "No Matching Items"}
          </p>
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 16px" }}>
            {items.length === 0
              ? "Use \"Log New Item\" to add found items to the system."
              : "Try adjusting your filters or search term."}
          </p>
          {items.length > 0 && (
            <button
              onClick={() => { setCat("All"); setSearch(""); }}
              style={{
                padding: "8px 16px", borderRadius: 8,
                background: T.white, border: `1.5px solid ${T.border}`,
                fontSize: 12, fontWeight: 600, color: T.navy,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
