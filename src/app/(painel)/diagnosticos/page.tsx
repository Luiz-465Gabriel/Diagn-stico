import { Badge } from "@/components/ui/badge";
import { TabelaOuCards } from "@/components/painel/tabela-ou-cards";
import { formatarDataHora } from "@/lib/format";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaDiagnosticos() {
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("diagnosticos").select("id, status, versao_motor, created_at, clientes(nome)").order("created_at", { ascending: false }).limit(100);
  const linhas = (data ?? []) as unknown as { id: string; status: string; versao_motor: string; created_at: string; clientes: { nome: string } | { nome: string }[] | null }[];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Diagnósticos</h1>
        <p className="text-sm text-muted-foreground">O diagnóstico nasce das respostas recebidas. Abra para revisar as premissas.</p>
      </div>
      <TabelaOuCards
        vazio="Nenhum diagnóstico."
        cabecalhos={["Cliente", "Status", "Motor", "Criado"]}
        linhas={linhas.map((linha) => {
          const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
          return {
            id: linha.id,
            href: `/diagnosticos/${linha.id}`,
            valores: [
              cliente?.nome ?? "Cliente",
              <Badge key="status" variant={linha.status === "revisado" ? "ok" : "alerta"}>{linha.status === "revisado" ? "Revisado" : "Rascunho"}</Badge>,
              linha.versao_motor,
              formatarDataHora(linha.created_at),
            ],
          };
        })}
      />
    </div>
  );
}
