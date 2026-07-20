"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Voter Verification", icon: "verified_user" },
  { href: "/admin/dashboard/candidates", label: "Candidate Management", icon: "groups" },
  { href: "/admin/dashboard/election", label: "Election Setup", icon: "how_to_vote" },
  { href: "/admin/dashboard/results", label: "Election Results", icon: "analytics" },
  { href: "/admin/dashboard/audit", label: "Audit Logs", icon: "receipt_long" },
  { href: "/admin/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function AdminHeader({ title }: { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <>
      <header className="w-full top-0 sticky bg-surface border-b border-outline-variant md:border-none z-30 shadow-sm md:shadow-none">
        <div className="flex justify-between items-center px-gutter py-stack-md w-full">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu on Mobile */}
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-on-surface-variant">menu</span>
            </button>
            <span className="font-headline-md text-primary tracking-tight font-bold md:hidden text-[16px]">
              NACOSS E-Voting Portal
            </span>
            <span className="h-4 w-px bg-outline-variant hidden md:block" />
            <span className="text-on-surface-variant font-body-md font-semibold hidden md:inline-block">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden md:flex p-2 hover:bg-surface-container-low rounded-full transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest">
              <span className="material-symbols-outlined text-primary">account_circle</span>
              <span className="font-label-caps text-label-caps">Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-full max-w-xs bg-surface border-r border-outline-variant h-full p-6 shadow-2xl animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-6 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="NACOSS Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="font-headline-md text-[16px] text-primary font-bold">Admin Portal</h2>
                  <p className="text-on-surface-variant text-[11px]">Election 2026</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded transition-all active:scale-95 ${
                      isActive
                        ? "bg-primary-container text-white font-semibold shadow-md shadow-primary/10"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="font-body-md text-[15px]">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Section */}
            <div className="pt-4 border-t border-outline-variant">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 px-4 py-2 text-error hover:bg-error-container rounded-full transition-colors font-semibold"
              >
                <span className="material-symbols-outlined">logout</span>
                <span className="font-body-md text-[15px]">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
