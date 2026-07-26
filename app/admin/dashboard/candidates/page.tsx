"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

const POSITIONS = [
  "President",
  "Vice President",
  "General Secretary",
  "Assistant General Secretary",
  "Financial Secretary",
  "Public Relation Officer",
  "Treasurer",
  "Welfare Director",
  "Director of Sports",
  "Director of Socials",
  "Director of Software",
];

type Candidate = {
  id: string;
  name: string;
  position: string;
  level: number;
  imageUrl: string | null;
  manifesto: string | null;
};

type FormState = {
  name: string;
  position: string;
  level: string;
  imageUrl: string;
  manifesto: string;
};

const EMPTY_FORM: FormState = { name: "", position: "", level: "", imageUrl: "", manifesto: "" };

export default function CandidateManagementPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    const res = await fetch("/api/candidates");
    if (res.ok) setCandidates(await res.json());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEditForm(candidate: Candidate) {
    setEditingId(candidate.id);
    setForm({
      name: candidate.name,
      position: candidate.position,
      level: String(candidate.level),
      imageUrl: candidate.imageUrl ?? "",
      manifesto: candidate.manifesto ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      position: form.position.trim(),
      level: parseInt(form.level, 10),
      imageUrl: form.imageUrl.trim() || undefined,
      manifesto: form.manifesto.trim() || undefined,
    };

    const res = await fetch(editingId ? `/api/candidates/${editingId}` : "/api/candidates", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Could not save candidate.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) await load();
  }

  const byPosition = candidates.reduce<Record<string, Candidate[]>>((acc, c) => {
    (acc[c.position] ??= []).push(c);
    return acc;
  }, {});

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setForm((f) => ({ ...f, imageUrl: event.target!.result as string }));
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AdminHeader title="Candidate Management" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-gutter max-w-container-max mx-auto w-full space-y-gutter">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-xs">Candidates</h1>
              <p className="font-body-md text-on-surface-variant">
                Manage who appears on the ballot for each position.
              </p>
            </div>
            <button
              onClick={openCreateForm}
              className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 hover:opacity-95 transition-all shadow-sm w-fit"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Candidate
            </button>
          </div>

          {formOpen && (
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                {editingId ? "Edit Candidate" : "New Candidate"}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Name</label>
                  <input
                    className="w-full h-11 px-3 border border-outline-variant rounded focus:border-primary transition-all"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Position / Executive Post
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-outline-variant rounded focus:border-primary transition-all bg-white"
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    required
                  >
                    <option value="" disabled>-- Select Position --</option>
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Candidate Level (100 - 300)
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-outline-variant rounded focus:border-primary transition-all bg-white"
                    value={form.level}
                    onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                    required
                  >
                    <option value="" disabled>-- Select Level --</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                  </select>
                </div>

                {/* Photo Upload & Preview Component */}
                <div className="space-y-2 md:col-span-3">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center justify-between">
                    <span>Candidate Photo</span>
                    <span className="normal-case text-outline text-xs">Upload Image File or Paste URL</span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                    {/* Photo Avatar Preview */}
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {form.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-outline text-2xl">person</span>
                      )}
                    </div>

                    <div className="flex-grow space-y-2 w-full">
                      <div className="flex items-center gap-3">
                        <label className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer hover:bg-primary/95 transition-all flex items-center gap-2 shadow-sm">
                          <span className="material-symbols-outlined text-base">cloud_upload</span>
                          Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        {form.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                            className="text-xs text-error font-medium hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span> Remove Photo
                          </button>
                        )}
                      </div>

                      <input
                        className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded focus:border-primary transition-all font-mono"
                        placeholder="Or paste direct image URL (https://...)"
                        value={form.imageUrl}
                        onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Manifesto <span className="normal-case text-outline">(optional)</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-outline-variant rounded focus:border-primary transition-all font-body-md text-charcoal-slate"
                    rows={4}
                    value={form.manifesto}
                    onChange={(e) => setForm((f) => ({ ...f, manifesto: e.target.value }))}
                  />
                </div>

                {error && <p className="text-error text-body-sm md:col-span-3">{error}</p>}

                <div className="md:col-span-3 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Candidate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="border border-outline-variant px-5 py-2.5 rounded-full font-bold text-xs bg-white hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-on-surface-variant font-medium">Loading candidates...</div>
          ) : Object.keys(byPosition).length === 0 ? (
            <div className="text-center py-12 bg-white border border-outline-variant rounded-xl shadow-sm">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">groups_3</span>
              <p className="text-on-surface-variant font-medium">No candidates registered yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(byPosition).map(([position, list]) => (
                <div key={position} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-2">
                    <h3 className="font-headline-md text-[16px] font-bold text-charcoal-slate uppercase tracking-wide">
                      {position}
                    </h3>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {list.length} Candidate{list.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {list.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden group"
                      >
                        <div className="space-y-4">
                          {/* Candidate Identity Header (Side-by-Side Layout) */}
                          <div className="flex flex-row items-center gap-4 text-left">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-container-high border-2 border-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0 overflow-hidden shadow-md group-hover:border-primary/40 transition-colors">
                              {candidate.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={candidate.imageUrl}
                                  alt={candidate.name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                />
                              ) : (
                                <span className="text-2xl font-extrabold">
                                  {candidate.name
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join("")}
                                </span>
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-bold text-body-lg text-charcoal-slate truncate" title={candidate.name}>
                                {candidate.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {candidate.position}
                                </span>
                                <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {candidate.level} Level
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Manifesto Scrollable Text Box */}
                          <div className="bg-surface-container-low/40 p-4 rounded-xl text-body-sm text-on-surface-variant font-medium leading-relaxed max-h-36 overflow-y-auto border border-outline-variant/30">
                            <span className="text-[10px] font-bold uppercase tracking-wider block text-outline mb-1.5 font-label-caps">
                              Manifesto / Agenda
                            </span>
                            <p className="whitespace-pre-wrap">
                              {candidate.manifesto || <span className="italic text-outline">No manifesto provided.</span>}
                            </p>
                          </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex items-center justify-end gap-2 border-t border-outline-variant/30 pt-3">
                          <button
                            onClick={() => openEditForm(candidate)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-outline-variant text-charcoal-slate hover:bg-surface-container-low rounded-full text-xs font-semibold shadow-xs transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(candidate.id)}
                            disabled={deletingId === candidate.id}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-error-container text-on-error-container hover:bg-error-container/90 disabled:opacity-60 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>{deletingId === candidate.id ? "..." : "Delete"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
