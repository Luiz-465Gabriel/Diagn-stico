import { Resend } from "resend";

export function emailHabilitado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function enviarEmail(entrada: { para: string; assunto: string; html: string }) {
  if (!emailHabilitado()) {
    return { ok: false as const, motivo: "O envio de e-mail está desligado. Configure RESEND_API_KEY e EMAIL_FROM." };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: entrada.para,
    subject: entrada.assunto,
    html: entrada.html,
  });
  if (error) return { ok: false as const, motivo: error.message };
  return { ok: true as const };
}
