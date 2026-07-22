import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle, Search, LayoutDashboard, Car, DollarSign, Users,
  Receipt, BarChart3, Globe, Settings, UserCog, LifeBuoy, ArrowRight,
  Ticket, MailCheck, MailWarning,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SupportTicketItem {
  id: number;
  ticketNumber: string;
  category: string;
  message: string;
  emailSent: boolean;
  createdAt: string | null;
  openedBy: string;
}

/** Lista dos chamados de suporte já abertos pela loja. */
function TicketList() {
  const { data: tickets, isLoading } = useQuery<SupportTicketItem[]>({
    queryKey: ["/api/support/tickets"],
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!tickets || tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhum chamado aberto ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((t) => (
        <div
          key={t.id}
          className="flex items-start justify-between gap-4 p-3.5 rounded-md border border-border/60 flex-wrap"
          data-testid={`row-ticket-${t.id}`}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-primary">#{t.ticketNumber}</span>
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{t.category}</Badge>
              {t.emailSent ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <MailCheck className="w-3.5 h-3.5" /> Enviado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <MailWarning className="w-3.5 h-3.5" /> Envio manual
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{t.message}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground shrink-0">
            <p>{t.openedBy}</p>
            <p>{t.createdAt ? new Date(t.createdAt).toLocaleString("pt-BR") : "—"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface HelpTopic {
  q: string;
  a: React.ReactNode;
}

interface HelpModule {
  id: string;
  icon: typeof Car;
  title: string;
  description: string;
  badge?: string;
  topics: HelpTopic[];
}

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
      {n}
    </span>
    <span>{children}</span>
  </li>
);

const Steps = ({ children }: { children: React.ReactNode }) => (
  <ol className="space-y-2.5 mt-1">{children}</ol>
);

const modules: HelpModule[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Visão geral do estoque e das finanças da loja.",
    topics: [
      {
        q: "O que o Dashboard mostra?",
        a: (
          <p>
            O Dashboard é a primeira tela após o login. Ele mostra os veículos disponíveis no
            pátio, o número de vendas do mês, a receita, o lucro das vendas e o comparativo
            entre o mês atual e o anterior. Os números são atualizados automaticamente conforme
            você registra veículos, vendas e despesas.
          </p>
        ),
      },
      {
        q: "Qual a diferença entre Receita, Lucro das Vendas e Lucro Líquido?",
        a: (
          <div className="space-y-2">
            <p><strong>Receita</strong> é a soma dos valores de venda dos veículos vendidos.</p>
            <p><strong>Lucro das Vendas</strong> é a receita menos o valor de compra dos veículos (a margem). Ex.: comprou por R$ 75.000 e vendeu por R$ 77.000 → lucro da venda de R$ 2.000.</p>
            <p><strong>Lucro Líquido</strong> é o lucro das vendas menos todas as despesas: manutenção dos veículos, despesas da loja (aluguel, energia...) e comissões de intermediários.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "veiculos",
    icon: Car,
    title: "Veículos",
    description: "Cadastro, fotos, status e ciclo de vida do estoque.",
    topics: [
      {
        q: "Como cadastrar um veículo?",
        a: (
          <Steps>
            <Step n={1}>No menu lateral, clique em <strong>Veículos</strong> e depois em <strong>Novo Veículo</strong>.</Step>
            <Step n={2}>Se seu plano tem FIPE, use <strong>Buscar na Tabela FIPE</strong> no topo do formulário: escolha marca, modelo e ano, e os dados técnicos são preenchidos automaticamente.</Step>
            <Step n={3}>Preencha a placa, cor, quilometragem e condição (Novo, Semi-novo ou Usado).</Step>
            <Step n={4}>Informe o <strong>Valor de Compra</strong> (quanto a loja pagou — essencial para o cálculo de lucro) e o <strong>Preço Anunciado</strong> (o que o cliente vê).</Step>
            <Step n={5}>Salve. O veículo entra com status "Aguardando Preparação".</Step>
          </Steps>
        ),
      },
      {
        q: "O que significa cada status?",
        a: (
          <div className="space-y-2">
            <p><Badge variant="secondary">Aguardando Preparação</Badge> — acabou de entrar, ainda em revisão/estética.</p>
            <p><Badge variant="secondary">Disponível</Badge> — pronto para venda. É o único status que aparece no catálogo público.</p>
            <p><Badge variant="secondary">Em Manutenção</Badge> — temporariamente fora de oferta.</p>
            <p><Badge variant="secondary">Reservado</Badge> — cliente sinalizou compra, aguardando conclusão.</p>
            <p><Badge variant="secondary">Vendido</Badge> — venda concluída (só é definido pelo fluxo de venda, não manualmente).</p>
          </div>
        ),
      },
      {
        q: "Como adicionar fotos ao veículo?",
        a: (
          <p>
            Abra o veículo na lista e use a seção de imagens para enviar até 20 fotos (jpg, png,
            gif ou webp, máx. 10 MB cada). A primeira foto vira a capa. As mesmas fotos são
            usadas no catálogo público. Clique numa foto para ver em tela cheia.
          </p>
        ),
      },
      {
        q: "Por que o Valor de Compra é tão importante?",
        a: (
          <p>
            É a base de todo o cálculo de lucro do sistema. Sem ele, o veículo aparece com margem
            incompleta nos relatórios (marcado com "—" na tabela de vendidos). Somente
            Administradores e Gerentes visualizam esse valor — vendedores veem apenas o preço anunciado.
          </p>
        ),
      },
    ],
  },
  {
    id: "vendas",
    icon: DollarSign,
    title: "Vendas",
    description: "Registro de venda, troca e comissões.",
    topics: [
      {
        q: "Como registrar uma venda?",
        a: (
          <Steps>
            <Step n={1}>Na lista de veículos, localize o veículo e clique em <strong>Vender</strong>.</Step>
            <Step n={2}>Informe o valor final da venda e a data.</Step>
            <Step n={3}>Identifique o comprador pelo CPF — se ainda não existir, o cadastro rápido abre na hora.</Step>
            <Step n={4}>Se houver <strong>veículo de troca</strong>, marque a opção e preencha os dados dele (pode usar a FIPE) — ele entra automaticamente no estoque como "Aguardando Preparação".</Step>
            <Step n={5}>Se houver <strong>intermediário</strong> (corretor), selecione-o e informe a comissão.</Step>
            <Step n={6}>Confirme. O veículo muda para "Vendido" e os valores entram no Financeiro.</Step>
          </Steps>
        ),
      },
      {
        q: "Vendi errado, dá para corrigir?",
        a: (
          <p>
            Um veículo vendido não pode ser vendido de novo (o sistema bloqueia). Para corrigir
            dados da venda, um Administrador ou Gerente pode editar o veículo. Em caso de
            desistência da compra, edite o status de volta para "Disponível".
          </p>
        ),
      },
      {
        q: "Como funcionam as comissões?",
        a: (
          <p>
            Cadastre os intermediários (corretores) em <strong>Configurações → Intermediários</strong>.
            Na venda, selecione o intermediário e o valor da comissão. A comissão é descontada
            automaticamente do lucro líquido nos relatórios e aparece no resumo financeiro do veículo.
          </p>
        ),
      },
    ],
  },
  {
    id: "pessoas",
    icon: Users,
    title: "Pessoas",
    description: "Proprietários e clientes da loja.",
    topics: [
      {
        q: "Qual a diferença entre Proprietário e Cliente?",
        a: (
          <p>
            <strong>Proprietário</strong> é quem deixou o veículo no pátio (consignação) — cadastro
            restrito a Gerentes e Administradores. <strong>Cliente</strong> é quem compra —
            qualquer usuário pode cadastrar, inclusive durante a venda.
          </p>
        ),
      },
      {
        q: "Como funciona a busca por CPF?",
        a: (
          <p>
            Nos formulários de veículo e de venda, digite o CPF: o sistema busca a pessoa
            automaticamente. Se não encontrar, abre um cadastro rápido sem sair da tela.
          </p>
        ),
      },
      {
        q: "Não consigo excluir uma pessoa. Por quê?",
        a: (
          <p>
            Pessoas vinculadas a veículos (como dono ou comprador) não podem ser excluídas, para
            preservar o histórico. Exclua ou reatribua os veículos primeiro. Apenas Administradores excluem cadastros.
          </p>
        ),
      },
    ],
  },
  {
    id: "despesas",
    icon: Receipt,
    title: "Despesas",
    description: "Custos por veículo e despesas operacionais da loja.",
    topics: [
      {
        q: "Despesa de veículo × despesa da loja",
        a: (
          <p>
            <strong>Despesas de veículo</strong> (mecânica, estética, documentação) são lançadas
            dentro da página do próprio veículo e reduzem o lucro daquele carro.
            <strong> Despesas da loja</strong> (aluguel, energia, salários — 11 categorias) ficam
            no menu "Despesas da Loja" e afetam o resultado geral do mês.
          </p>
        ),
      },
      {
        q: "Como lançar uma despesa de veículo?",
        a: (
          <Steps>
            <Step n={1}>Abra o veículo na lista.</Step>
            <Step n={2}>Na seção de despesas, clique em adicionar e informe a descrição e o valor.</Step>
            <Step n={3}>A despesa entra no resumo financeiro do veículo e nos relatórios mensais.</Step>
          </Steps>
        ),
      },
    ],
  },
  {
    id: "financeiro",
    icon: BarChart3,
    title: "Financeiro",
    description: "Relatórios de receita, custos e lucro.",
    topics: [
      {
        q: "Como ler o relatório financeiro?",
        a: (
          <div className="space-y-2">
            <p>O relatório segue uma cadeia simples, do topo para o resultado final:</p>
            <p className="font-mono text-sm bg-muted/50 p-3 rounded-md">
              Receita (vendas)<br />
              − Custo de aquisição (compra dos carros)<br />
              = Lucro das Vendas<br />
              − Despesas (veículos + loja + comissões)<br />
              = <strong>Lucro Líquido</strong>
            </p>
            <p>O comparativo mensal mostra essa mesma cadeia para o mês atual e o anterior, e a tabela lista cada veículo vendido com compra, venda e lucro individual.</p>
          </div>
        ),
      },
      {
        q: "Quem pode ver o Financeiro?",
        a: (
          <p>
            Administradores, Gerentes e usuários com perfil Financeiro. Vendedores não têm acesso
            a valores de compra, despesas nem relatórios.
          </p>
        ),
      },
    ],
  },
  {
    id: "fipe",
    icon: Search,
    title: "Tabela FIPE",
    description: "Preços de mercado e preenchimento automático.",
    badge: "Avançado+",
    topics: [
      {
        q: "Para que serve a consulta FIPE?",
        a: (
          <p>
            A FIPE é a referência nacional de preços de veículos. Use-a para precificar: consulte
            o valor de mercado, veja o histórico dos últimos 5 anos em gráfico e compare com o
            seu preço anunciado. Disponível nos planos Avançado e Profissional.
          </p>
        ),
      },
      {
        q: "Como usar no cadastro de veículo?",
        a: (
          <Steps>
            <Step n={1}>No formulário do veículo, abra <strong>Buscar na Tabela FIPE</strong>.</Step>
            <Step n={2}>Escolha o tipo (carro, moto ou caminhão), marca, modelo e ano.</Step>
            <Step n={3}>Clique em <strong>Aplicar Dados</strong>: marca, modelo, ano, código e preço FIPE são preenchidos automaticamente.</Step>
          </Steps>
        ),
      },
    ],
  },
  {
    id: "catalogo",
    icon: Globe,
    title: "Catálogo Público",
    description: "Vitrine online da loja para clientes.",
    badge: "Profissional",
    topics: [
      {
        q: "Como publicar meu catálogo?",
        a: (
          <Steps>
            <Step n={1}>No menu, acesse <strong>Catálogo Público</strong> (Administrador ou Gerente).</Step>
            <Step n={2}>Defina o endereço da página (ex.: <span className="font-mono text-sm">/loja/auto-center-silva</span>).</Step>
            <Step n={3}>Preencha a descrição da loja e o WhatsApp de contato (opcional).</Step>
            <Step n={4}>Ative o interruptor de publicação e salve.</Step>
            <Step n={5}>Copie o link e divulgue nas redes sociais e no WhatsApp da loja.</Step>
          </Steps>
        ),
      },
      {
        q: "O que os clientes veem?",
        a: (
          <p>
            Apenas os veículos com status <strong>Disponível</strong>, com fotos, preço anunciado,
            ano, quilometragem e cor. Dados internos (valor de compra, placa, dono, observações)
            nunca aparecem. Cada veículo tem um botão "Tenho interesse" que abre o WhatsApp com
            mensagem pronta citando o carro.
          </p>
        ),
      },
      {
        q: "Vendi o carro, preciso tirar do catálogo?",
        a: (
          <p>
            Não — é automático. Quando o veículo muda de status (Vendido, Reservado etc.), ele sai
            do catálogo em até 1 minuto. Você também pode despublicar o catálogo inteiro a
            qualquer momento pelo interruptor.
          </p>
        ),
      },
    ],
  },
  {
    id: "equipe",
    icon: UserCog,
    title: "Equipe e Permissões",
    description: "Usuários, cargos e o que cada um pode fazer.",
    topics: [
      {
        q: "Como adicionar alguém da equipe?",
        a: (
          <Steps>
            <Step n={1}>Acesse <strong>Configurações</strong> (apenas Administrador).</Step>
            <Step n={2}>Clique em <strong>Novo Usuário</strong>.</Step>
            <Step n={3}>Preencha nome, e-mail, CPF, telefone, uma senha inicial e o cargo.</Step>
            <Step n={4}>Informe o e-mail e a senha à pessoa — ela poderá trocar a senha depois por "Esqueci minha senha".</Step>
          </Steps>
        ),
      },
      {
        q: "O que cada cargo pode fazer?",
        a: (
          <div className="space-y-2">
            <p><strong>Administrador</strong> — tudo, incluindo gestão de usuários, exclusões e log de atividades.</p>
            <p><strong>Gerente</strong> — cadastra/edita veículos, pessoas e intermediários; vê o financeiro e o catálogo; não gerencia usuários.</p>
            <p><strong>Financeiro</strong> — acessa relatórios, despesas e cadastros de pessoas; não edita veículos.</p>
            <p><strong>Vendedor</strong> — consulta o estoque, registra vendas e cadastra clientes; não vê valores de compra nem relatórios.</p>
            <p className="text-muted-foreground">A matriz completa está em Configurações → Permissões.</p>
          </div>
        ),
      },
      {
        q: "Esqueci minha senha, e agora?",
        a: (
          <p>
            Na tela de login, clique em <strong>"Esqueci minha senha"</strong> e informe seu
            e-mail. Você receberá um link (válido por 1 hora) para criar uma nova senha.
            Administradores também podem redefinir a senha de qualquer usuário em Configurações.
          </p>
        ),
      },
    ],
  },
  {
    id: "conta",
    icon: Settings,
    title: "Conta e Plano",
    description: "Assinatura, limites e dados da loja.",
    topics: [
      {
        q: "Como funcionam os limites do plano?",
        a: (
          <p>
            Cada plano tem um limite de veículos no estoque e de usuários. Ao atingir o limite, o
            sistema avisa e sugere upgrade — nada é apagado. Os recursos FIPE (Avançado+) e
            Catálogo Público (Profissional) também dependem do plano.
          </p>
        ),
      },
      {
        q: "O que acontece quando o teste grátis acaba?",
        a: (
          <p>
            O acesso é pausado até você assinar um plano, mas todos os dados ficam guardados —
            veículos, vendas, fotos e relatórios voltam exatamente como estavam.
          </p>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  const filtered = term
    ? modules
        .map((m) => ({
          ...m,
          topics: m.topics.filter(
            (t) =>
              t.q.toLowerCase().includes(term) ||
              m.title.toLowerCase().includes(term),
          ),
        }))
        .filter((m) => m.topics.length > 0)
    : modules;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-help-title">
          <HelpCircle className="w-7 h-7 text-primary" />
          Ajuda
        </h1>
        <p className="text-muted-foreground mt-1">
          Tutoriais rápidos de cada módulo do VEHIRO.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar na ajuda... (ex.: vender, fotos, comissão)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-help-search"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">
          Nenhum tópico encontrado para "{search}".
        </p>
      )}

      <div className="space-y-5">
        {filtered.map((module) => (
          <Card key={module.id} id={module.id} className="scroll-mt-20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="p-2 rounded-lg bg-primary/10">
                  <module.icon className="w-5 h-5 text-primary" />
                </span>
                {module.title}
                {module.badge && (
                  <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                    Plano {module.badge}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground ml-12">{module.description}</p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {module.topics.map((topic, i) => (
                  <AccordionItem key={topic.q} value={`${module.id}-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium" data-testid={`help-${module.id}-${i}`}>
                      {topic.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {topic.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suporte */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <span className="p-3 rounded-full bg-primary/10 shrink-0">
              <LifeBuoy className="w-6 h-6 text-primary" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold font-display">Não encontrou o que procurava?</h3>
              <p className="text-sm text-muted-foreground">
                Abra um chamado com a nossa equipe — respondemos no seu e-mail.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/support")} data-testid="button-open-support">
            Suporte
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Chamados já abertos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="p-2 rounded-lg bg-primary/10">
              <Ticket className="w-5 h-5 text-primary" />
            </span>
            Chamados abertos
          </CardTitle>
          <p className="text-sm text-muted-foreground ml-12">
            Histórico de solicitações de suporte da sua loja.
          </p>
        </CardHeader>
        <CardContent>
          <TicketList />
        </CardContent>
      </Card>
    </div>
  );
}
