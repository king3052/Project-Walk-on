"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Sidebar } from "@/components/Sidebar";
import { getMe } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isOnboardingPage = pathname === "/onboarding";

  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setOnboarded(null);
      return;
    }
    getMe()
      .then((u) => setOnboarded(u.onboarding_complete))
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
    }
  }, [loading, userId, onboarded, isLoginPage, isOnboardingPage, router]);

  if (isLoginPage || isOnboardingPage) return <>{children}</>;

  if (loading || !userId || onboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-fg-dim">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
