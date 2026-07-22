"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import {
  getTemplateItems,
  createTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  resetTemplate,
  type TemplateItem,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TemplatePage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TemplateItem>>({});

  const [newWeekday, setNewWeekday] = useState("Sunday");
  const [newCategory, setNewCategory] = useState("");
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);

  function load() {
    getTemplateItems()
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(load, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim() || !newTask.trim()) return;
    setAdding(true);
    try {
      await createTemplateItem(newWeekday, newCategory, newTask);
      setNewCategory("");
      setNewTask("");
      showToast("Added to template.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: TemplateItem) {
    setEditingId(item.id);
    setEditValues({ weekday: item.weekday, category: item.category, task: item.task });
  }

  async function saveEdit(id: string) {
    try {
      await updateTemplateItem(id, editValues);
      setEditingId(null);
      showToast("Updated.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteTemplateItem(id);
      showToast("Removed.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  async function onReset() {
    if (!confirm("Reset your template back to the default? This removes all your custom edits.")) return;
    try {
      const fresh = await resetTemplate();
      setItems(fresh);
      showToast("Template reset to default.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  const grouped = WEEKDAYS.map((day) => ({
    day,
    items: items.filter((i) => i.weekday === day),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader
        title="Weekly template"
        description="This is what 'Load this week's template' on the Calendar seeds each week. Edit it however fits your training."
      />

      <form onSubmit={onAdd} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Add an item</h2>
        <div className="grid grid-cols-3 gap-2">
          <select value={newWeekday} onChange={(e) => setNewWeekday(e.target.value)} className={inputClass}>
            {WEEKDAYS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category"
            className={inputClass}
          />
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Task"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-2 rounded-md transition-colors"
        >
          {adding ? "Adding…" : "Add item"}
        </button>
      </form>

      <div className="space-y-6">
        {grouped.map(({ day, items: dayItems }) => (
          <div key={day}>
            <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">{day}</p>
            {dayItems.length === 0 ? (
              <p className="text-sm text-fg-dim">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-surface-border bg-surface-panel p-3">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={editValues.weekday}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, weekday: e.target.value }))}
                            className={inputClass}
                          >
                            {WEEKDAYS.map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editValues.category || ""}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, category: e.target.value }))}
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={editValues.task || ""}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, task: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(item.id)}
                            className="text-xs bg-accent hover:bg-accent-dim text-accent-deep px-3 py-1.5 rounded-md transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-fg-dim hover:text-fg-muted px-3 py-1.5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-accent">{item.category}</p>
                          <p className="text-sm text-fg">{item.task}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-xs text-fg-dim hover:text-accent px-3 py-2 rounded-md hover:bg-surface-panelHover transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            className="text-xs text-fg-dim hover:text-warn px-3 py-2 rounded-md hover:bg-surface-panelHover transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={onReset} className="text-sm text-fg-dim hover:text-warn transition-colors">
        Reset to default template
      </button>
    </main>
  );
}
