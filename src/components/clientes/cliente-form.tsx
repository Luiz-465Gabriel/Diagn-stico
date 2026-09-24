"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { salvarCliente } from "@/app/(painel)/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarCpfCnpj, formatarTelefone, somenteDigitos } from "@/lib/cpf-cnpj";
import { clienteSchema, STATUS, type ClienteInput } from "@/lib/clientes/schema";

export function ClienteForm({
  id,
  inicial,
  responsaveis,
}: {
  id?: string;
  inicial: ClienteInput;
  responsaveis: { id: string; nome: string }[];
}) {
  const [erro, setErro] = useState<string | null>(null);
  const form = useForm<ClienteInput>({ resolver: zodResolver(clienteSchema), defaultValues: inicial });

  async function onSubmit(dados: ClienteInput) {
    setErro(null);
    const resposta = await salvarCliente(id ?? null, {
      ...dados,
      cpf_cnpj: somenteDigitos(dados.cpf_cnpj),
      whatsapp: somenteDigitos(dados.whatsapp || ""),
    });
    if (resposta?.erro) setErro(resposta.erro);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <Campo label="Tipo">
        <select className="h-11 w-full rounded-md border bg-card px-3 text-sm" {...form.register("tipo")}>
          <option value="PF">Pessoa física</option>
          <option value="PJ">Pessoa jurídica</option>
        </select>
      </Campo>
      <Campo label="Status do funil">
        <select className="h-11 w-full rounded-md border bg-card px-3 text-sm" {...form.register("status_funil")}>
          {STATUS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Nome" erro={form.formState.errors.nome?.message} className="sm:col-span-2">
        <Input {...form.register("nome")} />
      </Campo>
      <Campo label="Razão social" erro={form.formState.errors.razao_social?.message} className="sm:col-span-2">
        <Input {...form.register("razao_social")} />
      </Campo>
      <Campo label="CPF ou CNPJ" erro={form.formState.errors.cpf_cnpj?.message}>
        <Input
          value={formatarCpfCnpj(form.watch("cpf_cnpj") || "")}
          onChange={(e) => form.setValue("cpf_cnpj", somenteDigitos(e.target.value).slice(0, 14), { shouldValidate: true })}
        />
      </Campo>
      <Campo label="WhatsApp" erro={form.formState.errors.whatsapp?.message}>
        <Input
          value={formatarTelefone(form.watch("whatsapp") || "")}
          onChange={(e) => form.setValue("whatsapp", somenteDigitos(e.target.value).slice(0, 11))}
          placeholder="(19) 99999-9999"
        />
      </Campo>
      <Campo label="E-mail" erro={form.formState.errors.email?.message}>
        <Input type="email" {...form.register("email")} />
      </Campo>
      <Campo label="Profissão ou especialidade">
        <Input {...form.register("profissao_especialidade")} />
      </Campo>
      <Campo label="Cidade/UF">
        <Input {...form.register("cidade_uf")} placeholder="Mogi Guaçu/SP" />
      </Campo>
      <Campo label="Origem do lead">
        <Input {...form.register("origem_lead")} list="origens" />
        <datalist id="origens">
          <option value="Indicação" />
          <option value="Instagram" />
          <option value="Google" />
          <option value="Evento" />
        </datalist>
      </Campo>
      <Campo label="Responsável" className="sm:col-span-2">
        <select className="h-11 w-full rounded-md border bg-card px-3 text-sm" {...form.register("responsavel_id")}>
          <option value="">Sem responsável</option>
          {responsaveis.map((pessoa) => (
            <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Observações" className="sm:col-span-2">
        <Textarea {...form.register("observacoes")} />
      </Campo>
      {erro && <p className="sm:col-span-2 text-sm text-destructive">{erro}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando…" : "Salvar cliente"}
        </Button>
      </div>
    </form>
  );
}

function Campo({ label, children, erro, className }: { label: string; children: ReactNode; erro?: string; className?: string }) {
  return (
    <label className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {erro && <span className="block text-sm text-destructive">{erro}</span>}
    </label>
  );
}
