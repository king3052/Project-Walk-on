"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { CoachSidebar } from "@/components/CoachSidebar";
import { getMe } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isOnboardingPage = pathname === "/onboarding";
  const isCoachPage = pathname.startsWith("/coaching");

  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setOnboarded(null);
      setRole(null);
      if (!isLoginPage) router.push("/login");
      return;
    }

    // Once we've confirmed this session is onboarded and sitting in the right
    // place for its role, later navigations don't need to hit the network
    // again — this is what made every single page change feel sluggish.
    const alreadyVerified = onboarded === true && role !== null && (role === "Coach" ? isCoachPage : true);
    if (alreadyVerified && !isOnboardingPage) return;

    getMe()
      .then((u) => {
        const freshOnboarded = u.onboarding_complete;
        const freshRole = u.role || "Athlete";
        setOnboarded(freshOnboarded);
        setRole(freshRole);

        // Decide the redirect using the value we JUST fetched, not state read
        // from a separate effect — that gap is exactly what caused the bounce
        // back to onboarding right after finishing it.
        if (freshOnboarded === false && !isOnboardingPage) {
          router.push("/onboarding");
        } else if (freshOnboarded && freshRole === "Coach" && !isCoachPage && !isOnboardingPage) {
          router.push("/coaching");
        }
      })
      .catch(() => {
        setOnboarded(true);
        setRole("Athlete");
      }); // fail open — don't trap the user in a permanent loading state if this call has a hiccup
  }, [loading, userId, pathname, isLoginPage, isOnboardingPage, isCoachPage, onboarded, role, router]);

  if (isLoginPage || isOnboardingPage) return <>{children}</>;

  if (loading || !userId || onboarded === null || role === null) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p className="text-sm text-fg-dim">Loading…</p>
      </div>
    );
  }

  if (role === "Coach") {
    return (
      <div className="flex">
        <CoachSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}
