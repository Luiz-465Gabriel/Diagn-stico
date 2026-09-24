import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function TabelaOuCards({
  cabecalhos,
  linhas,
  vazio,
}: {
  cabecalhos: string[];
  linhas: { id: string; href: string; valores: ReactNode[] }[];
  vazio: string;
}) {
  if (linhas.length === 0) {
    return <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{vazio}</p>;
  }
  return (
    <>
      <div className="space-y-3 md:hidden">
        {linhas.map((linha) => (
          <article key={linha.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="space-y-1.5 text-sm">
              {linha.valores.map((valor, indice) => (
                <p key={indice}>
                  <span className="text-muted-foreground">{cabecalhos[indice]}: </span>
                  {valor}
                </p>
              ))}
            </div>
            <Button asChild className="mt-3 h-11 w-full">
              <Link href={linha.href}>Abrir</Link>
            </Button>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60 text-left">
              {cabecalhos.map((titulo) => (
                <th key={titulo} className="px-3 py-2 font-medium text-muted-foreground">{titulo}</th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.id} className="border-b last:border-0">
                {linha.valores.map((valor, indice) => (
                  <td key={indice} className="px-3 py-3">{valor}</td>
                ))}
                <td className="px-3 py-3 text-right">
                  <Button asChild>
                    <Link href={linha.href}>Abrir</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
