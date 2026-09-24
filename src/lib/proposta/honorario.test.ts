import { describe, expect, it } from "vitest";
import { valorMensalInicial } from "@/lib/proposta/honorario";

describe("valor mensal da proposta", () => {
  it("usa os R$ 200 informados pela cliente, e não o preço de tabela", () => {
    const resultado = valorMensalInicial(1400, { valor: 200, origem: "cliente" });
    expect(resultado).toEqual({ valor: 200, usouInformado: true });
  });

  it("mantém a tabela quando o cliente não informou o honorário", () => {
    expect(valorMensalInicial(1400, { valor: 800, origem: "estimado" })).toEqual({ valor: 1400, usouInformado: false });
    expect(valorMensalInicial(1400, null)).toEqual({ valor: 1400, usouInformado: false });
  });
});
