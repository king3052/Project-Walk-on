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
    if (!userId) {
      setOnboarded(null);
      setRole(null);
      return;
    }
    getMe()
      .then((u) => {
        setOnboarded(u.onboarding_complete);
        setRole(u.role || "Athlete");
      })
      .catch(() => setOnboarded(true)); // fail open — don't trap the user if this call has a hiccup
  }, [userId, pathname]);

  useEffect(() => {
    if (loading) return;
    if (!userId && !isLoginPage) {
      router.push("/login");
      return;
    }
    if (userId && onboarded === false && !isOnboardingPage) {
      router.push("/onboarding");
      return;
    }
    // Coach accounts only ever see /coach/* — everything else in the app is athlete-only
    if (userId && onboarded && role === "Coach" && !isCoachPage && !isOnboardingPage) {
      router.push("/coaching");
    }
  }, [loading, userId, onboarded, role, isLoginPage, isOnboardingPage, isCoachPage, router]);

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
