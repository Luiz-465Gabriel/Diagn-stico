import type { DadosRelatorio } from "@/components/relatorio/documento";
import { formatarData, formatarMoeda } from "@/lib/format";
import { TEXTO_RESSALVA } from "@/lib/rotulos";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 40;
const NAVY = rgb(0.055, 0.165, 0.278);
const BLUE = rgb(0.082, 0.396, 0.753);
const AMBER = rgb(0.941, 0.635, 0.008);
const INK = rgb(0.078, 0.125, 0.2);
const MUTED = rgb(0.322, 0.376, 0.439);
const WASH = rgb(0.906, 0.933, 0.965);
const WHITE = rgb(1, 1, 1);

/** Helvetica cobre Latin-1. Troca o que o WinAnsi não desenha. */
function limpar(texto: string) {
  return texto
    .replace(/\u00A0|\u202F/g, " ")
    .replace(/\u2014|\u2013/g, "-")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, "...")
    .replace(/[^\n\r\t\x20-\xFF]/g, "");
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number) {
  const palavras = limpar(texto).split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) atual = tentativa;
    else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export function nomeArquivoSimples(numero: string) {
  return `Proposta-simples-${numero.replace("/", "-")}.pdf`;
}

export function nomeArquivoCompleto(numero: string) {
  return `Diagnostico-${numero.replace("/", "-")}.pdf`;
}

/** Proposta curta, sem Chrome e sem gráficos. É o arquivo para mandar no WhatsApp. */
export async function pdfPropostaSimples(dados: DadosRelatorio) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  let pagina = doc.addPage([LARGURA, ALTURA]);
  let y = ALTURA;

  pagina.drawRectangle({ x: 0, y: ALTURA - 108, width: LARGURA, height: 108, color: NAVY });
  pagina.drawText(limpar(dados.escritorio.razao_social).toUpperCase(), {
    x: MARGEM,
    y: ALTURA - 36,
    size: 9,
    font: regular,
    color: rgb(1, 1, 1),
  });
  pagina.drawText("Proposta de serviços", {
    x: MARGEM,
    y: ALTURA - 68,
    size: 24,
    font: negrito,
    color: WHITE,
  });
  pagina.drawRectangle({ x: 0, y: ALTURA - 114, width: 420, height: 6, color: BLUE });
  pagina.drawRectangle({ x: 420, y: ALTURA - 114, width: LARGURA - 420, height: 6, color: AMBER });
  y = ALTURA - 142;

  const cursor = {
    garantir(altura: number) {
      if (y - altura >= 48) return;
      pagina = doc.addPage([LARGURA, ALTURA]);
      y = ALTURA - 48;
      pagina.drawRectangle({ x: 0, y: ALTURA - 8, width: LARGURA, height: 8, color: NAVY });
    },
    escrever(texto: string, tamanho: number, fonte: PDFFont, cor: ReturnType<typeof rgb>, recuo = 0) {
      const linhas = quebrar(texto, fonte, tamanho, LARGURA - MARGEM * 2 - recuo);
      for (const linha of linhas) {
        this.garantir(tamanho + 4);
        pagina.drawText(linha, { x: MARGEM + recuo, y: y - tamanho, size: tamanho, font: fonte, color: cor });
        y -= tamanho + 4;
      }
    },
  };

  cursor.escrever(dados.cliente, 18, negrito, INK);
  y -= 2;
  cursor.escrever(`Proposta ${dados.numero}  ·  ${formatarData(dados.emitidaEm)}  ·  válida até ${dados.validade}`, 10, regular, MUTED);
  y -= 12;

  const caixaLargura = (LARGURA - MARGEM * 2 - 12) / 2;
  const caixaAltura = 52;
  cursor.garantir(caixaAltura + 8);
  const baseCaixa = y - caixaAltura;
  desenharValor(pagina, MARGEM, baseCaixa, caixaLargura, caixaAltura, "Por mês", formatarMoeda(dados.totalMensal), regular, negrito);
  desenharValor(pagina, MARGEM + caixaLargura + 12, baseCaixa, caixaLargura, caixaAltura, "Na contratação", formatarMoeda(dados.totalAvulso), regular, negrito);
  y = baseCaixa - 16;

  cursor.escrever("O que vamos fazer", 13, negrito, NAVY);
  y -= 4;
  const prioridades = dados.itens.filter((item) => item.prioridade_origem);
  if (prioridades.length === 0) cursor.escrever("Acompanhamento combinado nesta proposta.", 11, regular, INK);
  for (const item of prioridades) {
    cursor.escrever(item.prioridade_origem ?? "", 11, negrito, INK);
    cursor.escrever(item.descricao, 11, regular, INK);
    y -= 4;
  }

  y -= 6;
  cursor.escrever("Quanto fica", 13, negrito, NAVY);
  y -= 6;
  cursor.garantir(22);
  const topoTabela = y;
  pagina.drawRectangle({ x: MARGEM, y: topoTabela - 22, width: LARGURA - MARGEM * 2, height: 22, color: NAVY });
  pagina.drawText("Serviço", { x: MARGEM + 8, y: topoTabela - 15, size: 10, font: negrito, color: WHITE });
  pagina.drawText("Quando cobra", { x: MARGEM + 280, y: topoTabela - 15, size: 10, font: negrito, color: WHITE });
  pagina.drawText("Valor", { x: LARGURA - MARGEM - 80, y: topoTabela - 15, size: 10, font: negrito, color: WHITE });
  y = topoTabela - 22;

  for (const item of dados.itens) {
    cursor.garantir(22);
    pagina.drawRectangle({ x: MARGEM, y: y - 22, width: LARGURA - MARGEM * 2, height: 22, color: rgb(0.96, 0.97, 0.98) });
    const descricao = quebrar(item.descricao, regular, 10, 250)[0] ?? "";
    pagina.drawText(descricao, { x: MARGEM + 8, y: y - 15, size: 10, font: regular, color: INK });
    pagina.drawText(item.tipo === "mensal" ? "Por mês" : "Uma vez", { x: MARGEM + 280, y: y - 15, size: 10, font: regular, color: INK });
    pagina.drawText(limpar(formatarMoeda(item.valor_total)), { x: LARGURA - MARGEM - 80, y: y - 15, size: 10, font: negrito, color: INK });
    y -= 22;
  }

  if (dados.premissas.honorario_contabil.origem === "cliente") {
    y -= 10;
    cursor.escrever(`A mensalidade parte do valor que você informou pagar hoje: ${formatarMoeda(dados.premissas.honorario_contabil.valor)}.`, 10, regular, MUTED);
  }

  y -= 8;
  cursor.escrever("Está incluso", 13, negrito, NAVY);
  y -= 2;
  escreverLista(cursor, dados.escopoIncluso, regular);
  y -= 6;
  cursor.escrever("Não está incluso", 13, negrito, NAVY);
  y -= 2;
  escreverLista(cursor, dados.escopoNaoIncluso, regular);
  y -= 6;
  cursor.escrever("Pagamento", 13, negrito, NAVY);
  y -= 2;
  cursor.escrever(dados.condicoes, 11, regular, INK);
  if (dados.observacoes) {
    y -= 4;
    cursor.escrever(dados.observacoes, 11, regular, INK);
  }
  y -= 8;
  cursor.escrever("Próximo passo", 13, negrito, NAVY);
  y -= 2;
  cursor.escrever("Se estiver de acordo, responda esta proposta. A contratação segue por contrato escrito.", 11, regular, INK);
  y -= 10;
  cursor.escrever(`${TEXTO_RESSALVA} ${dados.escritorio.crc ?? ""} · ${dados.numero}`, 8, regular, MUTED);

  return doc.save();
}

function desenharValor(pagina: PDFPage, x: number, y: number, largura: number, altura: number, rotulo: string, valor: string, regular: PDFFont, negrito: PDFFont) {
  pagina.drawRectangle({ x, y, width: largura, height: altura, color: WASH });
  pagina.drawRectangle({ x, y, width: 4, height: altura, color: BLUE });
  pagina.drawText(rotulo, { x: x + 14, y: y + 32, size: 9, font: regular, color: MUTED });
  pagina.drawText(limpar(valor), { x: x + 14, y: y + 12, size: 16, font: negrito, color: BLUE });
}

function escreverLista(
  cursor: { escrever: (texto: string, tamanho: number, fonte: PDFFont, cor: ReturnType<typeof rgb>, recuo?: number) => void },
  texto: string,
  fonte: PDFFont,
) {
  const itens = texto.split("\n").map((linha) => linha.trim()).filter(Boolean);
  if (itens.length === 0) {
    cursor.escrever("O combinado nesta proposta.", 11, fonte, INK, 8);
    return;
  }
  for (const item of itens) cursor.escrever(`- ${item}`, 11, fonte, INK, 4);
}
