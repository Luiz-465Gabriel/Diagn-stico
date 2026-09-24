import { FormularioPublico } from "@/components/formulario/formulario-publico";
import { carregarEnvioPublico, limitarFormulario } from "@/lib/formulario/acesso";
import { adminConfigurado } from "@/lib/rotulos";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PaginaFormulario({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!adminConfigurado()) {
    return <Mensagem titulo="Formulário indisponível" texto="O escritório ainda não concluiu a configuração do sistema." />;
  }
  const limite = limitarFormulario(await headers(), "pagina");
  if (!limite.ok) return <Mensagem titulo="Muitas tentativas" texto="Espere um minuto e abra o link de novo." />;
  const { envio, motivo } = await carregarEnvioPublico(token);
  if (!envio) return <Mensagem titulo="Link inválido" texto={motivo ?? "Peça um novo link à EMPMED."} />;
  if (envio.status === "expirado") return <Mensagem titulo="Link expirado" texto="Peça à EMPMED para prorrogar o prazo." />;
  if (envio.status === "cancelado") return <Mensagem titulo="Link cancelado" texto="Este formulário foi cancelado pelo escritório." />;
  if (envio.status === "respondido") return <Mensagem titulo="Recebido." texto={envio.confirmacao} />;
  return (
    <FormularioPublico
      token={token}
      schema={envio.schema}
      iniciais={envio.respostas}
      consentimentoInicial={Boolean(envio.consentimento_lgpd_em)}
      nome={envio.cliente_nome}
      escritorio={envio.escritorio}
    />
  );
}

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--copper))]">EMPMED</p>
      <h1 className="mt-3 font-serif text-4xl">{titulo}</h1>
      <p className="mt-4 text-base leading-relaxed">{texto}</p>
    </main>
  );
}
