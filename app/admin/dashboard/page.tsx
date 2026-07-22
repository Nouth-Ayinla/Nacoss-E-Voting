"use client";

import { useEffect, useState, useCallback } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type Voter = {
  matricNumber: string;
  name: string;
  email: string;
  idCardUrl: string;
  documentType: "idcard" | "courseform";
  status: "pending" | "verified" | "rejected";
  rejectionReason: string | null;
  hasVoted: boolean;
  createdAt: string;
  classListMatch?: {
    status: "MATCH" | "MISMATCH" | "NOT_FOUND";
    similarityScore: number;
    masterName: string | null;
    level: number | null;
  };
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function VoterVerificationPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [counts, setCounts] = useState<{ status: string; _count: number }[]>([]);
  const [selected, setSelected] = useState<Voter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "verified" | "rejected">("pending");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setIsPreviewOpen(false);
  }, [selected]);

  const loadVoters = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/voters?status=${statusFilter}`);
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        setApiError("Database or network connection failed. Check database logs.");
        setIsLoading(false);
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setApiError("Invalid server response.");
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      setVoters(data.voters || []);
      setCounts(data.counts || []);
      setSelected((prev) => {
        if (prev && data.voters?.some((v: Voter) => v.matricNumber === prev.matricNumber)) {
          return data.voters.find((v: Voter) => v.matricNumber === prev.matricNumber) || null;
        }
        return data.voters?.[0] ?? null;
      });
    } catch (err) {
      setApiError("Unable to reach the server. Please verify your internet connection.");
      console.error("Failed to parse voters response:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadVoters();
  }, [loadVoters]);

  async function handleAction(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "reject" && !rejectionReason.trim()) {
      setShowRejectInput(true);
      return;
    }

    setIsActing(true);
    setActionError(null);

    try {
      const res = await fetch("/api/voters/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNumber: selected.matricNumber,
          action,
          rejectionReason: action === "reject" ? rejectionReason.trim() : undefined,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) {
        if (res.status === 500) {
          setActionError("A system or database error occurred. Please try again.");
        } else {
          setActionError(data.error ?? "The action could not be completed.");
        }
        setIsActing(false);
        return;
      }

      setRejectionReason("");
      setShowRejectInput(false);
      setSelected(null);
      await loadVoters();
    } catch (err: any) {
      setActionError(err.message || "Failed to process request.");
    } finally {
      setIsActing(false);
    }
  }

  const pendingCount = counts.find((c) => c.status === "pending")?._count ?? 0;
  const verifiedCount = counts.find((c) => c.status === "verified")?._count ?? 0;

  // Relative time helper
  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  const rejectedCount = counts.find((c) => c.status === "rejected")?._count ?? 0;

  return (
    <>
      <AdminHeader title="Voter Verification" />

      {/* ── Desktop subheader ─────────────────────────────────────────── */}
      <div className="hidden md:flex px-gutter py-stack-md flex-row justify-between items-center bg-white border-b border-outline-variant gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Verification Queue</h1>
          <p className="text-on-surface-variant font-body-sm mt-1">Review and approve pending student registrations.</p>
        </div>
        <div className="flex gap-3">
          {([
            { key: "pending",  label: "Pending",  count: pendingCount,  accent: "border-amber-400 text-amber-700 bg-amber-50" },
            { key: "verified", label: "Verified", count: verifiedCount,  accent: "border-emerald-500 text-emerald-700 bg-emerald-50" },
            { key: "rejected", label: "Rejected", count: rejectedCount,  accent: "border-rose-500 text-rose-700 bg-rose-50" },
          ] as const).map(({ key, label, count, accent }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`p-3 px-5 rounded-full border-2 transition-all flex items-center gap-3 cursor-pointer font-semibold ${
                statusFilter === key ? accent : "bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="text-[11px] uppercase tracking-widest">{label}</span>
              <span className="text-lg font-bold">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile filter tabs ────────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-outline-variant shadow-sm">
        <div className="flex">
          {([
            { key: "pending",  label: "Pending",  count: pendingCount,  dot: "bg-amber-400" },
            { key: "verified", label: "Verified", count: verifiedCount,  dot: "bg-emerald-500" },
            { key: "rejected", label: "Rejected", count: rejectedCount,  dot: "bg-rose-500" },
          ] as const).map(({ key, label, count, dot }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-center transition-all relative ${
                statusFilter === key
                  ? "text-primary font-bold"
                  : "text-on-surface-variant"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span>
              </div>
              <span className="text-xl font-bold leading-none">{count}</span>
              {statusFilter === key && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Voter list */}
        <section className={`flex-1 overflow-y-auto border-r border-outline-variant bg-surface ${selected ? "hidden md:block" : ""}`}>
          {apiError ? (
            <div className="p-gutter text-center py-12 flex flex-col items-center justify-center space-y-4">
              <span className="material-symbols-outlined text-error text-[48px]">wifi_off</span>
              <p className="text-on-surface-variant font-body-md max-w-xs">{apiError}</p>
              <button
                onClick={loadVoters}
                className="bg-primary text-white px-5 py-2 rounded-full font-semibold hover:brightness-110 active:scale-95 transition-all text-xs"
              >
                Retry Connection
              </button>
            </div>
          ) : isLoading ? (
            <p className="p-gutter text-on-surface-variant">Loading...</p>
          ) : voters.length === 0 ? (
            <p className="p-gutter text-on-surface-variant">No registrations found in this category.</p>
          ) : (
            <>
              {/* ── Mobile premium card list ───────────────────────────── */}
              <div className="md:hidden flex flex-col bg-[#f4f6f9] pt-2 pb-4">
                {voters.map((voter) => {
                  const matchStatus = voter.classListMatch?.status;
                  const accentColor =
                    voter.status === "verified" ? "bg-emerald-500"
                    : voter.status === "rejected" ? "bg-rose-500"
                    : matchStatus === "NOT_FOUND" ? "bg-rose-400"
                    : matchStatus === "MISMATCH" ? "bg-amber-400"
                    : "bg-amber-400";

                  return (
                    <button
                      key={voter.matricNumber}
                      onClick={() => {
                        setSelected(voter);
                        setShowRejectInput(false);
                        setActionError(null);
                      }}
                      className="w-full text-left bg-white mx-4 mb-2.5 rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden active:scale-[0.985] transition-all duration-150"
                      style={{width: "calc(100% - 32px)"}}
                    >
                      <div className="flex">
                        {/* Coloured left accent */}
                        <div className={`w-1 shrink-0 ${accentColor}`} />

                        <div className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner ${
                            voter.status === "verified" ? "bg-emerald-500"
                            : voter.status === "rejected" ? "bg-rose-500"
                            : "bg-primary"
                          }`}>
                            {initials(voter.name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[15px] text-on-surface truncate leading-tight">{voter.name}</p>
                            <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">{voter.matricNumber}</p>

                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {/* Status badge */}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                voter.status === "verified" ? "bg-emerald-100 text-emerald-800"
                                : voter.status === "rejected" ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                              }`}>
                                <span className="material-symbols-outlined" style={{fontSize:"10px"}}>
                                  {voter.status === "verified" ? "check_circle" : voter.status === "rejected" ? "cancel" : "schedule"}
                                </span>
                                {voter.status.toUpperCase()}
                              </span>

                              {/* Class list badge */}
                              {matchStatus === "MATCH" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="material-symbols-outlined" style={{fontSize:"10px"}}>school</span>
                                  {voter.classListMatch?.level}L Roster
                                </span>
                              )}
                              {matchStatus === "MISMATCH" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="material-symbols-outlined" style={{fontSize:"10px"}}>warning</span>
                                  {voter.classListMatch?.similarityScore}% match
                                </span>
                              )}
                              {matchStatus === "NOT_FOUND" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="material-symbols-outlined" style={{fontSize:"10px"}}>person_off</span>
                                  Not in Roster
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time + chevron */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[10px] text-on-surface-variant">{timeAgo(voter.createdAt)}</span>
                            <span className="material-symbols-outlined text-on-surface-variant" style={{fontSize:"20px"}}>chevron_right</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {/* Bottom padding for comfortable scrolling */}
                <div className="h-6" />
              </div>

              {/* Desktop table */}
              <table className="hidden md:table w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container-low z-10">
                <tr className="border-b border-outline-variant">
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Voter Name
                  </th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Matric Number
                  </th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Class List Status
                  </th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Verification
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {voters.map((voter) => (
                  <tr
                    key={voter.matricNumber}
                    onClick={() => {
                      setSelected(voter);
                      setShowRejectInput(false);
                      setActionError(null);
                    }}
                    className={`border-b border-outline-variant/30 cursor-pointer transition-colors ${
                      selected?.matricNumber === voter.matricNumber
                        ? "bg-primary-container/10"
                        : "hover:bg-surface-container-lowest"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold text-xs">
                          {initials(voter.name)}
                        </div>
                        <span className="font-body-md font-semibold text-on-surface">{voter.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-technical-code text-on-surface-variant">
                      {voter.matricNumber}
                    </td>
                    <td className="px-6 py-4">
                      {voter.classListMatch?.status === "MATCH" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          In Class List {voter.classListMatch.level ? `(${voter.classListMatch.level}L)` : ""}
                        </span>
                      )}
                      {voter.classListMatch?.status === "MISMATCH" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" title={`Master Name: ${voter.classListMatch.masterName}`}>
                          <span className="material-symbols-outlined text-xs">warning</span>
                          Name Mismatch ({voter.classListMatch.similarityScore}%)
                        </span>
                      )}
                      {voter.classListMatch?.status === "NOT_FOUND" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <span className="material-symbols-outlined text-xs">cancel</span>
                          Not in Class List
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-body-sm text-on-surface-variant">
                      {new Date(voter.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        voter.status === "verified"
                          ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                          : voter.status === "rejected"
                          ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]"
                          : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                      }`}>
                        {voter.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </section>

        {/* ── Review panel ─────────────────────────────────────────────── */}
        <section
          className={`flex flex-col overflow-hidden md:relative md:w-96 md:bg-white md:shadow-sm ${
            selected ? "fixed inset-0 z-50 md:static md:inset-auto bg-surface" : "hidden md:flex"
          }`}
        >
          {selected ? (
            <>
              {/* ── Mobile clean header ─── */}
              <div className="md:hidden bg-primary shrink-0">
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  {/* Back button */}
                  <button
                    onClick={() => setSelected(null)}
                    className="p-2 -ml-1 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-white" style={{fontSize:"22px"}}>arrow_back</span>
                  </button>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {initials(selected.name)}
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-[15px] truncate leading-tight">{selected.name}</p>
                    <p className="font-mono text-[11px] text-white/70">{selected.matricNumber}</p>
                  </div>

                  {/* Status chip */}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    selected.status === "verified" ? "bg-emerald-400/30 text-emerald-100"
                    : selected.status === "rejected" ? "bg-rose-400/30 text-rose-100"
                    : "bg-white/20 text-white"
                  }`}>
                    {selected.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* ── Desktop header (compact) ─── */}
              <div className="hidden md:flex items-center gap-3 px-6 py-4 border-b border-outline-variant bg-white shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  selected.status === "verified" ? "bg-emerald-500" : selected.status === "rejected" ? "bg-rose-500" : "bg-primary"
                }`}>
                  {initials(selected.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface truncate text-sm">{selected.name}</p>
                  <p className="text-on-surface-variant font-mono text-xs">{selected.matricNumber}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selected.status === "verified" ? "bg-emerald-100 text-emerald-800"
                  : selected.status === "rejected" ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
                }`}>{selected.status.toUpperCase()}</span>
              </div>

              {/* ── Scrollable detail body ─── */}
              <div className="flex-1 overflow-y-auto">
                {/* Class list status banner */}
                {selected.classListMatch && (
                  <div className={`mx-4 mt-4 rounded-xl p-3.5 flex items-center gap-3 ${
                    selected.classListMatch.status === "MATCH" ? "bg-emerald-50 border border-emerald-200"
                    : selected.classListMatch.status === "MISMATCH" ? "bg-amber-50 border border-amber-200"
                    : "bg-rose-50 border border-rose-200"
                  }`}>
                    <span className={`material-symbols-outlined ${
                      selected.classListMatch.status === "MATCH" ? "text-emerald-600"
                      : selected.classListMatch.status === "MISMATCH" ? "text-amber-600"
                      : "text-rose-600"
                    }`} style={{fontSize:"22px"}}>
                      {selected.classListMatch.status === "MATCH" ? "school" : selected.classListMatch.status === "MISMATCH" ? "warning" : "person_off"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${
                        selected.classListMatch.status === "MATCH" ? "text-emerald-800"
                        : selected.classListMatch.status === "MISMATCH" ? "text-amber-800"
                        : "text-rose-800"
                      }`}>
                        {selected.classListMatch.status === "MATCH"
                          ? `In Class Roster — ${selected.classListMatch.level}L`
                          : selected.classListMatch.status === "MISMATCH"
                          ? `Name Mismatch — ${selected.classListMatch.similarityScore}% similarity`
                          : "Not Found in Class Roster"}
                      </p>
                      {selected.classListMatch.status === "MISMATCH" && selected.classListMatch.masterName && (
                        <p className="text-[11px] text-amber-700 mt-0.5 truncate">
                          Roster: <strong>{selected.classListMatch.masterName}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Info cards */}
                <div className="px-4 pt-4 pb-2 space-y-3">
                  {/* Name */}
                  <div className="bg-white rounded-xl border border-outline-variant/70 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Full Legal Name</p>
                    <p className="font-semibold text-on-surface text-[15px]">{selected.name}</p>
                  </div>

                  {/* Matric + Email in a 2-col row on mobile */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white rounded-xl border border-outline-variant/70 px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Matric Number</p>
                      <p className="font-mono font-bold text-on-surface text-sm">{selected.matricNumber}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-outline-variant/70 px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Email Address</p>
                      <p className="text-on-surface text-sm truncate">{selected.email}</p>
                    </div>
                  </div>

                  {/* Submitted time */}
                  <div className="bg-white rounded-xl border border-outline-variant/70 px-4 py-3 shadow-sm flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{fontSize:"18px"}}>schedule</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Submitted</p>
                      <p className="text-on-surface text-sm">{new Date(selected.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Document preview */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {selected.documentType === "courseform" ? "Course Form Document" : "Student ID Card"}
                  </p>
                  <div className="rounded-2xl overflow-hidden border border-outline-variant shadow-sm">
                    {selected.idCardUrl.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center justify-center text-center p-6 bg-rose-50 space-y-3 min-h-[120px]">
                        <span className="material-symbols-outlined text-[44px] text-rose-500">picture_as_pdf</span>
                        <a
                          href={`/api/voters/id-card?matricNumber=${encodeURIComponent(selected.matricNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-rose-600 text-white px-5 py-2.5 rounded-full font-bold hover:brightness-110 active:scale-95 transition-all text-xs flex items-center gap-2 shadow-md"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open PDF Document
                        </a>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsPreviewOpen(true)}
                        className="relative cursor-zoom-in group overflow-hidden aspect-[4/3]"
                        title="Tap to zoom"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/voters/id-card?matricNumber=${encodeURIComponent(selected.matricNumber)}`}
                          alt="Uploaded verification document"
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                          <div className="bg-white/90 backdrop-blur rounded-full p-3 shadow-lg">
                            <span className="material-symbols-outlined text-on-surface" style={{fontSize:"24px"}}>zoom_in</span>
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-white" style={{fontSize:"12px"}}>zoom_in</span>
                          <span className="text-white text-[10px] font-semibold">Tap to zoom</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Action buttons — directly below the document ── */}
                {selected.status === "pending" && (
                  <div className="px-4 pb-4 space-y-2.5">
                    {actionError && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                        <span className="material-symbols-outlined text-rose-600" style={{fontSize:"16px"}}>error</span>
                        <p className="text-rose-700 text-xs font-medium">{actionError}</p>
                      </div>
                    )}
                    {showRejectInput && (
                      <textarea
                        className="w-full border-2 border-outline-variant focus:border-error rounded-xl p-3 text-sm bg-white outline-none transition-colors"
                        placeholder="Describe the reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                      />
                    )}
                    <button
                      onClick={() => handleAction("approve")}
                      disabled={isActing}
                      className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-emerald-200 text-[15px]"
                    >
                      {isActing ? (
                        <span className="material-symbols-outlined animate-spin" style={{fontSize:"20px"}}>progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{fontSize:"20px"}}>check_circle</span>
                      )}
                      Approve Registration
                    </button>
                    <button
                      onClick={() => handleAction("reject")}
                      disabled={isActing}
                      className="w-full bg-white text-rose-600 border-2 border-rose-200 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-50 active:scale-[0.98] transition-all disabled:opacity-50 text-[15px]"
                    >
                      <span className="material-symbols-outlined" style={{fontSize:"20px"}}>cancel</span>
                      {showRejectInput ? "Confirm Rejection" : "Reject & Request Re-upload"}
                    </button>
                  </div>
                )}

                {/* Rejection reason (if any) */}
                {selected.status === "rejected" && selected.rejectionReason && (
                  <div className="mx-4 mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1">Rejection Reason</p>
                    <p className="text-rose-800 text-sm">{selected.rejectionReason}</p>
                  </div>
                )}

                <div className="h-6" />
              </div>
            </>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center flex-1 text-center px-8 gap-4">
              <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant" style={{fontSize:"36px"}}>person_search</span>
              </div>
              <div>
                <p className="font-semibold text-on-surface">No voter selected</p>
                <p className="text-on-surface-variant text-sm mt-1">Click on a voter from the list to review their registration.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Image Preview Modal Overlay */}
      {isPreviewOpen && selected && (
        <div
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button
            className="absolute top-6 right-6 text-white hover:text-outline-variant bg-black/40 hover:bg-black/60 p-2 rounded-full transition-all flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
          <div
            className="relative max-w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/voters/id-card?matricNumber=${encodeURIComponent(selected.matricNumber)}`}
              alt="Uploaded verification document full view"
              className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl cursor-default"
            />
            <a
              href={`/api/voters/id-card?matricNumber=${encodeURIComponent(selected.matricNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-full font-semibold hover:brightness-110 active:scale-95 transition-all text-xs flex items-center gap-1.5 shadow-lg"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Open in New Tab
            </a>
          </div>
        </div>
      )}
    </>
  );
}
