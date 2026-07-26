"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // New admin form fields
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch("/api/admin/me");
    if (res.ok) {
      const data = await res.json();
      setEmail(data.email);
      setRole(data.role);
    }
  }

  async function loadAdmins() {
    setLoadingAdmins(true);
    const res = await fetch("/api/admin");
    if (res.ok) {
      const data = await res.json();
      setAdmins(data);
    }
    setLoadingAdmins(false);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSavingAdmin(true);

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      }),
    });

    const data = await res.json();
    setSavingAdmin(false);

    if (!res.ok) {
      setFormError(data.error?.email?.[0] || data.error?.password?.[0] || data.error || "Failed to create administrator.");
      return;
    }

    setFormSuccess("Administrator added successfully!");
    setNewEmail("");
    setNewPassword("");
    setNewRole("admin");
    setShowAddForm(false);
    loadAdmins();
  }

  async function handleDeleteAdmin(id: string, adminEmail: string) {
    if (!confirm(`Are you sure you want to delete admin "${adminEmail}"?`)) {
      return;
    }

    setDeletingId(id);
    setDeleteError(null);

    const res = await fetch(`/api/admin/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setDeleteError(data.error || "Failed to delete administrator.");
      return;
    }

    loadAdmins();
  }

  useEffect(() => {
    loadStatus();
    loadAdmins();
  }, []);

  const isSuperAdmin = role === "superadmin";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AdminHeader title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-gutter max-w-4xl w-full mx-auto space-y-gutter">
        {/* Profile Card */}
        <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-xs">Account Settings</h1>
            <p className="text-on-surface-variant mb-2">Signed in as <strong className="text-on-surface">{email}</strong></p>
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-on-surface-variant">Role:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${isSuperAdmin
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                }`}>
                {role || "loading..."}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 text-error border border-error hover:bg-error-container/20 px-6 py-2.5 rounded-full font-semibold transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </section>

        {/* Admin List Card */}
        <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-headline-md text-on-surface">System Administrators</h2>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                List of registered portal administrators and their roles.
              </p>
            </div>
            {isSuperAdmin && !showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="bg-primary text-white hover:opacity-90 px-4 py-2 rounded-full font-semibold text-body-sm flex items-center gap-2 transition-all w-fit"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Admin
              </button>
            )}
          </div>

          {deleteError && (
            <div className="p-4 mx-6 mt-4 bg-error-container text-error rounded-lg text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {deleteError}
            </div>
          )}

          {/* Add Admin Form */}
          {isSuperAdmin && showAddForm && (
            <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-headline-sm text-on-surface mb-4">Add New Administrator</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[11px]">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@nacoss.org"
                      className="w-full h-11 px-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-body-md"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[11px]">Password (min 8 chars)</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full h-11 px-3 border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-body-md"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-[11px]">Role</label>
                    <select
                      className="w-full h-11 px-3 border border-outline-variant bg-white rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-body-md"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <p className="text-error text-body-sm flex items-center gap-1.5 mt-1">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {formError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingAdmin}
                    className="bg-primary text-white px-5 py-2 rounded-full font-semibold text-body-sm disabled:opacity-60 transition-opacity flex items-center gap-1.5"
                  >
                    {savingAdmin ? "Saving..." : "Create Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="border border-outline-variant px-5 py-2 rounded-full font-semibold text-body-sm hover:bg-surface-container-low transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 mx-6 mt-4 bg-primary-container text-primary rounded-lg text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              {formSuccess}
            </div>
          )}

          {/* Admins List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface font-bold text-[11px] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface font-bold text-[11px] uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3.5 text-label-caps text-on-surface font-bold text-[11px] uppercase tracking-wider">Registered</th>
                  {isSuperAdmin && (
                    <th className="px-6 py-3.5 text-label-caps text-on-surface font-bold text-[11px] uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loadingAdmins ? (
                  <tr>
                    <td className="px-6 py-6 text-on-surface-variant" colSpan={isSuperAdmin ? 4 : 3}>
                      <div className="flex items-center gap-2">
                        <span className="animate-spin material-symbols-outlined text-primary text-[20px]">sync</span>
                        Loading administrators...
                      </div>
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-on-surface-variant text-center" colSpan={isSuperAdmin ? 4 : 3}>
                      No administrators found.
                    </td>
                  </tr>
                ) : (
                  admins.map((adm) => {
                    const isSelf = adm.email === email;
                    const isSuper = adm.role === "superadmin";
                    const isLastSuperAdmin = isSuper && admins.filter((a) => a.role === "superadmin").length <= 1;

                    return (
                      <tr key={adm.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="px-6 py-4 font-technical-code font-bold text-on-surface text-body-md">
                          <div className="flex items-center gap-2">
                            <span>{adm.email}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-primary-container text-primary font-semibold px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${isSuper
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                            }`}>
                            {adm.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-technical-code text-on-surface-variant text-body-sm">
                          {new Date(adm.createdAt).toLocaleDateString()}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4 text-right">
                            {isSelf || isLastSuperAdmin ? (
                              <span className="text-[11px] text-outline italic pr-2">
                                Protected
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                                disabled={deletingId === adm.id}
                                className="p-2 hover:bg-error-container text-error rounded-full transition-colors inline-flex items-center justify-center disabled:opacity-60"
                                title="Delete Administrator"
                              >
                                {deletingId === adm.id ? (
                                  <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
                                ) : (
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                )}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
