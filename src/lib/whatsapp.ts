import { somenteDigitos } from "@/lib/cpf-cnpj";

export function linkWhatsapp(telefone: string, mensagem: string): string {
  let digits = somenteDigitos(telefone);
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemFormulario(nome: string, link: string): string {
  return `Olá, ${nome}! Aqui é da EMPMED Assessoria Contábil. Preparei um formulário curto (cerca de 5 a 8 minutos) para planejar o seu novo espaço: ${link}\nPode responder pelo celular. Se não souber algum valor, marque "Não sei".`;
}

export function mensagemProposta(nome: string, numero: string, link: string, validadeDias: number): string {
  return `Olá, ${nome}! A proposta EMPMED ${numero} está pronta para você ver e responder: ${link}\nEla vale por ${validadeDias} dias. Qualquer dúvida, é só responder por aqui.`;
}
