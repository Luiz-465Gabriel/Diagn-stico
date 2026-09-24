import { notFound } from "next/navigation";
import { RelatorioDocumento } from "@/components/relatorio/documento";
import { montarDadosRelatorio } from "@/lib/propostas/carregar";
import { exigirSessao } from "@/lib/sessao";

export default async function RelatorioInterno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirSessao();
  const dados = await montarDadosRelatorio(supabase, id);
  if (!dados) notFound();
  return <RelatorioDocumento dados={dados} />;
}
