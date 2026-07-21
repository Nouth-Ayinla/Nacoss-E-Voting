"use client";

import { useEffect, useState } from "react";

type Candidate = { id: string; name: string; position: string; imageUrl: string | null; manifesto: string | null };
type Stage = "loading" | "login" | "ballot" | "submitting" | "success";

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

  // On load: check if already authenticated
  useEffect(() => {
    async function checkSession() {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setStage(data.authenticated ? "ballot" : "login");
    }
    checkSession();
  }, []);

  // Once in ballot stage, load candidates
  useEffect(() => {
    if (stage !== "ballot") return;
    async function loadCandidates() {
      const res = await fetch("/api/candidates");
      const data: Candidate[] = await res.json();
      setCandidates(data);
      const uniquePositions = Array.from(new Set(data.map((c) => c.position)));
      setPositions(uniquePositions);
    }
    loadCandidates();
  }, [stage]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmittingStep(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricNumber: matricNumber.trim(), pin: pin.trim() }),
    });
    const data = await res.json();
    setIsSubmittingStep(false);
    if (!res.ok) {
      setError(data.error ?? "Invalid Matric Number or PIN.");
      return;
    }
    setStage("ballot");
  }

  function selectCandidate(position: string, value: string) {
    setSelections((prev) => ({ ...prev, [position]: value }));
  }

  async function handleSubmitBallot() {
    setError(null);
    const votes = Object.entries(selections)
      .filter(([, candidateId]) => candidateId !== "abstain")
      .map(([position, candidateId]) => ({ position, candidateId }));

    if (votes.length === 0) {
      setError("You must vote for at least one position before submitting.");
      return;
    }

    setStage("submitting");
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
  }

  if (stage === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-on-surface-variant">Loading...</p>
      </main>
    );
  }

  if (stage === "login") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-margin-mobile">
        <div className="flex items-center gap-2 mb-stack-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NACOSS Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-headline-md font-headline-md font-bold text-primary tracking-tight">NACOSS Vote</h1>
        </div>

        <div className="w-full max-w-md bg-white border border-outline-variant p-stack-lg rounded-lg shadow-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2 text-center">
            Voter Sign In
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center mb-stack-lg">
            Enter your Matric Number and Voting PIN to proceed to the ballot.
          </p>
          <form className="space-y-stack-md" onSubmit={handleLogin}>
            <div className="space-y-stack-xs">
              <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1 uppercase" htmlFor="matricNumber">
                Matric Number
              </label>
              <input
                className="w-full px-4 py-3 bg-white border border-outline rounded font-technical-code uppercase focus:border-primary transition-all"
                id="matricNumber"
                placeholder="CSC/20/0001"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-stack-xs">
              <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1 uppercase" htmlFor="pin">
                Voting PIN
              </label>
              <input
                className="w-full px-4 py-3 bg-white border border-outline rounded text-center text-2xl tracking-[0.5em] font-technical-code focus:border-primary transition-all"
                id="pin"
                placeholder="000000"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            {error && <p className="text-error text-body-sm">{error}</p>}
            <button
              className="w-full bg-primary text-white font-bold py-4 rounded-full active:scale-[0.98] transition-all disabled:opacity-60"
              type="submit"
              disabled={isSubmittingStep}
            >
              {isSubmittingStep ? "Verifying..." : "Verify & Start Voting"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (stage === "success") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background px-margin-mobile text-center">
        <span
          className="material-symbols-outlined text-primary text-6xl mb-stack-md"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Vote Recorded</h1>
        <p className="text-on-surface-variant max-w-md mb-stack-lg">
          Your ballot has been cast anonymously. This receipt proves you voted — it cannot be used to reveal your
          choices.
        </p>
        {receipt && (
          <p className="font-technical-code text-technical-code text-primary bg-surface-container-low px-4 py-2 rounded border border-outline-variant break-all max-w-md">
            {receipt}
          </p>
        )}
      </main>
    );
  }

  // stage === "ballot" or "submitting"
  const currentPosition = positions[stepIndex];
  const currentCandidates = candidates.filter((c) => c.position === currentPosition);
  const isLastStep = stepIndex === positions.length - 1;
  const progressPercent = positions.length > 0 ? ((stepIndex + 1) / positions.length) * 100 : 0;

  if (positions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-margin-mobile text-center">
        <p className="text-on-surface-variant">No candidates have been added for this election yet.</p>
      </main>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col pb-24">
      <header className="bg-surface sticky top-0 z-40 flex justify-between items-center px-margin-mobile py-stack-sm">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NACOSS Logo" className="w-7 h-7 object-contain" />
          <h1 className="text-headline-md font-headline-md font-bold text-primary">NACOSS Vote</h1>
        </div>
      </header>

      <main className="px-margin-mobile py-stack-md max-w-lg mx-auto w-full flex-1">
        <div className="mb-stack-lg">
          <div className="flex justify-between items-end mb-2">
            <p className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-widest">
              Official Ballot
            </p>
            <p className="text-body-sm font-body-sm text-primary font-bold">
              Step {stepIndex + 1} of {positions.length}
            </p>
          </div>
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <h2 className="mt-stack-md font-headline-lg-mobile text-[24px] font-semibold text-on-surface">
            {currentPosition}
          </h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
            Select your preferred candidate for this position.
          </p>
        </div>

        <div className="space-y-stack-md">
          {currentCandidates.map((candidate) => {
            const isSelected = selections[currentPosition] === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => selectCandidate(currentPosition, candidate.id)}
                className={`w-full text-left flex items-center p-4 border rounded-xl shadow-sm active:scale-[0.98] transition-all ${
                  isSelected
                    ? "border-primary bg-[#f0fdf4]"
                    : "border-outline-variant bg-surface-container-lowest hover:shadow-md"
                }`}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-outline-variant bg-surface-container">
                  {candidate.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={candidate.imageUrl} alt={candidate.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-bold">
                      {candidate.name
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-grow">
                  <h3 className="font-headline-md text-[18px] text-on-surface leading-tight">{candidate.name}</h3>
                  {candidate.manifesto && (
                    <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">{candidate.manifesto}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-primary" : "border-outline-variant"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${isSelected ? "bg-primary" : "bg-transparent"}`} />
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => selectCandidate(currentPosition, "abstain")}
            className={`w-full text-left flex items-center p-4 border border-dashed rounded-xl active:scale-[0.98] transition-all ${
              selections[currentPosition] === "abstain"
                ? "border-primary bg-[#f0fdf4]"
                : "border-outline-variant bg-surface-container-low"
            }`}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-outline-variant bg-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-outline">block</span>
            </div>
            <div className="ml-4 flex-grow">
              <h3 className="text-body-md text-on-surface-variant font-medium">Abstain from Voting</h3>
              <p className="text-body-sm text-outline">Cast a blank vote for this position</p>
            </div>
          </button>
        </div>

        {error && <p className="text-error text-body-sm mt-stack-md">{error}</p>}

        <div className="mt-stack-lg p-4 bg-surface-container-high rounded-xl border border-outline-variant flex gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
          </span>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Your selections are held in this session only. Nothing is recorded until you submit the full ballot on
            the final step.
          </p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-surface p-4 pb-safe z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="flex-1 px-4 py-3 border border-outline-variant rounded-full text-on-surface font-medium hover:bg-surface-container transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Back</span>
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmitBallot}
              disabled={stage === "submitting"}
              className="flex-[2] px-4 py-3 bg-primary text-white rounded-full font-bold shadow-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{stage === "submitting" ? "Submitting..." : "Submit Ballot"}</span>
              <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(positions.length - 1, i + 1))}
              className="flex-[2] px-4 py-3 bg-primary text-white rounded-full font-bold shadow-sm hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
