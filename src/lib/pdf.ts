import { existsSync } from "node:fs";
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
  const chromeLocal = caminhoDoChrome();
  if (chromeLocal) {
    return puppeteer.default.launch({
      executablePath: chromeLocal,
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

function caminhoDoChrome() {
  const candidatos = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((caminho): caminho is string => Boolean(caminho));
  return candidatos.find((caminho) => existsSync(caminho));
}
