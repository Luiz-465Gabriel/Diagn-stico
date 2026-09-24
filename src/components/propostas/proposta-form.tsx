"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { criarProposta } from "@/app/(painel)/propostas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { totalizarItens, type ItemEntrada } from "@/lib/proposta/totais";
import { formatarMoeda } from "@/lib/format";
import { CONDICOES_PAGAMENTO_PADRAO, ESCOPO_INCLUSO_PADRAO, ESCOPO_NAO_INCLUSO_PADRAO, VALIDADE_PROPOSTA_DIAS } from "@/lib/rotulos";

const schema = z.object({
  validadeDias: z.coerce.number().min(1),
  condicoes: z.string().min(3),
  escopoIncluso: z.string().min(3),
  escopoNaoIncluso: z.string().min(3),
  observacoes: z.string().optional(),
});

export function PropostaForm({
  clienteId,
  diagnosticoId,
  envioId,
  iniciais,
}: {
  clienteId: string;
  diagnosticoId: string;
  envioId: string | null;
  iniciais: ItemEntrada[];
}) {
  const [itens, setItens] = useState<ItemEntrada[]>(iniciais.length ? iniciais : [{ descricao: "", quantidade: 1, valor_unitario: 0, desconto: 0, tipo: "avulso" }]);
  const [erro, setErro] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      validadeDias: VALIDADE_PROPOSTA_DIAS,
      condicoes: CONDICOES_PAGAMENTO_PADRAO,
      escopoIncluso: ESCOPO_INCLUSO_PADRAO,
      escopoNaoIncluso: ESCOPO_NAO_INCLUSO_PADRAO,
      observacoes: "",
    },
  });
  const totais = useMemo(() => totalizarItens(itens), [itens]);

  function atualizar(indice: number, parcial: Partial<ItemEntrada>) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, ...parcial } : item)));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (dados) => {
        setErro(null);
        const resposta = await criarProposta({
          clienteId,
          diagnosticoId,
          envioId,
          itens,
          validadeDias: dados.validadeDias,
          condicoes: dados.condicoes,
          escopoIncluso: dados.escopoIncluso,
          escopoNaoIncluso: dados.escopoNaoIncluso,
          observacoes: dados.observacoes || "",
        });
        if (resposta?.erro) setErro(resposta.erro);
      })}
    >
      {itens.map((item, indice) => (
        <div key={indice} className="grid gap-2 rounded-xl border bg-card p-3 md:grid-cols-6">
          <Input className="md:col-span-2" placeholder="Descrição" value={item.descricao} onChange={(e) => atualizar(indice, { descricao: e.target.value })} />
          <select className="h-11 rounded-md border px-2 text-sm" value={item.tipo} onChange={(e) => atualizar(indice, { tipo: e.target.value as "mensal" | "avulso" })}>
            <option value="mensal">Mensal</option>
            <option value="avulso">Avulso</option>
          </select>
          <Input type="number" step="0.01" value={item.quantidade} onChange={(e) => atualizar(indice, { quantidade: Number(e.target.value) })} />
          <Input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => atualizar(indice, { valor_unitario: Number(e.target.value) })} />
          <Input type="number" step="0.01" value={item.desconto} onChange={(e) => atualizar(indice, { desconto: Number(e.target.value) })} />
          {item.prioridade_origem && <p className="md:col-span-6 text-xs text-muted-foreground">Prioridade: {item.prioridade_origem}</p>}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => setItens((atual) => [...atual, { descricao: "", quantidade: 1, valor_unitario: 0, desconto: 0, tipo: "avulso" }])}>
        Adicionar item livre
      </Button>
      <p className="text-sm">Mensal {formatarMoeda(totais.total_mensal)} · Avulso {formatarMoeda(totais.total_avulso)}</p>
      <label className="block text-sm">Validade (dias)<Input type="number" {...form.register("validadeDias")} /></label>
      <label className="block text-sm">Condições de pagamento<Textarea {...form.register("condicoes")} /></label>
      <label className="block text-sm">Escopo incluso<Textarea {...form.register("escopoIncluso")} /></label>
      <label className="block text-sm">Escopo não incluso<Textarea {...form.register("escopoNaoIncluso")} /></label>
      <label className="block text-sm">Observações<Textarea {...form.register("observacoes")} /></label>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button type="submit" disabled={form.formState.isSubmitting}>Criar proposta</Button>
    </form>
  );
}
