import { formatarMoeda, formatarPercentual } from "@/lib/format";
import type { Alerta } from "@/lib/diagnostico/tipos";

const ORDEM: Record<Alerta["severidade"], number> = { alta: 0, media: 1, baixa: 2 };

export function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  return [...alertas].sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade]);
}

export function gerarAlertas(entrada: {
  separaPfPj: string | null;
  controles: string[];
  emissaoNotas: string | null;
  momentosRecebimento: string[];
  valoresAtraso: number;
  ocupacaoNecessaria: number | null;
  gapFinanceiro: number;
  parcelasMensais: number;
  receitaProjetada: number;
  paybackMeses: number | null;
  reserva: number;
  retiradaMensal: number;
  mesesReserva: number;
  percentualPremissasEstimadas: number;
  limitePremissas: number;
  limiarOcupacaoAlta: number;
  limiarOcupacaoMedia: number;
  limiarParcelas: number;
  margemNula: boolean;
}): Alerta[] {
  const alertas: Alerta[] = [];

  if (entrada.separaPfPj === "Não") {
    alertas.push({
      codigo: "separa_dinheiro",
      severidade: "alta",
      titulo: "Dinheiro pessoal e do trabalho no mesmo caixa",
      texto: "Você indicou que não separa o dinheiro pessoal do dinheiro do trabalho. O primeiro passo é uma conta exclusiva do espaço e uma retirada mensal definida, para a despesa da casa não consumir o caixa da clínica.",
    });
  } else if (entrada.separaPfPj === "Em parte") {
    alertas.push({
      codigo: "separa_dinheiro",
      severidade: "media",
      titulo: "A separação do dinheiro pessoal ainda é parcial",
      texto: "Parte do dinheiro do trabalho ainda se mistura com o pessoal. Vale fechar a regra da retirada mensal e deixar o restante na conta do espaço.",
    });
  }

  const fortes = ["Planilha", "Aplicativo ou sistema", "Extrato bancário"];
  const temForte = entrada.controles.some((item) => fortes.includes(item));
  const temFraco = entrada.controles.includes("Caderno") || entrada.controles.includes("Não faço controle");
  if (temFraco && !temForte) {
    alertas.push({
      codigo: "controle_fraco",
      severidade: "media",
      titulo: "O controle financeiro ainda é frágil",
      texto: "Sem um registro além do caderno, fica difícil saber se o espaço se paga. O acompanhamento começa por uma lista simples de recebimentos e despesas.",
    });
  }

  if (entrada.emissaoNotas === "Em alguns" || entrada.emissaoNotas === "Não emito") {
    alertas.push({
      codigo: "nota_fiscal",
      severidade: "alta",
      titulo: "Há atendimentos sem nota fiscal",
      texto: "Emitir nota só em parte dos atendimentos, ou não emitir, cria risco de autuação e de imposto calculado em cima de uma base incompleta. A rotina precisa prever nota em todos os atendimentos devidos.",
    });
  }

  const recebeDepois = entrada.momentosRecebimento.includes("Depois do atendimento");
  if (recebeDepois && entrada.valoresAtraso > 0) {
    alertas.push({
      codigo: "atraso_recebimento",
      severidade: "media",
      titulo: "Recebimento depois do atendimento, com valores em atraso",
      texto: `Há ${formatarMoeda(entrada.valoresAtraso)} em atraso e o recebimento ocorre depois do atendimento. Uma política de sinal e de cobrança reduz esse buraco no caixa.`,
    });
  }

  if (entrada.margemNula) {
    alertas.push({
      codigo: "margem_negativa",
      severidade: "alta",
      titulo: "O preço não cobre os custos variáveis",
      texto: "Com impostos, taxa de cartão, inadimplência e eventual percentual de outra profissional, não sobra margem por atendimento. Antes do ponto de equilíbrio, é preciso rever o preço ou esses percentuais.",
    });
  } else if (entrada.ocupacaoNecessaria !== null) {
    if (entrada.ocupacaoNecessaria > entrada.limiarOcupacaoAlta) {
      alertas.push({
        codigo: "ocupacao_alta",
        severidade: "alta",
        titulo: "A agenda precisa ficar muito cheia para se pagar",
        texto: `Para cobrir custos e retirada, a ocupação necessária é ${formatarPercentual(entrada.ocupacaoNecessaria)}. Acima de ${formatarPercentual(entrada.limiarOcupacaoAlta, 0)} a agenda fica apertada: vale revisar preço ou custos antes da abertura.`,
      });
    } else if (entrada.ocupacaoNecessaria >= entrada.limiarOcupacaoMedia) {
      alertas.push({
        codigo: "ocupacao_media",
        severidade: "media",
        titulo: "A ocupação necessária pede atenção",
        texto: `A ocupação necessária é ${formatarPercentual(entrada.ocupacaoNecessaria)}, entre ${formatarPercentual(entrada.limiarOcupacaoMedia, 0)} e ${formatarPercentual(entrada.limiarOcupacaoAlta, 0)}. Dá para planejar, desde que o preço e a meta de pacientes estejam combinados.`,
      });
    }
  }

  if (entrada.gapFinanceiro > 0) {
    alertas.push({
      codigo: "gap_financeiro",
      severidade: "alta",
      titulo: "Ainda falta recurso para abrir com folga",
      texto: `O valor que falta, já descontados recursos próprios, financiamento e reserva, é de ${formatarMoeda(entrada.gapFinanceiro)}.`,
    });
  }

  const razaoParcelas = entrada.receitaProjetada > 0 ? entrada.parcelasMensais / entrada.receitaProjetada : entrada.parcelasMensais > 0 ? Infinity : 0;
  if (razaoParcelas > entrada.limiarParcelas) {
    alertas.push({
      codigo: "parcelas_dividas",
      severidade: "media",
      titulo: "As parcelas pesam na receita",
      texto: `As parcelas mensais representam ${formatarPercentual(Math.min(razaoParcelas, 9.99))} da receita projetada, acima de ${formatarPercentual(entrada.limiarParcelas, 0)}. Vale renegociar antes de assumir custos novos.`,
    });
  }

  if (entrada.paybackMeses === null || entrada.paybackMeses > 12) {
    alertas.push({
      codigo: "payback",
      severidade: "alta",
      titulo: "O caixa não recupera o investimento em 12 meses",
      texto: "Na projeção realista, o resultado acumulado não devolve o investimento inicial dentro de um ano. O cenário ideal mostra o volume ou o preço que mudaria esse prazo.",
    });
  }

  if (entrada.retiradaMensal > 0 && entrada.reserva < entrada.retiradaMensal * entrada.mesesReserva) {
    alertas.push({
      codigo: "reserva_curta",
      severidade: "media",
      titulo: "A reserva pessoal está curta",
      texto: `A reserva cobre menos de ${formatarNumeroMeses(entrada.mesesReserva)} meses da retirada de ${formatarMoeda(entrada.retiradaMensal)}. O recomendado é separar essa reserva antes da abertura.`,
    });
  }

  if (entrada.percentualPremissasEstimadas > entrada.limitePremissas) {
    alertas.push({
      codigo: "premissas_estimadas",
      severidade: "baixa",
      titulo: "Muitos números deste diagnóstico foram estimados",
      texto: `${formatarPercentual(entrada.percentualPremissasEstimadas, 0)} das premissas numéricas foram estimadas pelo escritório, acima de ${formatarPercentual(entrada.limitePremissas, 0)}. O relatório é uma aproximação até esses valores serem confirmados.`,
    });
  }

  return ordenarAlertas(alertas);
}

function formatarNumeroMeses(meses: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(meses);
}
