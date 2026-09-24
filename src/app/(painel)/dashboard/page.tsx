import Link from "next/link";
import { formatarMoeda, formatarPercentual, inicioDoMesSaoPaulo } from "@/lib/format";
import { rotuloDe, STATUS_FUNIL } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export default async function Dashboard() {
  const { supabase, profile } = await exigirSessao();
  const [{ data: clientes }, { data: envios }, { data: propostas }] = await Promise.all([
    supabase.from("clientes").select("status_funil"),
    supabase.from("form_envios").select("status"),
    supabase.from("propostas").select("status, total_mensal, aceita_em, enviada_em, created_at"),
  ]);
  const funil = new Map<string, number>();
  for (const cliente of (clientes ?? []) as { status_funil: string }[]) {
    funil.set(cliente.status_funil, (funil.get(cliente.status_funil) ?? 0) + 1);
  }
  const listaEnvios = (envios ?? []) as { status: string }[];
  const baseResposta = listaEnvios.filter((item) => item.status !== "cancelado");
  const respondidos = listaEnvios.filter((item) => item.status === "respondido").length;
  const taxaResposta = baseResposta.length ? respondidos / baseResposta.length : 0;
  const listaPropostas = (propostas ?? []) as { status: string; total_mensal: number; aceita_em: string | null; enviada_em: string | null; created_at: string }[];
  const consideradas = listaPropostas.filter((item) => item.status !== "rascunho");
  const aceitas = consideradas.filter((item) => item.status === "aceita").length;
  const taxaConversao = consideradas.length ? aceitas / consideradas.length : 0;
  const inicioMes = inicioDoMesSaoPaulo();
  const abertas = listaPropostas.filter((item) => item.status === "enviada").reduce((acc, item) => acc + Number(item.total_mensal), 0);
  const aceitasMes = listaPropostas
    .filter((item) => item.status === "aceita" && item.aceita_em && new Date(item.aceita_em).getTime() >= inicioMes)
    .reduce((acc, item) => acc + Number(item.total_mensal), 0);
  const maxFunil = Math.max(1, ...Array.from(funil.values()));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Olá, {profile.nome.split(" ")[0]}</p>
        <h1 className="text-2xl font-semibold">Painel</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/clientes" className="rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm">
          <p className="font-medium">Enviar formulário</p>
          <p className="mt-1 text-sm text-muted-foreground">Abra o cliente, gere o link e mande no WhatsApp. As respostas voltam sozinhas.</p>
        </Link>
        <Link href="/propostas" className="rounded-lg border-l-4 border-[hsl(var(--copper))] bg-card p-4 shadow-sm">
          <p className="font-medium">Baixar proposta</p>
          <p className="mt-1 text-sm text-muted-foreground">Abra a proposta e use “Baixar proposta simples” para enviar ao cliente.</p>
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Taxa de resposta" valor={formatarPercentual(taxaResposta, 0)} detalhe={`${respondidos} de ${baseResposta.length} formulários`} faixa="bg-primary" />
        <Cartao titulo="Conversão de propostas" valor={formatarPercentual(taxaConversao, 0)} detalhe={`${aceitas} aceitas de ${consideradas.length}`} faixa="bg-[hsl(var(--copper))]" />
        <Cartao titulo="Mensal em aberto" valor={formatarMoeda(abertas)} detalhe="Propostas enviadas e ainda sem resposta" faixa="bg-sidebar" />
        <Cartao titulo="Mensal aceito no mês" valor={formatarMoeda(aceitasMes)} detalhe="Aceites deste mês" faixa="bg-emerald-600" />
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Funil</h2>
        <div className="mt-4 space-y-3">
          {STATUS_FUNIL.map((status) => {
            const quantidade = funil.get(status.value) ?? 0;
            return (
              <div key={status.value}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{rotuloDe(STATUS_FUNIL, status.value)}</span>
                  <span>{quantidade}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(quantidade / maxFunil) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Cartao({ titulo, valor, detalhe, faixa }: { titulo: string; valor: string; detalhe: string; faixa: string }) {
  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className={`h-1 ${faixa}`} />
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-2xl font-semibold">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
      </div>
    </article>
  );
}
