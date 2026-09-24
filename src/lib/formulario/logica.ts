import { validarCpfCnpj } from "@/lib/cpf-cnpj";
import type { Condicao, FormSchema, Pergunta, RespostasMap, SecaoFormulario } from "@/lib/formulario/tipos";

function valorPreenchido(valor: unknown): boolean {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "string") return valor.trim().length > 0;
  if (typeof valor === "number") return Number.isFinite(valor);
  if (typeof valor === "boolean") return true;
  if (Array.isArray(valor)) return valor.length > 0;
  return false;
}

function igual(valor: unknown, alvo: string): boolean {
  if (Array.isArray(valor)) return valor.some((item) => igual(item, alvo));
  if (valor && typeof valor === "object") {
    return Object.values(valor as Record<string, unknown>).some((item) => igual(item, alvo));
  }
  return String(valor) === alvo;
}

function contem(valor: unknown, alvo: string): boolean {
  if (typeof valor === "string") return valor.toLowerCase().includes(alvo.toLowerCase());
  if (typeof valor === "number") return String(valor).includes(alvo);
  if (Array.isArray(valor)) return valor.some((item) => contem(item, alvo));
  if (valor && typeof valor === "object") {
    return Object.values(valor as Record<string, unknown>).some((item) => contem(item, alvo));
  }
  return false;
}

export function condicaoAtendida(condicao: Condicao | undefined, respostas: RespostasMap, escopo?: Record<string, unknown>): boolean {
  if (!condicao) return true;
  const bruto = escopo ? escopo[condicao.perguntaId] : respostas[condicao.perguntaId]?.valor;
  if (bruto === undefined || bruto === null || bruto === "") return false;
  if (condicao.operador === "igual") return igual(bruto, condicao.valor);
  if (condicao.operador === "diferente") return !igual(bruto, condicao.valor);
  return contem(bruto, condicao.valor);
}

export function perguntaVisivel(pergunta: Pergunta, respostas: RespostasMap): boolean {
  return condicaoAtendida(pergunta.exibirSe, respostas);
}

export function perguntasDaSecao(secao: SecaoFormulario, respostas: RespostasMap): Pergunta[] {
  return secao.perguntas.filter((pergunta) => perguntaVisivel(pergunta, respostas));
}

export function perguntaRespondida(pergunta: Pergunta, respostas: RespostasMap): boolean {
  const resposta = respostas[pergunta.id];
  if (resposta?.nao_sabe && pergunta.permiteNaoSei) return true;
  if (pergunta.tipo === "checkbox") return true;
  if (pergunta.tipo === "tabela_repetivel") {
    const linhas = Array.isArray(resposta?.valor) ? resposta.valor : [];
    return linhas.length >= (pergunta.minimoLinhas ?? 0);
  }
  return valorPreenchido(resposta?.valor);
}

export function calcularProgresso(schema: FormSchema, respostas: RespostasMap): number {
  const obrigatorias = schema.secoes.flatMap((secao) => perguntasDaSecao(secao, respostas)).filter((pergunta) => pergunta.obrigatoria);
  if (!obrigatorias.length) return 100;
  const feitas = obrigatorias.filter((pergunta) => perguntaRespondida(pergunta, respostas)).length;
  return Math.round((feitas / obrigatorias.length) * 100);
}

function erroCelula(mensagem: string): string {
  return mensagem;
}

export function validarRespostas(schema: FormSchema, respostas: RespostasMap): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const secao of schema.secoes) {
    for (const pergunta of perguntasDaSecao(secao, respostas)) {
      const resposta = respostas[pergunta.id];
      if (resposta?.nao_sabe && pergunta.permiteNaoSei) continue;
      const valor = resposta?.valor;

      if (pergunta.obrigatoria && pergunta.tipo !== "checkbox" && !perguntaRespondida(pergunta, respostas)) {
        erros[pergunta.id] = "Responda esta pergunta ou marque Não sei, se disponível.";
        continue;
      }
      if (!valorPreenchido(valor) && pergunta.tipo !== "tabela_repetivel") continue;

      if (pergunta.tipo === "email" && typeof valor === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
        erros[pergunta.id] = "Informe um e-mail válido.";
      }
      if (pergunta.tipo === "cpf_cnpj" && typeof valor === "string" && valor && !validarCpfCnpj(valor)) {
        erros[pergunta.id] = "CPF ou CNPJ inválido.";
      }
      if ((pergunta.tipo === "numero" || pergunta.tipo === "percentual" || pergunta.tipo === "moeda") && typeof valor === "number") {
        if (pergunta.minimo !== undefined && valor < pergunta.minimo) erros[pergunta.id] = `O mínimo é ${pergunta.minimo}.`;
        if (pergunta.maximo !== undefined && valor > pergunta.maximo) erros[pergunta.id] = `O máximo é ${pergunta.maximo}.`;
      }
      if (pergunta.tipo === "multipla_escolha" && Array.isArray(valor)) {
        if (pergunta.minimo !== undefined && valor.length < pergunta.minimo) {
          erros[pergunta.id] = `Escolha pelo menos ${pergunta.minimo}.`;
        }
        if (pergunta.maximo !== undefined && valor.length > pergunta.maximo) {
          erros[pergunta.id] = `Escolha no máximo ${pergunta.maximo}.`;
        }
      }
      if (pergunta.tipo === "tabela_repetivel") {
        const linhas = Array.isArray(valor) ? valor : [];
        if ((pergunta.minimoLinhas ?? 0) > linhas.length) {
          erros[pergunta.id] = `Inclua pelo menos ${pergunta.minimoLinhas} linha.`;
          continue;
        }
        linhas.forEach((linha, indice) => {
          if (!linha || typeof linha !== "object") return;
          const registro = linha as Record<string, unknown>;
          for (const coluna of pergunta.colunas ?? []) {
            const exigida = coluna.obrigatoria || condicaoAtendida(coluna.obrigatorioSe, respostas, registro);
            const celula = registro[coluna.id];
            const vazia = celula === null || celula === undefined || celula === "";
            if (exigida && vazia && !erros[pergunta.id]) {
              erros[pergunta.id] = erroCelula(`Linha ${indice + 1}: preencha ${coluna.titulo}.`);
            }
          }
        });
      }
    }
  }
  return erros;
}

export function rotuloValor(valor: unknown, naoSabe?: boolean): string {
  if (naoSabe) return "Não sei";
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (Array.isArray(valor)) {
    if (valor.every((item) => typeof item === "string")) return valor.join(", ") || "—";
    return `${valor.length} linha(s)`;
  }
  return String(valor);
}
