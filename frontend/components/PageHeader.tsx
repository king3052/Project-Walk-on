export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="border-b border-surface-border pb-6 mb-8">
      <h1 className="font-display text-3xl tracking-tight text-fg">{title}</h1>
      {description && <p className="text-sm text-fg-dim mt-2">{description}</p>}
    </header>
  );
}
