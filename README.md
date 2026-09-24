# EMPMED Propostas

Sistema interno da EMPMED Assessoria Contábil (Mogi Guaçu/SP) para cadastrar clientes da saúde, enviar o formulário “Planejamento do Seu Novo Espaço”, revisar o diagnóstico financeiro e tributário e entregar a proposta com aceite online.

A interface está em português. Valores usam `R$ 1.234,56`, datas `DD/MM/AAAA` e o fuso `America/Sao_Paulo`.

## O que o sistema faz

1. A equipe entra com e-mail e senha. Não há cadastro público.
2. Cadastra o cliente e gera um link do formulário (token aleatório de 32 bytes; o banco guarda só o SHA-256).
3. O cliente preenche no celular, sem login, com aceite da LGPD e salvamento automático.
4. A equipe vê as respostas, gera o diagnóstico e revisa as premissas.
5. Monta a proposta. Há dois PDFs: a proposta simples, para o cliente, e o diagnóstico completo, com gráficos.
6. O cliente abre `/p/[token]`, vê a proposta curta no celular, pode abrir o diagnóstico e aceita ou recusa.

Alíquotas, ISS, honorários padrão e limiares de alerta ficam em Configurações. O código só aplica as fórmulas. Os seeds tributários estão marcados como **EXEMPLO — VALIDAR**.

## Requisitos

- Node.js 20 ou superior
- Um projeto no [Supabase](https://supabase.com) (Postgres, Auth e Storage)
- Google Chrome, se for gerar PDF na máquina local

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local`:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima. A RLS impede acesso direto às tabelas |
| `SUPABASE_SERVICE_ROLE_KEY` | Só no servidor. Formulário público, aceite, PDF e criação de usuários |
| `NEXT_PUBLIC_APP_URL` | URL pública dos links (`http://localhost:3000` no desenvolvimento) |
| `RESEND_API_KEY` e `EMAIL_FROM` | Opcionais. Sem eles, o e-mail fica desligado; WhatsApp e copiar link continuam |
| `PDF_SIGNING_SECRET` | Segredo HMAC da página de impressão. Se vazio, usa a service role |
| `CHROME_PATH` | Caminho do Chrome local, por exemplo `/usr/bin/google-chrome` |
| `BROWSERLESS_WS_ENDPOINT` | Opcional. WebSocket de um Chrome remoto |

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Banco de dados

As migrations estão em `supabase/migrations`, nesta ordem:

1. `20260924120000_base.sql` — perfis, clientes, escritório, auditoria, RLS
2. `20260924120100_formularios.sql` — templates, envios, respostas e buckets
3. `20260924120200_diagnostico.sql` — parâmetros e diagnósticos
4. `20260924120300_propostas.sql` — serviços, propostas e numeração `AAAA/0001`
5. `20260924120400_template_formulario.sql` — template “Planejamento do Seu Novo Espaço”, versão 1
6. `20260924120500_demo.sql` — cliente fictício Helena Vasconcelos
7. `20260924120600_honorario_demo.sql` — se a demonstração antiga já foi aplicada, ajusta a mensalidade para os R$ 200 informados pela cliente
8. `20260924120700_tema.sql` — atualiza as cores do escritório para azul-marinho, azul e âmbar, se ainda estiverem no tema antigo

No SQL Editor do Supabase, execute cada arquivo na ordem. Com a CLI:

```bash
supabase link --project-ref SEU_PROJETO
supabase db push
```

Todas as tabelas da aplicação têm RLS. O papel `anon` não tem grant. As rotas públicas passam por Route Handlers que conferem o hash do token com a service role.

O primeiro usuário nasce como colaborador. Crie-o em Authentication → Users (e-mail confirmado) e promova:

```sql
update public.profiles
set perfil = 'admin'
where email = 'seu-email@empmed.com.br';
```

Depois disso, a administração cria os demais acessos em Configurações → Usuários. Não existe tela de cadastro aberto.

## Demonstração

Depois das migrations, estes links funcionam sem login (troque o domínio se `NEXT_PUBLIC_APP_URL` for outro):

- Formulário já respondido: `/f/empmed-demo-formulario-helena-vasconcelos-v1`
- Proposta para aceitar ou recusar: `/p/empmed-demo-proposta-helena-vasconcelos-v1`

A proposta de demonstração é a `2026/0001`. Em um banco que já tenha essa numeração, ajuste o `numero` em `20260924120500_demo.sql` antes de aplicar. Os tokens acima são de demonstração; um envio novo gera outro token e o link anterior deixa de valer, porque o texto puro não é armazenado.

Para refazer o JSON do diagnóstico de demonstração com o motor atual:

```bash
npx vite-node --config vitest.config.ts scripts/gerar-seed-demo.ts
```

## Testes

```bash
npm run lint
npx vitest run
npm run build
```

O Vitest cobre o motor de diagnóstico (caso calculado à mão, com mensalidade, pacote, grupo e campo “Não sei”) e as regras do formulário (condicionais, CPF/CNPJ, token e limite por IP).

## Fluxo para testar com a equipe

1. Entre no painel.
2. Em Clientes, abra Helena Vasconcelos e confira envio, diagnóstico e proposta. Ou cadastre outro cliente.
3. Em Enviar formulário, copie o link, abra no celular (ou em 375 px) e preencha. O aceite da LGPD é obrigatório. O rascunho grava sozinho.
4. No envio respondido, use Gerar diagnóstico. Confirme os campos estimados, a atividade, o município e o regime. Marque como revisado.
5. Em Nova proposta, ajuste itens e descontos. Os serviços iniciais vêm das prioridades do formulário e do catálogo, que é editável em Serviços.
6. Na proposta, use “Baixar proposta simples” para mandar ao cliente. “Baixar diagnóstico completo” traz os gráficos e só sai com o diagnóstico revisado.
7. Envie a proposta. O cliente aceita ou recusa em `/p/[token]`. No celular ele vê a versão curta; o diagnóstico completo fica atrás de um botão.

O dashboard mostra o funil, a taxa de resposta, a conversão e o valor mensal das propostas abertas e das aceitas no mês (fuso de São Paulo).

## Velocidade e domínio

`npm run dev` recompila cada tela na hora e parece lento. No domínio, use `npm run build` e `npm run start`, ou a Vercel. A proposta simples não abre o Chrome. O diagnóstico completo abre, então continua mais demorado.

O painel e o formulário público se ajustam à largura do celular. Listas viram cartões com o botão Abrir. Campos de texto usam 16px para o iPhone não dar zoom ao focar.

## PDF na Vercel

A proposta simples é gerada com `pdf-lib`, sem navegador. O diagnóstico completo usa `puppeteer-core`. Em produção, sem `CHROME_PATH`, o servidor sobe o `@sparticuz/chromium`. A rota espera `window.__RELATORIO_PRONTO__` antes de imprimir e grava o arquivo no bucket privado `propostas`.

Se a função estourar o tamanho ou o tempo da Vercel, aponte `BROWSERLESS_WS_ENDPOINT` para um Chrome externo (por exemplo Browserless, `wss://...`). O mesmo código conecta nesse endpoint e não depende do binário dentro da função.

No deploy, configure as variáveis de `.env.example` no projeto da Vercel e use `npm run build` como comando de build. `NEXT_PUBLIC_APP_URL` precisa ser a URL pública, porque os links de formulário, proposta e impressão saem dela.

## Decisões registradas

O arquivo `PROGRESSO.md` lista as decisões de cálculo, token, e-mail e PDF.
