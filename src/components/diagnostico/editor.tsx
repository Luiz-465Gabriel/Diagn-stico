"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { salvarDiagnostico } from "@/app/(painel)/diagnosticos/actions";
import { GraficosDiagnostico } from "@/components/diagnostico/graficos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { calcularDiagnostico } from "@/lib/diagnostico/motor";
import { montarEntrada, type PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import type { CampoNumero, ParametrosCalculo, ParametroPF, ParametroPresumido, ParametroSimples } from "@/lib/diagnostico/tipos";
import { formatarMoeda, formatarPercentual } from "@/lib/format";

const NUMERICOS: { chave: keyof PremissasDiagnostico; rotulo: string; modo: "moeda" | "numero" | "percentual" }[] = [
  { chave: "dias_semana", rotulo: "Dias de atendimento por semana", modo: "numero" },
  { chave: "horas_dia", rotulo: "Horas de atendimento por dia", modo: "numero" },
  { chave: "pacientes_inicio", rotulo: "Pacientes no início", modo: "numero" },
  { chave: "sessoes_por_paciente_mes", rotulo: "Sessões por paciente no mês", modo: "numero" },
  { chave: "pessoas_por_horario_grupo", rotulo: "Pessoas por horário de grupo", modo: "numero" },
  { chave: "aluguel", rotulo: "Aluguel", modo: "moeda" },
  { chave: "gastos_mensais", rotulo: "Gastos mensais do espaço", modo: "moeda" },
  { chave: "remuneracao_fixa", rotulo: "Remuneração fixa da outra profissional", modo: "moeda" },
  { chave: "percentual_remuneracao", rotulo: "Percentual da outra profissional", modo: "percentual" },
  { chave: "honorario_contabil", rotulo: "Honorário contábil mensal", modo: "moeda" },
  { chave: "parcelas_dividas", rotulo: "Parcelas de dívidas", modo: "moeda" },
  { chave: "retirada_mensal", rotulo: "Retirada mensal", modo: "moeda" },
  { chave: "equipamentos", rotulo: "Equipamentos", modo: "moeda" },
  { chave: "reforma", rotulo: "Reforma e abertura", modo: "moeda" },
  { chave: "recursos_proprios", rotulo: "Recursos próprios", modo: "moeda" },
  { chave: "financiamento", rotulo: "Financiamento", modo: "moeda" },
  { chave: "reserva", rotulo: "Reserva", modo: "moeda" },
  { chave: "despesas_dedutiveis_mensais", rotulo: "Despesas dedutíveis no carnê-leão", modo: "moeda" },
  { chave: "pro_labore_mensal", rotulo: "Pró-labore mensal para o fator R", modo: "moeda" },
];

export function EditorPremissas({
  diagnosticoId,
  inicial,
  parametros,
  tributos,
  municipios,
  bloqueado,
}: {
  diagnosticoId: string;
  inicial: PremissasDiagnostico;
  parametros: ParametrosCalculo;
  tributos: { pf: ParametroPF; simplesIII: ParametroSimples; simplesV: ParametroSimples; presumido: ParametroPresumido };
  municipios: { municipio_uf: string; aliquota_iss: number }[];
  bloqueado: boolean;
}) {
  const [premissas, setPremissas] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const resultado = useMemo(() => calcularDiagnostico(montarEntrada(premissas, parametros, tributos)), [premissas, parametros, tributos]);

  function atualizarNumero(chave: keyof PremissasDiagnostico, valor: number) {
    setPremissas((atual) => {
      const campo = atual[chave] as CampoNumero;
      return { ...atual, [chave]: { ...campo, valor } };
    });
  }

  function confirmar(chave: keyof PremissasDiagnostico, confirmado: boolean) {
    setPremissas((atual) => {
      const campo = atual[chave] as { confirmado: boolean };
      return { ...atual, [chave]: { ...campo, confirmado } };
    });
  }

  async function salvar(revisar: boolean) {
    setSalvando(true);
    const resposta = await salvarDiagnostico(diagnosticoId, premissas, revisar);
    setSalvando(false);
    if (resposta?.erro) toast.error(resposta.erro);
    else toast.success(revisar ? "Diagnóstico marcado como revisado." : "Rascunho salvo.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {NUMERICOS.map((campo) => {
          const valor = premissas[campo.chave] as CampoNumero;
          const exibido = campo.modo === "percentual" ? valor.valor * 100 : valor.valor;
          const destacado = valor.origem === "estimado" || valor.nao_sabe;
          return (
            <div key={campo.chave} className={`rounded-xl border p-3 ${destacado ? "border-amber-300 bg-amber-50" : "bg-card"}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{campo.rotulo}</p>
                <Badge variant={valor.origem === "cliente" ? "ok" : valor.origem === "escritorio" ? "secondary" : "alerta"}>
                  {valor.origem === "cliente" ? "Informado pelo cliente" : valor.origem === "escritorio" ? "Parâmetro do escritório" : "Estimado pelo escritório"}
                </Badge>
              </div>
              <Input
                type="number"
                step="0.01"
                disabled={bloqueado}
                value={Number.isFinite(exibido) ? exibido : 0}
                onChange={(e) => atualizarNumero(campo.chave, campo.modo === "percentual" ? Number(e.target.value) / 100 : Number(e.target.value))}
              />
              {destacado && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Checkbox checked={valor.confirmado} disabled={bloqueado} onCheckedChange={(marcado) => confirmar(campo.chave, marcado === true)} />
                  Confirmo este valor
                </label>
              )}
            </div>
          );
        })}
        <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Atividade tributária
            <select
              className="h-11 w-full rounded-md border px-3"
              disabled={bloqueado}
              value={premissas.atividade.valor}
              onChange={(e) => setPremissas((atual) => ({ ...atual, atividade: { ...atual.atividade, valor: e.target.value as PremissasDiagnostico["atividade"]["valor"], confirmado: true } }))}
            >
              <option value="fator_r">Serviços com fator R</option>
              <option value="anexo_iii">Anexo III</option>
              <option value="anexo_v">Anexo V</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Município do ISS
            <select
              className="h-11 w-full rounded-md border px-3"
              disabled={bloqueado}
              value={premissas.municipio_uf.valor}
              onChange={(e) => {
                const encontrado = municipios.find((item) => item.municipio_uf === e.target.value);
                setPremissas((atual) => ({
                  ...atual,
                  municipio_uf: { ...atual.municipio_uf, valor: e.target.value, confirmado: true },
                  aliquota_iss: { ...atual.aliquota_iss, valor: encontrado ? Number(encontrado.aliquota_iss) : atual.aliquota_iss.valor, confirmado: true },
                }));
              }}
            >
              <option value="">Selecione</option>
              {municipios.map((item) => (
                <option key={item.municipio_uf} value={item.municipio_uf}>{item.municipio_uf}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            ISS (fração, ex. 0,02)
            <Input
              type="number"
              step="0.001"
              disabled={bloqueado}
              value={premissas.aliquota_iss.valor}
              onChange={(e) => setPremissas((atual) => ({ ...atual, aliquota_iss: { ...atual.aliquota_iss, valor: Number(e.target.value), confirmado: true } }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            Regime usado no cálculo
            <select
              className="h-11 w-full rounded-md border px-3"
              disabled={bloqueado}
              value={premissas.regime_adotado.valor}
              onChange={(e) => setPremissas((atual) => ({ ...atual, regime_adotado: { ...atual.regime_adotado, valor: e.target.value as PremissasDiagnostico["regime_adotado"]["valor"], confirmado: true } }))}
            >
              <option value="menor_carga">Menor carga (sugestão)</option>
              <option value="PF_CARNE_LEAO">Pessoa física</option>
              <option value="SIMPLES_ANEXO_III">Simples Anexo III</option>
              <option value="SIMPLES_ANEXO_V">Simples Anexo V</option>
              <option value="LUCRO_PRESUMIDO">Lucro presumido</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={premissas.atividade.confirmado && premissas.municipio_uf.confirmado && premissas.regime_adotado.confirmado && premissas.aliquota_iss.confirmado}
              disabled={bloqueado}
              onCheckedChange={(marcado) => {
                const confirmado = marcado === true;
                setPremissas((atual) => ({
                  ...atual,
                  atividade: { ...atual.atividade, confirmado },
                  municipio_uf: { ...atual.municipio_uf, confirmado },
                  regime_adotado: { ...atual.regime_adotado, confirmado },
                  aliquota_iss: { ...atual.aliquota_iss, confirmado },
                }));
              }}
            />
            Confirmo atividade, município, ISS e regime
          </label>
        </div>
        {!bloqueado && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={salvando} onClick={() => void salvar(false)}>Salvar rascunho</Button>
            <Button type="button" disabled={salvando} onClick={() => void salvar(true)}>Marcar como revisado</Button>
          </div>
        )}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prévia</p>
          <p className="mt-2 font-serif text-2xl">{formatarNumeroSeguro(resultado.ponto_equilibrio_atendimentos)} atend./mês</p>
          <p className="text-sm">Ocupação {formatarPercentual(resultado.ocupacao_necessaria)}</p>
          <p className="text-sm">Capital {formatarMoeda(resultado.necessidade_capital)}</p>
          <p className="text-sm">Gap {formatarMoeda(resultado.gap_financeiro)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{resultado.observacao_regime}</p>
        </div>
        <div className="space-y-2">
          {resultado.alertas.slice(0, 3).map((alerta) => (
            <p key={alerta.codigo} className="rounded-lg border bg-card p-3 text-sm"><strong>{alerta.titulo}.</strong> {alerta.texto}</p>
          ))}
        </div>
      </aside>
      <div className="lg:col-span-2">
        <GraficosDiagnostico resultado={resultado} recursos={premissas.recursos_proprios.valor} financiamento={premissas.financiamento.valor} reserva={premissas.reserva.valor} />
      </div>
    </div>
  );
}

function formatarNumeroSeguro(valor: number | null) {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
