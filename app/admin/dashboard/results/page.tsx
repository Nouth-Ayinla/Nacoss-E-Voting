"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type ResultsResponse = {
  resultsByPosition: Record<string, { candidateId: string; name: string; imageUrl: string | null; votes: number }[]>;
  totalVotesCast: number;
  totalVerifiedVoters: number;
  turnoutPercent: number;
};

export default function ResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/results");
      if (res.ok) setData(await res.json());
      setIsLoading(false);
    }
    load();
    const interval = setInterval(load, 15000); // live-ish refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AdminHeader title="Election Results" />
      <div className="p-gutter max-w-container-max mx-auto w-full space-y-gutter">
        {isLoading || !data ? (
          <p className="text-on-surface-variant">Loading results...</p>
        ) : (
          <>
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

            {Object.entries(data.resultsByPosition).map(([position, candidates]) => {
              const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
              return (
                <section
                  key={position}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/30">
                    <h3 className="font-headline-md text-on-surface">{position}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    {candidates.map((candidate, i) => {
                      const pct = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
                      return (
                        <div key={candidate.candidateId}>
                          <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold">
                                  {candidate.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                {i === 0 && (
                                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                    1st
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-on-surface">{candidate.name}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-headline-md font-bold text-primary">{candidate.votes}</span>
                              <span className="text-body-sm text-on-surface-variant ml-1">({pct.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${i === 0 ? "bg-primary" : "bg-on-surface-variant/50"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
