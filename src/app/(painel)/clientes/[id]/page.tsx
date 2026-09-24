import Link from "next/link";
import { notFound } from "next/navigation";
import { PainelCliente } from "@/components/clientes/painel-cliente";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/cpf-cnpj";
import { formatarDataHora } from "@/lib/format";
import { emailHabilitado } from "@/lib/email";
import { rotuloDe, STATUS_ENVIO, STATUS_FUNIL, STATUS_PROPOSTA } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const cliente = data as {
    id: string;
    tipo: string;
    nome: string;
    razao_social: string | null;
    cpf_cnpj: string;
    email: string | null;
    whatsapp: string | null;
    profissao_especialidade: string | null;
    cidade_uf: string | null;
    origem_lead: string | null;
    status_funil: string;
    observacoes: string | null;
  };
  const [{ data: envios }, { data: diagnosticos }, { data: propostas }] = await Promise.all([
    supabase.from("form_envios").select("id, status, canal, progresso:form_respostas(progresso_percentual), expira_em, created_at").eq("cliente_id", id).order("created_at", { ascending: false }),
    supabase.from("diagnosticos").select("id, status, created_at, versao_motor").eq("cliente_id", id).order("created_at", { ascending: false }),
    supabase.from("propostas").select("id, numero, status, total_mensal, total_avulso, created_at").eq("cliente_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{cliente.tipo} · {formatarCpfCnpj(cliente.cpf_cnpj)}</p>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">{cliente.profissao_especialidade || "Especialidade não informada"}{cliente.cidade_uf ? ` · ${cliente.cidade_uf}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{rotuloDe(STATUS_FUNIL, cliente.status_funil)}</Badge>
          <Button asChild variant="outline"><Link href={`/clientes/${id}/editar`}>Editar</Link></Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Info titulo="WhatsApp" valor={cliente.whatsapp ? formatarTelefone(cliente.whatsapp) : "—"} />
        <Info titulo="E-mail" valor={cliente.email || "—"} />
        <Info titulo="Origem" valor={cliente.origem_lead || "—"} />
      </div>
      {cliente.observacoes && <p className="rounded-xl border bg-card p-4 text-sm">{cliente.observacoes}</p>}
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold">Enviar formulário ao cliente</h2>
        <ol className="mb-4 mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Gere o link. Ele vale 30 dias e o cliente entra sem senha.</li>
          <li>Mande pelo WhatsApp ou copie o link. O e-mail só funciona com o Resend configurado.</li>
          <li>O cliente responde no celular. Você não precisa ficar com a tela aberta.</li>
          <li>Quando terminar, o envio abaixo fica como Respondido. Abra para ler as respostas e gerar o diagnóstico.</li>
        </ol>
        <PainelCliente clienteId={cliente.id} nome={cliente.nome} telefone={cliente.whatsapp} emailDisponivel={emailHabilitado()} />
      </section>
      <Lista titulo="Envios" vazio="Nenhum formulário enviado." itens={((envios ?? []) as { id: string; status: string; canal: string; expira_em: string; created_at: string; progresso: { progresso_percentual: number } | { progresso_percentual: number }[] | null }[]).map((envio) => {
        const progresso = Array.isArray(envio.progresso) ? envio.progresso[0]?.progresso_percentual : envio.progresso?.progresso_percentual;
        return { href: `/formularios/envios/${envio.id}`, titulo: rotuloDe(STATUS_ENVIO, envio.status), detalhe: `${envio.canal} · ${progresso ?? 0}% · expira ${formatarDataHora(envio.expira_em)}` };
      })} />
      <Lista titulo="Diagnósticos" vazio="Nenhum diagnóstico." itens={((diagnosticos ?? []) as { id: string; status: string; created_at: string; versao_motor: string }[]).map((item) => ({
        href: `/diagnosticos/${item.id}`,
        titulo: item.status === "revisado" ? "Revisado" : "Rascunho",
        detalhe: `${formatarDataHora(item.created_at)} · motor ${item.versao_motor}`,
      }))} />
      <Lista titulo="Propostas" vazio="Nenhuma proposta." itens={((propostas ?? []) as { id: string; numero: string; status: string; total_mensal: number }[]).map((item) => ({
        href: `/propostas/${item.id}`,
        titulo: item.numero,
        detalhe: rotuloDe(STATUS_PROPOSTA, item.status),
      }))} />
      {profile.perfil === "admin" && <p className="text-xs text-muted-foreground">A exclusão fica na edição, somente para administração.</p>}
    </div>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-sm">{valor}</p>
    </div>
  );
}

function Lista({ titulo, vazio, itens }: { titulo: string; vazio: string; itens: { href: string; titulo: string; detalhe: string }[] }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{titulo}</h2>
      <div className="divide-y rounded-lg border bg-card shadow-sm">
        {itens.length === 0 && <p className="p-4 text-sm text-muted-foreground">{vazio}</p>}
        {itens.map((item) => (
          <div key={item.href} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{item.titulo}</p>
              <p className="text-muted-foreground">{item.detalhe}</p>
            </div>
            <Button asChild size="sm" className="h-10 sm:h-8"><Link href={item.href}>Abrir</Link></Button>
          </div>
        ))}
      </div>
    </section>
  );
}
