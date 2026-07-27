"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Candidate = {
  id: string;
  name: string;
  position: string;
  level: number;
  imageUrl: string | null;
  manifesto: string | null;
};

type Stage = "loading" | "login" | "ballot" | "submitting" | "success" | "inactive";

function getCandidateImageUrl(url: string | null) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `/api/candidates/image?key=${url}`;
}

export default function VotePage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [matricNumber, setMatricNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingStep, setIsSubmittingStep] = useState(false);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({}); // position -> candidateId | "abstain"
  const [receipt, setReceipt] = useState<string | null>(null);
  const [electionState, setElectionState] = useState<"upcoming" | "ongoing" | "ended">("upcoming");
  const [electionName, setElectionName] = useState("NACOSS FUTA Chapter Vote");

  // Redesign additions
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [showMobileReview, setShowMobileReview] = useState(false);
  const [copied, setCopied] = useState(false);

  // On load: check if already authenticated and election state
  useEffect(() => {
    async function checkSession() {
      try {
        const [sessionRes, stateRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/election-state"),
        ]);
        const sessionData = await sessionRes.json();
        const stateData = await stateRes.json();

        const state = stateData.state ?? "upcoming";
        setElectionState(state);
        if (stateData.electionName) setElectionName(stateData.electionName);

        if (state !== "ongoing") {
          setStage("inactive");
        } else {
          setStage(sessionData.authenticated ? "ballot" : "login");
          if (sessionData.authenticated && sessionData.matricNumber) {
            setMatricNumber(sessionData.matricNumber);
          }
        }
      } catch {
        setStage("inactive");
      }
    }
    checkSession();
  }, []);

  // Once in ballot stage, load candidates
  useEffect(() => {
    if (stage !== "ballot") return;
    async function loadCandidates() {
      try {
        const res = await fetch("/api/candidates");
        const data: Candidate[] = await res.json();
        setCandidates(data);
        const uniquePositions = Array.from(new Set(data.map((c) => c.position)));
        setPositions(uniquePositions);
      } catch (err) {
        console.error("Failed to load candidates:", err);
      }
    }
    loadCandidates();
  }, [stage]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmittingStep(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      setIsSubmittingStep(false);
      if (!res.ok) {
        setError(data.error ?? "Invalid Voting Code.");
        return;
      }
      setStage("ballot");
    } catch {
      setIsSubmittingStep(false);
      setError("A connection error occurred. Please try again.");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    setStage("login");
    setMatricNumber("");
    setPin("");
    setSelections({});
    setStepIndex(0);
    setError(null);
  }

  function setCandidateChoice(candidateId: string, choice: "yes" | "no") {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    setSelections((prev) => {
      const newSelections = { ...prev };
      if (choice === "yes") {
        newSelections[candidateId] = "yes";
        // Automatically set all other candidates in the same position to "no"
        candidates
          .filter((c) => c.position === candidate.position && c.id !== candidateId)
          .forEach((c) => {
            newSelections[c.id] = "no";
          });
      } else {
        newSelections[candidateId] = "no";
      }
      return newSelections;
    });
  }

  function selectCandidate(position: string, candidateId: string) {
    setCandidateChoice(candidateId, "yes");
  }

  async function handleSubmitBallot() {
    setError(null);

    // Make sure all candidates have been given a choice (either 'yes' or 'no')
    const incompletePosition = positions.find((pos) => {
      const posCandidates = candidates.filter((c) => c.position === pos);
      return !posCandidates.every((c) => selections[c.id] !== undefined);
    });

    if (incompletePosition) {
      setError(`Please complete selections (Yes or No) for all candidates in the "${incompletePosition}" position before submitting.`);
      return;
    }

    const votes = candidates.map((c) => ({
      candidateId: c.id,
      position: c.position,
      choice: selections[c.id] || "no",
    }));

    setStage("submitting");
    setShowMobileReview(false);

    try {
      const res = await fetch("/api/votes/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votes }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not cast your vote. Try again.");
        setStage("ballot");
        return;
      }

      setReceipt(data.receipt);
      setStage("success");
    } catch {
      setError("A network error occurred while casting your vote. Please try again.");
      setStage("ballot");
    }
  }

  const copyToClipboard = () => {
    if (!receipt) return;
    navigator.clipboard.writeText(receipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper for displaying candidate initials if image is missing
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (stage === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-surface relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex flex-col items-center space-y-6 z-10">
          <div className="relative flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="material-symbols-outlined text-primary text-2xl absolute animate-pulse">lock</span>
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-charcoal-slate text-body-lg">Initializing Voting Portal</h3>

          </div>
        </div>
      </main>
    );
  }

  if (stage === "inactive") {
    return (
      <main className="min-h-screen flex flex-col bg-surface px-margin-mobile relative overflow-hidden bg-[radial-gradient(#eceef0_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Glow backdrop */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <header className="w-full max-w-5xl mx-auto py-6 flex items-center justify-between border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NACOSS Logo" className="w-9 h-9 object-contain" />
            <span className="font-bold text-sm tracking-wide text-charcoal-slate uppercase hidden sm:inline-block">NACOSS FUTA</span>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-outline-variant/35 text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outline animate-pulse" />
            Portal Offline
          </span>
        </header>

        <div className="flex-grow flex items-center justify-center py-12">
          <div className="w-full max-w-md bg-white border border-outline-variant/60 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${electionState === "upcoming" ? "bg-amber-100 text-amber-600" : "bg-error-container text-error"
              }`}>
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {electionState === "upcoming" ? "schedule" : "lock"}
              </span>
            </div>

            <div className="text-center space-y-3">
              <h2 className="font-headline-md text-headline-md text-charcoal-slate font-extrabold tracking-tight">
                {electionState === "upcoming" ? "Voting Portal Upcoming" : "Voting Portal Closed"}
              </h2>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {electionState === "upcoming"
                  ? "The departmental election is currently in the setup / registration phase. The voting portal will become active once deployed by the electoral committee."
                  : "This election has officially concluded. The digital ballot box is sealed and no further votes can be cast."}
              </p>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-charcoal-slate">
                <span>Election Name</span>
                <span className="text-on-surface-variant text-right font-bold">{electionName}</span>
              </div>
              <div className="h-px bg-outline-variant/30" />
              <div className="flex items-center justify-between text-xs font-semibold text-charcoal-slate">
                <span>Verification State</span>
                <span className="capitalize text-on-surface-variant">{electionState}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-full h-12 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-full shadow-lg transition-all active:scale-[0.98]"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "login") {
    return (
      <main className="min-h-screen flex flex-col bg-surface px-margin-mobile relative overflow-hidden bg-[radial-gradient(#eceef0_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Glow Effects */}
        <div className="absolute top-[10%] left-1/4 w-[350px] h-[350px] bg-primary/10 blur-[90px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-[10%] right-1/4 w-[350px] h-[350px] bg-secondary/5 blur-[90px] rounded-full pointer-events-none -z-10" />

        <header className="w-full max-w-5xl mx-auto py-6 flex items-center justify-between border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NACOSS Logo" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-extrabold text-sm tracking-wide text-charcoal-slate block uppercase leading-none">NACOSS FUTA</span>
              <span className="text-[10px] text-on-surface-variant font-medium">E-Voting Portal</span>
            </div>
          </div>
          <Link href="/" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span> Home
          </Link>
        </header>

        <div className="flex-grow flex items-center justify-center py-10">
          <div className="w-full max-w-md bg-white border border-outline-variant/60 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
                Ballot Box Entrance
              </span>
              <h2 className="font-headline-lg text-headline-md text-charcoal-slate font-extrabold tracking-tight">
                Voter Authentication
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                Enter the unique 6-digit access code sent to your email to load your ballot sheet. Your ballot remains anonymous.
              </p>
            </div>
 
            {error && (
              <div className="p-4 bg-error-container text-on-error-container border border-error/20 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-slide-in">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}
 
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-1">
                <label className="font-bold text-[11px] text-on-surface-variant uppercase tracking-wider block" htmlFor="pin">
                  Voting Access Code
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-outline text-lg absolute left-3.5 top-1/2 -translate-y-1/2">
                    lock_open
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-white border border-outline-variant/80 rounded-xl text-center font-technical-code text-lg tracking-[0.4em] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-charcoal-slate placeholder:text-outline-variant/60"
                    id="pin"
                    placeholder="000000"
                    maxLength={6}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>
 
              <div className="pt-2">
                <button
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-xs"
                  type="submit"
                  disabled={isSubmittingStep}
                >
                  {isSubmittingStep ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                      Authenticating Secure Session...
                    </>
                  ) : (
                    <>
                      Verify & Start Voting
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
 
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
              <p className="text-[11px] text-on-surface-variant leading-normal font-medium">
                Voting codes are issued privately to verified students via email. Your vote is recorded anonymously.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "success") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-surface px-margin-mobile text-center relative overflow-hidden bg-[radial-gradient(#eceef0_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Glow decoration */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="w-full max-w-md bg-white border border-outline-variant/60 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-500/10">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-headline-lg text-headline-md text-charcoal-slate font-extrabold tracking-tight">Ballot Cast Successfully</h1>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto">
              Your votes have been securely recorded on the tamper-proof blockchain ledger. Your identity remains private.
            </p>
          </div>

          <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/40 space-y-4 text-left relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold text-charcoal-slate">
              <span>Receipt Code</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">VERIFIED</span>
            </div>

            {receipt && (
              <div className="relative">
                <p className="font-technical-code text-xs text-primary bg-white p-3 rounded-lg border border-outline-variant/40 break-all select-all font-semibold leading-relaxed">
                  {receipt}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 py-2.5 bg-white border border-outline-variant/80 hover:bg-surface-container-low text-charcoal-slate font-bold text-xs rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? "check" : "content_copy"}
                </span>
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-white border border-outline-variant/80 hover:bg-surface-container-low text-charcoal-slate font-bold text-xs rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Print Receipt</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-outline-variant/30" />

          <div className="space-y-3">
            <Link
              href="/"
              onClick={handleLogout}
              className="inline-flex items-center justify-center w-full h-12 bg-primary hover:bg-primary/95 text-white font-extrabold text-xs rounded-full shadow-md active:scale-[0.98] transition-all"
            >
              Finish Session
            </Link>
            <p className="text-[10px] text-on-surface-variant font-medium text-center">
              You will be automatically signed out.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Ballot or submitting calculations
  const currentPosition = positions[stepIndex];
  const currentCandidates = candidates.filter((c) => c.position === currentPosition);
  const isLastStep = stepIndex === positions.length - 1;
  const progressPercent = positions.length > 0 ? ((stepIndex + 1) / positions.length) * 100 : 0;

  if (positions.length === 0 && stage === "ballot") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-surface px-margin-mobile text-center">
        <div className="max-w-md bg-white p-8 border border-outline-variant/60 rounded-2xl shadow-lg space-y-4">
          <span className="material-symbols-outlined text-5xl text-outline-variant animate-pulse">inbox</span>
          <h2 className="font-bold text-charcoal-slate text-body-lg">Ballot Sheets Empty</h2>
          <p className="text-xs text-on-surface-variant">No candidates have been registered for this election yet. Please consult the electoral committee dashboard.</p>
          <button onClick={handleLogout} className="px-6 py-2 bg-primary text-white text-xs font-semibold rounded-full hover:bg-primary/95 transition-all">
            Logout
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="bg-surface text-on-background min-h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="bg-white border-b border-outline-variant/50 sticky top-0 z-40 h-16 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NACOSS Logo" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-extrabold text-charcoal-slate uppercase tracking-wide leading-none">{electionName}</h1>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Secure Voting Session
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Authenticated Voter</span>
            <span className="text-xs font-mono font-bold text-charcoal-slate">{matricNumber || "ACTIVE_SESSION"}</span>
          </div>
          <div className="h-8 w-px bg-outline-variant/40 hidden sm:block" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 border border-error/25 text-error hover:bg-error/5 text-xs font-semibold rounded-full transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">Cancel & Exit</span>
          </button>
        </div>
      </header>

      {/* Main Ballot Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Positions navigation list (Desktop only) */}
        <aside className="hidden lg:block w-72 bg-white border-r border-outline-variant/40 p-4 overflow-y-auto space-y-2 shrink-0">
          <div className="px-2 py-1 mb-2">
            <h3 className="font-extrabold text-[11px] text-on-surface-variant uppercase tracking-wider">Ballot Offices</h3>
            <p className="text-[10px] text-outline mt-0.5">Click any title to jump directly to selection.</p>
          </div>
          {positions.map((pos, idx) => {
            const isCurrent = stepIndex === idx;
            const positionCandidates = candidates.filter((c) => c.position === pos);
            const isCompleted = positionCandidates.length > 0 && positionCandidates.every((c) => selections[c.id] !== undefined);
            const yesCandidate = positionCandidates.find((c) => selections[c.id] === "yes");

            return (
              <button
                key={pos}
                onClick={() => {
                  setError(null);
                  setStepIndex(idx);
                }}
                className={`w-full text-left flex items-center justify-between p-3 rounded-xl transition-all border ${isCurrent
                    ? "bg-primary/5 border-primary/20 text-primary font-bold shadow-sm"
                    : isCompleted
                      ? "bg-surface-container-low/50 border-transparent text-charcoal-slate hover:bg-surface-container-low"
                      : "bg-transparent border-transparent text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                type="button"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`material-symbols-outlined text-base flex-shrink-0 ${isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-emerald-600 font-bold"
                        : "text-outline-variant"
                    }`}>
                    {isCompleted ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs truncate font-semibold">{pos}</span>
                    {isCompleted && (
                      <span className="block text-[10px] text-on-surface-variant truncate font-normal">
                        {yesCandidate ? `Yes: ${yesCandidate.name}` : "No to all"}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-outline-variant px-1.5 py-0.5 rounded bg-surface">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Center Pane: Active Ballot / Candidate Selection */}
        <main className="flex-grow flex flex-col min-w-0 overflow-y-auto bg-surface pb-32">
          {/* Header Block with Progress */}
          <div className="bg-white border-b border-outline-variant/30 p-4 sm:p-6 sticky top-0 z-30">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
                  OFFICIAL BALLOT STEP
                </span>
                <h2 className="font-headline-lg text-lg sm:text-xl font-black text-charcoal-slate mt-1.5 uppercase tracking-tight">
                  {currentPosition}
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Review the profiles below and cast your selection.
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-xs font-bold text-primary">
                  Step {stepIndex + 1} of {positions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Candidates Container */}
          <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
            {error && (
              <div className="p-4 bg-error-container text-on-error-container border border-error/20 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-slide-in">
                <span className="material-symbols-outlined text-base mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Candidate Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentCandidates.map((candidate) => {
                const isYes = selections[candidate.id] === "yes";
                const isNo = selections[candidate.id] === "no";
                return (
                  <div
                    key={candidate.id}
                    className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group shadow-sm bg-white ${
                      isYes
                        ? "border-emerald-600 bg-emerald-50/10 ring-2 ring-emerald-600/10 shadow-emerald-50"
                        : isNo
                        ? "border-rose-600/30 bg-rose-50/5"
                        : "border-outline-variant/60 hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    {/* Corner Check/Cancel Indicators */}
                    {isYes && (
                      <span className="material-symbols-outlined text-emerald-600 absolute top-4 right-4 text-xl font-bold bg-white rounded-full">
                        check_circle
                      </span>
                    )}
                    {isNo && (
                      <span className="material-symbols-outlined text-rose-500 absolute top-4 right-4 text-xl font-bold bg-white rounded-full">
                        cancel
                      </span>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Photo / Avatar */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface-container flex-shrink-0 relative group-hover:scale-105 transition-transform shadow-md">
                        {candidate.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getCandidateImageUrl(candidate.imageUrl)}
                            alt={candidate.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-black text-2xl sm:text-3xl">
                            {getInitials(candidate.name)}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-1 min-w-0 pr-6">
                        <h3 className="font-extrabold text-charcoal-slate text-sm leading-snug truncate">
                          {candidate.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold text-[10px] uppercase">
                          {candidate.level} Level
                        </span>
                        {candidate.manifesto && (
                          <p className="text-body-sm text-xs text-on-surface-variant line-clamp-2 pt-1 leading-relaxed">
                            {candidate.manifesto}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-5 pt-3 border-t border-outline-variant/40 flex items-center justify-between gap-4">
                      {candidate.manifesto ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingCandidate(candidate);
                          }}
                          className="text-[11px] text-primary hover:text-primary-container font-extrabold flex items-center gap-1 py-1 hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">import_contacts</span>
                          Read Manifesto
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateChoice(candidate.id, "yes");
                          }}
                          className={`px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-1 border active:scale-95 ${
                            isYes
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-outline-variant text-charcoal-slate hover:bg-emerald-50 hover:border-emerald-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCandidateChoice(candidate.id, "no");
                          }}
                          className={`px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-1 border active:scale-95 ${
                            isNo
                              ? "bg-rose-600 border-rose-600 text-white"
                              : "bg-white border-outline-variant text-charcoal-slate hover:bg-rose-50 hover:border-rose-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">thumb_down</span>
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Standardized Abstain Box */}
            <div
              onClick={() => {
                currentCandidates.forEach((c) => {
                  setSelections((prev) => ({ ...prev, [c.id]: "no" }));
                });
              }}
              className={`p-4 rounded-xl border border-dashed text-left flex items-center justify-between cursor-pointer transition-all ${
                currentCandidates.length > 0 && currentCandidates.every((c) => selections[c.id] === "no")
                  ? "border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-600/10 shadow-sm"
                  : "border-outline-variant/80 hover:border-primary/50 hover:bg-surface-container-low/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                  currentCandidates.length > 0 && currentCandidates.every((c) => selections[c.id] === "no")
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-outline-variant text-outline"
                }`}>
                  <span className="material-symbols-outlined text-lg">block</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-charcoal-slate">Vote No / Abstain from Position</h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Vote "No" for all candidates in the {currentPosition} office</p>
                </div>
              </div>

              {currentCandidates.length > 0 && currentCandidates.every((c) => selections[c.id] === "no") && (
                <span className="material-symbols-outlined text-emerald-600 font-bold text-lg">check_circle</span>
              )}
            </div>

            {/* Hint alert */}
            <div className="p-4 bg-white border border-outline-variant/50 rounded-xl flex gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                info
              </span>
              <p className="text-[11px] leading-relaxed font-medium">
                Choices are held in local state and can be modified at any point. Your final encrypted ballot is sent to the network only when you click "Submit Ballot".
              </p>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Ballot Summary Sidebar (Desktop only) */}
        <aside className="hidden lg:flex w-80 bg-white border-l border-outline-variant/40 p-5 flex-col justify-between shrink-0">
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-[12px] text-charcoal-slate uppercase tracking-wider">Ballot Review</h3>
              <p className="text-[10px] text-outline mt-0.5">Summary of selections made so far.</p>
            </div>

            <div className="h-px bg-outline-variant/30" />

            <div className="space-y-3 max-h-[calc(100vh-21rem)] overflow-y-auto pr-1">
              {positions.map((pos) => {
                const positionCandidates = candidates.filter((c) => c.position === pos);
                const isCompleted = positionCandidates.length > 0 && positionCandidates.every((c) => selections[c.id] !== undefined);
                const yesCandidate = positionCandidates.find((c) => selections[c.id] === "yes");

                return (
                  <div key={pos} className="space-y-1">
                    <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{pos}</span>
                    {isCompleted ? (
                      <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-lg border border-outline-variant/30">
                        <span className="text-xs font-bold text-charcoal-slate truncate max-w-[150px]">
                          {yesCandidate ? `Yes: ${yesCandidate.name}` : "No to all"}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${yesCandidate ? "bg-emerald-100 text-emerald-800" : "bg-outline-variant/30 text-on-surface-variant"}`}>
                          {yesCandidate ? "Yes" : "No"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-error-container/10 p-2 rounded-lg border border-error/15">
                        <span className="text-xs text-error font-medium italic">No Selection</span>
                        <span className="text-[9px] font-bold text-error bg-error-container/30 px-2 py-0.5 rounded-full">Required</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-outline-variant/40 bg-white">
            <button
              onClick={handleSubmitBallot}
              disabled={stage === "submitting"}
              className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-extrabold text-xs rounded-full shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-60"
              type="button"
            >
              {stage === "submitting" ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Ballot</span>
                  <span className="material-symbols-outlined text-base">how_to_vote</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-outline leading-normal px-2">
              Ballots cannot be reversed or queried once cast on the ledger.
            </p>
          </div>
        </aside>
      </div>

      {/* Sticky Bottom Actions Bar (Mobile & Tablet only) */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-outline-variant/50 p-4 pb-safe lg:hidden z-30 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="flex-1 px-4 py-3 border border-outline-variant/60 hover:bg-surface-container rounded-xl text-charcoal-slate text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={() => setShowMobileReview(true)}
              className="flex-[2] px-4 py-3 bg-primary text-white rounded-xl font-extrabold text-xs shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Review & Cast</span>
              <span className="material-symbols-outlined text-base">how_to_vote</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(positions.length - 1, i + 1))}
              className="flex-[2] px-4 py-3 bg-primary text-white rounded-xl font-extrabold text-xs shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Next Position</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          )}
        </div>
      </footer>

      {/* Manifesto Overlay Modal */}
      {viewingCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface flex-shrink-0 shadow-md">
                  {viewingCandidate.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getCandidateImageUrl(viewingCandidate.imageUrl)} alt={viewingCandidate.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-xl sm:text-2xl">
                      {getInitials(viewingCandidate.name)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-charcoal-slate">{viewingCandidate.name}</h3>
                  <span className="text-[10px] font-bold text-primary uppercase">{viewingCandidate.position} Candidate</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCandidate(null)}
                className="w-8 h-8 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full uppercase">
                  Level: {viewingCandidate.level} Level
                </span>
              </div>
              <div className="h-px bg-outline-variant/30" />
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-charcoal-slate uppercase tracking-wider">Campaign Manifesto</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                  {viewingCandidate.manifesto ?? "No manifesto has been uploaded by the candidate."}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/40 bg-surface-container-low flex justify-end">
              <button
                type="button"
                onClick={() => {
                  selectCandidate(viewingCandidate.position, viewingCandidate.id);
                  setViewingCandidate(null);
                }}
                className="px-6 py-2.5 bg-primary text-white text-xs font-extrabold rounded-full hover:bg-primary/95 transition-all shadow"
              >
                Select Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Review Drawer/Modal */}
      {showMobileReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 p-0 sm:p-4 lg:hidden">
          <div className="w-full max-w-xl bg-white border border-outline-variant/40 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-low">
              <div>
                <h3 className="font-black text-sm text-charcoal-slate uppercase tracking-tight">Review Ballot Box</h3>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Please review your selections before casting.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileReview(false)}
                className="w-8 h-8 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Drawer Contents */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {positions.map((pos) => {
                const positionCandidates = candidates.filter((c) => c.position === pos);
                const isCompleted = positionCandidates.length > 0 && positionCandidates.every((c) => selections[c.id] !== undefined);
                const yesCandidate = positionCandidates.find((c) => selections[c.id] === "yes");

                return (
                  <div key={pos} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <div className="min-w-0 pr-4">
                      <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">{pos}</span>
                      <span className="block text-xs font-black text-charcoal-slate truncate mt-0.5">
                        {isCompleted ? (yesCandidate ? `Yes: ${yesCandidate.name}` : "No to all") : "No Selection"}
                      </span>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-error-container text-error"
                      }`}>
                      {isCompleted ? "Filled" : "Required"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-outline-variant/40 bg-surface-container-low space-y-3">
              <button
                onClick={handleSubmitBallot}
                disabled={stage === "submitting"}
                className="w-full py-3.5 bg-primary text-white font-extrabold text-xs rounded-full shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
                type="button"
              >
                {stage === "submitting" ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Cast Ballot</span>
                    <span className="material-symbols-outlined text-base">how_to_vote</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-outline leading-tight">
                Your credentials will be logged as 'voted'. Choices cannot be inspected or altered.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
