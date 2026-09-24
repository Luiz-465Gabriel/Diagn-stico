"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AceiteProposta({ token, status, nomeAceite }: { token: string; status: string; nomeAceite: string | null }) {
  const [nome, setNome] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [estado, setEstado] = useState(status);

  async function responder(decisao: "aceitar" | "recusar") {
    const resposta = await fetch(`/api/p/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisao, nome, motivo }),
    });
    const json = (await resposta.json()) as { erro?: string; ok?: boolean };
    if (!resposta.ok) {
      setMensagem(json.erro ?? "Não foi possível registrar.");
      return;
    }
    setEstado(decisao === "aceitar" ? "aceita" : "recusada");
    setMensagem(decisao === "aceitar" ? "Proposta aceita. A EMPMED entra em contato para o contrato." : "Resposta registrada. Obrigado.");
  }

  if (estado === "aceita") return <p className="mx-auto mt-6 max-w-[210mm] rounded-xl bg-white p-6 text-sm">Proposta aceita{nomeAceite ? ` por ${nomeAceite}` : ""}.</p>;
  if (estado === "recusada") return <p className="mx-auto mt-6 max-w-[210mm] rounded-xl bg-white p-6 text-sm">Proposta recusada.</p>;
  if (estado === "expirada") return <p className="mx-auto mt-6 max-w-[210mm] rounded-xl bg-white p-6 text-sm">Esta proposta expirou. Peça um novo envio à EMPMED.</p>;
  if (estado !== "enviada") return null;

  return (
    <section className="no-print mx-auto mt-6 max-w-[210mm] space-y-3 rounded-xl bg-white p-6">
      <h2 className="font-serif text-2xl">Responder a proposta</h2>
      <Input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Textarea placeholder="Motivo, se for recusar (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <div className="flex gap-2">
        <Button type="button" onClick={() => void responder("aceitar")}>Aceitar</Button>
        <Button type="button" variant="outline" onClick={() => void responder("recusar")}>Recusar</Button>
      </div>
      {mensagem && <p className="text-sm">{mensagem}</p>}
    </section>
  );
}
