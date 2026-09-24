import Link from "next/link";
import { salvarEscritorio } from "@/app/(painel)/configuracoes/actions";
import { Aviso } from "@/components/painel/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaConfiguracoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const avisos = await searchParams;
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("configuracoes_escritorio").select("*").eq("id", 1).maybeSingle();
  const config = (data ?? {}) as {
    razao_social?: string;
    cnpj?: string | null;
    crc?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    email?: string | null;
    logo_path?: string | null;
    cores_tema?: Record<string, string>;
  };
  const cores = config.cores_tema ?? {};
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Configurações</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="underline" href="/configuracoes/parametros">Premissas do diagnóstico</Link>
          <Link className="underline" href="/configuracoes/tributario">Parâmetros tributários</Link>
          <Link className="underline" href="/configuracoes/usuarios">Usuários</Link>
        </div>
      </div>
      <Aviso erro={avisos.erro} ok={avisos.ok} />
      <form action={salvarEscritorio} className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <input type="hidden" name="logo_path" value={config.logo_path ?? ""} />
        <label className="text-sm sm:col-span-2">Razão social<Input name="razao_social" defaultValue={config.razao_social ?? ""} required /></label>
        <label className="text-sm">CNPJ<Input name="cnpj" defaultValue={config.cnpj ?? ""} /></label>
        <label className="text-sm">CRC<Input name="crc" defaultValue={config.crc ?? ""} /></label>
        <label className="text-sm sm:col-span-2">Endereço<Input name="endereco" defaultValue={config.endereco ?? ""} /></label>
        <label className="text-sm">Telefone<Input name="telefone" defaultValue={config.telefone ?? ""} /></label>
        <label className="text-sm">E-mail<Input name="email" type="email" defaultValue={config.email ?? ""} /></label>
        <label className="text-sm sm:col-span-2">Logo (PNG ou JPG)<Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label>
        {(["primaria", "secundaria", "fundo", "texto", "destaque"] as const).map((cor) => (
          <label key={cor} className="text-sm capitalize">{cor}
            <Input name={cor} type="color" defaultValue={cores[cor] || "#143F45"} />
          </label>
        ))}
        <div className="sm:col-span-2"><Button type="submit">Salvar escritório</Button></div>
      </form>
    </div>
  );
}
