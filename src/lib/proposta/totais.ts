export type ItemEntrada = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  tipo: "mensal" | "avulso";
  servico_id?: string | null;
  prioridade_origem?: string | null;
};

export type ItemCalculado = ItemEntrada & { valor_total: number };

/** Desconto é valor em reais, limitado ao bruto da linha. */
export function totalizarItens(itens: ItemEntrada[]) {
  const calculados: ItemCalculado[] = itens.map((item) => {
    const quantidade = Number.isFinite(item.quantidade) ? item.quantidade : 0;
    const unitario = Number.isFinite(item.valor_unitario) ? item.valor_unitario : 0;
    const bruto = Math.max(quantidade, 0) * Math.max(unitario, 0);
    const desconto = Math.min(Math.max(item.desconto || 0, 0), bruto);
    return { ...item, quantidade, valor_unitario: unitario, desconto, valor_total: bruto - desconto };
  });
  const somar = (tipo: "mensal" | "avulso") => calculados.filter((item) => item.tipo === tipo).reduce((acc, item) => acc + item.valor_total, 0);
  return { itens: calculados, total_mensal: somar("mensal"), total_avulso: somar("avulso") };
}
