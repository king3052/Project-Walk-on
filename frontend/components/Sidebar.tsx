"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  CircleDot,
  ClipboardPlus,
  History,
  LineChart,
  CalendarCheck,
  CalendarDays,
  ListChecks,
  BookOpen,
  Target,
  UserCircle,
  Clapperboard,
  Bot,
  Trophy,
  FileText,
  ClipboardCheck,
  Settings,
  FlaskConical,
  HeartPulse,
  Sparkles,
  GraduationCap,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tennis", label: "Tennis", icon: CircleDot },
  { href: "/log", label: "Log today", icon: ClipboardPlus },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/history", label: "History", icon: History },
  { href: "/template", label: "Weekly template", icon: ListChecks },
  { href: "/review", label: "Weekly review", icon: CalendarCheck },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/coach", label: "AI Coach", icon: Bot },
  { href: "/scouting", label: "Scouting report", icon: ClipboardCheck },
  { href: "/learning", label: "Learning Center", icon: GraduationCap },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/science", label: "Sports Science", icon: FlaskConical },
  { href: "/injuries", label: "Injuries", icon: HeartPulse },
  { href: "/film", label: "Film", icon: Clapperboard },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="print:hidden hidden md:flex w-56 shrink-0 border-r border-surface-border h-[100dvh] sticky top-0 flex-col">
      <div className="px-5 py-6 border-b border-surface-border flex items-center gap-2.5">
        <Image src="/logo-mascot.png" alt="" width={32} height={32} />
        <div>
          <p className="text-xs tracking-wide text-accent leading-none">Project</p>
          <p className="font-display text-xl tracking-tight text-fg leading-tight">Walk-On</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
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
      <button
        onClick={() => signOut()}
        className="flex items-center gap-3 px-5 py-4 text-sm text-fg-dim hover:text-warn transition-colors border-t border-surface-border"
      >
        <LogOut size={16} strokeWidth={1.75} />
        Sign out
      </button>
    </aside>
  );
}
