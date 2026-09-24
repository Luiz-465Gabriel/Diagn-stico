import { assinarImpressao } from "@/lib/tokens";
import { urlPublica } from "@/lib/rotulos";

export function segredoImpressao() {
  return process.env.PDF_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function urlImpressao(propostaId: string) {
  const exp = Date.now() + 2 * 60 * 1000;
  const sig = assinarImpressao(propostaId, exp, segredoImpressao());
  return urlPublica(`/impressao/propostas/${propostaId}?exp=${exp}&sig=${sig}`);
}

export async function abrirNavegador() {
  const puppeteer = await import("puppeteer-core");
  if (process.env.BROWSERLESS_WS_ENDPOINT) {
    return puppeteer.default.connect({ browserWSEndpoint: process.env.BROWSERLESS_WS_ENDPOINT });
  }
  if (process.env.CHROME_PATH) {
    return puppeteer.default.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  const chromium = (await import("@sparticuz/chromium")).default;
  chromium.setGraphicsMode = false;
  return puppeteer.default.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: chromium.defaultViewport,
  });
}
