"use client";

import { useEffect, useState } from "react";

type ElectionState = "upcoming" | "ongoing" | "ended";

const NEXT_STATE: Record<ElectionState, ElectionState | null> = {
  upcoming: "ongoing",
  ongoing: "ended",
  ended: null,
};

const STATE_LABEL: Record<ElectionState, string> = {
  upcoming: "Registration Open",
  ongoing: "Voting Live",
  ended: "Election Closed",
};

const ACTION_LABEL: Record<ElectionState, string> = {
  upcoming: "Start Election",
  ongoing: "End Election",
  ended: "Election Ended",
};

export default function ElectionStateControl() {
  const [state, setState] = useState<ElectionState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/election-state")
      .then((res) => res.json())
      .then((data) => setState(data.state));
  }, []);

  async function advance() {
    if (!state) return;
    const next = NEXT_STATE[state];
    if (!next) return;

    setIsBusy(true);
    const res = await fetch("/api/election-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.state);
      // Reload page to refresh inputs if on the election dashboard page
      if (typeof window !== "undefined" && window.location.pathname.endsWith("/election")) {
        window.location.reload();
      }
    }
    setIsBusy(false);
    setConfirming(false);
  }

  if (!state) {
    return <div className="text-on-surface-variant text-[11px] font-label-caps animate-pulse">Loading state...</div>;
  }

  return (
    <div className="flex items-center gap-3">
      {/* State Status Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-md">
        <span
          className={`w-2 h-2 rounded-full ${
            state === "ongoing" ? "bg-primary animate-pulse" : state === "ended" ? "bg-outline" : "bg-secondary"
          }`}
        />
        <span className="font-label-caps text-[11px] text-on-surface-variant whitespace-nowrap select-none">
          {STATE_LABEL[state]}
        </span>
      </div>

      {/* Action / Confirmation Box */}
      {state !== "ended" &&
        (confirming ? (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-md">
            <span className="text-on-surface-variant text-[11px] font-medium whitespace-nowrap">
              {state === "upcoming" ? "Start voting?" : "End election?"}
            </span>
            <button
              onClick={advance}
              disabled={isBusy}
              className="bg-primary text-white px-2 py-0.5 rounded-full text-[11px] font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {isBusy ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="border border-outline-variant px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-on-surface hover:bg-surface-container-high active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 bg-primary text-white py-1.5 px-3 rounded-full font-bold text-body-sm shadow-sm hover:brightness-110 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">
              {state === "upcoming" ? "play_arrow" : "stop_circle"}
            </span>
            <span>{ACTION_LABEL[state]}</span>
          </button>
        ))}
    </div>
  );
}
