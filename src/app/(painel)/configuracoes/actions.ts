"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarEvento } from "@/lib/eventos";
import { exigirAdmin, exigirSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

function aviso(caminho: string, tipo: "erro" | "ok", mensagem: string): never {
  redirect(`${caminho}?${tipo}=${encodeURIComponent(mensagem)}`);
}

export async function salvarEscritorio(formData: FormData) {
  const { supabase, profile } = await exigirSessao();
  let logoPath = String(formData.get("logo_path") || "") || null;
  const arquivo = formData.get("logo");
  if (arquivo instanceof File && arquivo.size > 0) {
    const nome = `logo-${Date.now()}.${(arquivo.name.split(".").pop() || "png").replace(/[^a-z0-9]/gi, "")}`;
    const { error } = await supabase.storage.from("marca").upload(nome, arquivo, { upsert: true, contentType: arquivo.type });
    if (error) aviso("/configuracoes", "erro", error.message);
    logoPath = nome;
  }
  const cores = {
    primaria: String(formData.get("primaria") || "#143F45"),
    secundaria: String(formData.get("secundaria") || "#B86B3D"),
    fundo: String(formData.get("fundo") || "#F6F3EE"),
    texto: String(formData.get("texto") || "#1C2426"),
    destaque: String(formData.get("destaque") || "#1F6A5A"),
  };
  const { error } = await supabase.from("configuracoes_escritorio").update({
    razao_social: String(formData.get("razao_social") || ""),
    cnpj: String(formData.get("cnpj") || "") || null,
    crc: String(formData.get("crc") || "") || null,
    endereco: String(formData.get("endereco") || "") || null,
    telefone: String(formData.get("telefone") || "") || null,
    email: String(formData.get("email") || "") || null,
    logo_path: logoPath,
    cores_tema: cores,
  }).eq("id", 1);
  if (error) aviso("/configuracoes", "erro", error.message);
  await registrarEvento(supabase, { entidade: "configuracao", acao: "escritorio_atualizado", usuarioId: profile.id });
  revalidatePath("/configuracoes");
  aviso("/configuracoes", "ok", "Dados do escritório salvos.");
}

export async function salvarParametro(formData: FormData) {
  const { supabase, profile } = await exigirSessao();
  const chave = String(formData.get("chave") || "");
  const valor = Number(formData.get("valor"));
  if (!chave || !Number.isFinite(valor)) return;
  await supabase.from("parametros_diagnostico").update({ valor }).eq("chave", chave);
  await registrarEvento(supabase, { entidade: "parametro", acao: "parametro_atualizado", usuarioId: profile.id, dados: { chave, valor } });
  revalidatePath("/configuracoes/parametros");
}

export async function salvarTributo(formData: FormData) {
  const { supabase, profile } = await exigirSessao();
  const id = String(formData.get("id") || "");
  let parametros: unknown;
  try {
    parametros = JSON.parse(String(formData.get("parametros") || "{}"));
  } catch {
    aviso("/configuracoes/tributario", "erro", "JSON inválido.");
  }
  const { error } = await supabase.from("parametros_tributarios").update({
    vigencia_inicio: String(formData.get("vigencia_inicio")),
    vigencia_fim: String(formData.get("vigencia_fim") || "") || null,
    fonte_legal: String(formData.get("fonte_legal") || ""),
    parametros,
  }).eq("id", id);
  if (error) aviso("/configuracoes/tributario", "erro", error.message);
  await registrarEvento(supabase, { entidade: "parametro_tributario", entidadeId: id, acao: "tributo_atualizado", usuarioId: profile.id });
  revalidatePath("/configuracoes/tributario");
  aviso("/configuracoes/tributario", "ok", "Parâmetro tributário salvo.");
}

export async function salvarMunicipio(formData: FormData) {
  const { supabase, profile } = await exigirSessao();
  const municipio = String(formData.get("municipio_uf") || "").trim();
  const aliquota = Number(formData.get("aliquota_iss"));
  if (!municipio || !Number.isFinite(aliquota)) aviso("/configuracoes/tributario", "erro", "Informe município e alíquota.");
  const { error } = await supabase.from("parametros_municipais").upsert({
    municipio_uf: municipio,
    aliquota_iss: aliquota,
    observacoes: String(formData.get("observacoes") || "") || null,
  }, { onConflict: "municipio_uf" });
  if (error) aviso("/configuracoes/tributario", "erro", error.message);
  await registrarEvento(supabase, { entidade: "municipio", acao: "municipio_salvo", usuarioId: profile.id, dados: { municipio, aliquota } });
  revalidatePath("/configuracoes/tributario");
  aviso("/configuracoes/tributario", "ok", "Município salvo.");
}

export async function criarUsuario(formData: FormData) {
  const { profile } = await exigirAdmin();
  const admin = criarClienteAdmin();
  const email = String(formData.get("email") || "").trim();
  const senha = String(formData.get("senha") || "");
  const nome = String(formData.get("nome") || "").trim();
  const perfil = String(formData.get("perfil") || "colaborador");
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, perfil },
  });
  if (error) aviso("/configuracoes/usuarios", "erro", error.message);
  await registrarEvento(admin, { entidade: "usuario", acao: "usuario_criado", usuarioId: profile.id, dados: { email, perfil } });
  revalidatePath("/configuracoes/usuarios");
  aviso("/configuracoes/usuarios", "ok", "Usuário criado.");
}

export async function atualizarUsuario(formData: FormData) {
  await exigirAdmin();
  const admin = criarClienteAdmin();
  const id = String(formData.get("id") || "");
  await admin.from("profiles").update({
    perfil: String(formData.get("perfil") || "colaborador"),
    ativo: formData.get("ativo") === "on",
    nome: String(formData.get("nome") || ""),
  }).eq("id", id);
  revalidatePath("/configuracoes/usuarios");
}
