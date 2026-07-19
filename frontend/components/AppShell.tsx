"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !userId && !isLoginPage) {
      router.push("/login");
    }
  }, [loading, userId, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (loading || !userId) {
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
