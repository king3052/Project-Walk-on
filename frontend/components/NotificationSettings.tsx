"use client";

import { useEffect, useState } from "react";
import {
  subscribePush,
  unsubscribePush,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function subToPlain(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
  };
}

export function NotificationSettings() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dailyReminders, setDailyReminders] = useState(true);
  const [coachUpdates, setCoachUpdates] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub);
    });

    getNotificationPreferences()
      .then((p) => {
        setDailyReminders(p.daily_reminders);
        setCoachUpdates(p.coach_updates);
      })
      .catch(() => {});
  }, []);

  async function onTogglePreference(field: "daily_reminders" | "coach_updates", value: boolean) {
    if (field === "daily_reminders") setDailyReminders(value);
    else setCoachUpdates(value);
    await updateNotificationPreferences({ [field]: value });
  }

  async function onToggle() {
    setPending(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (enabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(subToPlain(sub));
          await sub.unsubscribe();
        }
        setEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setError("Notification permission was denied in your browser settings.");
          return;
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await subscribePush(subToPlain(sub));
        setEnabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-fg-dim">
        Push notifications aren&apos;t supported in this browser.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        disabled={pending}
        className={`text-sm px-5 py-2 rounded-md transition-colors disabled:opacity-50 ${
          enabled
            ? "bg-surface-panelHover text-fg-muted border border-surface-border"
            : "bg-accent hover:bg-accent-dim text-accent-deep"
        }`}
      >
        {pending ? "Please wait…" : enabled ? "Disable notifications on this device" : "Enable notifications"}
      </button>
      {error && <p className="text-warn text-sm">{error}</p>}

      {enabled && (
        <div className="pt-1 space-y-1">
          <label className="flex items-center justify-between text-xs text-fg-dim py-1">
            Daily training reminders
            <input
              type="checkbox"
              checked={dailyReminders}
              onChange={(e) => onTogglePreference("daily_reminders", e.target.checked)}
              className="accent-[#4ADE80]"
            />
          </label>
          <label className="flex items-center justify-between text-xs text-fg-dim py-1">
            Coach Portal updates (comments, assignments, reviews, goals)
            <input
              type="checkbox"
              checked={coachUpdates}
              onChange={(e) => onTogglePreference("coach_updates", e.target.checked)}
              className="accent-[#4ADE80]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
