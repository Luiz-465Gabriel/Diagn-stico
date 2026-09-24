import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/** Token aleatório de 32 bytes. Só o hash SHA-256 é persistido. */
export function gerarToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashesIguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function assinarImpressao(id: string, expiraEm: number, segredo: string): string {
  return createHmac("sha256", segredo).update(`${id}.${expiraEm}`).digest("hex");
}

export function assinaturaValida(id: string, expiraEm: number, assinatura: string, segredo: string): boolean {
  if (!segredo || !assinatura || !Number.isFinite(expiraEm)) return false;
  if (Date.now() > expiraEm) return false;
  const esperada = assinarImpressao(id, expiraEm, segredo);
  return hashesIguais(esperada, assinatura);
}
