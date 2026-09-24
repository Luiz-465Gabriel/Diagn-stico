import Link from "next/link";
import { notFound } from "next/navigation";
import { reabrirDiagnostico } from "@/app/(painel)/diagnosticos/actions";
import { EditorPremissas } from "@/components/diagnostico/editor";
import { Button } from "@/components/ui/button";
import { parametrosDeLinhas, tributosVigentes, type LinhaTributo } from "@/lib/diagnostico/parametros";
import type { PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import { dataHojeIso } from "@/lib/format";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaDiagnostico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("diagnosticos").select("id, status, premissas, clientes(nome, id)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const linha = data as unknown as { id: string; status: string; premissas: PremissasDiagnostico; clientes: { nome: string; id: string } | { nome: string; id: string }[] };
  const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
  const [{ data: parametrosLinhas }, { data: tributosLinhas }, { data: municipios }] = await Promise.all([
    supabase.from("parametros_diagnostico").select("chave, valor"),
    supabase.from("parametros_tributarios").select("id, regime, vigencia_inicio, vigencia_fim, parametros, fonte_legal"),
    supabase.from("parametros_municipais").select("municipio_uf, aliquota_iss").order("municipio_uf"),
  ]);
  const parametros = parametrosDeLinhas((parametrosLinhas ?? []) as { chave: string; valor: number }[]);
  const tributos = tributosVigentes((tributosLinhas ?? []) as LinhaTributo[], dataHojeIso());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/clientes/${cliente?.id}`} className="text-sm text-muted-foreground hover:underline">{cliente?.nome}</Link>
          <h1 className="font-serif text-3xl">Premissas do diagnóstico</h1>
          <p className="text-sm text-muted-foreground">Campos em destaque vieram de “Não sei” ou de estimativa do escritório. A prévia recalcula a cada alteração.</p>
        </div>
        {linha.status === "revisado" && (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/propostas/nova?diagnostico=${id}`}>Nova proposta</Link>
            </Button>
            <form action={reabrirDiagnostico.bind(null, id)}>
              <Button type="submit" variant="outline">Reabrir revisão</Button>
            </form>
          </div>
        )}
      </div>
      <EditorPremissas
        diagnosticoId={id}
        inicial={linha.premissas}
        parametros={parametros}
        tributos={tributos}
        municipios={(municipios ?? []) as { municipio_uf: string; aliquota_iss: number }[]}
        bloqueado={linha.status === "revisado"}
      />
    </div>
  );
}
