"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type ElectionState = "upcoming" | "ongoing" | "ended";

const STATE_LABEL: Record<ElectionState, string> = {
  upcoming: "Registration & Set Up (Upcoming)",
  ongoing: "Voting Live (Ongoing)",
  ended: "Election Closed (Ended)",
};

const NEXT_STATE: Record<ElectionState, ElectionState | null> = {
  upcoming: "ongoing",
  ongoing: "ended",
  ended: null,
};

const STATE_ACTION_LABEL: Record<ElectionState, string> = {
  upcoming: "Start Election Manually",
  ongoing: "End Election Manually",
  ended: "Election Finished",
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
  const [state, setState] = useState<ElectionState | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmingState, setConfirmingState] = useState(false);

  async function loadConfig() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/election-state");
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
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
  }, []);

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
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
      setIsSaving(false);
    }
  }

  async function handleAdvanceState() {
    if (!state) return;
    const next = NEXT_STATE[state];
    if (!next) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/election-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `Election state advanced to ${next}.` });
        setConfirmingState(false);
        await loadConfig();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to advance election state." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Election Setup" />
        <div className="p-gutter text-on-surface-variant">Loading configuration...</div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Election Setup" />
      <div className="p-gutter max-w-2xl w-full mx-auto space-y-gutter">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-xs">Election Control</h1>
          <p className="font-body-md text-on-surface-variant">
            Schedule automatic start/end times or manually transition the election state.
          </p>
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

        {/* Current State Indicator */}
        <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-headline-md text-[18px] font-semibold text-on-surface">Current Status</h2>
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-outline-variant/50">
            <div className="flex items-center gap-3">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  state === "ongoing"
                    ? "bg-primary animate-pulse"
                    : state === "ended"
                    ? "bg-outline"
                    : "bg-secondary"
                }`}
              />
              <span className="font-body-md font-semibold text-on-surface">
                {state ? STATE_LABEL[state] : "Unknown State"}
              </span>
            </div>

            {state !== "ended" && (
              <div className="flex items-center">
                {confirmingState ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdvanceState}
                      disabled={isSaving}
                      className="bg-primary text-white py-1.5 px-3 rounded-full text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                    >
                      {isSaving ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmingState(false)}
                      className="border border-outline-variant py-1.5 px-3 rounded-full text-xs font-semibold bg-white hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingState(true)}
                    className="flex items-center gap-1.5 bg-primary text-white py-1.5 px-3 rounded-full font-semibold text-xs hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {state === "upcoming" ? "play_arrow" : "stop_circle"}
                    </span>
                    <span>{STATE_ACTION_LABEL[state!]}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Schedule Settings Form */}
        <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-headline-md text-[18px] font-semibold text-on-surface">Schedule Voting Period</h2>
          <form className="space-y-4" onSubmit={handleSaveSchedule}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="start_time">
                  Start Date & Time
                </label>
                <input
                  className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
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
                  className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
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
                disabled={isSaving}
                className="bg-primary text-white py-3 px-6 rounded-full font-bold text-body-sm shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Schedule Configuration"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
