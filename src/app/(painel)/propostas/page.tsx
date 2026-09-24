import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <h1 className="font-serif text-3xl">Propostas</h1>
        <p className="text-sm text-muted-foreground">A proposta nasce de um diagnóstico revisado.</p>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensal</TableHead>
              <TableHead>Avulso</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma proposta.</TableCell></TableRow>}
            {linhas.map((linha) => {
              const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
              return (
                <TableRow key={linha.id}>
                  <TableCell><Link className="font-medium hover:underline" href={`/propostas/${linha.id}`}>{linha.numero}</Link></TableCell>
                  <TableCell>{cliente?.nome}</TableCell>
                  <TableCell><Badge>{rotuloDe(STATUS_PROPOSTA, linha.status)}</Badge></TableCell>
                  <TableCell>{formatarMoeda(Number(linha.total_mensal))}</TableCell>
                  <TableCell>{formatarMoeda(Number(linha.total_avulso))}</TableCell>
                  <TableCell>{formatarData(linha.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
