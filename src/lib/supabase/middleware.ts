import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "@/lib/rotulos";
import { lerSessaoLocal, sessaoPertoDeExpirar } from "@/lib/supabase/sessao-local";

const PROTEGIDAS = [/^\/dashboard/, /^\/clientes/, /^\/formularios/, /^\/diagnosticos/, /^\/propostas/, /^\/servicos/, /^\/configuracoes/];

export async function updateSession(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  const protegida = PROTEGIDAS.some((regra) => regra.test(caminho));

  if (!supabaseConfigurado()) {
    if (protegida) {
      const url = request.nextUrl.clone();
      url.pathname = "/sem-configuracao";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  const cookies = request.cookies.getAll();
  const local = lerSessaoLocal(cookies, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const valida = Boolean(local && !sessaoPertoDeExpirar(local.exp));

  if (valida) {
    if (caminho === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (!local && protegida) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", caminho);
    return NextResponse.redirect(url);
  }

  if (!local) return NextResponse.next({ request });

  return renovarSessao(request, protegida, caminho);
}

/** Só fala com o Supabase quando o token está perto de vencer. */
async function renovarSessao(request: NextRequest, protegida: boolean, caminho: string) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (protegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", caminho);
    return NextResponse.redirect(url);
  }
  if (caminho === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
