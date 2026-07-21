"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { askQuestion } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

type Exchange = { question: string; answer: string };

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setPending(true);
    setError(null);
    const q = question;
    try {
      const result = await askQuestion(q);
      setHistory((prev) => [...prev, { question: q, answer: result.answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get an answer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <PageHeader
        title="Ask your data"
        description="Ask a plain-language question about your own training history — answered from your real logged numbers."
      />

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How has my squat progressed since I started logging?"
          className={inputClass}
          rows={2}
        />
        <button
          type="submit"
          disabled={pending || !question.trim()}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Thinking…" : "Ask"}
        </button>
        {error && <p className="text-warn text-sm">{error}</p>}
      </form>

      <div className="space-y-4">
        {history.length === 0 && (
          <p className="text-sm text-fg-dim">Ask something like "what's my best bench so far" or "am I sleeping enough".</p>
        )}
        {[...history].reverse().map((ex, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-2">
            <p className="text-sm text-fg-muted">{ex.question}</p>
            <p className="text-sm text-fg leading-relaxed">{ex.answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
