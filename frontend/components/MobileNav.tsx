"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  LayoutDashboard,
  ClipboardPlus,
  History,
  CalendarDays,
  LineChart,
  MoreHorizontal,
  X,
  CalendarCheck,
  BookOpen,
  Target,
  UserCircle,
  Clapperboard,
  Bot,
  ClipboardCheck,
  Trophy,
  FileText,
  LogOut,
  Settings,
  FlaskConical,
  HeartPulse,
  MessageCircleQuestion,
  GraduationCap,
} from "lucide-react";

const PRIMARY = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: ClipboardPlus },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

const MORE_LINKS = [
  { href: "/history", label: "History", icon: History },
  { href: "/review", label: "Weekly review", icon: CalendarCheck },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/film", label: "Film", icon: Clapperboard },
  { href: "/coach", label: "AI Coach", icon: Bot },
  { href: "/scouting", label: "Scouting report", icon: ClipboardCheck },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/science", label: "Sports Science", icon: FlaskConical },
  { href: "/injuries", label: "Injuries", icon: HeartPulse },
  { href: "/ask", label: "Ask your data", icon: MessageCircleQuestion },
  { href: "/learning", label: "Learning Center", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_LINKS.some((l) => l.href === pathname);

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-surface-panel border-t border-surface-border rounded-t-2xl max-h-[70vh] overflow-y-auto md:hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <p className="text-xs uppercase tracking-wide text-fg-dim">More</p>
            <button onClick={() => setMoreOpen(false)}>
              <X size={18} className="text-fg-dim" />
            </button>
          </div>
          <div className="py-2">
            {MORE_LINKS.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3 text-sm ${
                    active ? "text-accent" : "text-fg"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setMoreOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 px-5 py-3 text-sm text-warn w-full"
            >
              <LogOut size={18} strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav
        className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-panel border-t border-surface-border flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] ${
                active ? "text-accent" : "text-fg-dim"
              }`}
            >
              <Icon size={20} strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] ${
            isMoreActive || moreOpen ? "text-accent" : "text-fg-dim"
          }`}
        >
          <MoreHorizontal size={20} strokeWidth={1.75} />
          More
        </button>
      </nav>
    </>
  );
}
