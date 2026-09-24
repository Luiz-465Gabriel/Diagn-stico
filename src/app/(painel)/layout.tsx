import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CascaPainel } from "@/components/painel/casca";
import { supabaseConfigurado } from "@/lib/rotulos";
import { obterSessao } from "@/lib/sessao";
import { lerSessaoLocal } from "@/lib/supabase/sessao-local";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  if (!supabaseConfigurado()) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="text-3xl font-semibold">Ambiente incompleto</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave anônima do Supabase. Sem isso o painel não abre sessão.
        </p>
      </main>
    );
  }
  const jar = await cookies();
  const usuario = lerSessaoLocal(jar.getAll(), process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!usuario) redirect("/login");
  return (
    <CascaPainel
      identidade={
        <Suspense fallback={<IdentidadeFallback nome={usuario.nome} />}>
          <Identidade />
        </Suspense>
      }
    >
      {children}
    </CascaPainel>
  );
}

function IdentidadeFallback({ nome }: { nome: string }) {
  return (
    <div className="mb-3">
      <p className="truncate text-sm font-medium text-white">{nome}</p>
    </div>
  );
}

async function Identidade() {
  const sessao = await obterSessao();
  if (!sessao) return <IdentidadeFallback nome="Equipe" />;
  return (
    <div className="mb-3">
      <p className="truncate text-sm font-medium text-white">{sessao.profile.nome}</p>
      <p className="text-xs text-white/60">{sessao.profile.perfil === "admin" ? "Administração" : "Colaboração"}</p>
    </div>
  );
}
