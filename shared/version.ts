export const APP_VERSION = "1.0.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
