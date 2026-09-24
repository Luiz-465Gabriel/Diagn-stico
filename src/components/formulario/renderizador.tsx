"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from "@/lib/format";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/cpf-cnpj";
import type { LinhaTabela, Pergunta, RespostasMap, ValorResposta } from "@/lib/formulario/tipos";
import { cn } from "@/lib/utils";

type Props = {
  perguntas: Pergunta[];
  respostas: RespostasMap;
  erros: Record<string, string>;
  onChange: (id: string, valor: ValorResposta) => void;
  onUpload?: (arquivo: File) => Promise<string>;
};

export function RenderizadorFormulario({ perguntas, respostas, erros, onChange, onUpload }: Props) {
  return (
    <div className="space-y-6">
      {perguntas.map((pergunta) => (
        <Campo key={pergunta.id} pergunta={pergunta} resposta={respostas[pergunta.id]} erro={erros[pergunta.id]} onChange={onChange} onUpload={onUpload} />
      ))}
    </div>
  );
}

function Campo({
  pergunta,
  resposta,
  erro,
  onChange,
  onUpload,
}: {
  pergunta: Pergunta;
  resposta?: ValorResposta;
  erro?: string;
  onChange: Props["onChange"];
  onUpload?: Props["onUpload"];
}) {
  const naoSabe = Boolean(resposta?.nao_sabe);
  const definir = (valor: unknown, sabe = false) => onChange(pergunta.id, { valor, nao_sabe: sabe ? false : undefined });

  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-medium leading-snug">
        {pergunta.titulo}
        {pergunta.obrigatoria ? <span className="text-[hsl(var(--copper))]"> *</span> : null}
      </legend>
      {pergunta.ajuda && <p className="text-sm text-muted-foreground">{pergunta.ajuda}</p>}
      <div className={cn(naoSabe && "pointer-events-none opacity-50")}>
        {pergunta.tipo === "texto_curto" && (
          <Input value={String(resposta?.valor ?? "")} onChange={(e) => definir(e.target.value)} disabled={naoSabe} />
        )}
        {pergunta.tipo === "texto_longo" && (
          <Textarea value={String(resposta?.valor ?? "")} onChange={(e) => definir(e.target.value)} disabled={naoSabe} />
        )}
        {pergunta.tipo === "email" && (
          <Input type="email" inputMode="email" value={String(resposta?.valor ?? "")} onChange={(e) => definir(e.target.value)} disabled={naoSabe} />
        )}
        {(pergunta.tipo === "escolha_unica" || pergunta.tipo === "lista_suspensa") && (
          <Escolha pergunta={pergunta} valor={typeof resposta?.valor === "string" ? resposta.valor : ""} onChange={(valor) => definir(valor)} lista={pergunta.tipo === "lista_suspensa"} />
        )}
        {pergunta.tipo === "multipla_escolha" && (
          <Multipla opcoes={pergunta.opcoes ?? []} valor={Array.isArray(resposta?.valor) ? (resposta?.valor as string[]) : []} maximo={pergunta.maximo} onChange={(valor) => definir(valor)} />
        )}
        {pergunta.tipo === "numero" && (
          <Input
            type="number"
            inputMode="decimal"
            min={pergunta.minimo}
            max={pergunta.maximo}
            value={resposta?.valor === null || resposta?.valor === undefined ? "" : String(resposta.valor)}
            onChange={(e) => definir(e.target.value === "" ? null : Number(e.target.value))}
            disabled={naoSabe}
          />
        )}
        {pergunta.tipo === "percentual" && (
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              value={resposta?.valor === null || resposta?.valor === undefined ? "" : String(resposta.valor)}
              onChange={(e) => definir(e.target.value === "" ? null : Number(e.target.value))}
              disabled={naoSabe}
              className="pr-10"
            />
            <span className="absolute right-3 top-3 text-sm text-muted-foreground">%</span>
          </div>
        )}
        {pergunta.tipo === "moeda" && (
          <Moeda valor={typeof resposta?.valor === "number" ? resposta.valor : null} onChange={(valor) => definir(valor)} disabled={naoSabe} />
        )}
        {pergunta.tipo === "cpf_cnpj" && (
          <Input
            inputMode="numeric"
            value={formatarCpfCnpj(String(resposta?.valor ?? ""))}
            onChange={(e) => definir(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="CPF ou CNPJ"
          />
        )}
        {pergunta.tipo === "telefone" && (
          <Input inputMode="tel" value={formatarTelefone(String(resposta?.valor ?? ""))} onChange={(e) => definir(e.target.value.replace(/\D/g, "").slice(0, 11))} />
        )}
        {pergunta.tipo === "data" && (
          <Input type="date" value={typeof resposta?.valor === "string" ? resposta.valor : ""} onChange={(e) => definir(e.target.value)} />
        )}
        {pergunta.tipo === "mes_ano" && (
          <Input type="month" value={typeof resposta?.valor === "string" ? resposta.valor : ""} onChange={(e) => definir(e.target.value)} disabled={naoSabe} />
        )}
        {pergunta.tipo === "checkbox" && (
          <label className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
            <Checkbox checked={resposta?.valor === true} onCheckedChange={(marcado) => onChange(pergunta.id, { valor: marcado === true })} />
            <span className="text-sm">Marcar</span>
          </label>
        )}
        {pergunta.tipo === "tabela_repetivel" && (
          <Tabela
            pergunta={pergunta}
            linhas={Array.isArray(resposta?.valor) ? (resposta?.valor as LinhaTabela[]) : []}
            onChange={(linhas) => definir(linhas)}
          />
        )}
        {pergunta.tipo === "upload_arquivo" && (
          <Upload atual={typeof resposta?.valor === "string" ? resposta.valor : ""} onUpload={onUpload} onChange={(caminho) => definir(caminho)} />
        )}
      </div>
      {pergunta.permiteNaoSei && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={naoSabe}
            onCheckedChange={(marcado) => onChange(pergunta.id, { valor: null, nao_sabe: marcado === true })}
          />
          Não sei
        </label>
      )}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </fieldset>
  );
}

function Escolha({ pergunta, valor, onChange, lista }: { pergunta: Pergunta; valor: string; onChange: (valor: string) => void; lista: boolean }) {
  if (lista) {
    return (
      <select className="h-11 w-full rounded-md border bg-card px-3 text-sm" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione</option>
        {(pergunta.opcoes ?? []).map((opcao) => (
          <option key={opcao} value={opcao}>{opcao}</option>
        ))}
      </select>
    );
  }
  return (
    <div className="grid gap-2">
      {(pergunta.opcoes ?? []).map((opcao) => (
        <label key={opcao} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3 py-3 text-sm", valor === opcao && "border-primary bg-primary/5")}>
          <input type="radio" className="mt-1" name={pergunta.id} checked={valor === opcao} onChange={() => onChange(opcao)} />
          <span>{opcao}</span>
        </label>
      ))}
    </div>
  );
}

function Multipla({ opcoes, valor, maximo, onChange }: { opcoes: string[]; valor: string[]; maximo?: number; onChange: (valor: string[]) => void }) {
  return (
    <div className="grid gap-2">
      {opcoes.map((opcao) => {
        const marcado = valor.includes(opcao);
        return (
          <label key={opcao} className={cn("flex items-start gap-3 rounded-lg border bg-card px-3 py-3 text-sm", marcado && "border-primary bg-primary/5")}>
            <Checkbox
              checked={marcado}
              onCheckedChange={(checado) => {
                if (checado === true) {
                  if (maximo && valor.length >= maximo) return;
                  onChange([...valor, opcao]);
                } else {
                  onChange(valor.filter((item) => item !== opcao));
                }
              }}
            />
            <span>{opcao}</span>
          </label>
        );
      })}
    </div>
  );
}

function Moeda({ valor, onChange, disabled }: { valor: number | null; onChange: (valor: number | null) => void; disabled?: boolean }) {
  const [texto, setTexto] = useState(valor === null ? "" : numeroParaMascaraMoeda(valor));
  useEffect(() => {
    if (disabled) setTexto("");
  }, [disabled]);
  return (
    <div className="relative">
      <span className="absolute left-3 top-3 text-sm text-muted-foreground">R$</span>
      <Input
        inputMode="numeric"
        className="pl-10"
        disabled={disabled}
        value={texto}
        onChange={(e) => {
          const mascara = mascaraMoeda(e.target.value);
          setTexto(mascara);
          onChange(mascara ? moedaParaNumero(mascara) : null);
        }}
      />
    </div>
  );
}

function Tabela({ pergunta, linhas, onChange }: { pergunta: Pergunta; linhas: LinhaTabela[]; onChange: (linhas: LinhaTabela[]) => void }) {
  const colunas = pergunta.colunas ?? [];
  const atualizar = (indice: number, coluna: string, valor: string | number | null) => {
    const copia = linhas.map((linha, i) => (i === indice ? { ...linha, [coluna]: valor } : linha));
    onChange(copia);
  };
  return (
    <div className="space-y-3">
      {linhas.map((linha, indice) => (
        <div key={indice} className="space-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Serviço {indice + 1}</p>
            {linhas.length > (pergunta.minimoLinhas ?? 0) && (
              <button type="button" className="text-xs text-destructive" onClick={() => onChange(linhas.filter((_, i) => i !== indice))}>
                Remover
              </button>
            )}
          </div>
          {colunas.map((coluna) => (
            <label key={coluna.id} className="block space-y-1 text-sm">
              <span>{coluna.titulo}</span>
              {coluna.tipo === "escolha_unica" ? (
                <select className="h-11 w-full rounded-md border bg-background px-3" value={String(linha[coluna.id] ?? "")} onChange={(e) => atualizar(indice, coluna.id, e.target.value)}>
                  <option value="">Selecione</option>
                  {(coluna.opcoes ?? []).map((opcao) => (
                    <option key={opcao}>{opcao}</option>
                  ))}
                </select>
              ) : coluna.tipo === "moeda" ? (
                <Moeda valor={typeof linha[coluna.id] === "number" ? (linha[coluna.id] as number) : null} onChange={(valor) => atualizar(indice, coluna.id, valor)} />
              ) : (
                <Input
                  type={coluna.tipo === "numero" ? "number" : "text"}
                  value={linha[coluna.id] === null || linha[coluna.id] === undefined ? "" : String(linha[coluna.id])}
                  onChange={(e) => atualizar(indice, coluna.id, coluna.tipo === "numero" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-lg border border-dashed py-3 text-sm"
        onClick={() => onChange([...linhas, {}])}
      >
        Adicionar serviço
      </button>
    </div>
  );
}

function Upload({ atual, onUpload, onChange }: { atual: string; onUpload?: Props["onUpload"]; onChange: (caminho: string) => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        disabled={enviando}
        onChange={async (e) => {
          const arquivo = e.target.files?.[0];
          if (!arquivo || !onUpload) return;
          if (arquivo.size > 10 * 1024 * 1024) {
            setAviso("O arquivo passa de 10 MB.");
            return;
          }
          setEnviando(true);
          setAviso(null);
          try {
            onChange(await onUpload(arquivo));
          } catch (erro) {
            setAviso(erro instanceof Error ? erro.message : "Não foi possível enviar o arquivo.");
          } finally {
            setEnviando(false);
          }
        }}
      />
      {atual && <p className="text-xs text-muted-foreground">Arquivo recebido.</p>}
      {aviso && <p className="text-sm text-destructive">{aviso}</p>}
      {enviando && <p className="text-sm text-muted-foreground">Enviando…</p>}
    </div>
  );
}
