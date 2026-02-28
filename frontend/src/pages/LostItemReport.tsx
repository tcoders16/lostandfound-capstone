// src/pages/LostItemReport.tsx
// IMPORTANT: All step sub-components are defined OUTSIDE this component
// to prevent remount-on-every-keystroke (the classic inner-function React trap).

import { useState, useCallback, memo, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/ui/AppShell";
import SearchingOverlay from "../components/ui/SearchingOverlay";
import AIChatBox from "../components/ui/AIChatBox";
import { submitLostItemReport } from "../lib/api";

/* ── constants (stable references, never recreated) ──────────────── */
const GO_STATIONS = [
  "Aldershot GO","Appleby GO","Aurora GO","Barrie South GO","Bloor GO",
  "Bramalea GO","Brampton GO","Bradford GO","Burlington GO","Clarkson GO",
  "Cooksville GO","Danforth GO","Don Mills GO","Downsview Park GO",
  "East Gwillimbury GO","Etobicoke North GO","Exhibition GO","Guildwood GO",
  "Hamilton GO","King City GO","Kitchener GO","Long Branch GO","Maple GO",
  "Markham GO","Milliken GO","Milton GO","Mimico GO","Mississauga GO",
  "Newmarket GO","Niagara Falls GO","Oakville GO","Oshawa GO","Pickering GO",
  "Port Credit GO","Richmond Hill GO","Rouge Hill GO","Rutherford GO",
  "Scarborough GO","Stouffville GO","Unionville GO","Union Station GO",
  "Whitby GO","Woodbridge GO","Other / Not listed",
];

type Cat = { value: string; label: string; hint: string };
const CATS: Cat[] = [
  { value:"electronics", label:"Electronics",  hint:"Phone, laptop, tablet, earbuds…" },
  { value:"clothing",    label:"Clothing",     hint:"Jacket, bag, hat, shoes…" },
  { value:"accessory",   label:"Accessory",    hint:"Wallet, keys, glasses, jewellery…" },
  { value:"document",    label:"Documents",    hint:"ID, passport, transit card…" },
  { value:"other",       label:"Other",        hint:"Anything that doesn't fit above" },
];

export type Step = "what" | "where" | "contact" | "searching" | "chat" | "manual" | "done";

/* ── shared tiny components ───────────────────────────────────────── */
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required && <span style={{ color:"var(--red)", marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StepBar({ current }: { current: Step }) {
  const steps = [
    { k:"what" as Step,    l:"What" },
    { k:"where" as Step,   l:"Where & When" },
    { k:"contact" as Step, l:"Contact" },
  ];
  const displayStep: Step = (["searching","chat","manual","done"] as Step[]).includes(current) ? "contact" : current;
  const idx = steps.findIndex(s => s.k === displayStep);
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
      {steps.map((s, i) => (
        <div key={s.k} style={{ display:"flex", alignItems:"center", flex:i<steps.length-1?1:"none" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{
              width:30, height:30, borderRadius:"50%",
              background:i<=idx?"var(--green)":"var(--surface-2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background .2s",
            }}>
              {i<idx
                ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                : <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:12, color:i<=idx?"#fff":"var(--text-light)" }}>{i+1}</span>
              }
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:11, marginTop:5, whiteSpace:"nowrap", color:i<=idx?"var(--navy)":"var(--text-light)" }}>
              {s.l}
            </span>
          </div>
          {i<steps.length-1 && (
            <div style={{ flex:1, height:2, margin:"0 8px", marginBottom:18, background:i<idx?"var(--green)":"var(--border)", transition:"background .2s" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP COMPONENTS — defined at MODULE level so React never remounts
   them due to a parent re-render. Props carry all needed state.
═══════════════════════════════════════════════════════════════════ */

interface WhatProps {
  category:    string;
  setCategory: (v: string) => void;
  desc:        string;
  setDesc:     (v: string) => void;
  onNext:      () => void;
}
const StepWhat = memo(function StepWhat({ category, setCategory, desc, setDesc, onNext }: WhatProps) {
  const wordCount = desc.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="fade-up">
      <StepBar current="what" />
      <h2 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:22, color:"var(--navy)", marginBottom:6 }}>
        What did you lose?
      </h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"var(--text-muted)", marginBottom:28 }}>
        Select a category and describe the item. The more detail you give, the faster our AI finds it.
        There is no limit — write as much as you can.
      </p>

      <p className="field-label" style={{ marginBottom:12 }}>Category</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:10, marginBottom:24 }}>
        {CATS.map(c => (
          <button key={c.value} type="button" onClick={() => setCategory(c.value)}
            style={{
              background:"var(--white)", borderRadius:10, padding:"14px 16px",
              border:`1.5px solid ${category===c.value?"var(--green)":"var(--border)"}`,
              boxShadow:category===c.value?"0 0 0 3px rgba(0,99,65,.1)":"none",
              cursor:"pointer", textAlign:"left",
              transition:"border-color .15s,box-shadow .15s",
            }}>
            <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:600, fontSize:13, color:"var(--navy)", marginBottom:3 }}>{c.label}</p>
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:"var(--text-muted)" }}>{c.hint}</p>
          </button>
        ))}
      </div>

      <Field label="Description" required>
        <textarea
          rows={5}
          className="field-input"
          style={{ resize:"vertical", fontFamily:"'Inter',sans-serif", minHeight:120 }}
          placeholder={"Describe your item: colour, brand, model, any unique markings, damage, serial/engraving, what was inside, and where you last had it.\n\nExample: Black Sony WH-1000XM4 headphones, scratch on right ear cup, red cable attached, soft case with GO Transit tag, lost near Oakville GO on Feb 12."}
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <p style={{ fontFamily:"'Inter',sans-serif", fontSize:11, marginTop:5, color:wordCount>=10?"var(--green)":"var(--text-light)" }}>
          {wordCount} words — minimum 10, no maximum. More detail = better matches.
        </p>
      </Field>

      <div style={{ marginTop:24 }}>
        <button type="button" disabled={!category||wordCount<10} onClick={onNext}
          className="btn btn-primary" style={{ opacity:(!category||wordCount<10)?0.45:1 }}>
          Continue
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

interface WhereProps {
  station:    string;
  setStation: (v: string) => void;
  lostDate:   string;
  setLostDate:(v: string) => void;
  onBack:     () => void;
  onNext:     () => void;
}
const StepWhere = memo(function StepWhere({ station, setStation, lostDate, setLostDate, onBack, onNext }: WhereProps) {
  return (
    <div className="fade-up">
      <StepBar current="where" />
      <h2 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:22, color:"var(--navy)", marginBottom:6 }}>
        Where and when?
      </h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"var(--text-muted)", marginBottom:28 }}>
        Select the GO station or route where you last had the item.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <Field label="Station / Location">
          <select className="field-input" value={station} onChange={e => setStation(e.target.value)} style={{ fontFamily:"'Inter',sans-serif" }}>
            <option value="">— Select a station —</option>
            {GO_STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Approximate Date Lost">
          <input type="date" className="field-input"
            max={new Date().toISOString().split("T")[0]}
            value={lostDate} onChange={e => setLostDate(e.target.value)} />
        </Field>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <button type="button" onClick={onBack} className="btn btn-ghost">Back</button>
        <button type="button" onClick={onNext} className="btn btn-primary">
          Continue
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

interface ContactProps {
  name:       string; setName:    (v: string) => void;
  phone:      string; setPhone:   (v: string) => void;
  email:      string; setEmail:   (v: string) => void;
  address:    string; setAddress: (v: string) => void;
  category:   string;
  desc:       string;
  station:    string;
  lostDate:   string;
  busy:       boolean;
  err:        string;
  onBack:     () => void;
  onSubmit:   (e: FormEvent) => void;
}
const StepContact = memo(function StepContact(p: ContactProps) {
  return (
    <form onSubmit={p.onSubmit} className="fade-up">
      <StepBar current="contact" />
      <h2 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:22, color:"var(--navy)", marginBottom:6 }}>
        Your contact details
      </h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"var(--text-muted)", marginBottom:28 }}>
        We'll reach out if we find a match. Your information is kept private.
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Field label="Full Name" required>
          <input className="field-input" placeholder="Jane Smith" value={p.name} onChange={e=>p.setName(e.target.value)} required/>
        </Field>
        <Field label="Phone Number" required>
          <input type="tel" className="field-input" placeholder="416-555-0100" value={p.phone} onChange={e=>p.setPhone(e.target.value)} required/>
        </Field>
        <Field label="Email Address">
          <input type="email" className="field-input" placeholder="jane@example.com" value={p.email} onChange={e=>p.setEmail(e.target.value)}/>
        </Field>
        <Field label="Mailing Address">
          <input className="field-input" placeholder="123 Main St, Toronto, ON" value={p.address} onChange={e=>p.setAddress(e.target.value)}/>
        </Field>
      </div>

      {/* Summary */}
      <div style={{ background:"var(--green-light)", border:"1px solid #c3e2d4", borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
        <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:600, fontSize:11, letterSpacing:".06em", textTransform:"uppercase", color:"var(--green)", marginBottom:8 }}>
          Report Summary
        </p>
        <p style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14, color:"var(--navy)", marginBottom:4 }}>
          <span style={{ textTransform:"capitalize" }}>{p.category}</span> — {p.desc}
        </p>
        {p.station  && <p style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"var(--text-muted)" }}>Location: {p.station}</p>}
        {p.lostDate && <p style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"var(--text-muted)" }}>
          Date: {new Date(p.lostDate+"T12:00:00").toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})}
        </p>}
      </div>

      {/* AI notice */}
      <div style={{ background:"#f0f4ff", border:"1px solid #c7d2fe", borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2} style={{flexShrink:0,marginTop:1}}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <p style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:"#3730a3", lineHeight:1.5 }}>
          After submitting, our AI will instantly search every found item on the GO network. A short verification chat will open if a potential match is found.
        </p>
      </div>

      {p.err && (
        <div style={{ background:"#fde8e8", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
          <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"var(--red)" }}>{p.err}</p>
        </div>
      )}

      <div style={{ display:"flex", gap:12 }}>
        <button type="button" onClick={p.onBack} className="btn btn-ghost">Back</button>
        <button type="submit" disabled={p.busy} className="btn btn-primary" style={{ flex:1, maxWidth:280 }}>
          {p.busy ? "Submitting…" : "Submit & Search Now"}
        </button>
      </div>
    </form>
  );
});

/* ── Done ─────────────────────────────────────────────────────────── */
function StepDone({ claimId, email }: { claimId: string; email: string }) {
  return (
    <div style={{ textAlign:"center", padding:"16px 0 8px" }} className="fade-up">
      <div style={{ width:72,height:72,borderRadius:"50%",background:"var(--green-light)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px" }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#006341" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:24, color:"var(--navy)", marginBottom:6 }}>
        Match Under Review
      </h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"var(--text-muted)", marginBottom:4 }}>Reference number:</p>
      <code style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:13, fontWeight:600, color:"var(--green)", background:"var(--green-light)", padding:"4px 12px", borderRadius:6 }}>
        {claimId}
      </code>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"var(--text-muted)", maxWidth:400, margin:"20px auto 0" }}>
        Our team is reviewing the potential match. If confirmed, you'll receive{email?` an email at ${email}`:" a call"} within 48 hours.
      </p>
      <div style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:14, padding:"20px 24px", maxWidth:420, margin:"28px auto", textAlign:"left" }}>
        <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:600, fontSize:12, letterSpacing:".06em", textTransform:"uppercase", color:"var(--text-light)", marginBottom:16 }}>
          What happens next
        </p>
        {["Staff reviews the AI-matched item within 2 business days","You'll receive a call or email confirming the match","Bring valid government photo ID to collect your item","Items are held for 30 days at the GO Transit Lost & Found office"].map((t,i)=>(
          <div key={i} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
            <div style={{ width:22,height:22,borderRadius:"50%",background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
              <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:11, color:"#fff" }}>{i+1}</span>
            </div>
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"var(--text-muted)", lineHeight:1.5 }}>{t}</p>
          </div>
        ))}
      </div>
      <Link to="/" className="btn btn-primary">Back to Home</Link>
    </div>
  );
}

/* ── Manual (no match) ────────────────────────────────────────────── */
function StepManual({ claimId }: { claimId: string }) {
  return (
    <div style={{ textAlign:"center", padding:"16px 0 8px" }} className="fade-up">
      <div style={{ width:72,height:72,borderRadius:"50%",background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px" }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d97706" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      <h2 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:24, color:"var(--navy)", marginBottom:6 }}>
        No Automatic Match Found
      </h2>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"var(--text-muted)", marginBottom:4 }}>Reference number:</p>
      <code style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:13, fontWeight:600, color:"#d97706", background:"#fef3c7", padding:"4px 12px", borderRadius:6 }}>
        {claimId}
      </code>
      <div style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:14, padding:"20px 24px", maxWidth:440, margin:"24px auto", textAlign:"left" }}>
        <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:600, fontSize:12, letterSpacing:".06em", textTransform:"uppercase", color:"var(--text-light)", marginBottom:14 }}>
          Your report is active
        </p>
        {["Our staff will manually review all incoming found items for the next 30 days","You will be notified immediately if a match appears","New found items are added daily — your chances improve over time","Bring valid government photo ID when collecting your item"].map((t,i)=>(
          <div key={i} style={{ display:"flex", gap:12, marginBottom:10, alignItems:"flex-start" }}>
            <div style={{ width:22,height:22,borderRadius:"50%",background:"#fef3c7",border:"1px solid #fde68a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
              <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:11, color:"#d97706" }}>{i+1}</span>
            </div>
            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"var(--text-muted)", lineHeight:1.5 }}>{t}</p>
          </div>
        ))}
      </div>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>
        Need to report differently?{" "}
        <a href="tel:18886386646" style={{ color:"var(--green)", textDecoration:"underline" }}>Call 1-888-GET-ON-GO</a>
      </p>
      <Link to="/" className="btn btn-primary">Back to Home</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE — thin orchestrator, only manages state
═══════════════════════════════════════════════════════════════════ */
export default function LostItemReport() {
  const [step,      setStep]      = useState<Step>("what");
  const [category,  setCategory]  = useState("");
  const [desc,      setDesc]      = useState("");
  const [station,   setStation]   = useState("");
  const [lostDate,  setLostDate]  = useState("");
  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");
  const [address,   setAddress]   = useState("");
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState("");
  const [claimId,   setClaimId]   = useState("");
  const [sessionId,    setSessionId]    = useState("");
  const [initialScore, setInitialScore] = useState(0);
  const [hasMatch,     setHasMatch]     = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await submitLostItemReport({
        description:  `[${category}] ${desc}`,
        locationName: station   || undefined,
        name, phone,
        email:   email   || undefined,
        address: address || undefined,
      });
      setClaimId(res.claimId);
      setSessionId(res.sessionId   || "");
      setInitialScore(res.initialScore ?? 0);
      setHasMatch(res.hasMatch     ?? false);
      setStep("searching");
    } catch (ex: any) {
      setErr(ex.message || "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [category, desc, station, name, phone, email, address]);

  const onSearchComplete = useCallback((r: { hasMatch: boolean; sessionId: string; initialScore: number }) => {
    setHasMatch(r.hasMatch);
    setSessionId(r.sessionId);
    setInitialScore(r.initialScore);
    // Only open the AI verification chat when a ≥80% match was found.
    // If no match → skip chat entirely and go straight to the manual queue.
    if (r.hasMatch) {
      setStep("chat");
    } else {
      setStep("manual");
    }
  }, []);

  const onChatDone = useCallback((r: { status: string }) => {
    setStep(r.status === "completed" || r.status === "conflict" ? "done" : "manual");
  }, []);

  const goWhat    = useCallback(() => setStep("what"),    []);
  const goWhere   = useCallback(() => setStep("where"),   []);
  const goContact = useCallback(() => setStep("contact"), []);

  const isOverlay = step === "searching" || step === "chat";

  return (
    <>
      {step === "searching" && (
        <SearchingOverlay
          sessionId={sessionId}
          initialScore={initialScore}
          hasMatch={hasMatch}
          onComplete={onSearchComplete}
        />
      )}

      {step === "chat" && sessionId && (
        <AIChatBox
          sessionId={sessionId}
          initialScore={initialScore}
          hasMatch={hasMatch}
          riderName={name}
          onDone={onChatDone}
        />
      )}

      <AppShell>
        <div style={{ background:"var(--navy)", paddingBottom:isOverlay?"1.5rem":"3rem" }}>
          <div className="page-container" style={{ padding:"56px 1.5rem 0" }}>
            {!["done","manual"].includes(step) ? (
              <>
                <h1 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:30, color:"#fff", marginBottom:8 }}>
                  Report a Lost Item
                </h1>
                <p style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:"rgba(255,255,255,.55)" }}>
                  File a report and our AI will instantly search the entire GO network for a match.
                </p>
              </>
            ) : (
              <h1 style={{ fontFamily:"'Chakra Petch',sans-serif", fontWeight:700, fontSize:26, color:"#fff" }}>
                {step==="done" ? "Report Confirmed" : "Report Filed"}
              </h1>
            )}
          </div>
        </div>

        {!isOverlay && (
          <div className="page-container" style={{ padding:"0 1.5rem 48px" }}>
            <div style={{
              background:"var(--white)", border:"1px solid var(--border)",
              borderRadius:18, padding:"36px 40px",
              maxWidth:680, margin:"-24px auto 0",
              boxShadow:"0 8px 32px rgba(0,0,0,.07)",
            }}>
              {step === "what" && (
                <StepWhat
                  category={category} setCategory={setCategory}
                  desc={desc}         setDesc={setDesc}
                  onNext={goWhere}
                />
              )}
              {step === "where" && (
                <StepWhere
                  station={station}   setStation={setStation}
                  lostDate={lostDate} setLostDate={setLostDate}
                  onBack={goWhat}     onNext={goContact}
                />
              )}
              {step === "contact" && (
                <StepContact
                  name={name}       setName={setName}
                  phone={phone}     setPhone={setPhone}
                  email={email}     setEmail={setEmail}
                  address={address} setAddress={setAddress}
                  category={category} desc={desc}
                  station={station} lostDate={lostDate}
                  busy={busy} err={err}
                  onBack={goWhere} onSubmit={handleSubmit}
                />
              )}
              {step === "done"   && <StepDone   claimId={claimId} email={email} />}
              {step === "manual" && <StepManual claimId={claimId} />}
            </div>

            {!["done","manual"].includes(step) && (
              <p style={{ textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:12, color:"var(--text-light)", marginTop:20 }}>
                Need help? Call{" "}
                <a href="tel:18886386646" style={{ color:"var(--text-muted)", textDecoration:"underline" }}>1-888-GET-ON-GO</a>
                {" "}· Mon–Fri, 8 AM–6 PM EST
              </p>
            )}
          </div>
        )}

        {isOverlay && <div style={{ minHeight:"60vh", background:"var(--surface)" }} />}
      </AppShell>
    </>
  );
}
