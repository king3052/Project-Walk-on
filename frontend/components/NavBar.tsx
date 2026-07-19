"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/log", label: "Log today" },
  { href: "/analytics", label: "Analytics" },
  { href: "/review", label: "Weekly review" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 mb-6">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              active ? "text-accent" : "text-fg-dim hover:text-fg-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
