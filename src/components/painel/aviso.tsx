export function Aviso({ erro, ok }: { erro?: string; ok?: string }) {
  if (erro) {
    return <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>;
  }
  if (ok) {
    return <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{ok}</p>;
  }
  return null;
}
