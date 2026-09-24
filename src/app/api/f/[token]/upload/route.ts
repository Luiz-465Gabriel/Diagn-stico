import { carregarEnvioPublico, limitarFormulario } from "@/lib/formulario/acesso";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIPOS = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: Request, contexto: { params: Promise<{ token: string }> }) {
  const limite = limitarFormulario(request.headers, "upload");
  if (!limite.ok) return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  const { token } = await contexto.params;
  const { envio } = await carregarEnvioPublico(token);
  if (!envio || ["respondido", "cancelado", "expirado"].includes(envio.status)) {
    return NextResponse.json({ erro: "Upload não permitido." }, { status: 403 });
  }
  const form = await request.formData();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: "Arquivo ausente." }, { status: 400 });
  if (!TIPOS.has(arquivo.type) || arquivo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ erro: "Envie PDF, JPG ou PNG de até 10 MB." }, { status: 400 });
  }
  const nome = arquivo.name.replace(/[^a-zA-Z0-9.\-_]/g, "").slice(0, 80) || "arquivo";
  const caminho = `${envio.id}/${crypto.randomUUID()}-${nome}`;
  const admin = criarClienteAdmin();
  const { error } = await admin.storage.from("form-uploads").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (error) return NextResponse.json({ erro: "Não foi possível guardar o arquivo." }, { status: 500 });
  return NextResponse.json({ caminho });
}
