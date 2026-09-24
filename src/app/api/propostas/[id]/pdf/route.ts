import { registrarEvento } from "@/lib/eventos";
import { abrirNavegador, urlImpressao } from "@/lib/pdf";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const { id } = await contexto.params;
  const { data } = await sessao.supabase.from("propostas").select("id, diagnosticos(status), numero").eq("id", id).maybeSingle();
  const proposta = data as { numero: string; diagnosticos: { status: string } | { status: string }[] | null } | null;
  if (!proposta) return NextResponse.json({ erro: "Proposta não encontrada" }, { status: 404 });
  const diagnostico = Array.isArray(proposta.diagnosticos) ? proposta.diagnosticos[0] : proposta.diagnosticos;
  if (diagnostico?.status !== "revisado") {
    return NextResponse.json({ erro: "Não é possível gerar o PDF com o diagnóstico em rascunho." }, { status: 409 });
  }
  if (!process.env.PDF_SIGNING_SECRET && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ erro: "Defina PDF_SIGNING_SECRET para assinar a página de impressão." }, { status: 500 });
  }

  const navegador = await abrirNavegador();
  try {
    const pagina = await navegador.newPage();
    await pagina.goto(urlImpressao(id), { waitUntil: "networkidle0", timeout: 45000 });
    await pagina.waitForFunction("window.__RELATORIO_PRONTO__ === true", { timeout: 20000 });
    const pdf = await pagina.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;color:#333;display:flex;justify-content:space-between;"><span>${proposta.numero}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
      margin: { top: "12mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    const admin = criarClienteAdmin();
    const caminho = `${id}/diagnostico-proposta.pdf`;
    const { error } = await admin.storage.from("propostas").upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
    if (!error) {
      await admin.from("propostas").update({ pdf_path: caminho }).eq("id", id);
      await registrarEvento(admin, { entidade: "proposta", entidadeId: id, acao: "pdf_gerado", usuarioId: sessao.profile.id });
    }
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="proposta-${proposta.numero.replace("/", "-")}.pdf"`,
      },
    });
  } finally {
    await navegador.close();
  }
}
