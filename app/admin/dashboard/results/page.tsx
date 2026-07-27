"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type ResultsResponse = {
  resultsByPosition: Record<string, { candidateId: string; name: string; imageUrl: string | null; yesVotes: number; noVotes: number; votes: number }[]>;
  totalVotesCast: number;
  totalVerifiedVoters: number;
  turnoutPercent: number;
  resultsPublished: boolean;
};

export default function ResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

  async function load() {
    const res = await fetch("/api/results");
    if (res.ok) setData(await res.json());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // live-ish refresh
    return () => clearInterval(interval);
  }, []);

  async function handleTogglePublish() {
    if (!data) return;
    setIsTogglingPublish(true);
    try {
      const res = await fetch("/api/election-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultsPublished: !data.resultsPublished }),
      });
      if (res.ok) {
        const updatedConfig = await res.json();
        setData((prev) => prev ? { ...prev, resultsPublished: updatedConfig.resultsPublished } : null);
      }
    } catch {
      // ignore
    } finally {
      setIsTogglingPublish(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AdminHeader title="Election Results" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-gutter max-w-container-max mx-auto w-full space-y-gutter">
        {isLoading || !data ? (
          <p className="text-on-surface-variant">Loading results...</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-outline-variant rounded-xl shadow-sm">
              <div>
                <h2 className="font-semibold text-charcoal-slate text-body-md">Results Visibility</h2>
                <p className="text-xs text-on-surface-variant">
                  {data.resultsPublished 
                    ? "Results are currently published and visible on the landing page."
                    : "Results are hidden from the public. Click 'Publish' to show them on the landing page."}
                </p>
              </div>
              <button
                onClick={handleTogglePublish}
                disabled={isTogglingPublish}
                className={`px-5 py-2.5 rounded-full font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60 ${
                  data.resultsPublished
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {data.resultsPublished ? "visibility_off" : "publish"}
                </span>
                <span>{isTogglingPublish ? "Updating..." : data.resultsPublished ? "Unpublish Results" : "Publish Results"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
              <div className="md:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="text-surface-container-high"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                    />
                    <circle
                      className="text-primary"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * data.turnoutPercent) / 100}
                      strokeLinecap="round"
                      strokeWidth="8"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-headline-md font-bold text-primary">{data.turnoutPercent}%</span>
                  </div>
                </div>
                <h3 className="font-label-caps text-on-surface-variant uppercase tracking-widest">Turnout</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {data.totalVotesCast} / {data.totalVerifiedVoters} Verified
                </p>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary w-fit mb-4">
                    <span className="material-symbols-outlined">ballot</span>
                  </div>
                  <p className="text-on-surface-variant text-label-caps">Total Votes Cast</p>
                  <h4 className="text-display-lg font-bold text-on-surface mt-2">{data.totalVotesCast}</h4>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="p-2 bg-tertiary-container/10 rounded-lg text-tertiary w-fit mb-4">
                    <span className="material-symbols-outlined">security</span>
                  </div>
                  <p className="text-on-surface-variant text-label-caps">Ballot Integrity</p>
                  <h4 className="text-headline-md font-bold text-on-surface mt-2">Anonymous & Verified</h4>
                  <p className="text-body-sm text-on-surface-variant mt-4">No voter-to-ballot linkage stored</p>
                </div>
              </div>
            </div>

            {Object.keys(data.resultsByPosition).length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center text-on-surface-variant">
                No candidate election results available yet.
              </div>
            ) : (
              Object.entries(data.resultsByPosition).map(([position, candidates]) => {
                const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
                return (
                  <section
                    key={position}
                    className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm space-y-4"
                  >
                    <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/40 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider font-label-caps">
                          Executive Post
                        </span>
                        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                          {position}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold px-3 py-1 bg-white border border-outline-variant rounded-full text-on-surface-variant shadow-xs">
                          Total Votes Cast: <strong className="text-primary">{totalVotes}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {candidates.map((candidate, i) => {
                        const totalCandidateVotes = candidate.yesVotes + candidate.noVotes;
                        const approvalRate = totalCandidateVotes > 0 ? (candidate.yesVotes / totalCandidateVotes) * 100 : 0;
                        const isLeading = i === 0 && candidate.votes > 0;

                        return (
                          <div key={candidate.candidateId} className="bg-white border border-outline-variant/60 rounded-xl p-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3.5">
                                <div className="relative flex-shrink-0">
                                  <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden text-lg shadow-inner">
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
                                  {isLeading && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-xs flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[12px]">emoji_events</span> 1st
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-on-surface text-body-lg">{candidate.name}</h4>
                                    {isLeading && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                                        Leading
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-on-surface-variant">
                                    Contesting for <strong className="text-on-surface">{position}</strong>
                                  </p>
                                </div>
                              </div>

                              <div className="text-left sm:text-right bg-surface-container-low sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                <div className="flex items-center gap-4 sm:justify-end">
                                  <div className="flex items-baseline gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-800">Yes:</span>
                                    <span className="text-headline-sm font-extrabold text-emerald-600">{candidate.yesVotes}</span>
                                  </div>
                                  <div className="flex items-baseline gap-1 bg-rose-50 px-2.5 py-1 rounded border border-rose-100">
                                    <span className="text-xs font-bold text-rose-800">No:</span>
                                    <span className="text-headline-sm font-extrabold text-rose-600">{candidate.noVotes}</span>
                                  </div>
                                </div>
                                <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded mt-2 inline-block">
                                  {approvalRate.toFixed(1)}% Approval Rate
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden p-0.5 border border-outline-variant/30">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    isLeading ? "bg-emerald-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${approvalRate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
