"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { chatWithAssistant, getAssistantHistory, clearAssistantHistory, type AssistantChatMessage, type AssistantAction } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

function summarizeAction(action: AssistantAction): string {
  const { tool, args } = action;
  switch (tool) {
    case "log_practice_session":
      return `Logged practice session${args.duration_min ? ` (${args.duration_min}min)` : ""}`;
    case "log_conditioning":
      return `Logged conditioning: ${args.activity || ""}`;
    case "log_nutrition":
      return `Logged nutrition${args.calories ? ` (${args.calories} cal)` : ""}`;
    case "log_recovery":
      return "Logged recovery";
    case "log_bodyweight":
      return `Logged bodyweight: ${args.weight_lb}lb`;
    case "create_goal":
      return `Created goal: ${args.title}`;
    case "create_tournament":
      return `Added tournament: ${args.name}`;
    default:
      return tool;
  }
}

type DisplayMessage = AssistantChatMessage & { actions?: AssistantAction[] };

export default function AssistantPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAssistantHistory()
      .then((records) => {
        setMessages(
          records.map((r) => ({
            role: r.role,
            content: r.content,
            actions: r.actions_taken ? JSON.parse(r.actions_taken) : undefined,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onClear() {
    if (!window.confirm("Start a new conversation? This clears your chat history with the assistant.")) return;
    await clearAssistantHistory();
    setMessages([]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const userMessage: DisplayMessage = { role: "user", content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const result = await chatWithAssistant(nextMessages.map((m) => ({ role: m.role, content: m.content })));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, actions: result.actions_taken },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 flex flex-col" style={{ minHeight: "calc(100dvh - 5rem)" }}>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Assistant"
          description="Ask about your training, get it to log things for you, or have it look something up — it knows your real data."
        />
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-fg-dim hover:text-warn px-2 py-1 shrink-0 mt-1"
          >
            New conversation
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 py-4">
        {historyLoading && <p className="text-xs text-fg-dim">Loading your conversation…</p>}
        {!historyLoading && messages.length === 0 && (
          <div className="text-sm text-fg-dim space-y-1">
            <p>Try things like:</p>
            <p className="text-fg-muted">&quot;I only have 45 minutes today, what should I focus on?&quot;</p>
            <p className="text-fg-muted">&quot;I slept 6 hours and had a Chick-fil-A combo for lunch&quot;</p>
            <p className="text-fg-muted">&quot;Add a goal to hit 180 lbs by May&quot;</p>
            <p className="text-fg-muted">&quot;What&apos;s a good recovery protocol for shin splints?&quot;</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-accent text-accent-deep" : "bg-surface-panel border border-surface-border text-fg"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface-border/50 space-y-0.5">
                  {m.actions.map((a, j) => (
                    <p key={j} className="text-xs text-accent">
                      ✓ {summarizeAction(a)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && <p className="text-xs text-fg-dim">Thinking…</p>}
        {error && <p className="text-warn text-sm">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 pt-2 sticky bottom-0 bg-surface pb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask, log, or look something up…"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors shrink-0"
        >
          Send
        </button>
      </form>
    </main>
  );
}
