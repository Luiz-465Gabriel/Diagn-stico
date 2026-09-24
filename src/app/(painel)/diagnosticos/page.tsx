import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarDataHora } from "@/lib/format";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaDiagnosticos() {
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("diagnosticos").select("id, status, versao_motor, created_at, clientes(nome)").order("created_at", { ascending: false }).limit(100);
  const linhas = (data ?? []) as unknown as { id: string; status: string; versao_motor: string; created_at: string; clientes: { nome: string } | { nome: string }[] | null }[];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Diagnósticos</h1>
        <p className="text-sm text-muted-foreground">O diagnóstico nasce das respostas recebidas, na ficha do envio.</p>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motor</TableHead>
              <TableHead>Criado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Nenhum diagnóstico.</TableCell></TableRow>}
            {linhas.map((linha) => {
              const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
              return (
                <TableRow key={linha.id}>
                  <TableCell><Link className="font-medium hover:underline" href={`/diagnosticos/${linha.id}`}>{cliente?.nome ?? "Cliente"}</Link></TableCell>
                  <TableCell><Badge variant={linha.status === "revisado" ? "ok" : "alerta"}>{linha.status === "revisado" ? "Revisado" : "Rascunho"}</Badge></TableCell>
                  <TableCell>{linha.versao_motor}</TableCell>
                  <TableCell>{formatarDataHora(linha.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
