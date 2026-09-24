import type { PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import type { ResultadoDiagnostico } from "@/lib/diagnostico/tipos";
import type { DadosRelatorio } from "@/components/relatorio/documento";
import { formatarData } from "@/lib/format";

export async function montarDadosRelatorio(supabase: unknown, propostaId: string): Promise<DadosRelatorio | null> {
  const consulta = supabase as {
    from: (tabela: string) => {
      select: (colunas: string) => {
        eq: (coluna: string, valor: string | number) => {
          maybeSingle: () => Promise<{ data: unknown }>;
        };
      };
    };
  };
  const { data } = await consulta
    .from("propostas")
    .select("id, numero, created_at, validade_dias, total_mensal, total_avulso, condicoes_pagamento, escopo_incluso, escopo_nao_incluso, observacoes, enviada_em, diagnosticos(premissas, resultados, status), clientes(nome), proposta_itens(descricao, quantidade, valor_unitario, desconto, valor_total, tipo, prioridade_origem, ordem)")
    .eq("id", propostaId)
    .maybeSingle();
  if (!data) return null;
  const linha = data as {
    numero: string;
    created_at: string;
    validade_dias: number;
    total_mensal: number;
    total_avulso: number;
    condicoes_pagamento: string | null;
    escopo_incluso: string | null;
    escopo_nao_incluso: string | null;
    observacoes: string | null;
    enviada_em: string | null;
    diagnosticos: { premissas: PremissasDiagnostico; resultados: ResultadoDiagnostico; status: string } | { premissas: PremissasDiagnostico; resultados: ResultadoDiagnostico; status: string }[] | null;
    clientes: { nome: string } | { nome: string }[] | null;
    proposta_itens: DadosRelatorio["itens"] | null;
  };
  const diagnostico = Array.isArray(linha.diagnosticos) ? linha.diagnosticos[0] : linha.diagnosticos;
  const cliente = Array.isArray(linha.clientes) ? linha.clientes[0] : linha.clientes;
  if (!diagnostico || !cliente) return null;
  const configResp = await consulta.from("configuracoes_escritorio").select("razao_social, cnpj, crc, endereco, telefone, email, logo_path, cores_tema").eq("id", 1).maybeSingle();
  const config = (configResp.data ?? {}) as {
    razao_social?: string;
    cnpj?: string | null;
    crc?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    email?: string | null;
    logo_path?: string | null;
    cores_tema?: Record<string, string>;
  };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const logoUrl = config.logo_path && base ? `${base}/storage/v1/object/public/marca/${config.logo_path}` : null;
  const validadeBase = new Date(linha.enviada_em || linha.created_at);
  validadeBase.setDate(validadeBase.getDate() + linha.validade_dias);
  return {
    numero: linha.numero,
    emitidaEm: linha.created_at,
    cliente: cliente.nome,
    escritorio: {
      razao_social: config.razao_social || "EMPMED ASSESSORIA CONTÁBIL",
      cnpj: config.cnpj ?? null,
      crc: config.crc ?? null,
      endereco: config.endereco ?? null,
      telefone: config.telefone ?? null,
      email: config.email ?? null,
      logoUrl,
      cores: config.cores_tema ?? {},
    },
    premissas: diagnostico.premissas,
    resultado: diagnostico.resultados,
    itens: [...(linha.proposta_itens ?? [])].sort((a, b) => ((a as { ordem?: number }).ordem ?? 0) - ((b as { ordem?: number }).ordem ?? 0)),
    totalMensal: Number(linha.total_mensal),
    totalAvulso: Number(linha.total_avulso),
    escopoIncluso: linha.escopo_incluso || "",
    escopoNaoIncluso: linha.escopo_nao_incluso || "",
    condicoes: linha.condicoes_pagamento || "",
    validade: formatarData(validadeBase.toISOString()),
    observacoes: linha.observacoes,
  };
}

export function propostaExpirada(enviadaEm: string | null, criadaEm: string, validadeDias: number) {
  const base = new Date(enviadaEm || criadaEm).getTime();
  return Date.now() > base + validadeDias * 24 * 60 * 60 * 1000;
}
