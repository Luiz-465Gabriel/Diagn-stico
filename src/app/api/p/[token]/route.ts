import { registrarEvento } from "@/lib/eventos";
import { propostaExpirada } from "@/lib/propostas/carregar";
import { ipDaRequisicao, limitarPorIp } from "@/lib/rate-limit";
import { hashesIguais, hashToken } from "@/lib/tokens";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, contexto: { params: Promise<{ token: string }> }) {
  const limite = limitarPorIp(`aceite:${ipDaRequisicao(request.headers)}`, 20, 60_000);
  if (!limite.ok) return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  const { token } = await contexto.params;
  const corpo = (await request.json().catch(() => null)) as { decisao?: string; nome?: string; motivo?: string } | null;
  if (corpo?.decisao !== "aceitar" && corpo?.decisao !== "recusar") {
    return NextResponse.json({ erro: "Decisão inválida." }, { status: 400 });
  }
  if (corpo.decisao === "aceitar" && !corpo.nome?.trim()) {
    return NextResponse.json({ erro: "Informe seu nome para aceitar." }, { status: 400 });
  }
  const admin = criarClienteAdmin();
  const hash = hashToken(token);
  const { data } = await admin.from("propostas").select("id, status, token_hash_aceite, cliente_id, enviada_em, created_at, validade_dias").eq("token_hash_aceite", hash).maybeSingle();
  const proposta = data as { id: string; status: string; token_hash_aceite: string; cliente_id: string; enviada_em: string | null; created_at: string; validade_dias: number } | null;
  if (!proposta || !hashesIguais(proposta.token_hash_aceite, hash)) return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  if (proposta.status !== "enviada") return NextResponse.json({ erro: "Esta proposta não está mais aberta." }, { status: 409 });
  if (propostaExpirada(proposta.enviada_em, proposta.created_at, proposta.validade_dias)) {
    await admin.from("propostas").update({ status: "expirada" }).eq("id", proposta.id);
    return NextResponse.json({ erro: "A proposta expirou." }, { status: 409 });
  }
  const ip = ipDaRequisicao(request.headers);
  if (corpo.decisao === "aceitar") {
    await admin.from("propostas").update({ status: "aceita", aceita_em: new Date().toISOString(), aceite_nome: corpo.nome?.trim(), aceite_ip: ip }).eq("id", proposta.id);
    await admin.from("clientes").update({ status_funil: "fechado" }).eq("id", proposta.cliente_id);
    await registrarEvento(admin, { entidade: "proposta", entidadeId: proposta.id, acao: "proposta_aceita", dados: { nome: corpo.nome?.trim() } });
  } else {
    await admin.from("propostas").update({ status: "recusada", motivo_recusa: corpo.motivo?.trim() || null, aceite_ip: ip }).eq("id", proposta.id);
    await registrarEvento(admin, { entidade: "proposta", entidadeId: proposta.id, acao: "proposta_recusada", dados: { motivo: corpo.motivo?.trim() || null } });
  }
  return NextResponse.json({ ok: true });
}
