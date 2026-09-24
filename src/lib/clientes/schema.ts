import { z } from "zod";
import { telefoneValido, validarCpfCnpj } from "@/lib/cpf-cnpj";
import { STATUS_FUNIL } from "@/lib/rotulos";

export const clienteSchema = z
  .object({
    tipo: z.enum(["PF", "PJ"]),
    nome: z.string().trim().min(2, "Informe o nome"),
    razao_social: z.string().optional(),
    cpf_cnpj: z.string().refine((valor) => validarCpfCnpj(valor), "CPF ou CNPJ inválido"),
    email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
    whatsapp: z.string().optional(),
    profissao_especialidade: z.string().optional(),
    cidade_uf: z.string().optional(),
    origem_lead: z.string().optional(),
    responsavel_id: z.string().optional(),
    status_funil: z.enum(["lead", "diagnostico_enviado", "diagnostico_respondido", "proposta_enviada", "fechado", "perdido"]),
    observacoes: z.string().optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.tipo === "PJ" && !dados.razao_social?.trim()) {
      ctx.addIssue({ code: "custom", path: ["razao_social"], message: "Informe a razão social" });
    }
    if (dados.whatsapp?.replace(/\D/g, "") && !telefoneValido(dados.whatsapp)) {
      ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "Informe um WhatsApp com DDD" });
    }
  });

export type ClienteInput = z.infer<typeof clienteSchema>;

export const STATUS = STATUS_FUNIL;
