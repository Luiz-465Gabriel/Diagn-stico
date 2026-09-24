import { ClienteForm } from "@/components/clientes/cliente-form";
import { exigirSessao } from "@/lib/sessao";

export default async function NovoCliente() {
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome");
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Novo cliente</h1>
      <div className="rounded-xl border bg-card p-5">
        <ClienteForm
          responsaveis={(data ?? []) as { id: string; nome: string }[]}
          inicial={{
            tipo: "PF",
            nome: "",
            razao_social: "",
            cpf_cnpj: "",
            email: "",
            whatsapp: "",
            profissao_especialidade: "",
            cidade_uf: "",
            origem_lead: "",
            responsavel_id: profile.id,
            status_funil: "lead",
            observacoes: "",
          }}
        />
      </div>
    </div>
  );
}
