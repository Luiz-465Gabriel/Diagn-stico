import { Badge } from "@/components/ui/badge";
import { TabelaOuCards } from "@/components/painel/tabela-ou-cards";
import { formatarDataHora } from "@/lib/format";
import { rotuloDe, STATUS_ENVIO } from "@/lib/rotulos";
import { exigirCliente } from "@/lib/sessao";

export default async function PaginaFormularios() {
  const { supabase } = await exigirCliente();
  const { data } = await supabase
    .from("form_envios")
    .select("id, status, canal, expira_em, created_at, clientes(nome), form_respostas(progresso_percentual)")
    .order("created_at", { ascending: false })
    .limit(100);
  const linhas = (data ?? []) as unknown as {
    id: string;
    status: string;
    canal: string;
    expira_em: string;
    clientes: { nome: string } | { nome: string }[] | null;
    form_respostas: { progresso_percentual: number } | { progresso_percentual: number }[] | null;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Formulários</h1>
        <p className="text-sm text-muted-foreground">O link é gerado na ficha do cliente. Quando ele responder, o status fica Respondido. Abra para ver as respostas.</p>
      </div>
      <TabelaOuCards
        vazio="Nenhum envio ainda. Abra um cliente e use Enviar formulário ao cliente."
        cabecalhos={["Cliente", "Status", "Progresso", "Canal", "Validade"]}
        linhas={linhas.map((linha) => {
          const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
          const respostas = Array.isArray(linha.form_respostas) ? linha.form_respostas[0] : linha.form_respostas;
          return {
            id: linha.id,
            href: `/formularios/envios/${linha.id}`,
            valores: [
              cliente?.nome ?? "Cliente",
              <Badge key="status">{rotuloDe(STATUS_ENVIO, linha.status)}</Badge>,
              `${Number(respostas?.progresso_percentual ?? 0)}%`,
              linha.canal,
              formatarDataHora(linha.expira_em),
            ],
          };
        })}
      />
    </div>
  );
}
