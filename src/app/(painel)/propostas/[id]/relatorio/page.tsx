import { notFound } from "next/navigation";
import { BaixarPdf } from "@/components/propostas/baixar-pdf";
import { RelatorioDocumento } from "@/components/relatorio/documento";
import { montarDadosRelatorio } from "@/lib/propostas/carregar";
import { exigirSessao } from "@/lib/sessao";

export default async function RelatorioInterno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirSessao();
  const dados = await montarDadosRelatorio(supabase, id);
  if (!dados) notFound();
  return (
    <div className="space-y-4">
      <div className="no-print rounded-md border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Baixar a proposta para enviar ao cliente</p>
        <BaixarPdf propostaId={id} numero={dados.numero} bloqueada={false} />
      </div>
      <RelatorioDocumento dados={dados} />
    </div>
  );
}
