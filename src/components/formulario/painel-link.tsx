"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { linkWhatsapp } from "@/lib/whatsapp";

export function PainelLink({
  rotulo,
  telefone,
  emailDisponivel,
  gerar,
  mensagemDe,
  enviarEmail,
  registrarWhatsapp,
}: {
  rotulo: string;
  telefone: string | null;
  emailDisponivel: boolean;
  gerar: () => Promise<{ url?: string; envioId?: string; erro?: string }>;
  mensagemDe: (url: string) => string;
  enviarEmail?: (url: string, id: string) => Promise<{ ok?: boolean; erro?: string }>;
  registrarWhatsapp?: (id: string) => Promise<void>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function criar() {
    setOcupado(true);
    const resposta = await gerar();
    setOcupado(false);
    if (resposta.erro || !resposta.url) {
      toast.error(resposta.erro ?? "Não foi possível gerar o link.");
      return;
    }
    setUrl(resposta.url);
    setId(resposta.envioId ?? null);
    setMensagem(mensagemDe(resposta.url));
    toast.success("Link gerado. Ele não será mostrado de novo — copie agora.");
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => void criar()} disabled={ocupado}>
        {ocupado ? "Gerando…" : rotulo}
      </Button>
      {url && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
          <p className="break-all text-sm">{url}</p>
          <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("Link copiado."))}>
              Copiar link
            </Button>
            {telefone ? (
              <Button
                type="button"
                variant="copper"
                onClick={() => {
                  if (id && registrarWhatsapp) void registrarWhatsapp(id);
                  window.open(linkWhatsapp(telefone, mensagem), "_blank", "noopener,noreferrer");
                }}
              >
                Abrir WhatsApp
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Cadastre o WhatsApp para abrir a conversa.</p>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={!emailDisponivel || !enviarEmail || !id}
              onClick={async () => {
                if (!enviarEmail || !id) return;
                const resposta = await enviarEmail(url, id);
                if (resposta.erro) toast.error(resposta.erro);
                else toast.success("E-mail enviado.");
              }}
            >
              {emailDisponivel ? "Enviar e-mail" : "E-mail desligado"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">O link anterior deixa de funcionar quando um novo é gerado. Só o hash fica gravado.</p>
        </div>
      )}
    </div>
  );
}
