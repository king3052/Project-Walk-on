"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  startGoogleCalendarOAuth,
  getGoogleCalendarStatus,
  selectGoogleCalendars,
  disconnectGoogleCalendar,
  type GoogleCalendarStatus,
} from "@/lib/api";

export function GoogleCalendarSettings() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function load() {
    getGoogleCalendarStatus()
      .then((s) => {
        setStatus(s);
        setSelected(s.selected_calendar_ids.length ? s.selected_calendar_ids : s.calendars.filter((c) => c.primary).map((c) => c.id));
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected")) {
      showToast("Google Calendar connected.", "success");
      window.history.replaceState({}, "", window.location.pathname);
      load();
    } else if (params.get("calendar_error")) {
      showToast("Couldn't connect Google Calendar — please try again.", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onConnect() {
    setConnecting(true);
    try {
      const result = await startGoogleCalendarOAuth();
      window.location.href = result.authorize_url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't start the connection.", "error");
      setConnecting(false);
    }
  }

  async function onDisconnect() {
    if (!window.confirm("Disconnect Google Calendar? The assistant will no longer be able to see your schedule.")) return;
    await disconnectGoogleCalendar();
    showToast("Disconnected.", "success");
    load();
  }

  function toggleCalendar(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function onSaveSelection() {
    setSaving(true);
    try {
      await selectGoogleCalendars(selected);
      showToast("Saved.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="skeleton h-10 w-48" />;

  if (!status?.configured) {
    return (
      <p className="text-xs text-fg-dim">
        Google Calendar isn&apos;t configured on the backend yet.
      </p>
    );
  }

  if (!status.connected) {
    return (
      <div>
        <p className="text-xs text-fg-dim mb-3">
          Connect your Google Calendar so the assistant can see your classes, exams, and appointments —
          read-only, it never creates or changes anything on your calendar.
        </p>
        <button
          onClick={onConnect}
          disabled={connecting}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-2 rounded-md transition-colors"
        >
          {connecting ? "Redirecting…" : "Connect Google Calendar"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-accent">Connected</p>
        <button onClick={onDisconnect} className="text-xs text-fg-dim hover:text-warn px-2 py-1">
          Disconnect
        </button>
      </div>

      {status.calendars.length > 0 && (
        <div>
          <p className="text-xs text-fg-dim mb-2">Which calendars should the assistant see?</p>
          <div className="space-y-1.5">
            {status.calendars.map((cal) => (
              <label key={cal.id} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(cal.id)}
                  onChange={() => toggleCalendar(cal.id)}
                  className="accent-[#4ADE80]"
                />
                {cal.summary}
                {cal.primary && <span className="text-xs text-fg-dim">(primary)</span>}
              </label>
            ))}
          </div>
          <button
            onClick={onSaveSelection}
            disabled={saving}
            className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors mt-2"
          >
            {saving ? "Saving…" : "Save selection"}
          </button>
        </div>
      )}
    </div>
  );
}
