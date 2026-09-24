import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesEnvio } from "@/components/formulario/acoes-envio";
import { Badge } from "@/components/ui/badge";
import { gerarDiagnostico } from "@/app/(painel)/diagnosticos/actions";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import { rotuloValor } from "@/lib/formulario/logica";
import type { FormSchema, RespostasMap } from "@/lib/formulario/tipos";
import { emailHabilitado } from "@/lib/email";
import { rotuloDe, STATUS_ENVIO } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";
import { Button } from "@/components/ui/button";

export default async function PaginaEnvio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirSessao();
  const { data } = await supabase
    .from("form_envios")
    .select("id, status, canal, expira_em, aberto_em, respondido_em, created_at, clientes(id, nome, whatsapp), form_templates(schema), form_respostas(respostas, progresso_percentual, consentimento_lgpd_em, submitted_at)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const linha = data as unknown as {
    id: string;
    status: string;
    canal: string;
    expira_em: string;
    aberto_em: string | null;
    respondido_em: string | null;
    created_at: string;
    clientes: { id: string; nome: string; whatsapp: string | null } | { id: string; nome: string; whatsapp: string | null }[];
    form_templates: { schema: FormSchema } | { schema: FormSchema }[];
    form_respostas: { respostas: RespostasMap; progresso_percentual: number; consentimento_lgpd_em: string | null; submitted_at: string | null } | null;
  };
  const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
  const template = Array.isArray(linha.form_templates) ? linha.form_templates[0] : linha.form_templates;
  const respostasLinha = Array.isArray(linha.form_respostas) ? linha.form_respostas[0] : linha.form_respostas;
  const respostas = respostasLinha?.respostas ?? {};
  const schema = template?.schema;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/clientes/${cliente?.id}`} className="text-sm text-muted-foreground hover:underline">{cliente?.nome}</Link>
          <h1 className="font-serif text-3xl">Respostas</h1>
          <p className="text-sm text-muted-foreground">
            {rotuloDe(STATUS_ENVIO, linha.status)} · {linha.canal} · progresso {Number(respostasLinha?.progresso_percentual ?? 0)}%
          </p>
        </div>
        <Badge>{respostasLinha?.consentimento_lgpd_em ? `LGPD ${formatarDataHora(respostasLinha.consentimento_lgpd_em)}` : "Sem aceite LGPD"}</Badge>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <AcoesEnvio envioId={id} nome={cliente?.nome ?? ""} telefone={cliente?.whatsapp ?? null} emailDisponivel={emailHabilitado()} respondido={linha.status === "respondido"} />
        <p className="mt-3 text-xs text-muted-foreground">Aberto em {formatarDataHora(linha.aberto_em)} · Respondido em {formatarDataHora(linha.respondido_em)} · Validade {formatarDataHora(linha.expira_em)}</p>
      </div>
      {linha.status === "respondido" && (
        <form action={gerarDiagnostico.bind(null, id)}>
          <Button type="submit">Gerar diagnóstico</Button>
        </form>
      )}
      {schema?.secoes.map((secao) => (
        <section key={secao.id} className="rounded-xl border bg-card p-5">
          <h2 className="font-serif text-xl">{secao.titulo}</h2>
          <dl className="mt-4 space-y-4">
            {secao.perguntas.map((pergunta) => {
              const resposta = respostas[pergunta.id];
              const vazia = !resposta || (resposta.valor === null && !resposta.nao_sabe) || resposta.valor === "" || (Array.isArray(resposta.valor) && resposta.valor.length === 0);
              return (
                <div key={pergunta.id} className={vazia && pergunta.obrigatoria ? "rounded-lg bg-amber-50 p-3" : ""}>
                  <dt className="text-sm text-muted-foreground">{pergunta.titulo}</dt>
                  <dd className="mt-1 text-sm">
                    {pergunta.tipo === "moeda" && typeof resposta?.valor === "number" ? formatarMoeda(resposta.valor) : rotuloValor(resposta?.valor, resposta?.nao_sabe)}
                    {resposta?.nao_sabe && <Badge variant="alerta" className="ml-2">Não sei</Badge>}
                    {vazia && pergunta.obrigatoria && !resposta?.nao_sabe && <span className="ml-2 text-amber-800">Obrigatória sem resposta</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
