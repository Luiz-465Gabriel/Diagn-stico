"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BaixarPdf({
  propostaId,
  numero,
  bloqueada,
}: {
  propostaId: string;
  numero: string;
  bloqueada: boolean;
}) {
  const [gerando, setGerando] = useState<"simples" | "completa" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar(versao: "simples" | "completa") {
    setGerando(versao);
    setErro(null);
    try {
      const resposta = await fetch(`/api/propostas/${propostaId}/pdf?versao=${versao}`, { method: "POST" });
      if (!resposta.ok) {
        const json = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        setErro(json?.erro ?? "Não foi possível gerar o PDF.");
        return;
      }
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const nome = versao === "simples" ? `Proposta-simples-${numero.replace("/", "-")}.pdf` : `Diagnostico-${numero.replace("/", "-")}.pdf`;
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não foi possível gerar o PDF. Confira se o Chrome está instalado e reinicie o servidor.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="w-full max-w-xl space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-11 flex-1" onClick={() => void baixar("simples")} disabled={bloqueada || gerando !== null}>
          {gerando === "simples" ? "Preparando…" : "Baixar proposta simples"}
        </Button>
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => void baixar("completa")} disabled={bloqueada || gerando !== null}>
          {gerando === "completa" ? "Preparando o diagnóstico…" : "Baixar diagnóstico completo"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">A proposta simples sai na hora e é o arquivo para o cliente: o que será feito, o valor e o que está incluso. O diagnóstico completo traz gráficos e demora mais.</p>
      {bloqueada && <p className="text-sm text-muted-foreground">Revise o diagnóstico antes de baixar.</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
