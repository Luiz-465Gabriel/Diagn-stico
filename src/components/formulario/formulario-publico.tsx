"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RenderizadorFormulario } from "@/components/formulario/renderizador";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { perguntasDaSecao, validarRespostas } from "@/lib/formulario/logica";
import type { FormSchema, RespostasMap } from "@/lib/formulario/tipos";

export function FormularioPublico({
  token,
  schema,
  iniciais,
  consentimentoInicial,
  nome,
  escritorio,
}: {
  token: string;
  schema: FormSchema;
  iniciais: RespostasMap;
  consentimentoInicial: boolean;
  nome: string;
  escritorio: string;
}) {
  const [passo, setPasso] = useState(consentimentoInicial ? 1 : 0);
  const [respostas, setRespostas] = useState<RespostasMap>(iniciais);
  const [consentimento, setConsentimento] = useState(consentimentoInicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const tocado = useRef(false);

  const secao = schema.secoes[passo - 1];
  const perguntas = useMemo(() => (secao ? perguntasDaSecao(secao, respostas) : []), [secao, respostas]);
  const progresso = Math.round((passo / (schema.secoes.length + 1)) * 100);

  useEffect(() => {
    if (!tocado.current || !consentimento || confirmacao) return;
    const timer = setTimeout(() => {
      void fetch(`/api/f/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "salvar", respostas, consentimento }),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [respostas, consentimento, token, confirmacao]);

  function alterar(id: string, valor: RespostasMap[string]) {
    tocado.current = true;
    setRespostas((atual) => ({ ...atual, [id]: valor }));
  }

  function continuar() {
    if (passo === 0) {
      if (!consentimento) {
        setAviso("Para seguir, é preciso aceitar o tratamento dos dados.");
        return;
      }
      tocado.current = true;
      setAviso(null);
      setPasso(1);
      return;
    }
    const todos = validarRespostas(schema, respostas);
    const daSecao: Record<string, string> = {};
    for (const pergunta of perguntas) {
      if (todos[pergunta.id]) daSecao[pergunta.id] = todos[pergunta.id];
    }
    setErros(daSecao);
    if (Object.keys(daSecao).length) return;
    setPasso((atual) => Math.min(atual + 1, schema.secoes.length));
  }

  async function enviar() {
    const todos = validarRespostas(schema, respostas);
    setErros(todos);
    if (Object.keys(todos).length) {
      const indice = schema.secoes.findIndex((item) => item.perguntas.some((pergunta) => todos[pergunta.id]));
      if (indice >= 0) setPasso(indice + 1);
      setAviso("Faltam respostas obrigatórias.");
      return;
    }
    const resposta = await fetch(`/api/f/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "enviar", respostas, consentimento: true }),
    });
    const json = (await resposta.json()) as { confirmacao?: string; erro?: string; erros?: Record<string, string> };
    if (!resposta.ok) {
      if (json.erros) setErros(json.erros);
      setAviso(json.erro ?? "Não foi possível enviar.");
      return;
    }
    setConfirmacao(json.confirmacao ?? schema.confirmacao);
  }

  if (confirmacao) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-10">
        <p className="text-sm text-muted-foreground">{escritorio}</p>
        <h1 className="mt-2 text-2xl font-semibold">Recebido</h1>
        <p className="mt-4 text-base leading-relaxed">{confirmacao}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-6">
      <p className="text-sm text-muted-foreground">{escritorio}</p>
      <h1 className="mt-1 text-xl font-semibold">Planejamento do seu novo espaço</h1>
      <p className="mt-1 text-sm text-muted-foreground">Olá, {nome.split(" ")[0]}.</p>
      <div className="mt-4">
        <Progress value={passo === 0 ? 4 : progresso} />
        <p className="mt-1 text-xs text-muted-foreground">
          {passo === 0 ? "Antes de começar" : `Etapa ${passo} de ${schema.secoes.length}`}
        </p>
      </div>

      <div className="mt-6 flex-1">
        {passo === 0 ? (
          <div className="space-y-4">
            <p className="text-base leading-relaxed">{schema.abertura}</p>
            <label className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-relaxed">
              <Checkbox checked={consentimento} onCheckedChange={(valor) => setConsentimento(valor === true)} className="mt-0.5" />
              <span>
                Li e concordo com o tratamento dos meus dados pessoais para elaboração do diagnóstico e da proposta de serviços, nos termos da Lei nº 13.709/2018 (LGPD). Os dados serão usados pelo escritório exclusivamente para esse atendimento.
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{secao?.titulo}</h2>
            <RenderizadorFormulario
              perguntas={perguntas}
              respostas={respostas}
              erros={erros}
              onChange={alterar}
              onUpload={async (arquivo) => {
                const corpo = new FormData();
                corpo.set("arquivo", arquivo);
                const resposta = await fetch(`/api/f/${token}/upload`, { method: "POST", body: corpo });
                const json = (await resposta.json()) as { caminho?: string; erro?: string };
                if (!resposta.ok || !json.caminho) throw new Error(json.erro || "Falha no envio");
                return json.caminho;
              }}
            />
          </div>
        )}
        {aviso && <p className="mt-4 text-sm text-destructive">{aviso}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2">
          {passo > 0 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setPasso((atual) => atual - 1)}>
              Voltar
            </Button>
          )}
          {passo < schema.secoes.length ? (
            <Button type="button" className="flex-1" onClick={continuar}>
              Continuar
            </Button>
          ) : (
            <Button type="button" className="flex-1" onClick={() => void enviar()}>
              Enviar respostas
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
