import { describe, expect, it } from "vitest";
import type { DadosRelatorio } from "@/components/relatorio/documento";
import { nomeArquivoCompleto, nomeArquivoSimples, pdfPropostaSimples } from "@/lib/propostas/pdf-simples";

const dados = {
  numero: "2026/0001",
  emitidaEm: "2026-09-24T12:00:00.000Z",
  cliente: "Helena Vasconcelos",
  escritorio: {
    razao_social: "EMPMED Assessoria Contábil",
    cnpj: null,
    crc: "CRC a informar",
    endereco: null,
    telefone: null,
    email: null,
    logoUrl: null,
    cores: {},
  },
  premissas: { honorario_contabil: { origem: "cliente", valor: 200 } },
  resultado: { alertas: [] },
  itens: [
    {
      descricao: "Contabilidade e acompanhamento financeiro",
      quantidade: 1,
      valor_unitario: 200,
      desconto: 0,
      valor_total: 200,
      tipo: "mensal",
      prioridade_origem: "Organizar o dinheiro da clínica",
    },
  ],
  totalMensal: 200,
  totalAvulso: 4400,
  escopoIncluso: "Escrituração mensal\nGuias do período",
  escopoNaoIncluso: "Impostos devidos pelo cliente",
  condicoes: "Mensalidade no dia 10.",
  validade: "24/10/2026",
  observacoes: null,
} as unknown as DadosRelatorio;

describe("proposta simples", () => {
  it("nomeia os dois arquivos", () => {
    expect(nomeArquivoSimples("2026/0001")).toBe("Proposta-simples-2026-0001.pdf");
    expect(nomeArquivoCompleto("2026/0001")).toBe("Diagnostico-2026-0001.pdf");
  });

  it("gera um PDF sem abrir o Chrome", async () => {
    const bytes = await pdfPropostaSimples(dados);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(800);
  });
});
