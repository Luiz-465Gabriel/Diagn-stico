import { describe, expect, it } from "vitest";
import { calcularProgresso, condicaoAtendida, validarRespostas } from "@/lib/formulario/logica";
import { TEMPLATE_PLANEJAMENTO_V1 } from "@/lib/formulario/template-v1";
import type { RespostasMap } from "@/lib/formulario/tipos";
import { validarCpf, validarCnpj } from "@/lib/cpf-cnpj";
import { _limparLimitesParaTeste, limitarPorIp } from "@/lib/rate-limit";
import { gerarToken, hashToken, hashesIguais } from "@/lib/tokens";

describe("formulário", () => {
  it("esconde a pergunta dependente até a origem ser respondida", () => {
    expect(condicaoAtendida({ perguntaId: "q06_imovel", operador: "igual", valor: "Alugado" }, {})).toBe(false);
    const erros = validarRespostas(TEMPLATE_PLANEJAMENTO_V1, {});
    expect(erros.q06_aluguel).toBeUndefined();
    expect(erros.q10_pessoas_por_horario_grupo).toBeUndefined();
  });

  it("exige aluguel quando o imóvel é alugado e sessões de pacote na tabela", () => {
    const respostas: RespostasMap = {
      q06_imovel: { valor: "Alugado" },
      q09_servicos: {
        valor: [{ servico: "Avaliação", modalidade: "Grupo", forma_cobranca: "Pacote", valor: 900 }],
      },
    };
    const erros = validarRespostas(TEMPLATE_PLANEJAMENTO_V1, respostas);
    expect(erros.q06_aluguel).toBeTruthy();
    expect(erros.q09_servicos).toMatch(/Sessões no pacote/);
    expect(erros.q10_pessoas_por_horario_grupo).toBeTruthy();
  });

  it("aceita Não sei em campo obrigatório de moeda e limita as prioridades", () => {
    const respostas: RespostasMap = {
      q03_receita_mensal: { valor: null, nao_sabe: true },
      q15_prioridades: { valor: ["a", "b", "c", "d"] },
    };
    const erros = validarRespostas(TEMPLATE_PLANEJAMENTO_V1, respostas);
    expect(erros.q03_receita_mensal).toBeUndefined();
    expect(erros.q15_prioridades).toMatch(/no máximo/);
    expect(calcularProgresso(TEMPLATE_PLANEJAMENTO_V1, respostas)).toBeGreaterThan(0);
  });
});

describe("documentos e tokens", () => {
  it("valida CPF e CNPJ", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCnpj("45.821.937/0001-66")).toBe(true);
    expect(validarCnpj("11.111.111/1111-11")).toBe(false);
  });

  it("guarda só o hash e limita requisições por IP", () => {
    const { token, hash } = gerarToken();
    expect(token).not.toBe(hash);
    expect(hash).toBe(hashToken(token));
    expect(hashesIguais(hash, hashToken(token))).toBe(true);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);

    _limparLimitesParaTeste();
    expect(limitarPorIp("1.1.1.1", 2, 1000, 0).ok).toBe(true);
    expect(limitarPorIp("1.1.1.1", 2, 1000, 10).ok).toBe(true);
    expect(limitarPorIp("1.1.1.1", 2, 1000, 20).ok).toBe(false);
  });
});
