"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CountdownTimer from "@/components/CountdownTimer";

type Candidate = {
  id: string;
  name: string;
  position: string;
  imageUrl: string | null;
  manifesto: string | null;
};

type ElectionConfig = {
  state: "upcoming" | "ongoing" | "ended";
  startTime: string | null;
  endTime: string | null;
  resultsPublished?: boolean;
  electionName?: string;
};

type LookupStatus = "pending" | "verified" | "rejected" | "not_found" | null;

type ResultsData = {
  resultsByPosition: Record<string, { candidateId: string; name: string; imageUrl: string | null; yesVotes: number; noVotes: number; votes: number }[]>;
  totalVotesCast: number;
  totalVerifiedVoters: number;
  turnoutPercent: number;
};

export default function LandingPage() {
  const [election, setElection] = useState<ElectionConfig | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [matricNumber, setMatricNumber] = useState("");
  const [statusResult, setStatusResult] = useState<LookupStatus>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkedMatric, setCheckedMatric] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");

  useEffect(() => {
    // Fetch election state
    fetch("/api/election-state")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setElection(data);
          if (data.resultsPublished) {
            fetch("/api/results")
              .then((res) => (res.ok ? res.json() : null))
              .then((resultsData) => {
                if (resultsData) setResults(resultsData);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        // Default fallback state when server/network is offline
      });

    // Fetch candidates
    fetch("/api/candidates")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {
        // Default fallback state when server/network is offline
      });
  }, []);

  async function handleCheckStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!matricNumber.trim()) return;

    setIsChecking(true);
    setStatusResult(null);
    setRejectionReason(null);
    setCheckedMatric(matricNumber.trim());

    try {
      const res = await fetch(`/api/voters/status?matricNumber=${encodeURIComponent(matricNumber.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setStatusResult(data.status);
        // Rejection reason is no longer returned from the public endpoint
        // (it is delivered privately to the voter's email by the admin)
      } else {
        setStatusResult("not_found");
      }
    } catch {
      setStatusResult("not_found");
    } finally {
      setIsChecking(false);
    }
  }

  // Group candidates by position
  const candidatesByPosition = candidates.reduce<Record<string, Candidate[]>>((acc, candidate) => {
    const pos = candidate.position;
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(candidate);
    return acc;
  }, {});

  const electionState = election?.state ?? "upcoming";
  const isScheduled = election?.startTime && new Date(election.startTime).getTime() > Date.now();

  return (
    <>
      <SiteHeader />
      <main className="flex-grow bg-surface text-charcoal-slate min-h-screen pt-24 pb-16 px-margin-mobile relative overflow-hidden bg-[radial-gradient(#eceef0_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Subtle decorative background glow */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-fixed/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto space-y-16">
          {/* Hero Section */}
          <section className="text-center space-y-6 pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-outline-variant shadow-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${isScheduled
                ? "bg-amber-500 animate-pulse"
                : electionState === "ongoing"
                  ? "bg-emerald-500 animate-pulse"
                  : electionState === "upcoming"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`} />
              <span className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider">
                {isScheduled
                  ? "Election Scheduled"
                  : electionState === "ongoing"
                    ? "Voting Portal Active"
                    : electionState === "upcoming"
                      ? "Registration Phase Open"
                      : "Election Concluded"}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display-lg text-display-lg text-charcoal-slate max-w-3xl mx-auto tracking-tight leading-[1.1] font-extrabold uppercase">
                {election?.electionName ?? "NACOSS FUTA CHAPTER ELECTIONS"}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto font-medium">
                Official Departmental E-Voting Portal.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 pt-2">
              {isScheduled ? (
                <div className="space-y-4 w-full">
                  <p className="font-semibold text-charcoal-slate text-body-md text-center">
                    Registration has closed. Voting starts in:
                  </p>
                  <CountdownTimer
                    targetDate={election.startTime!}
                    onComplete={() => {
                      fetch("/api/election-state")
                        .then((res) => (res.ok ? res.json() : null))
                        .then((data) => {
                          if (data) setElection(data);
                        });
                    }}
                  />
                </div>
              ) : electionState !== "ended" ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto h-12 px-8 bg-primary text-white font-semibold text-body-sm rounded-full shadow-sm hover:bg-primary/95 hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    Register to Vote
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                  {electionState === "ongoing" && (
                    <Link
                      href="/vote"
                      className="w-full sm:w-auto h-12 px-8 bg-white border border-outline-variant text-charcoal-slate font-semibold text-body-sm rounded-full shadow-sm hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      Access Ballot
                      <span className="material-symbols-outlined text-lg">how_to_vote</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="px-6 py-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant font-medium text-body-sm">
                  This election has ended. Thank you for participating.
                </div>
              )}
            </div>
          </section>

          {/* Election Results Board */}
          {results && (
            <section className="bg-white border-2 border-primary/20 rounded-2xl p-8 shadow-md space-y-8 animate-slide-in relative overflow-hidden">
              {/* Subtle background highlight for premium look */}
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-800 font-label-caps text-xs font-bold uppercase tracking-wider font-semibold">
                  <span className="material-symbols-outlined text-sm animate-pulse">emoji_events</span>
                  Official Election Results Published
                </span>
                <h2 className="font-headline-lg text-headline-lg font-extrabold text-charcoal-slate tracking-tight uppercase">
                  Election Results
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
                  Final authenticated votes for each contested position. Turnout is calculated based on verified voter participation.
                </p>
              </div>

              {/* Turnout Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container-low p-6 rounded-xl border border-outline-variant/60 text-center">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label-caps">Total Voters Turnout</span>
                  <div className="text-2xl font-extrabold text-primary">{results.turnoutPercent}%</div>
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-x border-outline-variant/60 py-3 sm:py-0">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label-caps">Total Ballots Cast</span>
                  <div className="text-2xl font-extrabold text-charcoal-slate">{results.totalVotesCast}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label-caps">Verified Registered Voters</span>
                  <div className="text-2xl font-extrabold text-charcoal-slate">{results.totalVerifiedVoters}</div>
                </div>
              </div>

              {/* Position Results breakdown */}
              <div className="space-y-8">
                {Object.entries(results.resultsByPosition).map(([position, list]) => {
                  const totalVotes = list.reduce((sum, c) => sum + c.votes, 0);
                  return (
                    <div key={position} className="space-y-4 border border-outline-variant/60 p-6 rounded-xl bg-surface-container-low/20">
                      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                          <h3 className="font-bold text-charcoal-slate text-body-lg">
                            Post: {position}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                          Total Position Votes: <strong className="text-primary">{totalVotes}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {list.map((candidate, idx) => {
                          const isWinner = idx === 0 && candidate.votes > 0;
                          const totalCandidateVotes = candidate.yesVotes + candidate.noVotes;
                          const approvalRate = totalCandidateVotes > 0 ? (candidate.yesVotes / totalCandidateVotes) * 100 : 0;
                          return (
                            <div
                              key={candidate.candidateId}
                              className={`flex flex-col justify-between p-4 border rounded-xl bg-white shadow-xs relative overflow-hidden transition-all ${
                                isWinner ? "border-emerald-500 bg-emerald-50/10 shadow-sm" : "border-outline-variant/60"
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden text-xl sm:text-2xl shrink-0 shadow-md transition-transform group-hover:scale-105">
                                  {candidate.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={candidate.imageUrl} alt={candidate.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                  ) : (
                                    candidate.name
                                      .split(" ")
                                      .slice(0, 2)
                                      .map((n) => n[0])
                                      .join("")
                                  )}
                                </div>
 
                                <div className="min-w-0 flex-grow">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-charcoal-slate text-body-md truncate">
                                      {candidate.name}
                                    </h4>
                                    {isWinner && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                                        <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                        Elected
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-baseline gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      <span className="text-xs font-bold text-emerald-800">Yes:</span>
                                      <span className="text-body-sm font-extrabold text-emerald-600">{candidate.yesVotes}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                      <span className="text-xs font-bold text-rose-800">No:</span>
                                      <span className="text-body-sm font-extrabold text-rose-600">{candidate.noVotes}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
 
                              <div className="mt-4 space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-semibold text-on-surface-variant">
                                  <span>Approval Rate</span>
                                  <span>{approvalRate.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden p-0.5 border border-outline-variant/30">
                                  <div
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      isWinner ? "bg-emerald-500" : "bg-primary"
                                    }`}
                                    style={{ width: `${approvalRate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Stepper Workflow Section */}
          <section className="bg-white border border-outline-variant rounded-xl p-8 shadow-sm space-y-8">
            <div className="text-center space-y-1">
              <h2 className="font-headline-md text-headline-md font-bold text-charcoal-slate">
                How It Works
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Four simple steps to make your vote count securely.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: "01",
                  title: "Register",
                  desc: "Input your matric number and upload your department ID.",
                },
                {
                  step: "02",
                  title: "Verify",
                  desc: "Admin checks your record against the department roster.",
                },
                {
                  step: "03",
                  title: "OTP Code",
                  desc: "Receive a login code via your registered email.",
                },
                {
                  step: "04",
                  title: "Ballot",
                  desc: "Cast your vote. Kept completely anonymous and chained.",
                },
              ].map((item, idx) => (
                <div key={idx} className="relative space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-technical-code text-technical-code text-primary font-bold bg-primary-fixed/30 px-2 py-0.5 rounded">
                      {item.step}
                    </span>
                    <h3 className="font-semibold text-on-surface text-body-md">{item.title}</h3>
                  </div>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Voter Verification Status Lookup */}
          <section className="max-w-xl mx-auto bg-white border border-outline-variant rounded-xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-headline-md text-headline-md font-bold text-charcoal-slate flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[26px] text-primary">verified_user</span>
                Check Registration Status
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Enter your matriculation number below to verify your approval status.
              </p>
            </div>

            <form onSubmit={handleCheckStatus} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CSC/20/0001"
                  className="monospaced-input uppercase flex-grow h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-technical-code text-technical-code text-charcoal-slate placeholder:text-outline"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                  required
                />
                <button
                  type="submit"
                  disabled={isChecking}
                  className="px-5 bg-primary text-white font-semibold rounded hover:bg-primary/95 flex items-center justify-center disabled:opacity-60 transition-colors"
                >
                  {isChecking ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  )}
                </button>
              </div>

              {/* Status Display Area */}
              {statusResult && (
                <div className="animate-slide-in overflow-hidden rounded-lg border border-outline-variant p-4 bg-surface-container-low space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusResult === "verified"
                      ? "bg-emerald-500"
                      : statusResult === "pending"
                        ? "bg-amber-500"
                        : statusResult === "rejected"
                          ? "bg-red-500"
                          : "bg-slate-400"
                      }`} />
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                      {statusResult === "verified" && "Registration Verified"}
                      {statusResult === "pending" && "Pending Approval"}
                      {statusResult === "rejected" && "Registration Rejected"}
                      {statusResult === "not_found" && "Record Not Found"}
                    </span>
                  </div>

                  <p className="font-body-sm text-body-sm text-charcoal-slate">
                    {statusResult === "verified" && "Your voter profile is approved and active. You are fully cleared to participate in the balloting."}
                    {statusResult === "pending" && "Your submitted student ID card and details are currently in the queue being reviewed by department admins."}
                    {statusResult === "rejected" && `Your registration was not approved. Reason: ${rejectionReason || "Credentials validation failed."}`}
                    {statusResult === "not_found" && `We couldn't find any record for matriculation number "${checkedMatric}". Please check the spelling or proceed to registration.`}
                  </p>
                </div>
              )}
            </form>
          </section>

          {/* Candidates Deck & Carousel */}
          {candidates.length > 0 && (
            <section className="space-y-8 pt-4">
              <div className="text-center space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-label-caps text-xs font-bold uppercase tracking-wider">
                  Contesting Candidates
                </span>
                <h2 className="font-headline-md text-headline-md font-bold text-charcoal-slate">
                  Meet the Candidates
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
                  Browse through the candidates standing for executive posts in NACOSS FUTA Chapter 2026.
                </p>
              </div>

              {/* Position Filter Tabs */}
              {Object.keys(candidatesByPosition).length > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedPosition("all")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedPosition === "all"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                  >
                    All Posts ({candidates.length})
                  </button>
                  {Object.keys(candidatesByPosition).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedPosition === pos
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                        }`}
                    >
                      {pos} ({candidatesByPosition[pos].length})
                    </button>
                  ))}
                </div>
              )}

              {/* Candidates Carousel by Position */}
              <div className="space-y-8">
                {Object.entries(candidatesByPosition)
                  .filter(([position]) => selectedPosition === "all" || selectedPosition === position)
                  .map(([position, list]) => (
                    <div key={position} className="space-y-4 bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                          <h3 className="font-bold text-charcoal-slate text-body-lg font-display-md">
                            Post: {position}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                          {list.length} Candidate{list.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Horizontal Scrollable Carousel */}
                      <div className="flex gap-4 overflow-x-auto pb-2 pt-2 scrollbar-thin snap-x snap-mandatory">
                        {list.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="snap-start flex-none w-[260px] sm:w-[300px] bg-surface-container-low border border-outline-variant rounded-xl p-5 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center gap-3.5">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-primary/20 text-2xl sm:text-3xl shadow-md">
                                  {candidate.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={candidate.imageUrl} alt={candidate.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                  ) : (
                                    candidate.name
                                      .split(" ")
                                      .slice(0, 2)
                                      .map((n) => n[0])
                                      .join("")
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="inline-block px-2 py-0.5 rounded bg-primary-fixed/30 text-primary font-label-caps text-[10px] font-bold uppercase tracking-wider mb-0.5">
                                    {candidate.position}
                                  </span>
                                  <h4 className="font-bold text-charcoal-slate text-body-md truncate">
                                    {candidate.name}
                                  </h4>
                                </div>
                              </div>

                              {candidate.manifesto && (
                                <p className="text-xs text-on-surface-variant line-clamp-3 bg-white p-3 rounded-lg border border-outline-variant/40 italic">
                                  &ldquo;{candidate.manifesto}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="pt-3 mt-3 border-t border-outline-variant/40 flex items-center justify-between text-xs text-on-surface-variant">
                              <span>Status</span>
                              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Verified Candidate
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
