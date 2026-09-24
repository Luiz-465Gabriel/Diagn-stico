const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return moeda.format(valor);
}

export function formatarNumero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarInteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return numero.format(valor);
}

export function formatarPercentual(fracao: number | null | undefined, casas = 1): string {
  if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return "—";
  return `${formatarNumero(fracao * 100, casas)}%`;
}

export function formatarData(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const data = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

export function formatarDataHora(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const data = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

/** Meia-noite do dia 1 no fuso de São Paulo, em milissegundos. */
export function inicioDoMesSaoPaulo(agora = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(agora);
  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  return new Date(`${ano}-${mes}-01T00:00:00-03:00`).getTime();
}

export function dataHojeIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Converte texto mascarado (1.234,56) em número. */
export function moedaParaNumero(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const normalizado = limpo.replace(/\s/g, "").replace(/^R\$\s?/, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Máscara de moeda enquanto a pessoa digita. Trabalha em centavos. */
export function mascaraMoeda(digitado: string): string {
  const digitos = digitado.replace(/\D/g, "");
  if (!digitos) return "";
  const cents = Number(digitos) / 100;
  return cents.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function numeroParaMascaraMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function mesAnoParaExibicao(valor: string | null | undefined): string {
  if (!valor) return "—";
  const [ano, mes] = valor.split("-");
  if (!ano || !mes) return valor;
  return `${mes}/${ano}`;
}

export function dataIsoParaExibicao(valor: string | null | undefined): string {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}
