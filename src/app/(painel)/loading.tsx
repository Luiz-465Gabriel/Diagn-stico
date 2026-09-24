export default function CarregandoPainel() {
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-card shadow-sm" />
      <div className="h-40 animate-pulse rounded-lg bg-card shadow-sm" />
    </div>
  );
}
