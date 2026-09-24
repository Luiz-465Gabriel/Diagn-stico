"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cancelarEnvio, prorrogarEnvio, reabrirEnvio, reenviarEnvio, registrarCanalWhatsapp, enviarFormularioEmail } from "@/app/(painel)/formularios/actions";
import { PainelLink } from "@/components/formulario/painel-link";
import { Button } from "@/components/ui/button";
import { mensagemFormulario } from "@/lib/whatsapp";

export function AcoesEnvio({
  envioId,
  nome,
  telefone,
  emailDisponivel,
  respondido,
}: {
  envioId: string;
  nome: string;
  telefone: string | null;
  emailDisponivel: boolean;
  respondido: boolean;
}) {
  const [aviso, setAviso] = useState<string | null>(null);

  async function rodar(acao: () => Promise<{ ok?: boolean; erro?: string }>) {
    const resposta = await acao();
    if (resposta.erro) toast.error(resposta.erro);
    else {
      toast.success("Atualizado.");
      setAviso(null);
    }
  }

  return (
    <div className="space-y-4">
      {!respondido && (
        <PainelLink
          rotulo="Gerar novo link"
          telefone={telefone}
          emailDisponivel={emailDisponivel}
          gerar={async () => {
            const resposta = await reenviarEnvio(envioId);
            return { url: resposta.url, envioId, erro: resposta.erro };
          }}
          mensagemDe={(url) => mensagemFormulario(nome, url)}
          enviarEmail={(url, id) => enviarFormularioEmail(id, url)}
          registrarWhatsapp={registrarCanalWhatsapp}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void rodar(() => prorrogarEnvio(envioId, 15))}>Prorrogar 15 dias</Button>
        <Button type="button" variant="outline" onClick={() => void rodar(() => cancelarEnvio(envioId))}>Cancelar envio</Button>
        <Button type="button" variant="secondary" onClick={() => void rodar(() => reabrirEnvio(envioId))}>Reabrir para edição</Button>
        <Button type="button" variant="ghost" asChild>
          <a href={`/api/envios/${envioId}/csv`}>Exportar CSV</a>
        </Button>
      </div>
      {aviso && <p className="text-sm text-destructive">{aviso}</p>}
    </div>
  );
}
