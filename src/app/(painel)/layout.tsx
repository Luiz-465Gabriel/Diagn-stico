import type { ReactNode } from "react";
import { CascaPainel } from "@/components/painel/casca";
import { supabaseConfigurado } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  if (!supabaseConfigurado()) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="font-serif text-3xl">Ambiente incompleto</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave anônima do Supabase. Sem isso o painel não abre sessão.
        </p>
      </main>
    );
  }
  const { profile } = await exigirSessao();
  return (
    <CascaPainel nome={profile.nome} perfil={profile.perfil}>
      {children}
    </CascaPainel>
  );
}
