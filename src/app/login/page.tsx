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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-sm">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-md border bg-card p-6">
          <div>
            <p className="text-sm text-muted-foreground">EMPMED Assessoria Contábil</p>
            <h1 className="mt-1 text-2xl font-semibold">Entrar</h1>
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
