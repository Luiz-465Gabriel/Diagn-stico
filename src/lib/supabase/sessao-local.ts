export type UsuarioLocal = {
  id: string;
  email: string;
  nome: string;
  exp: number;
};

const MARGEM_RENOVACAO_MS = 120_000;

/** Nome do cookie de sessão a partir da URL do projeto. */
export function chaveDoToken(urlProjeto: string | undefined) {
  if (!urlProjeto) return null;
  try {
    const ref = new URL(urlProjeto).hostname.split(".")[0];
    if (!ref || ref === "localhost") return null;
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

function juntarValor(cookies: { name: string; value: string }[], chave: string) {
  const inteiro = cookies.find((cookie) => cookie.name === chave)?.value;
  if (inteiro) return inteiro;
  const partes: string[] = [];
  for (let i = 0; ; i += 1) {
    const pedaco = cookies.find((cookie) => cookie.name === `${chave}.${i}`)?.value;
    if (!pedaco) break;
    partes.push(pedaco);
  }
  return partes.length > 0 ? partes.join("") : null;
}

function decodificar(valor: string) {
  const texto = valor.startsWith("base64-") ? Buffer.from(valor.slice("base64-".length), "base64url").toString("utf8") : valor;
  return JSON.parse(texto) as {
    access_token?: string;
    expires_at?: number;
    user?: { id?: string; email?: string; user_metadata?: { nome?: string } };
  };
}

function claimsDoJwt(token: string) {
  const parte = token.split(".")[1];
  if (!parte) return null;
  try {
    return JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as { sub?: string; email?: string; exp?: number };
  } catch {
    return null;
  }
}

/** Lê a sessão do cookie, sem chamar o Supabase. */
export function lerSessaoLocal(cookies: { name: string; value: string }[], urlProjeto: string | undefined): UsuarioLocal | null {
  const chave = chaveDoToken(urlProjeto);
  if (!chave) return null;
  const valor = juntarValor(cookies, chave);
  if (!valor) return null;
  try {
    const sessao = decodificar(valor);
    const claims = sessao.access_token ? claimsDoJwt(sessao.access_token) : null;
    const id = sessao.user?.id || claims?.sub;
    if (!id) return null;
    const email = sessao.user?.email || claims?.email || "";
    const nome = sessao.user?.user_metadata?.nome || email.split("@")[0] || "Equipe";
    const exp = sessao.expires_at || claims?.exp || 0;
    return { id, email, nome, exp };
  } catch {
    return null;
  }
}

export function sessaoPertoDeExpirar(exp: number, agora = Date.now()) {
  if (!exp) return true;
  return exp * 1000 - agora < MARGEM_RENOVACAO_MS;
}
