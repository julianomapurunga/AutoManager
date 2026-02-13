# AutoManager - Sistema de Controle de Pátio de Veículos

AutoManager é um sistema completo para gestão de estoque e controle financeiro de pátios de veículos. Desenvolvido para substituir planilhas físicas por uma solução moderna, segura e eficiente.

## 🚀 Funcionalidades

### 🚗 Gestão de Estoque
- **Cadastro Completo**: Registro detalhado de veículos incluindo placa, marca, modelo, cor, ano (fabricação/modelo) e quilometragem.
- **Condição do Veículo**: Classificação entre Novo, Semi-novo e Usado.
- **Galeria de Fotos**: Upload e gerenciamento de múltiplas imagens por veículo.
- **Dual Pricing**: Controle de preço de aquisição (interno) e preço anunciado (público).
- **Status de Preparação**: Workflow de status (Disponível, Vendido, Em Manutenção, Aguardando Preparação, Reservado).

### 💰 Gestão Financeira e Vendas
- **Vendas Detalhadas**: Registro de preço de venda, data, comprador e quilometragem no momento da venda.
- **Veículos de Troca**: Suporte a entrada de veículos como parte do pagamento com registro automático.
- **Comissões**: Gestão de intermediários (corretores) e cálculo automático de comissões.
- **Controle de Despesas**: Registro de gastos específicos por veículo (manutenção, estética) e despesas operacionais da loja.
- **Resumo de Lucro**: Cálculo automático de lucro por veículo descontando despesas e comissões.

### 📊 Inteligência e Relatórios
- **Integração FIPE**: Consulta automática de preços de mercado, histórico de valores e preenchimento automático de dados.
- **Dashboard**: Visão geral de vendas mensais, faturamento, despesas e estatísticas de estoque.
- **Relatório Financeiro**: Visão detalhada de receitas, custos e lucro líquido mensal.

### 👤 Segurança e Usuários
- **Níveis de Acesso**: Papéis de Administrador (acesso total) e Vendedor (acesso restrito).
- **Gestão de Pessoas**: Cadastro centralizado de Proprietários, Clientes e Intermediários.
- **Autenticação Segura**: Sistema de login protegido com sessões criptografadas.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn/UI, Wouter, TanStack Query.
- **Backend**: Express.js, TypeScript.
- **Banco de Dados**: PostgreSQL com Drizzle ORM.
- **Integrações**: API FIPE (Parallelum).

## 📦 Como Instalar e Rodar

1.  **Clone o repositório**:
    ```bash
    git clone https://github.com/julianomapurunga/AutoManager.git
    cd AutoManager
    ```

2.  **Instale as dependências**:
    ```bash
    npm install
    ```

3.  **Configure o Banco de Dados**:
    Certifique-se de ter um banco PostgreSQL e configure a variável de ambiente `DATABASE_URL`.

4.  **Execute as migrações**:
    ```bash
    npm run db:push
    ```

5.  **Inicie o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```

---
Desenvolvido por Juliano Mapurunga.
