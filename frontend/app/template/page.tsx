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

function PriorityStars({ value }: { value: number }) {
  return (
    <span className="text-xs tracking-tighter" title={`Priority ${value}/5`}>
      {"★".repeat(value)}
      <span className="text-fg-dim">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function targetLabel(item: TemplateItem): string | null {
  if (!item.target_count) return null;
  return item.target_unit ? `${item.target_count} ${item.target_unit}` : `${item.target_count}`;
}

type FormState = {
  weekday: string;
  category: string;
  subcategory: string;
  task: string;
  target_count: string;
  target_unit: string;
  priority: number;
};

const EMPTY_FORM: FormState = {
  weekday: "Sunday",
  category: "",
  subcategory: "",
  task: "",
  target_count: "",
  target_unit: "",
  priority: 3,
};

export default function TemplatePage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const [newForm, setNewForm] = useState<FormState>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  function load() {
    getTemplateItems()
      .then(setItems)
      .catch(() => setItems([]));
  }
  useEffect(load, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.category.trim() || !newForm.task.trim()) return;
    setAdding(true);
    try {
      await createTemplateItem({
        weekday: newForm.weekday,
        category: newForm.category,
        subcategory: newForm.subcategory || undefined,
        task: newForm.task,
        target_count: newForm.target_count ? Number(newForm.target_count) : undefined,
        target_unit: newForm.target_unit || undefined,
        priority: newForm.priority,
      });
      setNewForm({ ...EMPTY_FORM, weekday: newForm.weekday, category: newForm.category });
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
    setEditForm({
      weekday: item.weekday,
      category: item.category,
      subcategory: item.subcategory || "",
      task: item.task,
      target_count: item.target_count ? String(item.target_count) : "",
      target_unit: item.target_unit || "",
      priority: item.priority,
    });
  }

  async function saveEdit(id: string) {
    try {
      await updateTemplateItem(id, {
        weekday: editForm.weekday,
        category: editForm.category,
        subcategory: editForm.subcategory || undefined,
        task: editForm.task,
        target_count: editForm.target_count ? Number(editForm.target_count) : undefined,
        target_unit: editForm.target_unit || undefined,
        priority: editForm.priority,
      });
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

  // Group: weekday -> category -> subcategory (or "" for none) -> items, sorted by sort_order
  const byWeekday = WEEKDAYS.map((day) => {
    const dayItems = items.filter((i) => i.weekday === day).sort((a, b) => a.sort_order - b.sort_order);
    const categories = Array.from(new Set(dayItems.map((i) => i.category)));
    return {
      day,
      categories: categories.map((cat) => {
        const catItems = dayItems.filter((i) => i.category === cat);
        const subcats = Array.from(new Set(catItems.map((i) => i.subcategory || "")));
        return {
          category: cat,
          groups: subcats.map((sub) => ({
            subcategory: sub || null,
            items: catItems.filter((i) => (i.subcategory || "") === sub),
          })),
        };
      }),
    };
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader
        title="Weekly template"
        description="This is what 'Load this week's template' on the Calendar seeds each week — categories group into subcategories with real targets, and priority feeds Today's Mission."
      />

      <form onSubmit={onAdd} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Add an item</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <select
            value={newForm.weekday}
            onChange={(e) => setNewForm((p) => ({ ...p, weekday: e.target.value }))}
            className={inputClass}
          >
            {WEEKDAYS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input
            type="text"
            value={newForm.category}
            onChange={(e) => setNewForm((p) => ({ ...p, category: e.target.value }))}
            placeholder="Category (e.g. Basketball)"
            className={inputClass}
          />
          <input
            type="text"
            value={newForm.subcategory}
            onChange={(e) => setNewForm((p) => ({ ...p, subcategory: e.target.value }))}
            placeholder="Subcategory (optional)"
            className={inputClass}
          />
        </div>
        <input
          type="text"
          value={newForm.task}
          onChange={(e) => setNewForm((p) => ({ ...p, task: e.target.value }))}
          placeholder="Task (e.g. Form Makes)"
          className={inputClass}
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={newForm.target_count}
            onChange={(e) => setNewForm((p) => ({ ...p, target_count: e.target.value }))}
            placeholder="Target (optional)"
            className={inputClass}
          />
          <input
            type="text"
            value={newForm.target_unit}
            onChange={(e) => setNewForm((p) => ({ ...p, target_unit: e.target.value }))}
            placeholder="Unit (e.g. makes)"
            className={inputClass}
          />
          <select
            value={newForm.priority}
            onChange={(e) => setNewForm((p) => ({ ...p, priority: Number(e.target.value) }))}
            className={inputClass}
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                Priority {p}
              </option>
            ))}
          </select>
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
        {byWeekday.map(({ day, categories }) => (
          <div key={day}>
            <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">{day}</p>
            {categories.length === 0 ? (
              <p className="text-sm text-fg-dim">Nothing scheduled.</p>
            ) : (
              <div className="space-y-3">
                {categories.map(({ category, groups }) => (
                  <div key={category} className="rounded-lg border border-surface-border bg-surface-panel p-3">
                    <p className="text-xs text-accent mb-2">{category}</p>
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <div key={group.subcategory || "none"}>
                          {group.subcategory && (
                            <p className="text-xs text-fg-dim mb-1 ml-1">{group.subcategory}</p>
                          )}
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <div key={item.id} className="rounded-md bg-surface-panelHover px-2.5 py-1.5">
                                {editingId === item.id ? (
                                  <div className="space-y-2 py-1">
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                                        placeholder="Category"
                                        className={inputClass}
                                      />
                                      <input
                                        type="text"
                                        value={editForm.subcategory}
                                        onChange={(e) => setEditForm((p) => ({ ...p, subcategory: e.target.value }))}
                                        placeholder="Subcategory"
                                        className={inputClass}
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      value={editForm.task}
                                      onChange={(e) => setEditForm((p) => ({ ...p, task: e.target.value }))}
                                      className={inputClass}
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                      <input
                                        type="number"
                                        onFocus={(e) => e.target.select()}
                                        value={editForm.target_count}
                                        onChange={(e) => setEditForm((p) => ({ ...p, target_count: e.target.value }))}
                                        placeholder="Target"
                                        className={inputClass}
                                      />
                                      <input
                                        type="text"
                                        value={editForm.target_unit}
                                        onChange={(e) => setEditForm((p) => ({ ...p, target_unit: e.target.value }))}
                                        placeholder="Unit"
                                        className={inputClass}
                                      />
                                      <select
                                        value={editForm.priority}
                                        onChange={(e) => setEditForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                                        className={inputClass}
                                      >
                                        {[1, 2, 3, 4, 5].map((p) => (
                                          <option key={p} value={p}>
                                            Priority {p}
                                          </option>
                                        ))}
                                      </select>
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
                                    <div className="flex items-center gap-2 min-w-0">
                                      <PriorityStars value={item.priority} />
                                      <p className="text-sm text-fg truncate">{item.task}</p>
                                      {targetLabel(item) && (
                                        <span className="text-xs text-fg-dim shrink-0">{targetLabel(item)}</span>
                                      )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => startEdit(item)}
                                        className="text-xs text-fg-dim hover:text-accent px-2 py-1 rounded-md hover:bg-surface-panel transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => onDelete(item.id)}
                                        className="text-xs text-fg-dim hover:text-warn px-2 py-1 rounded-md hover:bg-surface-panel transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
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
