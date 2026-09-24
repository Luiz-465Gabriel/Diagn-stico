import { atualizarUsuario, criarUsuario } from "@/app/(painel)/configuracoes/actions";
import { Aviso } from "@/components/painel/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exigirAdmin } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export default async function PaginaUsuarios({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const avisos = await searchParams;
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const { data } = await admin.from("profiles").select("id, nome, email, perfil, ativo").order("nome");
  const pessoas = (data ?? []) as { id: string; nome: string; email: string; perfil: string; ativo: boolean }[];
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Usuários da equipe</h1>
      <p className="text-sm text-muted-foreground">Não há cadastro público. A administração cria o acesso e informa a senha inicial.</p>
      <Aviso erro={avisos.erro} ok={avisos.ok} />
      <form action={criarUsuario} className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-2">
        <Input name="nome" placeholder="Nome" required />
        <Input name="email" type="email" placeholder="E-mail" required />
        <Input name="senha" type="text" placeholder="Senha inicial" minLength={8} required />
        <select name="perfil" className="h-11 rounded-md border px-2 text-sm">
          <option value="colaborador">Colaborador</option>
          <option value="admin">Administração</option>
        </select>
        <Button type="submit">Criar usuário</Button>
      </form>
      <div className="space-y-3">
        {pessoas.map((pessoa) => (
          <form key={pessoa.id} action={atualizarUsuario} className="grid items-center gap-2 rounded-xl border bg-card p-3 md:grid-cols-5">
            <input type="hidden" name="id" value={pessoa.id} />
            <Input name="nome" defaultValue={pessoa.nome} />
            <p className="text-sm">{pessoa.email}</p>
            <select name="perfil" defaultValue={pessoa.perfil} className="h-11 rounded-md border px-2 text-sm">
              <option value="colaborador">Colaborador</option>
              <option value="admin">Administração</option>
            </select>
            <label className="text-sm"><input type="checkbox" name="ativo" defaultChecked={pessoa.ativo} /> Ativo</label>
            <Button type="submit" size="sm">Atualizar</Button>
          </form>
        ))}
      </div>
    </div>
  );
}
