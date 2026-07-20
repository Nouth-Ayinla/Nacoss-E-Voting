"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

type Candidate = {
  id: string;
  name: string;
  position: string;
  imageUrl: string | null;
  manifesto: string | null;
};

type FormState = {
  name: string;
  position: string;
  imageUrl: string;
  manifesto: string;
};

const EMPTY_FORM: FormState = { name: "", position: "", imageUrl: "", manifesto: "" };

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
    <>
      <AdminHeader title="Candidate Management" />
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
            className="bg-primary text-white px-4 py-2 rounded-full font-semibold text-body-sm flex items-center gap-2 hover:opacity-90 transition-opacity w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Candidate
          </button>
        </div>

        {formOpen && (
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
              {editingId ? "Edit Candidate" : "New Candidate"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <input
                  className="w-full h-11 px-3 border border-outline-variant rounded focus:border-primary transition-all"
                  placeholder="e.g. President"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  required
                />
              </div>

              {/* Photo Upload & Preview Component */}
              <div className="space-y-2 md:col-span-2">
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

              <div className="space-y-1 md:col-span-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Manifesto <span className="normal-case text-outline">(optional)</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:border-primary transition-all"
                  rows={3}
                  value={form.manifesto}
                  onChange={(e) => setForm((f) => ({ ...f, manifesto: e.target.value }))}
                />
              </div>

              {error && <p className="text-error text-body-sm md:col-span-2">{error}</p>}

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary text-white px-4 py-2 rounded-full font-semibold text-body-sm disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Candidate"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="border border-outline-variant px-4 py-2 rounded-full font-semibold text-body-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <p className="text-on-surface-variant">Loading candidates...</p>
        ) : Object.keys(byPosition).length === 0 ? (
          <p className="text-on-surface-variant">No candidates added yet.</p>
        ) : (
          Object.entries(byPosition).map(([position, list]) => (
            <section key={position} className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/30">
                <h3 className="font-headline-md text-on-surface">{position}</h3>
              </div>
              <div className="divide-y divide-outline-variant/30">
                {list.map((candidate) => (
                  <div key={candidate.id} className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold flex-shrink-0 overflow-hidden">
                      {candidate.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        candidate.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-on-surface truncate">{candidate.name}</p>
                      {candidate.manifesto && (
                        <p className="text-body-sm text-on-surface-variant truncate">{candidate.manifesto}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditForm(candidate)}
                        className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                      >
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(candidate.id)}
                        disabled={deletingId === candidate.id}
                        className="p-2 hover:bg-error-container rounded-full transition-colors disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-error text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
