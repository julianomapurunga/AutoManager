export const APP_VERSION = "0.4.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.4.0",
    date: "2026-07-30",
    title: "Rodapé institucional e páginas legais",
    changes: [
      "Novo rodapé em todas as telas com links para Termos de Uso e Política de Privacidade e os dados da empresa",
      "Novas páginas de Termos de Uso e Política de Privacidade",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-07-07",
    title: "Correções de auditoria: cálculos, fluxo, segurança e performance",
    changes: [
      "Receita Total e Lucro Líquido corrigidos (antes somavam só 2 meses); comissões de intermediários agora entram nos custos",
      "Bloqueio de venda dupla e validação de preço de venda",
      "Vendedor agora consegue cadastrar Cliente durante a venda",
      "Veículo de troca respeita o limite do plano e valida placa duplicada",
      "Exclusões de pessoas/intermediários vinculados retornam mensagem clara; log de auditoria só registra exclusões concluídas",
      "Rate limiting no cadastro e no catálogo público; headers de segurança; validação de conteúdo real das imagens (magic bytes)",
      "Validação de CPF por dígitos verificadores em todos os cadastros",
      "Dashboard ~3x mais rápido (queries em paralelo); índices no banco; cache em fotos e catálogo",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-07",
    title: "Catálogo público e novos planos",
    changes: [
      "Novo plano Avançado (R$ 179/mês): 150 veículos, 10 usuários e integração FIPE",
      "Integração FIPE agora disponível a partir do plano Avançado",
      "Catálogo público de veículos (plano Profissional): página /loja/sua-loja com fotos, preços e contato via WhatsApp",
      "Configurações do catálogo no painel: endereço personalizado, descrição e WhatsApp",
      "Nova landing page comercial com planos, preços e FAQ",
      "Plano Profissional atualizado para R$ 399/mês",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-07",
    title: "Transformação em SaaS multi-tenant",
    changes: [
      "Sistema transformado em SaaS multi-tenant: cada loja tem seus próprios dados isolados",
      "Cadastro público de lojas com 14 dias de teste grátis",
      "Autenticação migrada para Supabase Auth (login por e-mail)",
      "Estrutura de planos (Teste, Básico, Profissional) com limites de veículos e usuários",
      "Billing preparado para integração com Stripe",
      "Removida toda a estrutura do Replit (plugins, integrações e configs)",
      "Log de auditoria agora registra o usuário responsável por cada ação",
      "Correção do arquivo de changelog corrompido",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-03-04",
    title: "Automação para controle de versão",
    changes: [
      "Add admin script, dotenv and session checks",
      "Ajustes no env e package-lock",
      "Controle de versionamento e changelog",
      "Roles, audit log, permissions page, landing page update, hooks fix",
      "Adicionado README.md completo",
      "Nova landing page, remoção de cadastro público e melhorias de navegação",
      "Intermediários, comissões, veículos de troca, máscaras de moeda e melhorias gerais",
      "Página de perfil do usuário, gráfico de histórico FIPE, despesas separadas",
      "Badges coloridos de status de veículo",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-13",
    title: "Lançamento Oficial",
    changes: [
      "Sistema de controle de pátio de veículos completo",
      "Cadastro de veículos com fotos, condição e quilometragem",
      "Preço de aquisição (interno) e preço anunciado (público)",
      "Gestão de pessoas: proprietários, clientes e intermediários",
      "Fluxo de venda com comprador, veículo de troca e comissão de intermediário",
      "Controle de despesas por veículo e despesas operacionais da loja",
      "Dashboard com resumo financeiro e estatísticas de estoque",
      "Relatórios financeiros mensais (receita, custos, lucro)",
      "Consulta à Tabela FIPE com histórico de preços e gráficos",
      "Preenchimento automático de dados via FIPE no cadastro de veículos",
      "Sistema de login seguro com sessões criptografadas",
      "Quatro perfis de acesso: Administrador, Gerente, Vendedor e Financeiro",
      "Matriz de permissões com controle granular por módulo",
      "Log de auditoria com rastreabilidade de todas as ações",
      "Perfil de usuário com foto e edição de dados pessoais",
      "Landing page profissional com apresentação do sistema",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-02-09",
    title: "Melhorias de Perfil e FIPE",
    changes: [
      "Página de perfil do usuário com upload de foto",
      "Histórico de preços FIPE com gráfico de linha e tabela mensal",
      "Separação de despesas de veículos e despesas da loja no dashboard",
      "Foto do perfil exibida no menu lateral",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-02-06",
    title: "Consulta FIPE e Galeria de Imagens",
    changes: [
      "Página dedicada de consulta FIPE com seleção em cascata",
      "Seção FIPE no formulário de veículo com preenchimento automático",
      "Campos fipeCode e fipePrice salvos no cadastro do veículo",
      "Upload de múltiplas imagens por veículo com galeria e visualização em tela cheia",
      "Ano separado em fabricação e modelo (ex: 2024/2025)",
      "Máscara de moeda R$ nos campos de preço",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-02-06",
    title: "Autenticação e Permissões",
    changes: [
      "Sistema de autenticação com login e senha (bcrypt + sessões)",
      "Perfis de acesso: Administrador e Vendedor",
      "Página de configurações para gestão de usuários (admin)",
      "Cadastro de novos usuários pelo administrador",
      "Busca de pessoa por CPF com cadastro rápido via dialog",
      "Proprietário do veículo agora é opcional",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-02-06",
    title: "Dashboard e Financeiro",
    changes: [
      "Dashboard com cards de veículos disponíveis e estatísticas mensais",
      "Página de relatório financeiro com receita, despesas e lucro",
      "Despesas da loja com 11 categorias (Aluguel, Energia, Salários, etc.)",
      "Fluxo de venda: marcar como vendido com preço, data e comprador",
      "Pesquisa de veículos por placa, modelo, marca e cor",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-02-06",
    title: "Versão Inicial",
    changes: [
      "Cadastro básico de veículos (placa, marca, modelo, cor, ano, preço)",
      "Cadastro de pessoas (proprietários e clientes)",
      "Registro de despesas por veículo",
      "Landing page para usuários não autenticados",
    ],
  },
];
