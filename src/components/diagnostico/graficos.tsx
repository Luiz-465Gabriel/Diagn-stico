"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResultadoDiagnostico } from "@/lib/diagnostico/tipos";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/lib/format";

const COR = "#143F45";
const COBRE = "#8C5A32";
const SAGE = "#3E6B5A";

export function GraficosDiagnostico({
  resultado,
  recursos,
  financiamento,
  reserva,
  impressao = false,
}: {
  resultado: ResultadoDiagnostico;
  recursos: number;
  financiamento: number;
  reserva: number;
  impressao?: boolean;
}) {
  const altura = impressao ? 240 : 280;
  const equilibrio = serieEquilibrio(resultado);
  const custos = resultado.composicao_custos;
  const agenda = [
    { nome: "Capacidade", valor: resultado.capacidade_mensal },
    { nome: "Necessários", valor: resultado.ponto_equilibrio_atendimentos ?? 0 },
    { nome: "Previstos", valor: resultado.cenarios.realista.projecao[0]?.atendimentos ?? resultado.atendimentos_previstos },
  ];
  const investimento = [
    { nome: "Recursos próprios", valor: recursos },
    { nome: "Financiamento", valor: financiamento },
    { nome: resultado.gap_financeiro > 0 ? "Gap" : "Sobra", valor: Math.abs(resultado.gap_financeiro) },
  ];
  const caixa = resultado.cenarios.realista.projecao.map((mes, indice) => ({
    mes: mes.mes,
    Conservador: resultado.cenarios.conservador.projecao[indice]?.saldo_caixa ?? 0,
    Realista: mes.saldo_caixa,
    Ideal: resultado.cenarios.ideal.projecao[indice]?.saldo_caixa ?? 0,
  }));
  const tributos = resultado.comparativo_tributario.map((item) => ({
    nome: item.rotulo,
    carga: item.carga_anual,
    rotulo: formatarPercentual(item.aliquota_efetiva),
  }));

  return (
    <div className="grid gap-6">
      <Grafico titulo="Ponto de equilíbrio" nota="Linha contínua: receita. Tracejada: custo total. Vertical: capacidade da agenda.">
        <ResponsiveContainer width="100%" height={altura}>
          <LineChart data={equilibrio}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="atendimentos" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(valor: number) => formatarMoeda(Number(valor))} />
            <Legend />
            <Line dataKey="Receita" stroke={COR} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="Custo total" stroke={COBRE} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceLine x={Math.round(resultado.capacidade_mensal)} stroke={SAGE} strokeDasharray="2 3" label="Capacidade" />
            {resultado.ponto_equilibrio_atendimentos !== null && (
              <ReferenceLine x={Math.round(resultado.ponto_equilibrio_atendimentos)} stroke={COBRE} label="Equilíbrio" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Grafico>
      <div className="grid gap-6 md:grid-cols-2">
        <Barras titulo="Composição dos custos mensais" dados={custos.map((item) => ({ nome: item.nome, valor: item.valor }))} altura={altura} />
        <Barras titulo="Uso da agenda (atendimentos)" dados={agenda} altura={altura} />
        <Barras titulo="Estrutura do investimento" dados={investimento} altura={altura} nota={`A reserva de ${formatarMoeda(reserva)} já entra no cálculo do gap.`} />
        <Grafico titulo="Carga tributária anual" nota="O rótulo é a alíquota efetiva. A escolha final é do contador.">
          <ResponsiveContainer width="100%" height={altura}>
            <BarChart data={tributos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(valor: number) => formatarMoeda(Number(valor))} />
              <Bar dataKey="carga" fill={COR} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1 text-xs">
            {tributos.map((item) => (
              <li key={item.nome}>{item.nome}: {formatarMoeda(item.carga)} · efetiva {item.rotulo}</li>
            ))}
          </ul>
        </Grafico>
      </div>
      <Grafico titulo="Saldo de caixa em 12 meses" nota="Contínua: realista. Tracejada: conservador. Pontilhada: ideal.">
        <ResponsiveContainer width="100%" height={altura}>
          <LineChart data={caixa}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(valor: number) => formatarMoeda(Number(valor))} />
            <Legend />
            <Line dataKey="Realista" stroke={COR} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="Conservador" stroke={COBRE} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="Ideal" stroke={SAGE} strokeDasharray="2 3" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Grafico>
      <p className="text-xs text-muted-foreground">Atendimentos no equilíbrio: {formatarNumero(resultado.ponto_equilibrio_atendimentos, 1)} · Ocupação: {formatarPercentual(resultado.ocupacao_necessaria)}</p>
    </div>
  );
}

function serieEquilibrio(resultado: ResultadoDiagnostico) {
  const retirada = resultado.cenarios.realista.projecao[0]?.retirada ?? 0;
  const maximo = Math.max(resultado.capacidade_mensal, (resultado.ponto_equilibrio_atendimentos ?? 0) * 1.2, 1);
  return Array.from({ length: 13 }, (_, indice) => {
    const atendimentos = (maximo * indice) / 12;
    return {
      atendimentos: Math.round(atendimentos),
      Receita: atendimentos * resultado.ticket_medio,
      "Custo total": resultado.custos_fixos_mensais + retirada + atendimentos * resultado.ticket_medio * resultado.percentual_custos_variaveis,
    };
  });
}

function Grafico({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <figure className="evita-quebra rounded-xl border bg-white p-3">
      <figcaption className="mb-2 font-medium">{titulo}</figcaption>
      {children}
      {nota && <p className="mt-2 text-xs text-muted-foreground">{nota}</p>}
    </figure>
  );
}

function Barras({ titulo, dados, altura, nota }: { titulo: string; dados: { nome: string; valor: number }[]; altura: number; nota?: string }) {
  return (
    <Grafico titulo={titulo} nota={nota}>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(valor: number) => formatarMoeda(Number(valor))} />
          <Bar dataKey="valor" fill={COR} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-2 text-xs">
        {dados.map((item) => (
          <li key={item.nome}>{item.nome}: {formatarMoeda(item.valor)}</li>
        ))}
      </ul>
    </Grafico>
  );
}
