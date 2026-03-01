// src/components/ui/AIChatBox.tsx
// Animated AI chat popup — slides up after match found
// Asks 3-8 clarifying questions, shows live confidence bar, then displays
// a green "Verification Complete" ticket when the session is done.

import { useState, useEffect, useRef, useCallback } from "react";
import { chatGetNextQuestion, chatSubmitAnswer, chatCancelSession } from "../../lib/api";

interface Props {
  sessionId:    string;
  claimId:      string;       // reference number shown on completion ticket
  initialScore: number;
  hasMatch:     boolean;
  riderName:    string;
  onDone: (result: { status: "completed" | "no_match" | "conflict" | "cancelled"; ticketRef?: string }) => void;
}

type Message = { role: "assistant" | "user"; text: string; ts: number };
type Phase   = "intro" | "chatting" | "verified" | "no_match" | "done";

/* ── Design tokens ─────────────────────────────────────────────────── */
const T = {
  green:  "#006341",
  teal:   "#00d492",
  navy:   "#0c1825",
  navyL:  "#162231",
  border: "rgba(255,255,255,.1)",
  muted:  "rgba(255,255,255,.45)",
  white:  "#fff",
};

/* ── GO avatar bubble ──────────────────────────────────────────────── */
function GoBubble() {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 6,
      background: T.green,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 9, color: "#fff" }}>GO</span>
    </div>
  );
}

// NOTE: ScoreBar intentionally removed — confidence % is internal/admin-only.
// Riders only see a subtle step indicator, not the AI score.

/* ── Subtle step progress dots (rider-visible, no numbers) ─────────── */
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{
      padding: "10px 16px 8px",
      borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: T.muted, flex: 1 }}>
        Verifying your item
      </span>
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i < current ? 18 : 7,
            height: 7, borderRadius: 4,
            background: i < current ? T.teal : "rgba(255,255,255,.15)",
            transition: "all .4s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Typing indicator ──────────────────────────────────────────────── */
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

/* ── Green "Verified" completion panel ─────────────────────────────── */
function VerifiedPanel({
  claimId,
  ticketRef,
  score,
  onDone,
}: {
  claimId: string;
  ticketRef: string;
  score: number;
  onDone: () => void;
}) {
  const pct = Math.round(score * 100);
  const ref = ticketRef || claimId;

  return (
    <div style={{
      flex: 1, overflowY: "auto",
      padding: "28px 24px 28px",
      display: "flex", flexDirection: "column", alignItems: "center",
      animation: "msgIn .5s ease",
      background: T.navyL,
    }}>
      {/* Animated checkmark ring */}
      <div style={{
        width: 76, height: 76, borderRadius: "50%",
        background: "linear-gradient(135deg, #006341 0%, #00d492 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18,
        animation: "pulse 2.5s ease infinite",
      }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 17, color: T.white, letterSpacing: ".02em", marginBottom: 6, textAlign: "center" }}>
        Verification Complete!
      </p>
      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.muted, textAlign: "center", marginBottom: 20, maxWidth: 300, lineHeight: 1.6 }}>
        Your answers have been recorded. Our staff will confirm your match within 48 hours.
      </p>

      {/* Confidence badge */}
      <div style={{
        background: "rgba(0,212,146,.08)", border: "1px solid rgba(0,212,146,.25)",
        borderRadius: 10, padding: "10px 20px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, background: "rgba(0,212,146,.12)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 13, color: T.teal }}>{pct}%</span>
        </div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
          Match confidence achieved
        </p>
      </div>

      {/* Ticket reference */}
      <div style={{
        background: "rgba(255,255,255,.04)", border: `1px solid ${T.border}`,
        borderRadius: 12, padding: "14px 20px", width: "100%", maxWidth: 360, marginBottom: 20,
      }}>
        <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontSize: 10, color: T.muted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
          Pending Ticket Reference
        </p>
        <div style={{
          background: "rgba(0,99,65,.15)", border: "1px solid rgba(0,99,65,.4)",
          borderRadius: 8, padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <code style={{
            fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, fontWeight: 700,
            color: T.teal, letterSpacing: ".04em", wordBreak: "break-all",
          }}>
            {ref}
          </code>
          <button
            title="Copy"
            onClick={() => navigator.clipboard?.writeText(ref).catch(() => {})}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.teal} strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 8, lineHeight: 1.5 }}>
          Save this — you'll need it when collecting your item.
        </p>
      </div>

      {/* What happens next */}
      <div style={{ width: "100%", maxWidth: 360, marginBottom: 22 }}>
        {[
          "Staff reviews the AI-matched item within 2 business days",
          "You'll receive a call or email confirming the match",
          "Bring valid government photo ID + this reference to collect",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: T.green, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 10, color: "#fff" }}>{i + 1}</span>
            </div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.muted, lineHeight: 1.55, margin: 0 }}>{t}</p>
          </div>
        ))}
      </div>

      {/* Done button */}
      <button
        onClick={onDone}
        style={{
          width: "100%", maxWidth: 360, padding: "13px 0",
          background: `linear-gradient(135deg, ${T.green} 0%, #00835a 100%)`,
          border: "none", borderRadius: 12,
          fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 14,
          color: "#fff", letterSpacing: ".04em", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,99,65,.4)",
        }}
      >
        Got it — View Confirmation
      </button>
    </div>
  );
}

/* ── No-match panel ────────────────────────────────────────────────── */
function NoMatchPanel({ claimId, onDone }: { claimId: string; onDone: () => void }) {
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "28px 24px 24px",
      display: "flex", flexDirection: "column", alignItems: "center",
      animation: "msgIn .5s ease", background: T.navyL,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "rgba(245,158,11,.12)", border: "2px solid rgba(245,158,11,.3)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 16, color: T.white, marginBottom: 8 }}>
        Filed for Manual Review
      </p>
      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.muted, textAlign: "center", maxWidth: 300, lineHeight: 1.6, marginBottom: 16 }}>
        No automatic confirmation — your report is active and staff review all incoming items daily.
      </p>
      <code style={{
        fontFamily: "'Chakra Petch',sans-serif", fontSize: 12, fontWeight: 600,
        color: "#f59e0b", background: "rgba(245,158,11,.1)",
        border: "1px solid rgba(245,158,11,.25)", borderRadius: 8,
        padding: "8px 16px", marginBottom: 22, display: "block", wordBreak: "break-all",
      }}>
        {claimId}
      </code>
      <button
        onClick={onDone}
        style={{
          width: "100%", maxWidth: 320, padding: "12px 0",
          background: "rgba(255,255,255,.07)", border: `1px solid ${T.border}`,
          borderRadius: 12, fontFamily: "'Chakra Petch',sans-serif",
          fontWeight: 700, fontSize: 13, color: T.white, cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function AIChatBox({ sessionId, claimId, initialScore, hasMatch, riderName, onDone }: Props) {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [inputVal,   setInputVal]   = useState("");
  const [busy,       setBusy]       = useState(false);
  const [typing,     setTyping]     = useState(false);
  const [score,      setScore]      = useState(initialScore);
  const [isConflict, setIsConflict] = useState(false);
  const [questionsLeft, setQLeft]   = useState(hasMatch ? 5 : 6);
  const [visible,    setVisible]    = useState(false);
  const [phase,      setPhase]      = useState<Phase>("intro");
  const [ticketRef,  setTicketRef]  = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  // Slide-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Load first question after slide-in animation completes
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => fetchNextQuestion(), 650);
    return () => clearTimeout(t);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollToBottom(); }, [messages, typing, scrollToBottom]);

  function addMsg(role: "assistant" | "user", text: string) {
    setMessages(m => [...m, { role, text, ts: Date.now() }]);
  }

  async function fetchNextQuestion() {
    setTyping(true);
    try {
      const res = await chatGetNextQuestion(sessionId);
      setTyping(false);
      if (res.done) {
        const ref = res.ticketRef ?? claimId;
        setTicketRef(ref);
        if (res.status === "completed" || res.status === "conflict") {
          setPhase("verified");
        } else {
          setPhase("no_match");
        }
        return;
      }
      addMsg("assistant", res.question ?? "Could you tell us more about the item?");
      setPhase("chatting");
    } catch (err) {
      setTyping(false);
      console.error("[AIChatBox] fetchNextQuestion error:", err);
      // Graceful fallback — keep the chat open, don't crash with "trouble connecting"
      addMsg("assistant", "Could you describe any unique markings or features on the item?");
      setPhase("chatting");
    }
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
      setQLeft(q => Math.max(0, q - 1));
      setTimeout(() => { setBusy(false); fetchNextQuestion(); }, 350);
    } catch (err) {
      console.error("[AIChatBox] submitAnswer error:", err);
      setBusy(false);
      addMsg("assistant", "I couldn't process that. Please try again.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleCancel() {
    chatCancelSession(sessionId).catch(() => {});
    onDone({ status: "cancelled" });
  }

  const introMsg = hasMatch
    ? `Hi ${riderName.split(" ")[0]}, we may have found a match for your item! I just need to ask a few quick questions to verify it's yours.`
    : `Hi ${riderName.split(" ")[0]}! I'll ask you a few questions to help locate your item. More detail = better chances.`;

  const showChat  = phase === "intro" || phase === "chatting";
  const showInput = showChat;

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); }
          40%         { transform: translateY(-6px); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 8px rgba(0,212,146,.15),0 0 0 20px rgba(0,212,146,.06); }
          50%     { box-shadow: 0 0 0 14px rgba(0,212,146,.22),0 0 0 28px rgba(0,212,146,.08); }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,.6)",
        backdropFilter: "blur(5px)",
        opacity: visible ? 1 : 0, transition: "opacity .4s",
      }} />

      {/* Chat window */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 901,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px", pointerEvents: "none",
      }}>
        <div style={{
          background: T.navyL,
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${T.border}`,
          borderBottom: "none",
          boxShadow: "0 -8px 48px rgba(0,0,0,.55)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          maxHeight: "88vh",
          width: "min(520px, 100%)",
          pointerEvents: "auto",
          transform: visible ? "translateY(0)" : "translateY(80px)",
          opacity: visible ? 1 : 0,
          transition: "transform .45s cubic-bezier(.22,.87,.35,1), opacity .3s",
        }}>

          {/* ── Header ── */}
          <div style={{
            background: T.navy, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9, background: T.green, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>GO</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Chakra Petch',sans-serif", fontWeight: 700, fontSize: 13, color: T.white, marginBottom: 1 }}>
                GO Transit — Lost & Found Assistant
              </p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.muted }}>
                {phase === "verified"
                  ? "✓ Verification complete — pending admin approval"
                  : phase === "no_match"
                  ? "Report filed for manual review"
                  : isConflict
                  ? "Conflict detected — enhanced verification required"
                  : hasMatch
                  ? "Verifying potential match"
                  : "Gathering details to search"}
              </p>
            </div>
            {showInput && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: T.teal,
                  boxShadow: `0 0 0 3px rgba(0,212,146,.2)`,
                  animation: "bounce 2s ease infinite",
                }} />
                <button
                  onClick={handleCancel}
                  style={{
                    background: "rgba(255,255,255,.06)", border: `1px solid ${T.border}`,
                    color: T.white, borderRadius: 999, padding: "6px 12px",
                    fontSize: 11, fontWeight: 700, letterSpacing: ".02em", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* ── Step progress dots (chatting only — no score shown to rider) ── */}
          {phase === "chatting" && (
            <StepDots
              total={hasMatch ? 5 : 6}
              current={(hasMatch ? 5 : 6) - questionsLeft}
            />
          )}

          {/* ── Verified panel ── */}
          {phase === "verified" && (
            <VerifiedPanel
              claimId={claimId}
              ticketRef={ticketRef || claimId}
              score={score}
              onDone={() => onDone({ status: "completed", ticketRef: ticketRef || claimId })}
            />
          )}

          {/* ── No-match panel ── */}
          {phase === "no_match" && (
            <NoMatchPanel
              claimId={claimId}
              onDone={() => onDone({ status: "no_match" })}
            />
          )}

          {/* ── Chat messages ── */}
          {showChat && (
            <div ref={scrollRef} style={{
              flex: 1, overflowY: "auto",
              padding: "16px 16px 8px",
              display: "flex", flexDirection: "column", gap: 10,
              minHeight: 160, maxHeight: 340,
            }}>
              {/* Intro bubble */}
              {visible && (
                <div style={{ animation: "msgIn .35s ease", display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <GoBubble />
                  <div style={{ background: "rgba(255,255,255,.07)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", maxWidth: "82%" }}>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.white, lineHeight: 1.55 }}>
                      {introMsg}
                    </p>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{
                  animation: "msgIn .3s ease",
                  display: "flex",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  gap: 8, alignItems: "flex-end",
                }}>
                  {m.role === "assistant" && <GoBubble />}
                  <div style={{
                    background: m.role === "assistant"
                      ? "rgba(255,255,255,.07)"
                      : `linear-gradient(135deg,${T.green},#00835a)`,
                    borderRadius: m.role === "assistant"
                      ? "16px 16px 16px 4px"
                      : "16px 16px 4px 16px",
                    padding: "10px 14px", maxWidth: "82%",
                  }}>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.white, lineHeight: 1.55, margin: 0 }}>
                      {m.text}
                    </p>
                  </div>
                </div>
              ))}

              {typing && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", animation: "msgIn .25s ease" }}>
                  <GoBubble />
                  <div style={{ background: "rgba(255,255,255,.07)", borderRadius: "16px 16px 16px 4px", padding: "4px 6px" }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Input bar ── */}
          {showInput && (
            <div style={{
              padding: "12px 14px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex", gap: 10,
              background: T.navy,
            }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={busy || typing}
                placeholder={busy || typing ? "Processing…" : "Type your reply…"}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,.07)",
                  border: `1px solid ${inputVal ? T.green : T.border}`,
                  borderRadius: 12, padding: "10px 14px",
                  fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.white,
                  outline: "none", caretColor: T.teal, transition: "border-color .2s",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputVal.trim() || busy || typing}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: inputVal.trim() ? T.green : "rgba(255,255,255,.08)",
                  border: "none", cursor: inputVal.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .2s", flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.white} strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── Questions remaining hint ── */}
          {phase === "chatting" && questionsLeft > 1 && (
            <p style={{
              textAlign: "center", fontFamily: "'Inter',sans-serif", fontSize: 10,
              color: "rgba(255,255,255,.2)", padding: "0 16px 14px",
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
