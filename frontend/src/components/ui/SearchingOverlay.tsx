// src/components/ui/SearchingOverlay.tsx
// Fullscreen animated search screen — appears right after claim submission
// Shows scanning animation + countdown dots then transitions to result

import { useEffect, useState, useRef } from "react";

interface Props {
  onComplete: (result: { hasMatch: boolean; sessionId: string; initialScore: number }) => void;
  sessionId: string;
  initialScore: number;
  hasMatch: boolean;
}

// Messages shown during the search animation
const MSGS = [
  "Connecting to GO Transit database…",
  "Scanning 800+ found items…",
  "Running AI similarity analysis…",
  "Cross-referencing station logs…",
];

export default function SearchingOverlay({ onComplete, sessionId, initialScore, hasMatch }: Props) {
  const [msgIdx,    setMsgIdx]    = useState(0);
  const [dots,      setDots]      = useState(".");
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate messages
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => Math.min(i + 1, MSGS.length - 1)), 1100);
    return () => clearInterval(id);
  }, []);

  // Animate dots
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 420);
    return () => clearInterval(id);
  }, []);

  // Progress bar
  useEffect(() => {
    const total = 4200; // 4.2s total search
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / total) * 100, 95);
      setProgress(p);
      if (elapsed >= total) {
        clearInterval(id);
        setProgress(100);
        setDone(true);
        timerRef.current = setTimeout(() => setShowResult(true), 500);
      }
    }, 50);
    return () => { clearInterval(id); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Transition out
  useEffect(() => {
    if (showResult) {
      timerRef.current = setTimeout(() => {
        onComplete({ hasMatch, sessionId, initialScore });
      }, 1200);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [showResult, hasMatch, sessionId, initialScore, onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#0c1825",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      transition: "opacity .6s",
      opacity: showResult ? 0 : 1,
    }}>
      {/* Radar rings */}
      <div style={{ position: "relative", width: 160, height: 160, marginBottom: 48 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: "absolute",
            inset: `${i * 20}px`,
            borderRadius: "50%",
            border: `1.5px solid rgba(0,180,100,${0.35 - i * 0.1})`,
            animation: `radarPulse 2s ease-out ${i * 0.55}s infinite`,
          }} />
        ))}
        {/* Center GO mark */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 14,
            background: "#006341",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: done
              ? "0 0 0 12px rgba(0,180,100,.25), 0 0 32px rgba(0,180,100,.5)"
              : "0 0 0 4px rgba(0,99,65,.3)",
            transition: "box-shadow .5s",
          }}>
            <span style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700, fontSize: 26, color: "#fff", letterSpacing: -1,
            }}>GO</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {!done ? (
        <>
          <p style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 600, fontSize: 15, color: "#fff",
            marginBottom: 8, letterSpacing: ".04em",
          }}>
            {MSGS[msgIdx]}{dots}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 40 }}>
            This usually takes a few seconds
          </p>
        </>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeUp .4s ease" }}>
          {hasMatch ? (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(0,180,100,.2)",
                border: "2px solid #00b464",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d492" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontWeight: 700, fontSize: 18, color: "#00d492", marginBottom: 4,
              }}>Potential match found!</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
                Opening verification chat…
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(255,200,0,.12)",
                border: "2px solid rgba(255,200,0,.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                </svg>
              </div>
              <p style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontWeight: 700, fontSize: 18, color: "#fbbf24", marginBottom: 4,
              }}>No exact match yet</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
                Opening help chat to gather more details…
              </p>
            </>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        width: 280, height: 3, background: "rgba(255,255,255,.1)", borderRadius: 2,
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: done
            ? (hasMatch ? "linear-gradient(90deg,#006341,#00d492)" : "linear-gradient(90deg,#ca8a04,#fbbf24)")
            : "linear-gradient(90deg,#006341,#00d492)",
          width: `${progress}%`,
          transition: "width .1s linear, background .5s",
        }} />
      </div>

      <style>{`
        @keyframes radarPulse {
          0%   { transform: scale(.7); opacity: .9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
