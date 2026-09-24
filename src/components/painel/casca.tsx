"use client";

import {
  Briefcase,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { sair } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/formularios", label: "Formulários", icon: FileText },
  { href: "/diagnosticos", label: "Diagnósticos", icon: LineChart },
  { href: "/propostas", label: "Propostas", icon: ScrollText },
  { href: "/servicos", label: "Serviços", icon: Briefcase },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function CascaPainel({ nome, perfil, children }: { nome: string; perfil: string; children: ReactNode }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const ativo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const menu = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <p className="font-serif text-2xl tracking-tight text-[hsl(var(--sidebar-foreground))]">EMPMED</p>
        <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--copper))]">Propostas</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {ITENS.map((item) => {
          const Icone = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                ativo(item.href) ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icone className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm text-white">{nome}</p>
        <p className="mb-3 text-xs uppercase tracking-wide text-white/50">{perfil === "admin" ? "Administração" : "Colaboração"}</p>
        <form action={sair}>
          <button className="flex items-center gap-2 text-sm text-white/70 hover:text-white" type="submit">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-sidebar lg:block">{menu}</aside>
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} aria-label="Fechar menu" />
          <aside className="relative z-10 h-full w-72 bg-sidebar">{menu}</aside>
        </div>
      )}
      <div className="painel-fundo min-h-screen text-foreground">
        <header className="flex items-center justify-between border-b bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
          <p className="font-serif text-lg">EMPMED</p>
          <Button variant="ghost" size="icon" onClick={() => setAberto((v) => !v)} aria-label="Abrir menu">
            {aberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
