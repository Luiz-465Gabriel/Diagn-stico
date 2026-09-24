import type {
  AtividadeTributaria,
  FaixaProgressiva,
  FaixaSimples,
  ItemTributo,
  ParametroPF,
  ParametroPresumido,
  ParametroSimples,
  RegimeId,
} from "@/lib/diagnostico/tipos";

function faixaDe(base: number, faixas: FaixaProgressiva[]): FaixaProgressiva {
  const ordenadas = [...faixas].sort((a, b) => {
    if (a.limite === null) return 1;
    if (b.limite === null) return -1;
    return a.limite - b.limite;
  });
  return (
    ordenadas.find((faixa) => faixa.limite === null || base <= faixa.limite) ??
    ordenadas[ordenadas.length - 1] ?? { limite: null, aliquota: 0, deducao: 0 }
  );
}

/** Carnê-leão: IR pela tabela progressiva mensal + INSS de contribuinte individual. */
export function cargaPessoaFisica(entrada: {
  receitaAnual: number;
  despesasDedutiveisAnuais: number;
  pf: ParametroPF;
}): { carga_anual: number; aliquota_efetiva: number; detalhe: string } {
  const { receitaAnual, pf } = entrada;
  if (receitaAnual <= 0) {
    return { carga_anual: 0, aliquota_efetiva: 0, detalhe: "Sem receita projetada." };
  }
  const despesas = Math.min(Math.max(entrada.despesasDedutiveisAnuais, 0), receitaAnual);
  const rendaMensal = Math.max(0, (receitaAnual - despesas) / 12);
  let baseInss = rendaMensal;
  if (pf.inss_minimo_obrigatorio && baseInss < pf.inss_piso) baseInss = pf.inss_piso;
  baseInss = Math.min(baseInss, pf.inss_teto);
  const inssMensal = baseInss * pf.inss_aliquota;
  const baseIr = pf.deduz_inss_base_ir ? Math.max(0, rendaMensal - inssMensal) : rendaMensal;
  const faixa = faixaDe(baseIr, pf.faixas_mensais);
  const irMensal = Math.max(0, baseIr * faixa.aliquota - faixa.deducao);
  const carga = (irMensal + inssMensal) * 12;
  return {
    carga_anual: carga,
    aliquota_efetiva: carga / receitaAnual,
    detalhe: "IRPF pela tabela mensal informada nos parâmetros e INSS de contribuinte individual, sobre a renda depois das despesas dedutíveis.",
  };
}

export function aliquotaEfetivaSimples(rbt12: number, faixas: FaixaSimples[]): number {
  if (rbt12 <= 0) return 0;
  const ordenadas = [...faixas].sort((a, b) => a.limite_rbt12 - b.limite_rbt12);
  const faixa = ordenadas.find((item) => rbt12 <= item.limite_rbt12) ?? ordenadas[ordenadas.length - 1];
  if (!faixa) return 0;
  return Math.max(0, (rbt12 * faixa.aliquota - faixa.deducao) / rbt12);
}

export function resolverAnexoSimples(entrada: {
  atividade: AtividadeTributaria;
  receitaAnual: number;
  folhaAnual: number;
  simplesIII: ParametroSimples;
  simplesV: ParametroSimples;
}): { anexo: "III" | "V"; fatorR: number; motivo: string; parametro: ParametroSimples } {
  const fatorR = entrada.receitaAnual > 0 ? entrada.folhaAnual / entrada.receitaAnual : 0;
  const limite = entrada.simplesIII.fator_r_limite;
  if (entrada.atividade === "anexo_iii") {
    return { anexo: "III", fatorR, motivo: "Anexo III definido pela atividade escolhida.", parametro: entrada.simplesIII };
  }
  if (entrada.atividade === "anexo_v") {
    return { anexo: "V", fatorR, motivo: "Anexo V definido pela atividade escolhida.", parametro: entrada.simplesV };
  }
  // Fator R (LC nº 123/2006, art. 18): o limite vem dos parâmetros, não do código.
  if (fatorR + 1e-9 >= limite) {
    return {
      anexo: "III",
      fatorR,
      motivo: `Fator R de ${(fatorR * 100).toFixed(1)}% ficou igual ou acima do limite configurado. Anexo III.`,
      parametro: entrada.simplesIII,
    };
  }
  return {
    anexo: "V",
    fatorR,
    motivo: `Fator R de ${(fatorR * 100).toFixed(1)}% ficou abaixo do limite configurado. Anexo V.`,
    parametro: entrada.simplesV,
  };
}

export function cargaSimples(entrada: {
  receitaAnual: number;
  folhaAnual: number;
  atividade: AtividadeTributaria;
  simplesIII: ParametroSimples;
  simplesV: ParametroSimples;
}): { carga_anual: number; aliquota_efetiva: number; detalhe: string; regime: RegimeId } {
  const resolvido = resolverAnexoSimples(entrada);
  const aliquota = aliquotaEfetivaSimples(entrada.receitaAnual, resolvido.parametro.faixas);
  return {
    regime: resolvido.anexo === "III" ? "SIMPLES_ANEXO_III" : "SIMPLES_ANEXO_V",
    carga_anual: entrada.receitaAnual * aliquota,
    aliquota_efetiva: aliquota,
    detalhe: resolvido.motivo,
  };
}

/** Lucro presumido: IRPJ, adicional, CSLL, PIS, COFINS, ISS e, se preenchidos, CBS/IBS. */
export function cargaLucroPresumido(entrada: {
  receitaAnual: number;
  aliquotaIss: number;
  presumido: ParametroPresumido;
}): { carga_anual: number; aliquota_efetiva: number; detalhe: string } {
  const { receitaAnual, presumido } = entrada;
  if (receitaAnual <= 0) {
    return { carga_anual: 0, aliquota_efetiva: 0, detalhe: "Sem receita projetada." };
  }
  const receitaMensal = receitaAnual / 12;
  const baseMensalIrpj = receitaMensal * presumido.percentual_presuncao_irpj;
  const adicionalMensal = Math.max(0, baseMensalIrpj - presumido.limite_adicional_mensal) * presumido.aliquota_adicional_irpj;
  const irpj = receitaAnual * presumido.percentual_presuncao_irpj * presumido.aliquota_irpj + adicionalMensal * 12;
  const csll = receitaAnual * presumido.percentual_presuncao_csll * presumido.aliquota_csll;
  const pis = receitaAnual * presumido.aliquota_pis;
  const cofins = receitaAnual * presumido.aliquota_cofins;
  const iss = receitaAnual * entrada.aliquotaIss;
  const cbs = receitaAnual * (presumido.aliquota_cbs || 0);
  const ibs = receitaAnual * (presumido.aliquota_ibs || 0);
  const carga = irpj + csll + pis + cofins + iss + cbs + ibs;
  return {
    carga_anual: carga,
    aliquota_efetiva: carga / receitaAnual,
    detalhe:
      "IRPJ e CSLL sobre a base presumida, PIS, COFINS e ISS municipal. CBS e IBS entram somente se as alíquotas estiverem preenchidas na vigência.",
  };
}

export function compararTributos(entrada: {
  receitaAnual: number;
  despesasDedutiveisAnuais: number;
  folhaAnual: number;
  aliquotaIss: number;
  atividade: AtividadeTributaria;
  pf: ParametroPF;
  simplesIII: ParametroSimples;
  simplesV: ParametroSimples;
  presumido: ParametroPresumido;
}): { itens: ItemTributo[]; menor: ItemTributo } {
  const pf = cargaPessoaFisica(entrada);
  const simples = cargaSimples(entrada);
  const presumido = cargaLucroPresumido(entrada);
  const itens: ItemTributo[] = [
    { regime: "PF_CARNE_LEAO", rotulo: "Pessoa física (carnê-leão)", ...pf },
    { regime: simples.regime, rotulo: `Simples Nacional (Anexo ${simples.regime === "SIMPLES_ANEXO_III" ? "III" : "V"})`, carga_anual: simples.carga_anual, aliquota_efetiva: simples.aliquota_efetiva, detalhe: simples.detalhe },
    { regime: "LUCRO_PRESUMIDO", rotulo: "Lucro presumido", ...presumido },
  ];
  const menor = itens.reduce((atual, item) => (item.carga_anual < atual.carga_anual ? item : atual));
  return { itens, menor };
}
