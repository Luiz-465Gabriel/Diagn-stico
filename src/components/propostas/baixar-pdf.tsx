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
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setGerando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/propostas/${propostaId}/pdf`, { method: "POST" });
      if (!resposta.ok) {
        const json = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        setErro(json?.erro ?? "Não foi possível gerar o PDF.");
        return;
      }
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Proposta-${numero.replace("/", "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não foi possível gerar o PDF. Confira se o Chrome está instalado e se o servidor foi reiniciado.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void baixar()} disabled={bloqueada || gerando}>
          {gerando ? "Preparando o PDF…" : "Baixar PDF"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()} disabled={bloqueada}>
          Salvar pelo navegador
        </Button>
      </div>
      {bloqueada && <p className="text-sm text-muted-foreground">Revise o diagnóstico antes de baixar a proposta.</p>}
      {erro && <p className="max-w-xl text-sm text-destructive">{erro}</p>}
    </div>
  );
}
