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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <section className="bg-sidebar px-6 py-10 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-white/70">EMPMED</p>
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight sm:text-4xl">Propostas para clínicas e profissionais da saúde</h1>
          <div className="mt-6 h-1 w-16 bg-[hsl(var(--copper))]" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/75">
            Formulário no celular, diagnóstico no escritório e proposta pronta para enviar.
          </p>
        </div>
        <p className="mt-10 text-sm text-white/60">Mogi Guaçu · acesso da equipe</p>
      </section>
      <section className="flex items-center justify-center bg-background px-6 py-12">
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Não há cadastro público.</p>
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
          {erro && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Entrando…" : "Acessar o painel"}
          </Button>
        </form>
      </section>
    </main>
  );
}
