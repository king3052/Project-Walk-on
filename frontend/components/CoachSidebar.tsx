"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { LayoutDashboard, LogOut } from "lucide-react";
import Image from "next/image";

export function CoachSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="print:hidden hidden md:flex w-56 shrink-0 border-r border-surface-border h-[100dvh] sticky top-0 flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-surface-border">
        <Image src="/logo-mascot.png" alt="" width={28} height={24} />
        <div>
          <p className="text-xs text-accent leading-none">Coach</p>
          <p className="text-sm text-fg font-medium">Walk-On</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/coaching"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
            pathname === "/coaching" ? "bg-surface-panel text-accent" : "text-fg-dim hover:bg-surface-panelHover"
          }`}
        >
          <LayoutDashboard size={18} strokeWidth={1.75} />
          Dashboard
        </Link>
      </nav>
      <button
        onClick={() => signOut()}
        className="flex items-center gap-2.5 px-3 py-2 mx-3 mb-4 rounded-md text-sm text-fg-dim hover:text-warn hover:bg-surface-panelHover transition-colors"
      >
        <LogOut size={18} strokeWidth={1.75} />
        Sign out
      </button>
    </aside>
  );
}
