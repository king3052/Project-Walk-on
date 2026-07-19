"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardPlus,
  LineChart,
  CalendarCheck,
  BookOpen,
  Target,
  UserCircle,
  Clapperboard,
  Bot,
  Trophy,
  FileText,
  ClipboardCheck,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log today", icon: ClipboardPlus },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/review", label: "Weekly review", icon: CalendarCheck },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/film", label: "Film", icon: Clapperboard },
  { href: "/coach", label: "AI Coach", icon: Bot },
  { href: "/scouting", label: "Scouting report", icon: ClipboardCheck },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/resume", label: "Resume", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="print:hidden w-56 shrink-0 border-r border-surface-border h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-6 border-b border-surface-border">
        <p className="text-xs tracking-wide text-accent">Project</p>
        <p className="font-display text-2xl tracking-tight text-fg leading-none mt-0.5">Walk-On</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 ${
                active
                  ? "border-accent text-accent bg-surface-panel"
                  : "border-transparent text-fg-dim hover:text-fg-muted hover:bg-surface-panel"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
