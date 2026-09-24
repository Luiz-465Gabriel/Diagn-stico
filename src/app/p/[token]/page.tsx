import { notFound } from "next/navigation";
import { VistaPublica } from "@/components/propostas/vista-publica";
import { montarDadosRelatorio, propostaExpirada } from "@/lib/propostas/carregar";
import { adminConfigurado } from "@/lib/rotulos";
import { hashesIguais, hashToken } from "@/lib/tokens";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ipDaRequisicao, limitarPorIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PropostaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!adminConfigurado()) return <p className="p-8">Proposta indisponível.</p>;
  const limite = limitarPorIp(`proposta:${ipDaRequisicao(await headers())}`, 40, 60_000);
  if (!limite.ok) return <p className="p-8">Muitas tentativas. Espere um minuto.</p>;
  const admin = criarClienteAdmin();
  const hash = hashToken(token);
  const { data } = await admin.from("propostas").select("id, status, token_hash_aceite, enviada_em, created_at, validade_dias, aceite_nome, aceita_em").eq("token_hash_aceite", hash).maybeSingle();
  const proposta = data as { id: string; status: string; token_hash_aceite: string; enviada_em: string | null; created_at: string; validade_dias: number; aceite_nome: string | null; aceita_em: string | null } | null;
  if (!proposta || !hashesIguais(proposta.token_hash_aceite, hash)) notFound();
  let status = proposta.status;
  if (status === "enviada" && propostaExpirada(proposta.enviada_em, proposta.created_at, proposta.validade_dias)) {
    status = "expirada";
    await admin.from("propostas").update({ status: "expirada" }).eq("id", proposta.id);
  }
  const dados = await montarDadosRelatorio(admin, proposta.id);
  if (!dados) notFound();
  return <VistaPublica dados={dados} token={token} status={status} nomeAceite={proposta.aceite_nome} />;
}
