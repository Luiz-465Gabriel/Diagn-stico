import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/cpf-cnpj";
import { STATUS_FUNIL, rotuloDe } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; responsavel?: string }>;
}) {
  const { supabase } = await exigirSessao();
  const filtros = await searchParams;
  let consulta = supabase.from("clientes").select("id, nome, tipo, cpf_cnpj, whatsapp, cidade_uf, status_funil, responsavel_id, profiles!clientes_responsavel_id_fkey(nome)").order("created_at", { ascending: false }).limit(100);
  if (filtros.q) {
    const termo = filtros.q.replace(/[%_]/g, "");
    consulta = consulta.or(`nome.ilike.%${termo}%,razao_social.ilike.%${termo}%,cpf_cnpj.ilike.%${termo.replace(/\D/g, "")}%,email.ilike.%${termo}%`);
  }
  if (filtros.status) consulta = consulta.eq("status_funil", filtros.status);
  if (filtros.responsavel) consulta = consulta.eq("responsavel_id", filtros.responsavel);
  const [{ data }, { data: equipe }] = await Promise.all([
    consulta,
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  const linhas = (data ?? []) as unknown as {
    id: string;
    nome: string;
    tipo: string;
    cpf_cnpj: string;
    whatsapp: string | null;
    cidade_uf: string | null;
    status_funil: string;
    profiles: { nome: string } | { nome: string }[] | null;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Clientes</h1>
          <p className="text-sm text-muted-foreground">Leads e clientes do escritório.</p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">Novo cliente</Link>
        </Button>
      </div>
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4">
        <Input name="q" placeholder="Buscar nome, documento ou e-mail" defaultValue={filtros.q} />
        <select name="status" defaultValue={filtros.status ?? ""} className="h-11 rounded-md border bg-card px-3 text-sm">
          <option value="">Todos os status</option>
          {STATUS_FUNIL.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select name="responsavel" defaultValue={filtros.responsavel ?? ""} className="h-11 rounded-md border bg-card px-3 text-sm">
          <option value="">Todos os responsáveis</option>
          {((equipe ?? []) as { id: string; nome: string }[]).map((pessoa) => (
            <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
          ))}
        </select>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum cliente com esses filtros.</TableCell>
              </TableRow>
            )}
            {linhas.map((cliente) => {
              const responsavel = Array.isArray(cliente.profiles) ? cliente.profiles[0]?.nome : cliente.profiles?.nome;
              return (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">{cliente.nome}</Link>
                    <p className="text-xs text-muted-foreground">{cliente.tipo}{cliente.cidade_uf ? ` · ${cliente.cidade_uf}` : ""}</p>
                  </TableCell>
                  <TableCell>{formatarCpfCnpj(cliente.cpf_cnpj)}</TableCell>
                  <TableCell>{cliente.whatsapp ? formatarTelefone(cliente.whatsapp) : "—"}</TableCell>
                  <TableCell><Badge>{rotuloDe(STATUS_FUNIL, cliente.status_funil)}</Badge></TableCell>
                  <TableCell>{responsavel ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
