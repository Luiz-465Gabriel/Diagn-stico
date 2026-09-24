import { notFound } from "next/navigation";
import { excluirCliente } from "@/app/(painel)/clientes/actions";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { Aviso } from "@/components/painel/aviso";
import { Button } from "@/components/ui/button";
import type { ClienteInput } from "@/lib/clientes/schema";
import { exigirSessao } from "@/lib/sessao";

export default async function EditarCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const avisos = await searchParams;
  const { id } = await params;
  const { supabase, profile } = await exigirSessao();
  const [{ data }, { data: equipe }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  if (!data) notFound();
  const cliente = data as ClienteInput & { id: string };
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Editar cliente</h1>
      <Aviso erro={avisos.erro} />
      <div className="rounded-xl border bg-card p-5">
        <ClienteForm
          id={id}
          responsaveis={(equipe ?? []) as { id: string; nome: string }[]}
          inicial={{
            tipo: cliente.tipo,
            nome: cliente.nome,
            razao_social: cliente.razao_social ?? "",
            cpf_cnpj: cliente.cpf_cnpj,
            email: cliente.email ?? "",
            whatsapp: cliente.whatsapp ?? "",
            profissao_especialidade: cliente.profissao_especialidade ?? "",
            cidade_uf: cliente.cidade_uf ?? "",
            origem_lead: cliente.origem_lead ?? "",
            responsavel_id: cliente.responsavel_id ?? "",
            status_funil: cliente.status_funil,
            observacoes: cliente.observacoes ?? "",
          }}
        />
      </div>
      {profile.perfil === "admin" && (
        <form action={excluirCliente.bind(null, id)}>
          <Button type="submit" variant="destructive">Excluir cliente</Button>
        </form>
      )}
    </div>
  );
}
