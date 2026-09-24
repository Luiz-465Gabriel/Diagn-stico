import { salvarMunicipio, salvarTributo } from "@/app/(painel)/configuracoes/actions";
import { Aviso } from "@/components/painel/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { exigirCliente } from "@/lib/sessao";

export default async function PaginaTributario({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const avisos = await searchParams;
  const { supabase } = await exigirCliente();
  const [{ data: tributos }, { data: municipios }] = await Promise.all([
    supabase.from("parametros_tributarios").select("id, regime, vigencia_inicio, vigencia_fim, parametros, fonte_legal").order("regime"),
    supabase.from("parametros_municipais").select("municipio_uf, aliquota_iss, observacoes").order("municipio_uf"),
  ]);
  const linhas = (tributos ?? []) as { id: string; regime: string; vigencia_inicio: string; vigencia_fim: string | null; parametros: unknown; fonte_legal: string }[];
  const cidades = (municipios ?? []) as { municipio_uf: string; aliquota_iss: number; observacoes: string | null }[];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Parâmetros tributários</h1>
        <p className="text-sm text-muted-foreground">Tudo que está marcado como VALIDAR é exemplo. A fonte legal aparece no relatório e precisa ser conferida antes do uso.</p>
        <Aviso erro={avisos.erro} ok={avisos.ok} />
      </div>
      {linhas.map((linha) => (
        <form key={linha.id} action={salvarTributo} className="space-y-2 rounded-xl border bg-card p-4">
          <input type="hidden" name="id" value={linha.id} />
          <p className="font-medium">{linha.regime}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">Vigência início<Input type="date" name="vigencia_inicio" defaultValue={linha.vigencia_inicio} /></label>
            <label className="text-sm">Vigência fim<Input type="date" name="vigencia_fim" defaultValue={linha.vigencia_fim ?? ""} /></label>
          </div>
          <label className="block text-sm">Fonte legal<Textarea name="fonte_legal" defaultValue={linha.fonte_legal} /></label>
          <label className="block text-sm">Parâmetros (JSON)<Textarea name="parametros" className="min-h-40 font-mono text-xs" defaultValue={JSON.stringify(linha.parametros, null, 2)} /></label>
          <Button type="submit" size="sm">Salvar vigência</Button>
        </form>
      ))}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl">ISS municipal</h2>
        <ul className="text-sm">
          {cidades.map((cidade) => (
            <li key={cidade.municipio_uf}>{cidade.municipio_uf}: {(Number(cidade.aliquota_iss) * 100).toLocaleString("pt-BR")}% — {cidade.observacoes}</li>
          ))}
        </ul>
        <form action={salvarMunicipio} className="grid gap-2 md:grid-cols-4">
          <Input name="municipio_uf" placeholder="Cidade/UF" required />
          <Input name="aliquota_iss" type="number" step="0.0001" placeholder="0,02" required />
          <Input name="observacoes" placeholder="Fonte / observação" />
          <Button type="submit">Salvar município</Button>
        </form>
      </section>
    </div>
  );
}
