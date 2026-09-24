import { registrarEvento } from "@/lib/eventos";
import { abrirNavegador, urlImpressao } from "@/lib/pdf";
import { nomeArquivoCompleto, nomeArquivoSimples, pdfPropostaSimples } from "@/lib/propostas/pdf-simples";
import { montarDadosRelatorio } from "@/lib/propostas/carregar";
import { obterSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
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

  const simples = new URL(request.url).searchParams.get("versao") === "simples";
  if (simples) {
    try {
      const dados = await montarDadosRelatorio(criarClienteAdmin(), id);
      if (!dados) return NextResponse.json({ erro: "Proposta não encontrada" }, { status: 404 });
      const pdf = await pdfPropostaSimples(dados);
      return await entregar(id, sessao.profile.id, pdf, nomeArquivoSimples(proposta.numero), `${id}/proposta-simples.pdf`);
    } catch {
      return NextResponse.json({ erro: "Não foi possível gerar a proposta simples." }, { status: 500 });
    }
  }

  if (!process.env.PDF_SIGNING_SECRET && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ erro: "Defina PDF_SIGNING_SECRET para assinar a página de impressão." }, { status: 500 });
  }

  let navegador: Awaited<ReturnType<typeof abrirNavegador>> | null = null;
  try {
    navegador = await abrirNavegador();
    const pagina = await navegador.newPage();
    await pagina.goto(urlImpressao(id), { waitUntil: "load", timeout: 25000 });
    await pagina.waitForFunction("window.__RELATORIO_PRONTO__ === true", { timeout: 12000 });
    const pdf = await pagina.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;color:#333;display:flex;justify-content:space-between;"><span>${proposta.numero}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
      margin: { top: "12mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return await entregar(id, sessao.profile.id, pdf, nomeArquivoCompleto(proposta.numero), `${id}/diagnostico-proposta.pdf`);
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível gerar o PDF. Instale o Google Chrome ou defina CHROME_PATH no .env.local e reinicie o servidor." },
      { status: 500 },
    );
  } finally {
    await navegador?.close();
  }
}

async function entregar(id: string, usuarioId: string, pdf: Uint8Array | Buffer, nome: string, caminho: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin.storage.from("propostas").upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
  if (!error) {
    await admin.from("propostas").update({ pdf_path: caminho }).eq("id", id);
    await registrarEvento(admin, { entidade: "proposta", entidadeId: id, acao: "pdf_gerado", usuarioId });
  }
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
