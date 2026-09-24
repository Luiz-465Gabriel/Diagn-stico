import Link from "next/link";
import { notFound } from "next/navigation";
import { BaixarPdf } from "@/components/propostas/baixar-pdf";
import { EnviarProposta } from "@/components/propostas/enviar-proposta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/format";
import { emailHabilitado } from "@/lib/email";
import { rotuloDe, STATUS_PROPOSTA } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaProposta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirSessao();
  const { data } = await supabase
    .from("propostas")
    .select("id, numero, status, validade_dias, total_mensal, total_avulso, pdf_path, diagnosticos(status), clientes(nome, whatsapp, id), proposta_itens(descricao, tipo, valor_total)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const proposta = data as unknown as {
    id: string;
    numero: string;
    status: string;
    validade_dias: number;
    total_mensal: number;
    total_avulso: number;
    pdf_path: string | null;
    diagnosticos: { status: string } | { status: string }[] | null;
    clientes: { nome: string; whatsapp: string | null; id: string } | { nome: string; whatsapp: string | null; id: string }[];
    proposta_itens: { descricao: string; tipo: string; valor_total: number }[];
  };
  const cliente = Array.isArray(proposta.clientes) ? proposta.clientes[0] : proposta.clientes;
  const diagnostico = Array.isArray(proposta.diagnosticos) ? proposta.diagnosticos[0] : proposta.diagnosticos;
  const bloqueada = diagnostico?.status !== "revisado";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/clientes/${cliente?.id}`} className="text-sm text-muted-foreground hover:underline">{cliente?.nome}</Link>
          <h1 className="text-2xl font-semibold">Proposta {proposta.numero}</h1>
          <Badge className="mt-2">{rotuloDe(STATUS_PROPOSTA, proposta.status)}</Badge>
        </div>
        <BaixarPdf propostaId={id} numero={proposta.numero} bloqueada={bloqueada} />
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {(proposta.proposta_itens ?? []).map((item) => (
          <li key={item.descricao} className="flex justify-between px-4 py-3 text-sm">
            <span>{item.descricao} · {item.tipo}</span>
            <span>{formatarMoeda(Number(item.valor_total))}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm">Mensal {formatarMoeda(Number(proposta.total_mensal))} · Avulso {formatarMoeda(Number(proposta.total_avulso))}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link href={`/propostas/${id}/relatorio`}>Ver relatório</Link></Button>
        {proposta.pdf_path && <p className="text-xs text-muted-foreground">Último PDF também ficou salvo no escritório.</p>}
      </div>
      <div className="rounded-xl border bg-card p-5">
        <EnviarProposta
          propostaId={id}
          nome={cliente?.nome ?? ""}
          telefone={cliente?.whatsapp ?? null}
          numero={proposta.numero}
          validade={proposta.validade_dias}
          emailDisponivel={emailHabilitado()}
          bloqueada={bloqueada}
        />
      </div>
    </div>
  );
}
