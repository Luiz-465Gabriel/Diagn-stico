export const TIPOS_PERGUNTA = [
  "texto_curto",
  "texto_longo",
  "escolha_unica",
  "multipla_escolha",
  "lista_suspensa",
  "numero",
  "moeda",
  "percentual",
  "cpf_cnpj",
  "telefone",
  "email",
  "data",
  "mes_ano",
  "checkbox",
  "tabela_repetivel",
  "upload_arquivo",
] as const;

export type TipoPergunta = (typeof TIPOS_PERGUNTA)[number];

export type Condicao = {
  perguntaId: string;
  operador: "igual" | "diferente" | "contem";
  valor: string;
};

export type ColunaTabela = {
  id: string;
  titulo: string;
  tipo: "texto_curto" | "numero" | "moeda" | "escolha_unica";
  obrigatoria?: boolean;
  opcoes?: string[];
  obrigatorioSe?: Condicao;
};

export type Pergunta = {
  id: string;
  titulo: string;
  ajuda?: string;
  tipo: TipoPergunta;
  obrigatoria?: boolean;
  opcoes?: string[];
  minimo?: number;
  maximo?: number;
  exibirSe?: Condicao;
  permiteNaoSei?: boolean;
  colunas?: ColunaTabela[];
  minimoLinhas?: number;
};

export type SecaoFormulario = {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
};

export type FormSchema = {
  abertura: string;
  confirmacao: string;
  secoes: SecaoFormulario[];
};

export type ValorResposta = {
  valor: unknown;
  nao_sabe?: boolean;
};

export type RespostasMap = Record<string, ValorResposta>;

export type LinhaTabela = Record<string, string | number | null>;
