import { concluirEnvioPublico, salvarEnvioPublico } from "@/lib/formulario/acesso";
import type { RespostasMap } from "@/lib/formulario/tipos";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params;
  const corpo = (await request.json().catch(() => null)) as { acao?: string; respostas?: RespostasMap; consentimento?: boolean } | null;
  if (!corpo?.respostas || JSON.stringify(corpo.respostas).length > 500_000) {
    return NextResponse.json({ erro: "Envio inválido." }, { status: 400 });
  }
  if (corpo.acao === "enviar") {
    const resultado = await concluirEnvioPublico(token, { respostas: corpo.respostas }, request.headers);
    if (!resultado.ok) return NextResponse.json({ erro: resultado.erro, erros: "erros" in resultado ? resultado.erros : undefined }, { status: resultado.status });
    return NextResponse.json(resultado);
  }
  const resultado = await salvarEnvioPublico(token, { respostas: corpo.respostas, consentimento: Boolean(corpo.consentimento) }, request.headers);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  return NextResponse.json(resultado);
}
