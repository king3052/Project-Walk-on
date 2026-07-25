"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import {
  getRacquets,
  createRacquet,
  updateRacquet,
  deleteRacquet,
  getShoes,
  createShoe,
  updateShoe,
  deleteShoe,
  type TennisRacquet,
  type TennisShoe,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

export default function TennisEquipmentPage() {
  const { showToast } = useToast();
  const [racquets, setRacquets] = useState<TennisRacquet[]>([]);
  const [shoes, setShoes] = useState<TennisShoe[]>([]);

  const [racquetModel, setRacquetModel] = useState("");
  const [racquetString, setRacquetString] = useState("");
  const [racquetTension, setRacquetTension] = useState<number | undefined>();
  const [addingRacquet, setAddingRacquet] = useState(false);

  const [shoeModel, setShoeModel] = useState("");
  const [shoeSurface, setShoeSurface] = useState("Hard");
  const [addingShoe, setAddingShoe] = useState(false);

  function load() {
    getRacquets().then(setRacquets).catch(() => setRacquets([]));
    getShoes().then(setShoes).catch(() => setShoes([]));
  }
  useEffect(load, []);

  async function onAddRacquet(e: React.FormEvent) {
    e.preventDefault();
    if (!racquetModel.trim()) return;
    setAddingRacquet(true);
    try {
      await createRacquet({
        model: racquetModel,
        string_type: racquetString || undefined,
        string_tension_lb: racquetTension,
        hours_played: 0,
      });
      setRacquetModel("");
      setRacquetString("");
      setRacquetTension(undefined);
      showToast("Racquet added.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setAddingRacquet(false);
    }
  }

  async function onLogRacquetHours(r: TennisRacquet, hours: number) {
    await updateRacquet(r.id, { hours_played: r.hours_played + hours });
    load();
  }

  async function onRestrung(r: TennisRacquet) {
    await updateRacquet(r.id, { hours_played: 0, last_restrung_date: new Date().toISOString().slice(0, 10) });
    showToast("Marked as restrung — hours reset.", "success");
    load();
  }

  async function onDeleteRacquet(id: string) {
    await deleteRacquet(id);
    load();
  }

  async function onAddShoe(e: React.FormEvent) {
    e.preventDefault();
    if (!shoeModel.trim()) return;
    setAddingShoe(true);
    try {
      await createShoe({ model: shoeModel, surface: shoeSurface, hours_played: 0 });
      setShoeModel("");
      showToast("Shoes added.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setAddingShoe(false);
    }
  }

  async function onLogShoeHours(s: TennisShoe, hours: number) {
    await updateShoe(s.id, { hours_played: s.hours_played + hours });
    load();
  }

  async function onDeleteShoe(id: string) {
    await deleteShoe(id);
    load();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader title="Equipment" description="Racquets and shoes — with restring and replacement reminders." />

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Racquets</h2>
        <form onSubmit={onAddRacquet} className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={racquetModel}
              onChange={(e) => setRacquetModel(e.target.value)}
              placeholder="Racquet model"
              className={inputClass}
            />
            <input
              type="text"
              value={racquetString}
              onChange={(e) => setRacquetString(e.target.value)}
              placeholder="String type"
              className={inputClass}
            />
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={racquetTension ?? ""}
              onChange={(e) => setRacquetTension(Number(e.target.value))}
              placeholder="Tension (lb)"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={addingRacquet}
            className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-1.5 rounded-md transition-colors"
          >
            {addingRacquet ? "Adding…" : "Add racquet"}
          </button>
        </form>

        {racquets.map((r) => (
          <div key={r.id} className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-fg">{r.model}</p>
                <p className="text-xs text-fg-dim">
                  {r.string_type ? `${r.string_type} · ` : ""}
                  {r.string_tension_lb ? `${r.string_tension_lb}lb · ` : ""}
                  {r.hours_played}h played
                </p>
                {r.needs_restring && (
                  <p className="text-xs text-warn mt-1">⚠ Time to restring (15+ hours since last)</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onLogRacquetHours(r, 1)}
                  className="text-xs text-fg-dim hover:text-accent px-2 py-1 rounded-md hover:bg-surface-panelHover"
                >
                  +1h
                </button>
                <button
                  onClick={() => onRestrung(r)}
                  className="text-xs text-fg-dim hover:text-accent px-2 py-1 rounded-md hover:bg-surface-panelHover"
                >
                  Restrung
                </button>
                <button
                  onClick={() => onDeleteRacquet(r.id)}
                  className="text-xs text-fg-dim hover:text-warn px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Shoes</h2>
        <form onSubmit={onAddShoe} className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={shoeModel}
              onChange={(e) => setShoeModel(e.target.value)}
              placeholder="Shoe model"
              className={inputClass}
            />
            <select value={shoeSurface} onChange={(e) => setShoeSurface(e.target.value)} className={inputClass}>
              <option>Hard</option>
              <option>Clay</option>
              <option>Grass</option>
              <option>Indoor</option>
              <option>All-court</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={addingShoe}
            className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-1.5 rounded-md transition-colors"
          >
            {addingShoe ? "Adding…" : "Add shoes"}
          </button>
        </form>

        {shoes.map((s) => (
          <div key={s.id} className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-fg">{s.model}</p>
                <p className="text-xs text-fg-dim">
                  {s.surface ? `${s.surface} · ` : ""}
                  {s.hours_played}h played
                </p>
                {s.needs_replacement && (
                  <p className="text-xs text-warn mt-1">⚠ Consider replacing (60+ hours)</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onLogShoeHours(s, 1)}
                  className="text-xs text-fg-dim hover:text-accent px-2 py-1 rounded-md hover:bg-surface-panelHover"
                >
                  +1h
                </button>
                <button onClick={() => onDeleteShoe(s.id)} className="text-xs text-fg-dim hover:text-warn px-2 py-1">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
