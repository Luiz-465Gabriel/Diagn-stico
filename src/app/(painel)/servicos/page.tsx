import { removerMapa, salvarMapa, salvarServico } from "@/app/(painel)/servicos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIORIDADES_APOIO, TIPOS_APOIO } from "@/lib/formulario/template-v1";
import { formatarMoeda } from "@/lib/format";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaServicos() {
  const { supabase } = await exigirSessao();
  const [{ data: servicos }, { data: mapa }] = await Promise.all([
    supabase.from("servicos").select("id, nome, descricao, tipo, valor_base, ativo, ordem").order("ordem"),
    supabase.from("mapa_prioridade_servico").select("id, prioridade, servico_id, servicos(nome)").order("prioridade"),
  ]);
  const lista = (servicos ?? []) as { id: string; nome: string; descricao: string | null; tipo: string; valor_base: number; ativo: boolean; ordem: number }[];
  const ligacoes = (mapa ?? []) as unknown as { id: string; prioridade: string; servico_id: string; servicos: { nome: string } | { nome: string }[] | null }[];
  const prioridades = [...PRIORIDADES_APOIO, ...TIPOS_APOIO];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Serviços</h1>
        <p className="text-sm text-muted-foreground">Valores de referência do catálogo. A proposta pode alterá-los item a item.</p>
      </div>
      <div className="space-y-3">
        {lista.map((servico) => (
          <form key={servico.id} action={salvarServico} className="grid gap-2 rounded-xl border bg-card p-3 md:grid-cols-6">
            <input type="hidden" name="id" value={servico.id} />
            <Input name="nome" defaultValue={servico.nome} className="md:col-span-2" />
            <select name="tipo" defaultValue={servico.tipo} className="h-11 rounded-md border px-2 text-sm">
              <option value="mensal">Mensal</option>
              <option value="avulso">Avulso</option>
            </select>
            <Input name="valor_base" type="number" step="0.01" defaultValue={servico.valor_base} />
            <Input name="ordem" type="number" defaultValue={servico.ordem} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={servico.ativo} /> Ativo</label>
            <p className="md:col-span-5 text-xs text-muted-foreground">{servico.descricao} · hoje {formatarMoeda(Number(servico.valor_base))}</p>
            <Button type="submit" size="sm">Salvar</Button>
          </form>
        ))}
        <form action={salvarServico} className="grid gap-2 rounded-xl border border-dashed p-3 md:grid-cols-5">
          <Input name="nome" placeholder="Novo serviço" required />
          <select name="tipo" className="h-11 rounded-md border px-2 text-sm"><option value="avulso">Avulso</option><option value="mensal">Mensal</option></select>
          <Input name="valor_base" type="number" step="0.01" placeholder="Valor base" defaultValue={0} />
          <Input name="ordem" type="number" defaultValue={lista.length + 1} />
          <Button type="submit">Incluir</Button>
          <input type="hidden" name="ativo" value="on" />
        </form>
      </div>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Prioridade → serviço</h2>
        <ul className="space-y-2">
          {ligacoes.map((item) => {
            const nome = Array.isArray(item.servicos) ? item.servicos[0]?.nome : item.servicos?.nome;
            return (
              <li key={item.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                <span>{item.prioridade} → {nome}</span>
                <form action={removerMapa}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="ghost" size="sm">Remover</Button>
                </form>
              </li>
            );
          })}
        </ul>
        <form action={salvarMapa} className="grid gap-2 md:grid-cols-3">
          <select name="prioridade" className="h-11 rounded-md border bg-card px-2 text-sm">
            {prioridades.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select name="servico_id" className="h-11 rounded-md border bg-card px-2 text-sm">
            {lista.filter((item) => item.ativo).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
          <Button type="submit">Vincular</Button>
        </form>
        <Badge variant="secondary">O texto da prioridade precisa ser idêntico ao do formulário.</Badge>
      </section>
    </div>
  );
}
