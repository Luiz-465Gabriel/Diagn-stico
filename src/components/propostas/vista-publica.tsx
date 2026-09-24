"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { AceiteProposta } from "@/components/propostas/aceite";
import { Button } from "@/components/ui/button";
import type { DadosRelatorio } from "@/components/relatorio/documento";
import { formatarData, formatarMoeda } from "@/lib/format";

const RelatorioDocumento = dynamic(
  () => import("@/components/relatorio/documento").then((modulo) => modulo.RelatorioDocumento),
  { ssr: false, loading: () => <p className="mx-auto max-w-lg px-4 text-sm text-muted-foreground">Abrindo o diagnóstico…</p> },
);

export function VistaPublica({
  dados,
  token,
  status,
  nomeAceite,
}: {
  dados: DadosRelatorio;
  token: string;
  status: string;
  nomeAceite: string | null;
}) {
  const [completo, setCompleto] = useState(false);
  const prioridades = dados.itens.filter((item) => item.prioridade_origem);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-sidebar px-5 py-8 text-white">
        <div className="mx-auto max-w-lg">
          <p className="text-xs uppercase tracking-[0.16em] text-white/70">{dados.escritorio.razao_social}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Proposta de serviços</h1>
          <div className="mt-4 h-1 w-16 bg-[hsl(var(--copper))]" />
        </div>
      </header>
      <div className="h-1.5 bg-gradient-to-r from-primary to-[hsl(var(--copper))]" />
      <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
        <div>
          <p className="text-xl font-semibold">{dados.cliente}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Proposta {dados.numero} · {formatarData(dados.emitidaEm)} · válida até {dados.validade}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Valor rotulo="Por mês" valor={formatarMoeda(dados.totalMensal)} />
          <Valor rotulo="Na contratação" valor={formatarMoeda(dados.totalAvulso)} />
        </div>
        <Secao titulo="O que vamos fazer">
          {prioridades.length === 0 && <p className="text-sm">Acompanhamento combinado nesta proposta.</p>}
          <ul className="space-y-2">
            {prioridades.map((item) => (
              <li key={item.descricao} className="text-sm">
                <span className="font-medium">{item.prioridade_origem}</span>
                <span className="mt-0.5 block text-muted-foreground">{item.descricao}</span>
              </li>
            ))}
          </ul>
        </Secao>
        <Secao titulo="Quanto fica">
          <ul className="divide-y rounded-lg border bg-card">
            {dados.itens.map((item) => (
              <li key={`${item.tipo}-${item.descricao}`} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
                <span>
                  {item.descricao}
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.tipo === "mensal" ? "Por mês" : "Uma vez"}</span>
                </span>
                <span className="font-medium">{formatarMoeda(item.valor_total)}</span>
              </li>
            ))}
          </ul>
          {dados.premissas.honorario_contabil.origem === "cliente" && (
            <p className="text-sm text-muted-foreground">
              A mensalidade parte do valor que você informou pagar hoje: {formatarMoeda(dados.premissas.honorario_contabil.valor)}.
            </p>
          )}
        </Secao>
        <Secao titulo="Está incluso">
          <Lista texto={dados.escopoIncluso} vazio="O combinado nesta proposta." />
        </Secao>
        <Secao titulo="Não está incluso">
          <Lista texto={dados.escopoNaoIncluso} vazio="Nada além do que está escrito acima." />
        </Secao>
        <Secao titulo="Pagamento">
          <p className="text-sm leading-relaxed">{dados.condicoes}</p>
          {dados.observacoes && <p className="text-sm leading-relaxed">{dados.observacoes}</p>}
        </Secao>
        <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setCompleto((atual) => !atual)}>
          {completo ? "Ocultar diagnóstico completo" : "Ver diagnóstico completo"}
        </Button>
      </main>
      {completo && (
        <div className="px-3 pb-4">
          <RelatorioDocumento dados={dados} publico />
        </div>
      )}
      <AceiteProposta token={token} status={status} nomeAceite={nomeAceite} />
    </div>
  );
}

function Valor({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <article className="rounded-lg border-l-4 border-primary bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold text-primary">{valor}</p>
    </article>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-sidebar">{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ texto, vazio }: { texto: string; vazio: string }) {
  const itens = texto.split("\n").map((linha) => linha.trim()).filter(Boolean);
  if (itens.length === 0) return <p className="text-sm">{vazio}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
