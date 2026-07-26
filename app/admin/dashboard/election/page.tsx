"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type ElectionState = "upcoming" | "ongoing" | "ended";

const STATE_LABEL: Record<ElectionState, string> = {
  upcoming: "Registration & Setup (Upcoming)",
  ongoing: "Voting Live (Ongoing)",
  ended: "Election Closed (Ended)",
};

const NEXT_STATE: Record<ElectionState, ElectionState | null> = {
  upcoming: "ongoing",
  ongoing: "ended",
  ended: null,
};

const STATE_ACTION_LABEL: Record<ElectionState, string> = {
  upcoming: "Deploy & Start Election",
  ongoing: "Stop & Close Election",
  ended: "Election Finished",
};

type CandidateSummary = {
  id: string;
  name: string;
  position: string;
  imageUrl: string | null;
};

type ElectionConfigResponse = {
  state: ElectionState;
  startTime: string | null;
  endTime: string | null;
  resultsPublished: boolean;
  electionName: string;
  totalVotesCast?: number;
  totalVerifiedVoters?: number;
  totalCandidates?: number;
  candidates?: CandidateSummary[];
};

function formatToLocalDateTime(dateStr: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ElectionSetupPage() {
  const [config, setConfig] = useState<ElectionConfigResponse | null>(null);
  const [electionNameInput, setElectionNameInput] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAdvancingState, setIsAdvancingState] = useState(false);
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmingState, setConfirmingState] = useState(false);

  async function loadConfig() {
    try {
      const res = await fetch("/api/election-state");
      if (res.ok) {
        const data: ElectionConfigResponse = await res.json();
        setConfig(data);
        setElectionNameInput(data.electionName);
        setStartTime(formatToLocalDateTime(data.startTime));
        setEndTime(formatToLocalDateTime(data.endTime));
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load election configuration." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    const interval = setInterval(loadConfig, 10000); // live updates for voter stats
    return () => clearInterval(interval);
  }, []);

  async function handleSaveElectionName(e: React.FormEvent) {
    e.preventDefault();
    if (!electionNameInput.trim()) return;

    setIsSavingName(true);
    setMessage(null);

    try {
      const res = await fetch("/api/election-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionName: electionNameInput.trim() }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Election name updated successfully." });
        await loadConfig();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to update election name." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSchedule(true);
    setMessage(null);

    try {
      const res = await fetch("/api/election-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Election schedule updated successfully." });
        await loadConfig();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to update schedule." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleAdvanceState() {
    if (!config?.state) return;
    const next = NEXT_STATE[config.state];
    if (!next) return;

    setIsAdvancingState(true);
    setMessage(null);
    try {
      const res = await fetch("/api/election-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `Election successfully deployed into phase: ${next.toUpperCase()}.` });
        setConfirmingState(false);
        await loadConfig();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to advance election state." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsAdvancingState(false);
    }
  }

  if (isLoading || !config) {
    return (
      <>
        <AdminHeader title="Election Control Room" />
        <div className="p-gutter text-on-surface-variant">Loading configuration...</div>
      </>
    );
  }

  // Turnout Stats math
  const turnoutPercent =
    (config.totalVerifiedVoters ?? 0) > 0
      ? Math.round(((config.totalVotesCast ?? 0) / (config.totalVerifiedVoters ?? 0)) * 100)
      : 0;

  // Group candidates by position for quick summary
  const candidatesByPosition: Record<string, CandidateSummary[]> = {};
  if (config.candidates) {
    for (const c of config.candidates) {
      if (!candidatesByPosition[c.position]) candidatesByPosition[c.position] = [];
      candidatesByPosition[c.position].push(c);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AdminHeader title="Election Control Room" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-gutter max-w-container-max mx-auto w-full space-y-gutter">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-xs">Election Control Dashboard</h1>
            <p className="font-body-md text-on-surface-variant">
              Manage election name branding, monitor live voter participation, and deploy manual state changes.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-body-sm font-medium ${
              message.type === "success"
                ? "bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]"
                : "bg-error-container text-on-error-container border border-error/25"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Main Controls Column */}
          <div className="lg:col-span-2 space-y-gutter">
            
            {/* Redesigned 1: Election Title Configuration */}
            <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-headline-md text-[18px] font-bold text-charcoal-slate flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_square</span>
                Configure Election Name
              </h2>
              <form onSubmit={handleSaveElectionName} className="flex gap-3">
                <input
                  className="w-full h-11 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
                  placeholder="e.g. NACOSS FUTA Chapter Elections"
                  value={electionNameInput}
                  onChange={(e) => setElectionNameInput(e.target.value)}
                  disabled={isSavingName}
                  required
                />
                <button
                  type="submit"
                  disabled={isSavingName || electionNameInput.trim() === config.electionName}
                  className="bg-primary hover:brightness-105 text-white px-6 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
                >
                  {isSavingName ? "..." : "Save"}
                </button>
              </form>
            </section>

            {/* Redesigned 2: Live Stats & Turnout Activity */}
            <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
              <h2 className="font-headline-md text-[18px] font-bold text-charcoal-slate flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Live Participation Stats
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest font-label-caps block mb-1">
                    People Voted
                  </span>
                  <span className="text-display-sm font-extrabold text-primary block">
                    {config.totalVotesCast ?? 0}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium mt-1 block">
                    Submitted Ballots
                  </span>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest font-label-caps block mb-1">
                    Verified Roster
                  </span>
                  <span className="text-display-sm font-extrabold text-charcoal-slate block">
                    {config.totalVerifiedVoters ?? 0}
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium mt-1 block">
                    Approved Registrations
                  </span>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest font-label-caps block mb-1">
                    Turnout Percent
                  </span>
                  <span className="text-display-sm font-extrabold text-emerald-600 block">
                    {turnoutPercent}%
                  </span>
                  <span className="text-xs text-on-surface-variant font-medium mt-1 block">
                    Participation Rate
                  </span>
                </div>
              </div>

              {/* Turnout Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-on-surface-variant font-semibold">
                  <span>Voting Turnout Progress</span>
                  <span>{turnoutPercent}%</span>
                </div>
                <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden p-0.5 border border-outline-variant/30">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${turnoutPercent}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Redesigned 3: Deployment Controls */}
            <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-headline-md text-[18px] font-bold text-charcoal-slate flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">dynamic_feed</span>
                Manual Phase Deployment
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/50">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block font-label-caps">
                    Current Deployment State
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full ${
                        config.state === "ongoing"
                          ? "bg-primary animate-pulse"
                          : config.state === "ended"
                          ? "bg-outline"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="font-body-md font-extrabold text-charcoal-slate">
                      {STATE_LABEL[config.state]}
                    </span>
                  </div>
                </div>

                {config.state !== "ended" && (
                  <div className="w-full sm:w-auto flex items-center justify-end">
                    {confirmingState ? (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleAdvanceState}
                          disabled={isAdvancingState}
                          className="bg-primary text-white py-2 px-4 rounded-full text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm"
                        >
                          {isAdvancingState ? "..." : "Confirm Deployment"}
                        </button>
                        <button
                          onClick={() => setConfirmingState(false)}
                          className="border border-outline-variant py-2 px-4 rounded-full text-xs font-bold bg-white hover:bg-surface-container transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingState(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 px-5 rounded-full font-bold text-xs hover:brightness-105 active:scale-[0.98] transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {config.state === "upcoming" ? "rocket_launch" : "stop_circle"}
                        </span>
                        <span>{STATE_ACTION_LABEL[config.state]}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Redesigned 4: Scheduling Settings */}
            <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="font-headline-md text-[18px] font-bold text-charcoal-slate flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Automatic Schedule Settings
              </h2>
              <form className="space-y-4" onSubmit={handleSaveSchedule}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-stack-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="start_time">
                      Start Date & Time
                    </label>
                    <input
                      className="w-full h-11 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
                      id="start_time"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-stack-xs">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="end_time">
                      End Date & Time
                    </label>
                    <input
                      className="w-full h-11 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
                      id="end_time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSchedule}
                    className="bg-white border border-outline-variant hover:bg-surface-container-low text-charcoal-slate py-2.5 px-5 rounded-full font-semibold text-xs shadow-xs transition-all active:scale-[0.98]"
                  >
                    {isSavingSchedule ? "Saving..." : "Save Schedule Timing"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Ballot Candidates Summary Deck */}
          <div className="space-y-gutter">
            <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                <h2 className="font-headline-md text-[18px] font-bold text-charcoal-slate flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  Candidates summary
                </h2>
                <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  Total: {config.totalCandidates ?? 0}
                </span>
              </div>

              {Object.keys(candidatesByPosition).length === 0 ? (
                <p className="text-xs text-on-surface-variant font-medium py-4 text-center">
                  No candidates registered yet.
                </p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {Object.entries(candidatesByPosition).map(([position, list]) => (
                    <div key={position} className="space-y-2 border border-outline-variant/40 p-3.5 rounded-lg bg-surface-container-lowest">
                      <div className="flex items-center justify-between text-xs font-bold text-charcoal-slate">
                        <span>{position}</span>
                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                          {list.length} Contesting
                        </span>
                      </div>
                      
                      <div className="divide-y divide-outline-variant/20">
                        {list.map((c) => (
                          <div key={c.id} className="flex items-center gap-2.5 py-2 first:pt-1 last:pb-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold overflow-hidden shadow-inner flex-shrink-0">
                              {c.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                c.name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join("")
                              )}
                            </div>
                            <span className="text-xs font-medium text-on-surface truncate">
                              {c.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
