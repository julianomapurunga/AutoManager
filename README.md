# AutoManager — SaaS de Controle de Pátio de Veículos

AutoManager é um SaaS multi-tenant para gestão de estoque e controle financeiro de pátios de veículos. Cada loja se cadastra, tem seus próprios usuários e seus dados ficam totalmente isolados das demais.

## Arquitetura SaaS

- **Multi-tenant**: toda tabela do banco é vinculada a uma `organization` (loja). Todas as consultas do servidor são escopadas pela organização do usuário autenticado.
- **Autenticação**: [Supabase Auth](https://supabase.com/auth) (login por e-mail e senha). O servidor valida o JWT do Supabase em cada requisição.
- **Planos**: Teste Grátis (7 dias), Básico, Avançado e Profissional, com limites de veículos e usuários (`shared/models/tenancy.ts`). Estrutura de billing pronta para Stripe (`server/routes/billing.ts`).
- **Cadastro público**: qualquer loja pode se cadastrar pela tela "Criar conta da loja"; quem cadastra vira o Administrador e pode criar os demais usuários da equipe.

## Funcionalidades

### Gestão de Estoque
- Cadastro completo de veículos (placa, marca, modelo, cor, ano, quilometragem) com galeria de fotos.
- Dual pricing (preço de aquisição interno e preço anunciado) e workflow de status (Disponível, Vendido, Em Manutenção, Aguardando Preparação, Reservado).

### Gestão Financeira e Vendas
- Registro de vendas com comprador, veículo de troca e comissão de intermediários.
- Controle de despesas por veículo e despesas operacionais da loja, com cálculo automático de lucro.

### Inteligência e Relatórios
- Integração com a Tabela FIPE (preços de mercado, histórico de 5 anos, preenchimento automático).
- Dashboard com faturamento, despesas e estatísticas de estoque; relatório financeiro mensal.

### Segurança e Auditoria
- Quatro perfis por loja: Administrador, Gerente, Vendedor e Financeiro.
- Log de auditoria com o usuário responsável por cada ação.
- Isolamento total de dados entre lojas.

## Tecnologias

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn/UI, Wouter, TanStack Query, @supabase/supabase-js.
- **Backend**: Express.js, TypeScript, validação de JWT com `jose`.
- **Banco de Dados**: PostgreSQL (Supabase) com Drizzle ORM.
- **Autenticação**: Supabase Auth.

## Como rodar com o Supabase

### 1. Crie o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto (guarde a senha do banco).
2. No painel, vá em **Settings > API** e anote:
   - **Project URL** (ex.: `https://xxxx.supabase.co`)
   - **anon/publishable key** (pública, vai no frontend)
   - **service_role key** (secreta, só no servidor)
3. Clique em **Connect** (topo do painel) e copie a **connection string** do pooler (substitua `[YOUR-PASSWORD]` pela senha do banco).

### 2. Configure o ambiente
```bash
cp .env.example .env
# edite o .env com os valores do seu projeto Supabase
```

### 3. Instale e crie as tabelas
```bash
npm install
npm run db:push   # cria as tabelas no Postgres do Supabase via Drizzle
```

### 4. Desative a confirmação de e-mail (recomendado para começar)
No painel do Supabase: **Authentication > Sign In / Providers > Email** e desative **"Confirm email"** — o servidor já cria os usuários como confirmados, mas isso evita conflitos em fluxos futuros.

### 5. Rode o projeto
```bash
npm run dev
# abra http://localhost:5000 e cadastre a primeira loja pela interface
```

Para criar uma loja via terminal (opcional):
```bash
TENANT_NAME="Minha Loja" ADMIN_EMAIL=admin@loja.com ADMIN_PASSWORD=suasenha npm run create-tenant
```

## Build de produção

```bash
npm run build   # gera dist/ (client + server bundle)
npm start       # NODE_ENV=production node dist/index.cjs
```

Funciona em qualquer host Node.js (Railway, Render, Fly.io, VPS...). Configure as mesmas variáveis do `.env` no ambiente do host. As fotos dos veículos são salvas no disco local (`uploads/`) — em produção use um host com disco persistente ou migre para o Supabase Storage.

## Ativando cobrança (Stripe)

A estrutura está pronta em `server/routes/billing.ts`:
1. `npm install stripe` e crie os produtos/preços no painel do Stripe.
2. Preencha `stripePriceId` em `PLANS` (`shared/models/tenancy.ts`).
3. Implemente o checkout e o webhook seguindo os comentários do arquivo.

---
Desenvolvido por Juliano Mapurunga.
