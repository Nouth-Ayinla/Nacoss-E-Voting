"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ElectionStateControl from "./ElectionStateControl";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Voter Verification", icon: "verified_user" },
  { href: "/admin/dashboard/class-list", label: "Class List Roster", icon: "badge" },
  { href: "/admin/dashboard/candidates", label: "Candidate Management", icon: "groups" },
  { href: "/admin/dashboard/election", label: "Election Setup", icon: "how_to_vote" },
  { href: "/admin/dashboard/results", label: "Election Results", icon: "analytics" },
  { href: "/admin/dashboard/audit", label: "Audit Logs", icon: "receipt_long" },
  { href: "/admin/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant hidden md:flex flex-col py-stack-lg z-40">
      <div className="px-gutter mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NACOSS FUTA Chapter Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-headline-md text-[18px] text-primary font-bold leading-tight">Admin Portal</h1>
            <p className="text-on-surface-variant text-[12px]">Election 2026</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-stack-md space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded transition-all active:scale-95 ${
                isActive
                  ? "bg-primary-container text-white font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-stack-md pt-stack-lg border-t border-outline-variant mt-stack-lg">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-error hover:bg-error-container rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body-md">Logout</span>
        </button>
      </div>
    </aside>
  );
}
