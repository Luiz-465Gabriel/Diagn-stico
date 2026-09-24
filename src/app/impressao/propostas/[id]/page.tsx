import { notFound } from "next/navigation";
import { RelatorioDocumento } from "@/components/relatorio/documento";
import { segredoImpressao } from "@/lib/pdf";
import { montarDadosRelatorio } from "@/lib/propostas/carregar";
import { assinaturaValida } from "@/lib/tokens";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Impressao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exp?: string; sig?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const exp = Number(query.exp);
  if (!assinaturaValida(id, exp, query.sig || "", segredoImpressao())) notFound();
  const dados = await montarDadosRelatorio(criarClienteAdmin(), id);
  if (!dados) notFound();
  return <RelatorioDocumento dados={dados} />;
}
