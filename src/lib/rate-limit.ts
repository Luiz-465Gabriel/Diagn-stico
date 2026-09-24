type Balde = { count: number; reset: number };

const baldes = new Map<string, Balde>();

/**
 * Limite simples em memória, por instância. Em ambiente serverless cada
 * instância conta à parte — é uma barreira básica, não um WAF.
 */
export function limitarPorIp(
  chave: string,
  limite = 60,
  janelaMs = 60_000,
  agora = Date.now(),
): { ok: boolean; retryMs: number } {
  const atual = baldes.get(chave);
  if (!atual || agora > atual.reset) {
    baldes.set(chave, { count: 1, reset: agora + janelaMs });
    return { ok: true, retryMs: 0 };
  }
  if (atual.count >= limite) {
    return { ok: false, retryMs: atual.reset - agora };
  }
  atual.count += 1;
  return { ok: true, retryMs: 0 };
}

export function ipDaRequisicao(cabecalhos: Headers): string {
  const encaminhado = cabecalhos.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]?.trim() || "desconhecido";
  return cabecalhos.get("x-real-ip") ?? "desconhecido";
}

export function _limparLimitesParaTeste() {
  baldes.clear();
}
