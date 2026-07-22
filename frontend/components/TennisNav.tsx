"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tennis", label: "Overview" },
  { href: "/tennis/matches", label: "Matches" },
  { href: "/tennis/strokes", label: "Strokes" },
  { href: "/tennis/tournaments", label: "Tournaments" },
  { href: "/tennis/rankings", label: "Rankings" },
  { href: "/tennis/profile", label: "Profile" },
];

export function TennisNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-surface-border pb-0 mb-8 -mt-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm px-3 py-2 border-b-2 transition-colors ${
              active ? "border-accent text-accent" : "border-transparent text-fg-dim hover:text-fg-muted"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
