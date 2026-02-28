// src/pages/Admin/AdminDashboard.tsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAllItems } from "../../lib/api";
import { IconUpload, IconMatch, IconBox, IconMail, IconCpu, IconCheck } from "../../components/admin/AdminIcons";
import NeuralCanvas from "../../components/ui/NeuralCanvas";

const API_BASE =
  (import.meta as any).env?.VITE_BACKEND_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: "'Chakra Petch', sans-serif",
      fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
      textTransform: "uppercase" as const, color: "#8695a4",
      marginBottom: 14, ...style,
    }}>{children}</p>
  );
}

function KpiCard({ label, value, sub, accent, icon, trend }: {
  label: string; value: string | number; sub?: string;
  accent: string; icon: React.ReactNode;
  trend?: { dir: "up" | "down" | "neutral"; text: string };
}) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)} style={{
      background: "#fff", border: `1px solid ${hover ? accent + "55" : "#e8ecf0"}`,
      borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14,
      transition: "border-color .2s, box-shadow .2s",
      boxShadow: hover ? `0 6px 20px ${accent}18` : "0 1px 4px rgba(0,0,0,.05)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: accent + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        {trend && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".04em", color: trend.dir === "up" ? "#006341" : trend.dir === "down" ? "#dc2626" : "#8695a4", background: trend.dir === "up" ? "#e8f4ef" : trend.dir === "down" ? "#fef2f2" : "#f1f4f7", padding: "3px 8px", borderRadius: 999 }}>
            {trend.text}
          </span>
        )}
      </div>
      <div>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, color: "#1c2b39", margin: "0 0 3px", letterSpacing: "-.03em", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, fontWeight: 500, color: "#546478", margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: "#8695a4", marginTop: 3 }}>{sub}</p>}
      </div>
    </div>
  );
}

function ActionTile({ to, label, desc, accent, icon }: { to: string; label: string; desc: string; accent: string; icon: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)} style={{
        background: "#fff", border: `1.5px solid ${hover ? accent : "#e8ecf0"}`,
        borderRadius: 12, padding: "18px 18px 16px",
        transition: "all .18s", boxShadow: hover ? `0 8px 22px ${accent}1a` : "0 1px 4px rgba(0,0,0,.04)",
        transform: hover ? "translateY(-2px)" : "none",
        cursor: "pointer", height: "100%", display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: accent + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 600, color: "#1c2b39", margin: "0 0 5px" }}>{label}</p>
          <p style={{ fontSize: 12, color: "#546478", lineHeight: 1.5, margin: 0 }}>{desc}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: accent, display: "flex", alignItems: "center", gap: 4 }}>
          Open
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </div>
    </Link>
  );
}

function PipelineStep({ n, label, desc, icon, isLast }: { n: number; label: string; desc: string; icon: React.ReactNode; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flex: "1 1 0", position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#006341", border: "2px solid #006341", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
          {icon}
        </div>
        {!isLast && <div style={{ position: "absolute", top: 18, left: 17, width: "calc(100% - 14px)", height: 1.5, background: "linear-gradient(90deg, #006341 0%, #00634120 100%)", zIndex: 0 }} />}
      </div>
      <div style={{ paddingLeft: 10, paddingRight: 8, paddingBottom: 8 }}>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 11, fontWeight: 700, color: "#1c2b39", margin: "0 0 3px", letterSpacing: ".01em" }}>{n}. {label}</p>
        <p style={{ fontSize: 10.5, color: "#546478", lineHeight: 1.45, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function ActivityRow({ title, sub, tag, tagColor, tagBg }: { title: string; sub: string; tag: string; tagColor: string; tagBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f1f4f7" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1c2b39", margin: "0 0 2px" }}>{title}</p>
        <p style={{ fontSize: 11, color: "#8695a4", margin: 0 }}>{sub}</p>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".04em", background: tagBg, color: tagColor, borderRadius: 999, padding: "3px 10px", flexShrink: 0 }}>{tag}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [itemCount,    setItemCount]    = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, matchesRes] = await Promise.allSettled([
        getAllItems(),
        fetch(`${API_BASE}/api/claims/matches`).then(r => r.json()),
      ]);
      if (itemsRes.status === "fulfilled") {
        const d = itemsRes.value;
        setItemCount(d.count ?? d.items?.length ?? 0);
      }
      if (matchesRes.status === "fulfilled") {
        const d = matchesRes.value;
        const pending = (d.matches ?? []).filter((m: any) => m.status === "pending_review").length;
        setPendingCount(pending);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: "100%", background: "#f5f6f7" }}>
      {/* Hero with NeuralCanvas */}
      <div style={{ position: "relative", height: 200, overflow: "hidden", background: "#1c2b39" }}>
        <NeuralCanvas bgColor={0x1c2b39} nodeColor={0x005535} hubColor={0x00a870} edgeColor={0x003d26} edgeDist={5.5} nodeCount={50} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 32px", background: "linear-gradient(90deg, rgba(28,43,57,.75) 0%, rgba(28,43,57,.1) 100%)" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-.02em", margin: "0 0 6px" }}>Lost & Found Portal</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", margin: 0 }}>GO Transit Ontario — AI-assisted item recovery system</p>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Link to="/admin/upload" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, background: "#006341", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              <IconUpload size={13} color="#fff" />
              Log Found Item
            </Link>
            <Link to="/admin/confirm" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,.12)", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", border: "1px solid rgba(255,255,255,.2)" }}>
              <IconMatch size={13} color="#fff" />
              Review Matches
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
          <KpiCard label="Items in Database" value={loading ? "—" : (itemCount ?? 0)} sub="Found & logged items" accent="#006341" icon={<IconBox size={18} color="#006341" />} trend={{ dir: "neutral", text: "LIVE" }} />
          <KpiCard label="Pending AI Reviews" value={loading ? "—" : (pendingCount ?? 0)} sub="Matches awaiting approval" accent="#d97706" icon={<IconMatch size={18} color="#d97706" />} trend={pendingCount && pendingCount > 0 ? { dir: "down", text: `${pendingCount} pending` } : { dir: "neutral", text: "UP TO DATE" }} />
          <KpiCard label="Email Notifications" value="Active" sub="Sent on match approval" accent="#2563eb" icon={<IconMail size={18} color="#2563eb" />} trend={{ dir: "neutral", text: "LIVE" }} />
          <KpiCard label="AI Pipeline" value="Online" sub="Pinecone + OpenAI Vision" accent="#7c3aed" icon={<IconCpu size={18} color="#7c3aed" />} trend={{ dir: "up", text: "ACTIVE" }} />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Quick Actions</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <ActionTile to="/admin/upload" label="Log Found Item" desc="Upload a photo and let AI extract item attributes automatically." accent="#006341" icon={<IconUpload size={17} color="#006341" />} />
            <ActionTile to="/admin/confirm" label="Review AI Matches" desc="Approve or reject AI-suggested matches. Approved matches email the rider." accent="#d97706" icon={<IconMatch size={17} color="#d97706" />} />
            <ActionTile to="/admin/found-items" label="Browse All Items" desc="View every found item in the system with filters and full-text search." accent="#2563eb" icon={<IconBox size={17} color="#2563eb" />} />
          </div>
        </div>

        {/* Pipeline */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "22px 24px", marginBottom: 22 }}>
          <SectionLabel style={{ marginBottom: 18 }}>AI Pipeline</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, position: "relative" }}>
            {[
              { label: "Item Logged",   desc: "Admin uploads photo",             icon: <IconUpload size={14} color="#fff" /> },
              { label: "Vision AI",     desc: "OpenAI extracts attributes",      icon: <IconCpu    size={14} color="#fff" /> },
              { label: "Vector Stored", desc: "Pinecone embedding saved",        icon: <IconBox    size={14} color="#fff" /> },
              { label: "Rider Reports", desc: "Lost item description submitted", icon: <IconMatch  size={14} color="#fff" /> },
              { label: "Auto Match",    desc: "Similarity >=80% -> review",      icon: <IconCheck  size={14} color="#fff" /> },
              { label: "Email Sent",    desc: "Rider notified with pickup info", icon: <IconMail   size={14} color="#fff" /> },
            ].map((s, i, arr) => (
              <PipelineStep key={i} n={i + 1} label={s.label} desc={s.desc} icon={s.icon} isLast={i === arr.length - 1} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionLabel style={{ marginBottom: 0 }}>Recent Activity</SectionLabel>
            <Link to="/admin/found-items" style={{ fontSize: 12, color: "#006341", fontWeight: 600, textDecoration: "none" }}>View all</Link>
          </div>
          <ActivityRow title="Black Logitech Mouse" sub="Oakville GO · Today 14:30" tag="Uploaded" tagColor="#006341" tagBg="#e8f4ef" />
          <ActivityRow title="Blue JanSport Backpack" sub="Union Station · Today 13:10" tag="Matched" tagColor="#d97706" tagBg="#fef3c7" />
          <ActivityRow title="iPhone 12 Blue" sub="Kipling · Yesterday 17:00" tag="Approved" tagColor="#2563eb" tagBg="#eff6ff" />
          <p style={{ fontSize: 11, color: "#8695a4", marginTop: 14, fontStyle: "italic" }}>Live feed connects to MongoDB change streams.</p>
        </div>
      </div>
    </div>
  );
}
