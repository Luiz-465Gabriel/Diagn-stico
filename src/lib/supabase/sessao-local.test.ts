import { describe, expect, it } from "vitest";
import { chaveDoToken, lerSessaoLocal, sessaoPertoDeExpirar } from "@/lib/supabase/sessao-local";

function jwt(payload: Record<string, unknown>) {
  const corpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `cabeca.${corpo}.assinatura`;
}

describe("sessão local", () => {
  it("descobre o cookie do projeto", () => {
    expect(chaveDoToken("https://abcxyz.supabase.co")).toBe("sb-abcxyz-auth-token");
    expect(chaveDoToken("")).toBeNull();
  });

  it("lê nome e validade sem ir à rede", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sessao = {
      access_token: jwt({ sub: "user-1", email: "ana@empmed.com.br", exp }),
      expires_at: exp,
      user: { id: "user-1", email: "ana@empmed.com.br", user_metadata: { nome: "Ana" } },
    };
    const valor = `base64-${Buffer.from(JSON.stringify(sessao)).toString("base64url")}`;
    const meio = Math.floor(valor.length / 2);
    const usuario = lerSessaoLocal(
      [
        { name: "sb-abcxyz-auth-token.0", value: valor.slice(0, meio) },
        { name: "sb-abcxyz-auth-token.1", value: valor.slice(meio) },
      ],
      "https://abcxyz.supabase.co",
    );
    expect(usuario).toMatchObject({ id: "user-1", nome: "Ana", email: "ana@empmed.com.br" });
    expect(sessaoPertoDeExpirar(usuario!.exp)).toBe(false);
  });

  it("marca sessão vencendo para renovar só nesse caso", () => {
    const exp = Math.floor(Date.now() / 1000) + 30;
    expect(sessaoPertoDeExpirar(exp)).toBe(true);
    expect(sessaoPertoDeExpirar(0)).toBe(true);
  });
});
