# EMPMED Propostas — Progresso

Checklist da ordem de construção. Itens marcados somente depois de implementados e com `npm run build`, `npm run lint` e `npx vitest run` sem erros.

## Decisões de implementação

- Next.js 15 (App Router) + React 19 + Tailwind 3 + componentes no padrão shadcn/ui.
- Rotas públicas (`/f/[token]`, `/p/[token]`, PDF) usam o service role apenas no servidor, depois de validar o hash SHA-256 do token. A chave nunca vai ao client.
- Alíquotas, faixas, presunções, ISS, honorário padrão e limiares de alerta ficam em tabelas editáveis. O código só aplica as fórmulas. Seeds tributários estão marcados como **VALIDAR** (exemplo, não tabela oficial vigente).
- Limiares citados nas regras de alerta (ocupação 50%/70% e parcelas 15% da receita) foram para `parametros_diagnostico`, para o escritório ajustar sem deploy.
- Atendimentos previstos na projeção não ultrapassam a capacidade física da agenda. O teto saudável é `capacidade × ocupação máxima`.
- A rampa aplica o crescimento mensal na virada dos meses 2 até `meses_rampa` (inclusive).
- O regime usado nos indicadores é o escolhido pelo contador; a sugestão inicial é o de menor carga. A escolha final não é automática.
- Pró-labore para o fator R começa em zero e precisa ser confirmado na tela de premissas (não há percentual inventado sobre a retirada).
- Despesas dedutíveis do carnê-leão começam com aluguel + gastos do espaço e são editáveis pelo contador.
- Textos de escopo e pagamento da proposta são rascunhos editáveis, gravados em cada proposta.
- PDF: Puppeteer abre a página de impressão com assinatura HMAC de curta duração. Se a função estourar tempo ou tamanho na Vercel, usar Browserless (documentado no README). Sem `PDF_SIGNING_SECRET`, o segredo cai para a service role.
- E-mail via Resend fica desligado quando `RESEND_API_KEY` ou `EMAIL_FROM` não existe; WhatsApp e copiar link continuam disponíveis.
- Rate limit público é em memória (melhor esforço por instância).
- Reenviar o formulário ou a proposta gera um token novo. O link anterior deixa de funcionar, porque o texto puro não é guardado.
- Formulários de configuração e a exclusão de cliente redirecionam com `?erro` ou `?ok`, para caber na ação de formulário do Next.js e ainda mostrar o aviso.
- O mês do dashboard usa o calendário de `America/Sao_Paulo`.
- O nome do template no banco é “Planejamento do Seu Novo Espaço” e a versão fica na coluna `versao` (1).
- Recusa da proposta não muda o funil para perdido, para permitir outro envio. Aceite marca o funil como fechado.
- Reabrir um formulário já enviado limpa `submitted_at` e volta o funil para diagnóstico enviado.
- O diagnóstico é recalculado no servidor ao salvar. O resultado enviado pelo navegador não é gravado.
- Desconto do item é valor em reais, limitado ao bruto da linha.
- Premissas de parâmetro do escritório (semanas no mês, ISS de tabela) não entram no percentual de estimativas. “Não sei” numérico usa o padrão e fica como estimado até o contador confirmar.
- A atividade tributária, o município, o ISS e o regime adotado precisam de confirmação para marcar o diagnóstico como revisado.
- A mensalidade de uma proposta nova começa no honorário que o cliente informou no formulário. O preço de tabela do catálogo não substitui esse valor. Serviços avulsos continuam na tabela.
- A proposta tem dois downloads. “Baixar proposta simples” sai com pdf-lib, sem Chrome, e é o arquivo para o cliente. “Baixar diagnóstico completo” abre o Chrome e inclui os gráficos.
- No celular, a proposta pública mostra a versão curta. O diagnóstico completo só carrega se a pessoa pedir.
- Listas do painel têm botão Abrir no celular e no computador. O envio do formulário fica explicado na ficha do cliente: gerar link, WhatsApp e respostas em Envios.
- O tema do painel e dos PDFs usa azul-marinho, azul e âmbar. A migration `20260924120700_tema.sql` atualiza um escritório que ainda esteja no cinza ou no verde antigo.

## 1. Base

- [x] Supabase client/server e middleware de autenticação
- [x] Login por e-mail e senha (sem cadastro público)
- [x] Layout do painel com menu lateral
- [x] CRUD de Clientes (busca, filtros, CPF/CNPJ, WhatsApp)
- [x] Configurações do escritório (dados, logo, cores)
- [x] Build, lint e testes do módulo

## 2. Formulário

- [x] Seed do template "Planejamento do Seu Novo Espaço — v1"
- [x] Renderizador dinâmico (todos os tipos, condicionais, tabela repetível)
- [x] Envio com token de 32 bytes (somente hash, validade 30 dias)
- [x] WhatsApp, e-mail (Resend) e copiar link
- [x] Rota pública `/f/[token]` (LGPD, seções, autosave, rate limit)
- [x] Build, lint e testes do módulo

## 3. Painel de respostas

- [x] Lista de envios com status, datas e progresso
- [x] Respostas por seção (obrigatórias vazias e "Não sei")
- [x] Reenviar, prorrogar, cancelar e reabrir
- [x] Exportação CSV
- [x] Build, lint e testes do módulo

## 4. Diagnóstico

- [x] Tabelas e seeds de parâmetros
- [x] Motor em `/lib/diagnostico` com testes Vitest (caso fixo calculado à mão)
- [x] Tela de premissas com recálculo em tempo real e gráficos
- [x] Alertas automáticos
- [x] Configurações de parâmetros tributários e premissas padrão
- [x] Build, lint e testes do módulo

## 5. Proposta e PDF

- [x] CRUD de Serviços e mapa prioridade → serviço
- [x] Nova proposta a partir do diagnóstico revisado
- [x] Itens, desconto, totais e numeração AAAA/0001
- [x] Relatório HTML e geração de PDF no Storage
- [x] Envio da proposta por WhatsApp, e-mail e link
- [x] Build, lint e testes do módulo

## 6. Aceite online e dashboard

- [x] `/p/[token]` visualizar, aceitar ou recusar
- [x] Expiração automática pela validade
- [x] Dashboard (funil, taxas, valor mensal)
- [x] Build, lint e testes do módulo

## 7. Finalização

- [x] Seed de demonstração (cliente, formulário, diagnóstico, proposta)
- [x] README (instalação, migrations, testes, Vercel, Browserless)
- [x] Relatório final
- [x] Build, lint e testes finais
