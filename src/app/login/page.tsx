"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { entrar } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  senha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
});

type Dados = z.infer<typeof schema>;

export default function LoginPage() {
  const [erro, setErro] = useState<string | null>(null);
  const form = useForm<Dados>({ resolver: zodResolver(schema), defaultValues: { email: "", senha: "" } });

  async function onSubmit(dados: Dados) {
    setErro(null);
    const corpo = new FormData();
    corpo.set("email", dados.email);
    corpo.set("senha", dados.senha);
    const resposta = await entrar(corpo);
    if (resposta?.erro) setErro(resposta.erro);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[hsl(var(--sidebar))] p-12 text-[hsl(var(--sidebar-foreground))] lg:flex">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--copper))]">Mogi Guaçu · SP</p>
          <h1 className="mt-6 max-w-md font-serif text-5xl leading-tight">Contabilidade para quem cuida de gente.</h1>
        </div>
        <p className="max-w-sm text-sm text-white/70">
          EMPMED Assessoria Contábil. Diagnóstico financeiro e proposta de serviços para médicos, clínicas e profissionais da saúde.
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5">
          <div>
            <p className="font-serif text-3xl">Entrar</p>
            <p className="mt-1 text-sm text-muted-foreground">Acesso da equipe. Não há cadastro público.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" autoComplete="current-password" {...form.register("senha")} />
            {form.formState.errors.senha && <p className="text-sm text-destructive">{form.formState.errors.senha.message}</p>}
          </div>
          {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Entrando…" : "Acessar o painel"}
          </Button>
        </form>
      </section>
    </main>
  );
}
