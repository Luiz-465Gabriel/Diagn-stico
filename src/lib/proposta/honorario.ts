export type HonorarioInformado = {
  valor: number;
  origem: "cliente" | "estimado" | "escritorio";
};

/**
 * A mensalidade da proposta começa no que o cliente disse que paga hoje.
 * O preço de tabela do catálogo não substitui essa informação.
 * Serviços avulsos continuam no valor de tabela, porque não são a mensalidade atual.
 */
export function valorMensalInicial(valorTabela: number, honorario: HonorarioInformado | null | undefined): { valor: number; usouInformado: boolean } {
  if (honorario && honorario.origem === "cliente" && Number.isFinite(honorario.valor) && honorario.valor > 0) {
    return { valor: honorario.valor, usouInformado: true };
  }
  return { valor: valorTabela, usouInformado: false };
}
