import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarDataHora } from "@/lib/format";
import { rotuloDe, STATUS_ENVIO } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaFormularios() {
  const { supabase } = await exigirSessao();
  const { data } = await supabase
    .from("form_envios")
    .select("id, status, canal, expira_em, aberto_em, respondido_em, created_at, clientes(nome), form_respostas(progresso_percentual)")
    .order("created_at", { ascending: false })
    .limit(100);
  const linhas = (data ?? []) as unknown as {
    id: string;
    status: string;
    canal: string;
    expira_em: string;
    created_at: string;
    clientes: { nome: string } | { nome: string }[] | null;
    form_respostas: { progresso_percentual: number } | { progresso_percentual: number }[] | null;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Formulários</h1>
        <p className="text-sm text-muted-foreground">Envios do planejamento do novo espaço. O link nasce na ficha do cliente.</p>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Validade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum envio ainda.</TableCell></TableRow>
            )}
            {linhas.map((linha) => {
              const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
              const respostas = Array.isArray(linha.form_respostas) ? linha.form_respostas[0] : linha.form_respostas;
              return (
                <TableRow key={linha.id}>
                  <TableCell><Link className="font-medium hover:underline" href={`/formularios/envios/${linha.id}`}>{cliente?.nome ?? "Cliente"}</Link></TableCell>
                  <TableCell><Badge>{rotuloDe(STATUS_ENVIO, linha.status)}</Badge></TableCell>
                  <TableCell>{Number(respostas?.progresso_percentual ?? 0)}%</TableCell>
                  <TableCell>{linha.canal}</TableCell>
                  <TableCell>{formatarDataHora(linha.expira_em)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
