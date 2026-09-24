import { rotuloValor } from "@/lib/formulario/logica";
import type { FormSchema, RespostasMap } from "@/lib/formulario/tipos";
import { obterSessao } from "@/lib/sessao";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const { id } = await contexto.params;
  const { data } = await sessao.supabase
    .from("form_envios")
    .select("id, clientes(nome), form_templates(schema), form_respostas(respostas)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });
  const linha = data as unknown as {
    clientes: { nome: string } | { nome: string }[] | null;
    form_templates: { schema: FormSchema } | { schema: FormSchema }[] | null;
    form_respostas: { respostas: RespostasMap } | { respostas: RespostasMap }[] | null;
  };
  const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
  const template = Array.isArray(linha.form_templates) ? linha.form_templates[0] : linha.form_templates;
  const respostasLinha = Array.isArray(linha.form_respostas) ? linha.form_respostas[0] : linha.form_respostas;
  const respostas = respostasLinha?.respostas ?? {};
  const linhas = ["secao,pergunta_id,pergunta,valor,nao_sabe"];
  for (const secao of template?.schema.secoes ?? []) {
    for (const pergunta of secao.perguntas) {
      const resposta = respostas[pergunta.id];
      const valor = rotuloValor(resposta?.valor, false).replaceAll('"', '""');
      linhas.push(`"${secao.titulo}","${pergunta.id}","${pergunta.titulo.replaceAll('"', '""')}","${valor}","${resposta?.nao_sabe ? "sim" : "nao"}"`);
    }
  }
  return new NextResponse(linhas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="respostas-${(cliente?.nome ?? "cliente").replace(/\s+/g, "-").toLowerCase()}.csv"`,
    },
  });
}
