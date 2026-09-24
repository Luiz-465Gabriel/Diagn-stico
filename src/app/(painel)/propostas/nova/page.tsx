import { notFound } from "next/navigation";
import { PropostaForm } from "@/components/propostas/proposta-form";
import type { ItemEntrada } from "@/lib/proposta/totais";
import type { PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import { exigirSessao } from "@/lib/sessao";

export default async function NovaProposta({ searchParams }: { searchParams: Promise<{ diagnostico?: string }> }) {
  const { diagnostico: diagnosticoId } = await searchParams;
  if (!diagnosticoId) notFound();
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("diagnosticos").select("id, cliente_id, envio_id, status, premissas, clientes(nome)").eq("id", diagnosticoId).maybeSingle();
  if (!data) notFound();
  const diagnostico = data as unknown as {
    id: string;
    cliente_id: string;
    envio_id: string | null;
    status: string;
    premissas: PremissasDiagnostico;
    clientes: { nome: string } | { nome: string }[];
  };
  if (diagnostico.status !== "revisado") {
    return <p className="text-sm">Revise o diagnóstico antes de criar a proposta.</p>;
  }
  const { data: servicos } = await supabase.from("servicos").select("id, nome, tipo, valor_base").eq("ativo", true);
  const { data: mapa } = await supabase.from("mapa_prioridade_servico").select("prioridade, servico_id");
  const prioridades = [...(diagnostico.premissas.qualitativo.prioridades ?? []), diagnostico.premissas.qualitativo.tipo_apoio].filter(Boolean) as string[];
  const catalogo = (servicos ?? []) as { id: string; nome: string; tipo: "mensal" | "avulso"; valor_base: number }[];
  const ligacoes = (mapa ?? []) as { prioridade: string; servico_id: string }[];
  const iniciais: ItemEntrada[] = [];
  for (const prioridade of prioridades) {
    for (const ligacao of ligacoes.filter((item) => item.prioridade === prioridade)) {
      const servico = catalogo.find((item) => item.id === ligacao.servico_id);
      if (!servico || iniciais.some((item) => item.servico_id === servico.id)) continue;
      iniciais.push({
        servico_id: servico.id,
        descricao: servico.nome,
        quantidade: 1,
        valor_unitario: Number(servico.valor_base),
        desconto: 0,
        tipo: servico.tipo,
        prioridade_origem: prioridade,
      });
    }
  }
  const cliente = Array.isArray(diagnostico.clientes) ? diagnostico.clientes[0] : diagnostico.clientes;
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Nova proposta</h1>
      <p className="text-sm text-muted-foreground">{cliente?.nome}. Os serviços abaixo vieram das prioridades do formulário e podem ser editados. Valores são os do catálogo.</p>
      <PropostaForm clienteId={diagnostico.cliente_id} diagnosticoId={diagnostico.id} envioId={diagnostico.envio_id} iniciais={iniciais} />
    </div>
  );
}
