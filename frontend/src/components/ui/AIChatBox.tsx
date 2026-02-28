// src/components/ui/AIChatBox.tsx
// Animated AI chat popup — slides up after match/no-match
// Asks clarifying questions, shows score progress, handles conflict mode

import { useState, useEffect, useRef, useCallback } from "react";
import { chatGetNextQuestion, chatSubmitAnswer } from "../../lib/api";

interface Props {
  sessionId:    string;
  initialScore: number;
  hasMatch:     boolean;         // true = ≥80% match found, false = helping improve score
  riderName:    string;
  onDone: (result: { status: "completed" | "no_match" | "conflict" }) => void;
}

type Message = { role: "assistant" | "user"; text: string; ts: number };

const T = {
  green:  "#006341",
  teal:   "#00d492",
  navy:   "#0c1825",
  navyL:  "#162231",
  border: "rgba(255,255,255,.1)",
  muted:  "rgba(255,255,255,.45)",
  white:  "#fff",
};

function ScoreBar({ score, isConflict }: { score: number; isConflict: boolean }) {
  const pct    = Math.round(score * 100);
  const colour = isConflict ? "#f59e0b" : score >= 0.8 ? T.teal : score >= 0.6 ? "#60a5fa" : T.muted;
  return (
    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, color: T.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {isConflict ? "CONFLICT — Escalated verification" : "Match confidence"}
        </span>
        <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, color: colour, fontWeight: 700 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${pct}%`,
          background: colour,
          transition: "width .6s ease, background .4s",
        }} />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: T.teal,
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function AIChatBox({ sessionId, initialScore, hasMatch, riderName, onDone }: Props) {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [inputVal,   setInputVal]   = useState("");
  const [busy,       setBusy]       = useState(false);
  const [typing,     setTyping]     = useState(false);
  const [score,      setScore]      = useState(initialScore);
  const [isConflict, setIsConflict] = useState(false);
  const [questionsLeft, setQLeft]   = useState(6);
  const [visible,    setVisible]    = useState(false);
  const [phase,      setPhase]      = useState<"intro" | "chatting" | "done">("intro");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  // Slide in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Load first question after slide-in
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => fetchNextQuestion(), 600);
    return () => clearTimeout(t);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollToBottom(); }, [messages, typing, scrollToBottom]);

  async function fetchNextQuestion() {
    setTyping(true);
    try {
      const res = await chatGetNextQuestion(sessionId);
      setTyping(false);
      if (res.done) {
        setPhase("done");
        const finalStatus = (res.status as "completed" | "no_match" | "conflict") ?? "no_match";
        onDone({ status: finalStatus });
        return;
      }
      addMsg("assistant", res.question ?? "Could you tell us more about the item?");
      setPhase("chatting");
    } catch {
      setTyping(false);
      addMsg("assistant", "Sorry, I'm having trouble connecting. Your report has been saved.");
    }
  }

  function addMsg(role: "assistant" | "user", text: string) {
    setMessages(m => [...m, { role, text, ts: Date.now() }]);
  }

  async function handleSend() {
    const txt = inputVal.trim();
    if (!txt || busy) return;
    setInputVal("");
    addMsg("user", txt);
    setBusy(true);
    try {
      const res = await chatSubmitAnswer(sessionId, txt);
      setScore(res.currentScore ?? score);
      if (res.conflictDetected) setIsConflict(true);
      if (res.matchFound || res.status === "completed" || res.status === "no_match") {
        // short pause then get next (which may return done)
        setTimeout(() => { setBusy(false); fetchNextQuestion(); }, 400);
      } else {
        setBusy(false);
        fetchNextQuestion();
      }
      setQLeft(q => Math.max(0, q - 1));
    } catch {
      setBusy(false);
      addMsg("assistant", "I couldn't process that. Please try again.");
    }
  }

  const introMsg = hasMatch
    ? `Hi ${riderName.split(" ")[0]}, we may have found a match for your item! I just need to ask a few quick questions to verify it's yours.`
    : `Hi ${riderName.split(" ")[0]}! I'm going to ask you a few questions to help us find your item in our database. The more detail you give, the better our chances.`;

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); }
          40%         { transform: translateY(-6px); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)",
        opacity: visible ? 1 : 0, transition: "opacity .4s",
      }} />

      {/* Chat window */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 901,
        maxWidth: 520,
        margin: "0 auto",
        transform: visible ? "translateY(0)" : "translateY(100px)",
        opacity: visible ? 1 : 0,
        transition: "transform .45s cubic-bezier(.22,.87,.35,1), opacity .3s",
      }}>
        <div style={{
          background: T.navyL,
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${T.border}`,
          borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "82vh",
        }}>
          {/* Header */}
          <div style={{
            background: T.navy,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9,
              background: T.green,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>GO</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 13, color: T.white, marginBottom: 1 }}>
                GO Transit — Lost & Found Assistant
              </p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>
                {isConflict
                  ? "Conflict detected — enhanced verification required"
                  : hasMatch
                  ? "Verifying potential match"
                  : "Gathering details to search"}
              </p>
            </div>
            {/* Live dot */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: T.teal,
              boxShadow: `0 0 0 3px rgba(0,212,146,.2)`,
              animation: "bounce 2s ease infinite",
            }} />
          </div>

          {/* Score bar (only show once chatting started) */}
          {phase === "chatting" && (
            <ScoreBar score={score} isConflict={isConflict} />
          )}

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 160,
            maxHeight: 340,
          }}>
            {/* Intro bubble */}
            {visible && (
              <div style={{ animation: "msgIn .35s ease", display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6, background: T.green,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 9, color: "#fff" }}>GO</span>
                </div>
                <div style={{
                  background: "rgba(255,255,255,.07)", borderRadius: "16px 16px 16px 4px",
                  padding: "10px 14px", maxWidth: "82%",
                }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.white, lineHeight: 1.55 }}>
                    {introMsg}
                  </p>
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((m, i) => (
              <div key={i} style={{
                animation: "msgIn .3s ease",
                display: "flex",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
                gap: 8,
                alignItems: "flex-end",
              }}>
                {m.role === "assistant" && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, background: T.green,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 9, color: "#fff" }}>GO</span>
                  </div>
                )}
                <div style={{
                  background: m.role === "assistant"
                    ? "rgba(255,255,255,.07)"
                    : `linear-gradient(135deg,${T.green},#00835a)`,
                  borderRadius: m.role === "assistant"
                    ? "16px 16px 16px 4px"
                    : "16px 16px 4px 16px",
                  padding: "10px 14px",
                  maxWidth: "82%",
                }}>
                  <p style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 13,
                    color: T.white, lineHeight: 1.55, margin: 0,
                  }}>
                    {m.text}
                  </p>
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", animation: "msgIn .25s ease" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6, background: T.green,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 9, color: "#fff" }}>GO</span>
                </div>
                <div style={{
                  background: "rgba(255,255,255,.07)",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "4px 6px",
                }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {phase !== "done" && (
            <div style={{
              padding: "12px 14px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              gap: 10,
              background: T.navy,
            }}>
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                disabled={busy || typing}
                placeholder={busy || typing ? "Processing…" : "Type your reply…"}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,.07)",
                  border: `1px solid ${inputVal ? T.green : T.border}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 13,
                  color: T.white,
                  outline: "none",
                  caretColor: T.teal,
                  transition: "border-color .2s",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputVal.trim() || busy || typing}
                style={{
                  width: 42, height: 42,
                  borderRadius: 12,
                  background: inputVal.trim() ? T.green : "rgba(255,255,255,.08)",
                  border: "none",
                  cursor: inputVal.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .2s",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.white} strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          )}

          {/* Questions remaining hint */}
          {phase === "chatting" && questionsLeft > 1 && (
            <p style={{
              textAlign: "center",
              fontFamily: "'Inter',sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,.2)",
              padding: "0 16px 14px",
              background: T.navy,
            }}>
              Up to {questionsLeft} question{questionsLeft !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
      </div>
    </>
  );
}
