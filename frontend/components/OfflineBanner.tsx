"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="print:hidden fixed top-0 left-0 right-0 z-[200] bg-warn/15 border-b border-warn/40 text-warn text-sm text-center py-2">
      You&apos;re offline — changes won&apos;t save until your connection comes back.
    </div>
  );
}
