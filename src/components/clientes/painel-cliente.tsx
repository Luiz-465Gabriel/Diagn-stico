"use client";

import { criarEnvio, enviarFormularioEmail, registrarCanalWhatsapp } from "@/app/(painel)/formularios/actions";
import { PainelLink } from "@/components/formulario/painel-link";
import { mensagemFormulario } from "@/lib/whatsapp";

export function PainelCliente({
  clienteId,
  nome,
  telefone,
  emailDisponivel,
}: {
  clienteId: string;
  nome: string;
  telefone: string | null;
  emailDisponivel: boolean;
}) {
  return (
    <PainelLink
      rotulo="Gerar link do formulário"
      telefone={telefone}
      emailDisponivel={emailDisponivel}
      gerar={() => criarEnvio(clienteId)}
      mensagemDe={(url) => mensagemFormulario(nome, url)}
      enviarEmail={(url, id) => enviarFormularioEmail(id, url)}
      registrarWhatsapp={registrarCanalWhatsapp}
    />
  );
}
