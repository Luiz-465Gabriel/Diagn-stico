export const STATUS_FUNIL = [
  { value: "lead", label: "Lead" },
  { value: "diagnostico_enviado", label: "Diagnóstico enviado" },
  { value: "diagnostico_respondido", label: "Diagnóstico respondido" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
] as const;

export type StatusFunil = (typeof STATUS_FUNIL)[number]["value"];

export const STATUS_ENVIO = [
  { value: "enviado", label: "Enviado" },
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "respondido", label: "Respondido" },
  { value: "expirado", label: "Expirado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const STATUS_PROPOSTA = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
  { value: "expirada", label: "Expirada" },
] as const;

export function rotuloDe<T extends { value: string; label: string }>(lista: readonly T[], valor: string | null | undefined) {
  return lista.find((item) => item.value === valor)?.label ?? valor ?? "—";
}

export const VERSAO_MOTOR = "1.0.0";

export const VALIDADE_FORMULARIO_DIAS = 30;
export const VALIDADE_PROPOSTA_DIAS = 15;

export const TEXTO_RESSALVA =
  "As projeções são estimativas baseadas nas informações prestadas pelo cliente e em premissas do escritório, identificadas neste relatório, e não constituem garantia de resultado. A contratação será formalizada por contrato escrito de prestação de serviços contábeis (Resolução CFC nº 987/2003; NBC PG 01).";

export const ESCOPO_INCLUSO_PADRAO = [
  "Escrituração e apuração conforme o regime tributário definido em contrato.",
  "Emissão das guias do período e orientação dos vencimentos.",
  "Atendimento em horário comercial pelos canais combinados.",
].join("\n");

export const ESCOPO_NAO_INCLUSO_PADRAO = [
  "Consultoria jurídica e representação em processos.",
  "Auditoria independente.",
  "Implantação de sistemas de terceiros.",
  "Regularização de períodos anteriores, salvo se contratada à parte.",
].join("\n");

export const CONDICOES_PAGAMENTO_PADRAO =
  "Honorários mensais com vencimento no dia 10. Serviços avulsos: 50% na aprovação da proposta e 50% na entrega.";

export function urlPublica(caminho: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function adminConfigurado(): boolean {
  return supabaseConfigurado() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
