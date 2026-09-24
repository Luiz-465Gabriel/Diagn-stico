"use client";

import { useEffect, type CSSProperties } from "react";
import { GraficosDiagnostico } from "@/components/diagnostico/graficos";
import type { PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import type { Alerta, ResultadoDiagnostico } from "@/lib/diagnostico/tipos";
import { formatarData, formatarMoeda, formatarNumero, formatarPercentual, mesAnoParaExibicao } from "@/lib/format";
import { TEXTO_RESSALVA } from "@/lib/rotulos";

export type DadosRelatorio = {
  numero: string;
  emitidaEm: string;
  cliente: string;
  escritorio: {
    razao_social: string;
    cnpj: string | null;
    crc: string | null;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    logoUrl: string | null;
    cores: Record<string, string>;
  };
  premissas: PremissasDiagnostico;
  resultado: ResultadoDiagnostico;
  itens: {
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    desconto: number;
    valor_total: number;
    tipo: string;
    prioridade_origem: string | null;
  }[];
  totalMensal: number;
  totalAvulso: number;
  escopoIncluso: string;
  escopoNaoIncluso: string;
  condicoes: string;
  validade: string;
  observacoes: string | null;
};

export function RelatorioDocumento({ dados, publico = false }: { dados: DadosRelatorio; publico?: boolean }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.__RELATORIO_PRONTO__ = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const cores = dados.escritorio.cores ?? {};
  const estilo = {
    "--rel-primaria": cores.primaria || "#143F45",
    "--rel-secundaria": cores.secundaria || "#B86B3D",
    "--rel-fundo": cores.fundo || "#F6F3EE",
    "--rel-texto": cores.texto || "#1C2426",
    "--rel-destaque": cores.destaque || "#1F6A5A",
  } as CSSProperties;
  const q = dados.premissas.qualitativo;
  const r = dados.resultado;
  const topAlertas = r.alertas.slice(0, 3);
  const estimadas = listaEstimadas(dados.premissas);

  return (
    <article className="relatorio relatorio-folha mx-auto max-w-[210mm] bg-white shadow-sm" style={estilo}>
      <div className="rodape-fixo">
        <span>{rodape(dados)}</span>
        <span>{dados.numero}</span>
      </div>
      <section className="capa-relatorio">
        <div>
          {dados.escritorio.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dados.escritorio.logoUrl} alt="" className="mb-8 h-12 w-auto" />
          ) : (
            <p className="text-sm uppercase tracking-[0.28em]">EMPMED</p>
          )}
          <p className="mt-16 text-sm uppercase tracking-[0.22em] text-white/70">{dados.escritorio.razao_social}</p>
          <h1 className="mt-4 max-w-md">Diagnóstico e Proposta de Serviços</h1>
        </div>
        <div>
          <p className="font-serif text-3xl text-white">{dados.cliente}</p>
          <p className="mt-2">Proposta {dados.numero} · {formatarData(dados.emitidaEm)}</p>
        </div>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Resumo executivo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="cartao-kpi"><p className="text-xs uppercase tracking-wide">Ponto de equilíbrio</p><p className="mt-1 font-serif text-2xl">{formatarNumero(r.ponto_equilibrio_atendimentos, 1)} atend./mês</p></article>
          <article className="cartao-kpi"><p className="text-xs uppercase tracking-wide">Ocupação necessária</p><p className="mt-1 font-serif text-2xl">{formatarPercentual(r.ocupacao_necessaria)}</p></article>
          <article className="cartao-kpi"><p className="text-xs uppercase tracking-wide">Necessidade de capital</p><p className="mt-1 font-serif text-2xl">{formatarMoeda(r.necessidade_capital)}</p></article>
          <article className="cartao-kpi"><p className="text-xs uppercase tracking-wide">Menor carga tributária</p><p className="mt-1 font-serif text-2xl">{rotuloRegime(r.regime_menor_carga)}</p></article>
        </div>
        <div className="mt-6 space-y-3">
          {topAlertas.map((alerta) => (
            <AlertaCard key={alerta.codigo} alerta={alerta} />
          ))}
        </div>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Situação atual</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Bloco titulo="Atendimento" texto={q.atendimento || "Não informado"} />
          <Bloco titulo="Cidade do espaço" texto={q.cidade || "Não informada"} />
          <Bloco titulo="Serviços atuais" texto={q.servicos_atuais || "Não informado"} />
          <Bloco titulo="Receita e gastos atuais" texto={`${q.receita_atual === null ? "Não informado" : formatarMoeda(q.receita_atual)} de receita · ${q.gastos_atuais === null ? "gastos não informados" : formatarMoeda(q.gastos_atuais)} de gastos`} />
          <Bloco titulo="Controle" texto={q.controles.join(", ") || "Não informado"} />
          <Bloco titulo="Separa o dinheiro" texto={q.separa_pf_pj || "Não informado"} />
          <Bloco titulo="Notas" texto={q.emissao_notas || "Não informado"} />
          <Bloco titulo="Quando recebe" texto={q.momentos_recebimento.join(", ") || "Não informado"} />
          <Bloco titulo="Contabilidade atual" texto={q.contabilidade_atual || "Não informada"} />
          <Bloco titulo="Preocupação" texto={q.preocupacao || "Nenhuma além do formulário"} />
        </div>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">O novo espaço</h2>
        <p className="mt-2 text-sm">Abertura prevista para {mesAnoParaExibicao(q.previsao_abertura)}. Imóvel {q.imovel || "não definido"}. Ticket médio {formatarMoeda(r.ticket_medio)} por atendimento. Capacidade de {formatarNumero(r.capacidade_mensal, 1)} atendimentos no mês.</p>
        <div className="mt-4">
          <GraficosDiagnostico resultado={r} recursos={dados.premissas.recursos_proprios.valor} financiamento={dados.premissas.financiamento.valor} reserva={dados.premissas.reserva.valor} impressao />
        </div>
        {estimadas.length > 0 && (
          <p className="nota-estimada mt-4 text-xs">Premissas estimadas pelo escritório: {estimadas.join(", ")}. Elas não vieram das suas respostas.</p>
        )}
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Projeção de 12 meses</h2>
        <p className="mt-2 text-sm">O saldo parte dos recursos próprios e do financiamento, já descontado o investimento em equipamentos e reforma. A tabela abaixo é o cenário realista.</p>
        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Mês</th>
              <th>Atendimentos</th>
              <th>Receita</th>
              <th>Resultado</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {r.cenarios.realista.projecao.map((mes) => (
              <tr key={mes.mes} className="border-b">
                <td className="py-1">{mes.mes}</td>
                <td>{formatarNumero(mes.atendimentos, 1)}</td>
                <td>{formatarMoeda(mes.receita)}</td>
                <td>{formatarMoeda(mes.resultado)}</td>
                <td>{formatarMoeda(mes.saldo_caixa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm">Payback do cenário realista: {r.payback_meses === null ? "não ocorre em 12 meses" : `${r.payback_meses} meses`}.</p>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Comparativo tributário</h2>
        <p className="mt-2 text-sm">{r.observacao_regime}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {r.comparativo_tributario.map((item) => (
            <li key={item.regime} className="rounded-lg border p-3">
              <strong>{item.rotulo}</strong> · {formatarMoeda(item.carga_anual)} ao ano · efetiva {formatarPercentual(item.aliquota_efetiva)}
              <p className="text-xs text-muted-foreground">{item.detalhe}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Cenário ideal</h2>
        <p className="mt-3 text-base leading-relaxed">
          Para cobrir os custos, a sua retirada e uma folga de segurança, o espaço precisa de cerca de {formatarNumero(r.cenarios.ideal.atendimentos_mes_referencia, 0)} atendimentos por mês
          {r.cenarios.ideal.exige_reajuste_preco
            ? `, com preço de ${formatarMoeda(r.cenarios.ideal.preco_por_atendimento)} por atendimento. Isso exige reajuste de preço ou ampliação de agenda.`
            : `, mantendo o preço médio de ${formatarMoeda(r.cenarios.ideal.preco_por_atendimento)}.`}
          {" "}O preço mínimo para a ocupação saudável da agenda é {formatarMoeda(r.preco_minimo_por_atendimento)}. O equilíbrio desse cenário {r.cenarios.ideal.payback_meses === null ? "não fecha em 12 meses" : `acontece no mês ${r.cenarios.ideal.payback_meses}`}.
        </p>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Alertas e recomendações</h2>
        <div className="mt-4 space-y-3">
          {r.alertas.map((alerta) => (
            <AlertaCard key={alerta.codigo} alerta={alerta} />
          ))}
          {r.alertas.length === 0 && <p className="text-sm">Nenhum alerta automático com as premissas atuais.</p>}
        </div>
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Proposta comercial</h2>
        <div className="mt-4 space-y-3">
          {dados.itens.filter((item) => item.prioridade_origem).map((item) => (
            <p key={item.descricao} className="text-sm"><strong>Sua prioridade:</strong> {item.prioridade_origem} → <strong>Como vamos atuar:</strong> {item.descricao}</p>
          ))}
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Serviço</th>
              <th>Tipo</th>
              <th>Qtd.</th>
              <th>Valor</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {dados.itens.map((item) => (
              <tr key={`${item.descricao}-${item.tipo}`} className="border-b">
                <td className="py-2">{item.descricao}</td>
                <td>{item.tipo === "mensal" ? "Mensal" : "Avulso"}</td>
                <td>{formatarNumero(item.quantidade, 0)}</td>
                <td>{formatarMoeda(item.valor_unitario)}</td>
                <td>{formatarMoeda(item.desconto)}</td>
                <td>{formatarMoeda(item.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm">Total mensal {formatarMoeda(dados.totalMensal)} · Total avulso {formatarMoeda(dados.totalAvulso)}</p>
        <h3 className="mt-6 text-lg">Escopo incluso</h3>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{dados.escopoIncluso}</pre>
        <h3 className="mt-4 text-lg">Escopo não incluso</h3>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{dados.escopoNaoIncluso}</pre>
        <p className="mt-4 text-sm">Validade: {dados.validade}. {dados.condicoes}</p>
        {dados.observacoes && <p className="mt-2 text-sm">{dados.observacoes}</p>}
      </section>

      <section className="folha quebra">
        <h2 className="text-2xl">Próximos passos</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>Confirmar as premissas marcadas com ※.</li>
          <li>Validar o regime tributário com o contador.</li>
          <li>{publico ? "Aceitar ou recusar esta proposta nesta página." : "Enviar o link para o cliente aceitar online."}</li>
          <li>Formalizar a contratação por contrato escrito.</li>
        </ol>
        <p className="mt-6 text-sm leading-relaxed">{TEXTO_RESSALVA}</p>
        <p className="mt-8 text-xs text-muted-foreground">{rodape(dados)} · {dados.numero}</p>
      </section>
    </article>
  );
}

function AlertaCard({ alerta }: { alerta: Alerta }) {
  return (
    <article className="evita-quebra rounded-lg border p-3 text-sm">
      <p className="text-xs uppercase tracking-wide">{alerta.severidade}</p>
      <p className="font-medium">{alerta.titulo}</p>
      <p>{alerta.texto}</p>
    </article>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1">{texto}</p>
    </div>
  );
}

function listaEstimadas(premissas: PremissasDiagnostico) {
  const mapa: [string, { origem: string }][] = [
    ["honorário contábil", premissas.honorario_contabil],
    ["gastos do espaço", premissas.gastos_mensais],
    ["pró-labore", premissas.pro_labore_mensal],
    ["despesas dedutíveis", premissas.despesas_dedutiveis_mensais],
    ["dias por semana", premissas.dias_semana],
    ["horas por dia", premissas.horas_dia],
  ];
  return mapa.filter(([, campo]) => campo.origem === "estimado").map(([nome]) => nome);
}

function rotuloRegime(regime: string) {
  if (regime === "PF_CARNE_LEAO") return "Pessoa física";
  if (regime === "SIMPLES_ANEXO_III") return "Simples III";
  if (regime === "SIMPLES_ANEXO_V") return "Simples V";
  return "Lucro presumido";
}

function rodape(dados: DadosRelatorio) {
  return [dados.escritorio.razao_social, dados.escritorio.cnpj ? `CNPJ ${dados.escritorio.cnpj}` : null, dados.escritorio.crc, dados.escritorio.endereco].filter(Boolean).join(" · ");
}
