import { Badge } from "@/components/ui/badge";
import { TabelaOuCards } from "@/components/painel/tabela-ou-cards";
import { formatarData, formatarMoeda } from "@/lib/format";
import { rotuloDe, STATUS_PROPOSTA } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaPropostas() {
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("propostas").select("id, numero, status, total_mensal, total_avulso, created_at, clientes(nome)").order("created_at", { ascending: false }).limit(100);
  const linhas = (data ?? []) as unknown as { id: string; numero: string; status: string; total_mensal: number; total_avulso: number; created_at: string; clientes: { nome: string } | { nome: string }[] | null }[];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Propostas</h1>
        <p className="text-sm text-muted-foreground">Abra a proposta para baixar o PDF e enviar ao cliente.</p>
      </div>
      <TabelaOuCards
        vazio="Nenhuma proposta."
        cabecalhos={["Número", "Cliente", "Status", "Mensal", "Avulso", "Data"]}
        linhas={linhas.map((linha) => {
          const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
          return {
            id: linha.id,
            href: `/propostas/${linha.id}`,
            valores: [
              linha.numero,
              cliente?.nome ?? "—",
              <Badge key="status">{rotuloDe(STATUS_PROPOSTA, linha.status)}</Badge>,
              formatarMoeda(Number(linha.total_mensal)),
              formatarMoeda(Number(linha.total_avulso)),
              formatarData(linha.created_at),
            ],
          };
        })}
      />
    </div>
  );
}
