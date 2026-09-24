export default function SemConfiguracao() {
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">EMPMED Propostas</p>
      <h1 className="mt-3 font-serif text-3xl">Ambiente incompleto</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave anônima do Supabase. Sem isso o painel não abre sessão.
      </p>
    </main>
  );
}
