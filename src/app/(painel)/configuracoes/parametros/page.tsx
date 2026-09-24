import { salvarParametro } from "@/app/(painel)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaParametros() {
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("parametros_diagnostico").select("chave, valor, descricao, tipo").order("chave");
  const linhas = (data ?? []) as { chave: string; valor: number; descricao: string; tipo: string }[];
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Premissas padrão</h1>
      <p className="text-sm text-muted-foreground">Percentuais são gravados como fração: 85% = 0,85. Moeda em reais.</p>
      {linhas.map((linha) => (
        <form key={linha.chave} action={salvarParametro} className="grid items-end gap-2 rounded-xl border bg-card p-3 md:grid-cols-[1fr_160px_auto]">
          <div>
            <p className="font-medium">{linha.chave}</p>
            <p className="text-xs text-muted-foreground">{linha.descricao} · {linha.tipo}</p>
          </div>
          <input type="hidden" name="chave" value={linha.chave} />
          <Input name="valor" type="number" step="0.0001" defaultValue={Number(linha.valor)} />
          <Button type="submit" size="sm">Salvar</Button>
        </form>
      ))}
    </div>
  );
}
