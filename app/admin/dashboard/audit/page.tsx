"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type AuditLog = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: { email: string };
};

function describeAction(log: AuditLog): string {
  const meta = log.metadata ?? {};
  switch (log.action) {
    case "voter_approve":
      return `Approved matric number ${meta.matricNumber}`;
    case "voter_reject":
      return `Rejected matric number ${meta.matricNumber}: ${meta.rejectionReason ?? "no reason given"}`;
    case "candidate_create":
      return `Created candidate (${meta.candidateId})`;
    case "candidate_update":
      return `Updated candidate (${meta.candidateId})`;
    case "candidate_delete":
      return `Deleted candidate (${meta.candidateId})`;
    case "election_state_change":
      return `Changed election state to "${meta.newState}"`;
    case "admin_2fa_enabled":
      return "Enabled two-factor authentication on their account";
    case "admin_2fa_disabled":
      return "Disabled two-factor authentication on their account";
    default:
      return log.action;
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [chainStatus, setChainStatus] = useState<{
    valid: boolean;
    checkedCount: number;
    reason: string | null;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/audit-logs?limit=100");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  async function verifyChain() {
    setIsVerifying(true);
    const res = await fetch("/api/audit/verify-chain");
    if (res.ok) setChainStatus(await res.json());
    setIsVerifying(false);
  }

  const filtered = logs.filter((log) => {
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.admin.email.toLowerCase().includes(term) ||
      describeAction(log).toLowerCase().includes(term)
    );
  });

  return (
    <>
      <AdminHeader title="System Audit Log" />
      <div className="p-gutter max-w-container-max mx-auto w-full space-y-gutter">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-xs">System Audit Log</h1>
            <p className="font-body-md text-on-surface-variant max-w-2xl">
              Insert-only record of all administrative actions. Entries cannot be edited or deleted.
            </p>
          </div>
          <div className="flex items-center bg-surface-container-low px-stack-md py-stack-xs rounded-lg border border-outline-variant focus-within:border-primary transition-all w-72">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-sm w-full"
              placeholder="Search audit logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-gutter py-stack-md text-label-caps text-on-surface font-bold">Timestamp</th>
                  <th className="px-gutter py-stack-md text-label-caps text-on-surface font-bold">Admin</th>
                  <th className="px-gutter py-stack-md text-label-caps text-on-surface font-bold">Event Type</th>
                  <th className="px-gutter py-stack-md text-label-caps text-on-surface font-bold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {isLoading ? (
                  <tr>
                    <td className="px-gutter py-stack-md text-on-surface-variant" colSpan={4}>
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-gutter py-stack-md text-on-surface-variant" colSpan={4}>
                      No matching events.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-gutter py-stack-md font-technical-code text-on-surface-variant">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-gutter py-stack-md font-technical-code font-bold">{log.admin.email}</td>
                      <td className="px-gutter py-stack-md">
                        <span className="px-stack-sm py-stack-xs rounded bg-surface-container-high text-label-caps text-[10px] uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-gutter py-stack-md text-body-sm">{describeAction(log)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile compact card list */}
          <div className="md:hidden divide-y divide-outline-variant">
            {isLoading ? (
              <p className="p-4 text-on-surface-variant">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-on-surface-variant">No matching events.</p>
            ) : (
              filtered.map((log, i) => (
                <div key={log.id} className={`p-4 ${i % 2 === 0 ? "bg-white" : "bg-surface-container-low/40"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-technical-code text-technical-code text-primary-container">
                      {log.action.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface mb-2">{describeAction(log)}</p>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <p className="text-[10px] text-outline font-label-caps uppercase tracking-tighter">
                        Timestamp
                      </p>
                      <p className="font-technical-code text-body-sm text-on-surface">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-outline font-label-caps uppercase tracking-tighter">Admin</p>
                      <p className="font-technical-code text-body-sm text-on-surface">{log.admin.email}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
