"use client";

import { useEffect, useState, useTransition } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import * as XLSX from "xlsx";

interface ClassRosterItem {
  id: string;
  matricNumber: string;
  name: string;
  level: number;
  department: string;
  status: string;
  createdAt: string;
}

interface VerificationItem {
  voter: {
    matricNumber: string;
    name: string;
    email: string;
    documentType: string;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  };
  verificationResult: {
    status: "MATCH" | "MISMATCH" | "NOT_FOUND";
    similarityScore: number;
    masterRecord: ClassRosterItem | null;
    details?: string;
  };
}

export default function ClassListDashboardPage() {
  const [activeTab, setActiveTab] = useState<"roster" | "verifications">("roster");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [rosterItems, setRosterItems] = useState<ClassRosterItem[]>([]);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [summary, setSummary] = useState({
    totalVoters: 0,
    matchCount: 0,
    mismatchCount: 0,
    notFoundCount: 0,
    totalRosterEntries: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassRosterItem | null>(null);

  // Upload Form State
  const [uploadLevel, setUploadLevel] = useState<number>(100);
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);

  // Single Add Form State
  const [addName, setAddName] = useState("");
  const [addMatric, setAddMatric] = useState("");
  const [addLevel, setAddLevel] = useState<number>(100);
  const [addDepartment, setAddDepartment] = useState("Computer Science");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editMatric, setEditMatric] = useState("");
  const [editLevel, setEditLevel] = useState<number>(100);
  const [editDepartment, setEditDepartment] = useState("Computer Science");

  // Pagination State
  const [rosterPage, setRosterPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setRosterPage(1);
  }, [selectedLevel, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [selectedLevel, searchQuery, rosterPage]);

  async function safeFetchJson(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    let data: any = null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = "/admin/login";
        throw new Error("Session expired. Please log in again.");
      }
      if (res.status === 500) {
        throw new Error("A database connection or system error occurred. Please try again in a few moments.");
      }
      throw new Error(data?.error || "An unexpected error occurred. Please check your inputs and try again.");
    }
    return data || {};
  }

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const levelQuery = selectedLevel === "all" ? "all" : selectedLevel.toString();
      const searchQueryParam = searchQuery.trim() ? encodeURIComponent(searchQuery.trim()) : "";

      // Fetch Roster with pagination and search
      const rosterData = await safeFetchJson(`/api/admin/class-list?level=${levelQuery}&search=${searchQueryParam}&page=${rosterPage}&limit=25`);
      setRosterItems(rosterData.roster || []);
      setTotalPages(rosterData.pagination?.totalPages || 1);
      setTotalCount(rosterData.pagination?.totalCount || 0);

      // Fetch Verifications
      const verifData = await safeFetchJson(`/api/admin/class-list/verify?level=${levelQuery}`);
      setVerifications(verifData.verifications || []);
      setSummary(verifData.summary || {
        totalVoters: 0,
        matchCount: 0,
        mismatchCount: 0,
        notFoundCount: 0,
        totalRosterEntries: 0,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load class list data");
    } finally {
      setLoading(false);
    }
  }

  // Roster Items are already filtered and paginated from the backend API
  const filteredRoster = rosterItems;

  // Filter Verification Items by search query
  const filteredVerifications = verifications.filter(
    (item) =>
      item.voter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.voter.matricNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle CSV Upload / Paste Submit
  async function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText.trim()) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Parse CSV text: support lines formatted as "Matric, Name" or "Matric, Name, Level"
      const lines = csvText.trim().split("\n");
      const parsedItems: Array<{ matricNumber: string; name: string; level: number; department: string }> = [];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.toLowerCase().startsWith("matric")) continue; // skip header or empty

        const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 2) {
          const matric = parts[0];
          const name = parts[1];
          let level = uploadLevel;

          if (parts.length >= 3 && !isNaN(parseInt(parts[2], 10))) {
            level = parseInt(parts[2], 10);
          }

          if (matric && name) {
            parsedItems.push({
              matricNumber: matric,
              name,
              level,
              department: "Computer Science",
            });
          }
        }
      }

      if (parsedItems.length === 0) {
        throw new Error("No valid lines found. Ensure format is 'MatricNumber, Student Name'.");
      }

      const data = await safeFetchJson("/api/admin/class-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedItems),
      });

      setSuccessMsg(data.message || `Uploaded ${parsedItems.length} entries successfully.`);
      setShowUploadModal(false);
      setCsvText("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  }

  // Handle Excel (.xlsx, .xls) and CSV File Upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvTextOutput = XLSX.utils.sheet_to_csv(worksheet);
          setCsvText(csvTextOutput || "");
        } catch (err: any) {
          setError("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text || "");
      };
      reader.readAsText(file);
    }
  }

  // Single Add Submit
  async function handleSingleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim() || !addMatric.trim()) return;

    setError(null);
    setSuccessMsg(null);

    try {
      await safeFetchJson("/api/admin/class-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNumber: addMatric.trim(),
          name: addName.trim(),
          level: addLevel,
          department: addDepartment.trim(),
        }),
      });

      setSuccessMsg("Student added to class roster.");
      setShowAddModal(false);
      setAddName("");
      setAddMatric("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to add student");
    }
  }

  // Open Edit Modal
  function handleOpenEdit(item: ClassRosterItem) {
    setEditingItem(item);
    setEditName(item.name);
    setEditMatric(item.matricNumber);
    setEditLevel(item.level);
    setEditDepartment(item.department || "Computer Science");
  }

  // Save Edit
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await safeFetchJson(`/api/admin/class-list/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          matricNumber: editMatric,
          level: editLevel,
          department: editDepartment,
        }),
      });

      setSuccessMsg("Class list entry updated successfully.");
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update record");
    }
  }

  // Delete Entry
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this record from the class list?")) return;

    try {
      await safeFetchJson(`/api/admin/class-list/${id}`, { method: "DELETE" });
      setSuccessMsg("Record deleted from class list.");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete record");
    }
  }

  // Quick Approve Voter Action
  async function handleVerifyVoterAction(matricNumber: string, action: "approve" | "reject", reason?: string) {
    try {
      await safeFetchJson("/api/voters/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNumber,
          action,
          rejectionReason: reason,
        }),
      });

      setSuccessMsg(`Voter ${matricNumber} has been ${action === "approve" ? "verified" : "rejected"}.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Voter action failed");
    }
  }

  // Clear/Delete Class List
  async function handleClearClassList() {
    const levelQuery = selectedLevel === "all" ? "all" : selectedLevel.toString();
    const promptMessage = selectedLevel === "all"
      ? "Are you sure you want to delete the ENTIRE class list roster? This will purge all 100L–500L student records and cannot be undone."
      : `Are you sure you want to delete all ${selectedLevel}L records from the class roster? This action cannot be undone.`;

    if (!confirm(promptMessage)) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await safeFetchJson(`/api/admin/class-list?level=${levelQuery}`, {
        method: "DELETE",
      });
      setSuccessMsg(data.message || "Class list cleared successfully.");
      setRosterPage(1);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to clear class list");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AdminHeader title="Class List Roster & Verification" />

      <main className="flex-1 p-gutter max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header & Alert Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">Class List Roster (100L – 500L)</h1>
            <p className="text-on-surface-variant text-sm">
              Upload official level rosters, edit entries, and cross-reference submitted voter registrations.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-full shadow hover:bg-primary/90 hover:shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Upload Excel / CSV List
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-outline text-on-surface font-semibold text-sm rounded-full hover:bg-surface-container-high transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              Add Single Student
            </button>
            <button
              onClick={handleClearClassList}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-error/30 text-error hover:bg-error-container/20 font-semibold text-sm rounded-full transition-all active:scale-95"
              title="Delete class list records"
            >
              <span className="material-symbols-outlined text-lg">delete_sweep</span>
              Clear Class List
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-4 bg-error-container text-error rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="material-symbols-outlined text-sm">close</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="material-symbols-outlined text-sm">close</button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant">Master Roster Records</span>
              <span className="material-symbols-outlined text-primary">groups</span>
            </div>
            <p className="text-2xl font-bold text-on-surface mt-2">{summary.totalRosterEntries}</p>
            <p className="text-xs text-on-surface-variant mt-1">Across levels 100L - 500L</p>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">Class List Match</span>
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{summary.matchCount}</p>
            <p className="text-xs text-on-surface-variant mt-1">Voters matching master list</p>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">Name Mismatch</span>
              <span className="material-symbols-outlined text-amber-600">warning</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{summary.mismatchCount}</p>
            <p className="text-xs text-on-surface-variant mt-1">Matric found, name typo</p>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">Not in Class List</span>
              <span className="material-symbols-outlined text-rose-600">person_off</span>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{summary.notFoundCount}</p>
            <p className="text-xs text-on-surface-variant mt-1">Matric not in roster</p>
          </div>
        </div>

        {/* Registered Voters Per Level Breakdown */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">how_to_vote</span>
            Registered Voters per Level (Verified vs Pending)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {([100, 200, 300, 400, 500] as const).map((lvl) => {
              const lvlData = (summary as any).registeredByLevel?.[lvl] || { total: 0, verified: 0, pending: 0 };
              return (
                <div key={lvl} className="p-2.5 rounded-lg bg-surface-container border border-outline-variant text-center flex flex-col justify-between">
                  <div>
                    <span className="block text-[11px] font-semibold uppercase text-on-surface-variant">{lvl}L</span>
                    <span className="text-lg font-bold text-on-surface mt-1 block">{lvlData.total}</span>
                    <span className="text-[10px] text-on-surface-variant">Registered</span>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-outline-variant/30 flex justify-center gap-2 text-[9px] font-bold">
                    <span className="text-emerald-600" title="Verified count">{lvlData.verified} V</span>
                    <span className="text-outline-variant">•</span>
                    <span className="text-amber-600" title="Pending count">{lvlData.pending} P</span>
                  </div>
                </div>
              );
            })}
            <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant text-center flex flex-col justify-between">
              <div>
                <span className="block text-[11px] font-semibold uppercase text-on-surface-variant">Unknown/Other</span>
                <span className="text-lg font-bold text-on-surface mt-1 block">{(summary as any).registeredByLevel?.unknown?.total ?? 0}</span>
                <span className="text-[10px] text-on-surface-variant">Unresolved</span>
              </div>
              <div className="mt-2 pt-1.5 border-t border-outline-variant/30 flex justify-center gap-2 text-[9px] font-bold">
                <span className="text-emerald-600" title="Verified count">{(summary as any).registeredByLevel?.unknown?.verified ?? 0} V</span>
                <span className="text-outline-variant">•</span>
                <span className="text-amber-600" title="Pending count">{(summary as any).registeredByLevel?.unknown?.pending ?? 0} P</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Tabs & Filter Controls */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Level Filter Buttons (100L - 500L) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <span className="text-xs font-semibold uppercase text-on-surface-variant mr-2">Level:</span>
              {(["all", 100, 200, 300, 400, 500] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedLevel === lvl
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {lvl === "all" ? "All Levels" : `${lvl}L`}
                </button>
              ))}
            </div>

          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-lg">search</span>
            <input
              type="text"
              placeholder="Search by student name or matriculation number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
            />
          </div>
        </div>

        {/* Master Class Roster Table */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-outline-variant">
              {loading ? (
                <div className="px-6 py-8 text-center text-on-surface-variant">
                  Loading class roster entries...
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="px-6 py-8 text-center text-on-surface-variant">
                  No class list records found for the selected level or query.
                </div>
              ) : (
                filteredRoster.map((item) => (
                  <div key={item.id} className="p-4 space-y-2 hover:bg-surface-container-high/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-primary text-sm">{item.matricNumber}</span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-container text-primary">
                        {item.level}L
                      </span>
                    </div>
                    <div className="font-medium text-on-surface text-sm">{item.name}</div>
                    <div className="text-xs text-on-surface-variant">{item.department || "Computer Science"}</div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
                      <div>
                        {item.status === "verified" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                            <span className="material-symbols-outlined text-[10px]">check_circle</span>
                            Verified
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                            <span className="material-symbols-outlined text-[10px]">schedule</span>
                            Pending
                          </span>
                        )}
                        {(item.status === "rejected" || item.status === "unverified" || !item.status) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                            <span className="material-symbols-outlined text-[10px]">info</span>
                            Not Registered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-primary hover:bg-primary-container rounded transition-colors"
                          title="Edit Record"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-error hover:bg-error-container rounded transition-colors"
                          title="Delete Record"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-on-surface">
                <thead className="bg-surface-container text-xs uppercase font-semibold text-on-surface-variant border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-3">Matric Number</th>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Academic Level</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Verification Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                        Loading class roster entries...
                      </td>
                    </tr>
                  ) : filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                        No class list records found for the selected level or query.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-primary">{item.matricNumber}</td>
                        <td className="px-6 py-4 font-medium text-on-surface">{item.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary-container text-primary">
                            {item.level}L
                          </span>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{item.department || "Computer Science"}</td>
                        <td className="px-6 py-4">
                          {item.status === "verified" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Verified
                            </span>
                          )}
                          {item.status === "pending" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              Pending
                            </span>
                          )}
                          {(item.status === "rejected" || item.status === "unverified" || !item.status) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400">
                              <span className="material-symbols-outlined text-xs">info</span>
                              Not Registered
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-primary hover:bg-primary-container rounded transition-colors"
                            title="Edit Record"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-error hover:bg-error-container rounded transition-colors"
                            title="Delete Record"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-surface-container-low px-6 py-4 flex items-center justify-between border-t border-outline-variant">
                <div className="text-xs text-on-surface-variant">
                  Showing page <span className="font-semibold text-on-surface">{rosterPage}</span> of <span className="font-semibold text-on-surface">{totalPages}</span> ({totalCount} total entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={rosterPage === 1 || loading}
                    onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-outline text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    Previous
                  </button>
                  <button
                    disabled={rosterPage === totalPages || loading}
                    onClick={() => setRosterPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-outline text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    Next
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
      </main>

      {/* CSV Bulk Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Upload Class List (CSV)</h2>
              <button onClick={() => setShowUploadModal(false)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Default Target Academic Level
                </label>
                <select
                  value={uploadLevel}
                  onChange={(e) => setUploadLevel(parseInt(e.target.value, 10))}
                  className="w-full text-sm p-2 bg-surface border border-outline rounded-lg text-on-surface"
                >
                  <option value={100}>100 Level (Freshers)</option>
                  <option value={200}>200 Level</option>
                  <option value={300}>300 Level</option>
                  <option value={400}>400 Level</option>
                  <option value={500}>500 Level (Final Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Choose Excel (.xlsx, .xls) or CSV File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Or Paste CSV Content (Format: <code className="font-mono text-xs text-primary">MatricNumber, Student Name</code>)
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`CSC/22/1001, John Doe\nCSC/22/1002, Jane Smith`}
                  className="w-full p-3 text-xs font-mono bg-surface border border-outline rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-outline rounded-lg text-on-surface hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !csvText.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploading ? "Processing Upload..." : "Import Class List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Add Student to Class List</h2>
              <button onClick={() => setShowAddModal(false)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>

            <form onSubmit={handleSingleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Matriculation Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC/22/1001"
                  value={addMatric}
                  onChange={(e) => setAddMatric(e.target.value)}
                  className="w-full p-2 text-sm bg-surface border border-outline rounded-lg text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adewale Temitope"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full p-2 text-sm bg-surface border border-outline rounded-lg text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Academic Level</label>
                <select
                  value={addLevel}
                  onChange={(e) => setAddLevel(parseInt(e.target.value, 10))}
                  className="w-full p-2 text-sm bg-surface border border-outline rounded-lg text-on-surface"
                >
                  <option value={100}>100 Level</option>
                  <option value={200}>200 Level</option>
                  <option value={300}>300 Level</option>
                  <option value={400}>400 Level</option>
                  <option value={500}>500 Level</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-outline rounded-lg text-on-surface"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg shadow">
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">Edit Class List Entry</h2>
              <button onClick={() => setEditingItem(null)} className="material-symbols-outlined text-on-surface-variant">close</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Matriculation Number</label>
                <input
                  type="text"
                  required
                  value={editMatric}
                  onChange={(e) => setEditMatric(e.target.value)}
                  className="w-full p-2 text-sm bg-surface border border-outline rounded-lg text-on-surface font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 text-sm bg-surface border border-outline rounded-lg text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Academic Level</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(parseInt(e.target.value, 10))}
                  className="w-full p-2 text-sm bg-surface border border-outline rounded-lg text-on-surface"
                >
                  <option value={100}>100 Level</option>
                  <option value={200}>200 Level</option>
                  <option value={300}>300 Level</option>
                  <option value={400}>400 Level</option>
                  <option value={500}>500 Level</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold border border-outline rounded-lg text-on-surface"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg shadow">
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
