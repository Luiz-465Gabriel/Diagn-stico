"use client";

import { enviarProposta, enviarPropostaEmail } from "@/app/(painel)/propostas/actions";
import { PainelLink } from "@/components/formulario/painel-link";
import { mensagemProposta } from "@/lib/whatsapp";

export function EnviarProposta({
  propostaId,
  nome,
  telefone,
  numero,
  validade,
  emailDisponivel,
  bloqueada,
}: {
  propostaId: string;
  nome: string;
  telefone: string | null;
  numero: string;
  validade: number;
  emailDisponivel: boolean;
  bloqueada: boolean;
}) {
  if (bloqueada) {
    return <p className="text-sm text-amber-800">O diagnóstico vinculado está em rascunho. Revise-o antes de gerar o PDF ou enviar a proposta.</p>;
  }
  return (
    <PainelLink
      rotulo="Gerar link público da proposta"
      telefone={telefone}
      emailDisponivel={emailDisponivel}
      gerar={() => enviarProposta(propostaId)}
      mensagemDe={(url) => mensagemProposta(nome, numero, url, validade)}
      enviarEmail={(url) => enviarPropostaEmail(propostaId, url)}
    />
  );
}
