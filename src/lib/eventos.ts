type ClienteEvento = {
  from: (tabela: "eventos") => {
    insert: (linha: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export async function registrarEvento(
  supabase: ClienteEvento,
  evento: { entidade: string; entidadeId?: string | null; acao: string; dados?: Record<string, unknown>; usuarioId?: string | null },
) {
  const { error } = await supabase.from("eventos").insert({
    entidade: evento.entidade,
    entidade_id: evento.entidadeId ?? null,
    acao: evento.acao,
    dados: evento.dados ?? {},
    usuario_id: evento.usuarioId ?? null,
  });
  if (error) console.error("Falha ao registrar evento", error.message);
}
