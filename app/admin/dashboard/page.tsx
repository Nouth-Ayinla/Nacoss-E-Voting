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

  const loadVoters = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/voters?status=${statusFilter}`);
      if (!res.ok) {
        setApiError("Database or network connection failed. Check database logs.");
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      setVoters(data.voters);
      setCounts(data.counts);
      setSelected((prev) => {
        if (prev && data.voters.some((v: Voter) => v.matricNumber === prev.matricNumber)) {
          return data.voters.find((v: Voter) => v.matricNumber === prev.matricNumber) || null;
        }
        return data.voters[0] ?? null;
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

    const res = await fetch("/api/voters/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricNumber: selected.matricNumber,
        action,
        rejectionReason: action === "reject" ? rejectionReason.trim() : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Action failed.");
      setIsActing(false);
      return;
    }

    setRejectionReason("");
    setShowRejectInput(false);
    setSelected(null);
    await loadVoters();
    setIsActing(false);
  }

  const pendingCount = counts.find((c) => c.status === "pending")?._count ?? 0;
  const verifiedCount = counts.find((c) => c.status === "verified")?._count ?? 0;

  return (
    <>
      <AdminHeader title="Voter Verification" />
      <div className="px-gutter py-stack-md flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border-b border-outline-variant gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Verification Queue</h1>
          <p className="text-on-surface-variant font-body-sm mt-1">
            Review and approve pending student registrations.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`p-3 px-5 rounded-full border transition-all flex items-center gap-3 cursor-pointer ${
              statusFilter === "pending"
                ? "bg-primary/5 border-primary text-primary font-bold"
                : "bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="font-label-caps uppercase text-[11px]">Pending</span>
            <span className="font-headline-md">{pendingCount}</span>
          </button>
          
          <button
            onClick={() => setStatusFilter("verified")}
            className={`p-3 px-5 rounded-full border transition-all flex items-center gap-3 cursor-pointer ${
              statusFilter === "verified"
                ? "bg-primary/5 border-primary text-primary font-bold"
                : "bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="font-label-caps uppercase text-[11px]">Verified</span>
            <span className="font-headline-md">{verifiedCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter("rejected")}
            className={`p-3 px-5 rounded-full border transition-all flex items-center gap-3 cursor-pointer ${
              statusFilter === "rejected"
                ? "bg-error/5 border-error text-error font-bold"
                : "bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <span className="font-label-caps uppercase text-[11px]">Rejected</span>
            <span className="font-headline-md">{counts.find((c) => c.status === "rejected")?._count ?? 0}</span>
          </button>
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
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-outline-variant border-t border-outline-variant">
                {voters.map((voter) => (
                  <div
                    key={voter.matricNumber}
                    className="flex items-center justify-between px-margin-mobile py-stack-md hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-headline-md text-[16px] text-on-surface font-semibold">
                        {voter.name.toUpperCase()}
                      </span>
                      <span className="font-technical-code text-body-sm text-outline">{voter.matricNumber}</span>
                      <span className={`font-label-caps text-[10px] px-2 py-0.5 rounded w-fit mt-1 ${
                        voter.status === "verified"
                          ? "bg-primary-container text-white"
                          : voter.status === "rejected"
                          ? "bg-error-container text-on-error-container"
                          : "bg-secondary-fixed text-on-secondary-fixed-variant"
                      }`}>
                        {voter.status.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelected(voter);
                        setShowRejectInput(false);
                        setActionError(null);
                      }}
                      className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 rounded-full hover:bg-primary-container transition-all active:scale-95 shadow-sm"
                    >
                      REVIEW
                    </button>
                  </div>
                ))}
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
                    Submitted
                  </th>
                  <th className="px-6 py-4 font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Status
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

        {/* Review panel */}
        <section
          className={`bg-white flex flex-col shadow-sm md:relative md:w-96 ${
            selected ? "fixed inset-0 z-50 md:static md:inset-auto" : "hidden md:flex"
          }`}
        >
          {selected ? (
            <>
              <div className={`p-6 overflow-y-auto flex-1 ${selected.status === "pending" ? "pb-40" : "pb-6"}`}>
                <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="md:hidden p-1 hover:bg-surface-container-low rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Voter Review</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase">
                      Full Legal Name
                    </label>
                    <p className="font-body-md font-bold text-on-surface bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                      {selected.name}
                    </p>
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase">
                      Matric Number
                    </label>
                    <p className="font-technical-code font-bold text-on-surface bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                      {selected.matricNumber}
                    </p>
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase">
                      Email
                    </label>
                    <p className="font-body-md text-on-surface bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                      {selected.email}
                    </p>
                  </div>
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase">
                      {selected.documentType === "courseform" ? "Course Form Document" : "Student ID Card"}
                    </label>
                    <div className="aspect-[1.6/1] border-2 border-dashed border-outline rounded-lg overflow-hidden bg-surface-container-low">
                      {selected.idCardUrl.toLowerCase().endsWith(".pdf") ? (
                        <div className="flex flex-col items-center justify-center text-center p-4 w-full h-full space-y-3">
                          <span className="material-symbols-outlined text-[48px] text-error">picture_as_pdf</span>
                          <span className="font-body-sm text-on-surface font-medium truncate max-w-full px-2">
                            PDF Document
                          </span>
                          <a
                            href={`/api/voters/id-card?matricNumber=${encodeURIComponent(selected.matricNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary text-white px-4 py-2 rounded-full font-semibold hover:brightness-110 active:scale-95 transition-all text-xs flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            Open PDF in New Tab
                          </a>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/voters/id-card?matricNumber=${encodeURIComponent(selected.matricNumber)}`}
                          alt="Uploaded verification document"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selected.status === "pending" && (
                <div className="absolute bottom-0 w-full p-6 bg-white border-t border-outline-variant flex flex-col gap-3">
                  {actionError && <p className="text-error text-body-sm">{actionError}</p>}
                  {showRejectInput && (
                    <textarea
                      className="w-full border border-outline-variant rounded-lg p-3 text-body-sm"
                      placeholder="Reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                    />
                  )}
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={isActing}
                    className="w-full bg-primary text-white py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Approve Registration
                  </button>
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={isActing}
                    className="w-full bg-white text-error border border-error py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-error/5 transition-all disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    {showRejectInput ? "Confirm Rejection" : "Reject & Request Re-upload"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="p-6 text-on-surface-variant">Select a voter to review.</p>
          )}
        </section>
      </div>
    </>
  );
}
