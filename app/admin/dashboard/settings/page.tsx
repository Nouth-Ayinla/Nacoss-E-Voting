"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  async function loadStatus() {
    const res = await fetch("/api/admin/me");
    if (res.ok) {
      const data = await res.json();
      setEmail(data.email);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  useEffect(() => {
    loadStatus();
  }, []);



  return (
    <>
      <AdminHeader title="Settings" />
      <div className="p-gutter max-w-2xl w-full mx-auto space-y-gutter">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-xs">Account Settings</h1>
          <p className="text-on-surface-variant">Signed in as {email}</p>
        </div>



        <section className="md:hidden bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-error border border-error py-3 rounded-full font-semibold"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </section>
      </div>
    </>
  );
}
