"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/dashboard", label: "Voters", icon: "how_to_reg" },
  { href: "/admin/dashboard/candidates", label: "Candidates", icon: "groups" },
  { href: "/admin/dashboard/election", label: "Election", icon: "how_to_vote" },
  { href: "/admin/dashboard/results", label: "Results", icon: "analytics" },
  { href: "/admin/dashboard/settings", label: "Settings", icon: "settings" },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface flex justify-around items-center px-2 py-2 pb-safe shadow-lg">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-200 ${
              isActive ? "text-primary font-semibold" : "text-on-surface-variant"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="font-label-caps text-label-caps mt-1">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

