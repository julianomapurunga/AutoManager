import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_VERSION } from "@shared/version";
import { PLANS, TRIAL_DAYS } from "@shared/models/tenancy";
import {
  Car, BarChart3, Users, Shield, ArrowRight, Wrench,
  DollarSign, Search, CheckCircle2, LogIn, Store,
  ClipboardList, Rocket, Globe, Infinity as InfinityIcon,
  TrendingUp, Gauge, Camera,
} from "lucide-react";

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister?: () => void;
}

// ─── Animações reutilizáveis ─────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] } },
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Conteúdo ────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Car,
    title: "Estoque sob controle",
    description: "Cadastre veículos com fotos, condição, quilometragem e status de preparação. Saiba exatamente o que está disponível, reservado ou em manutenção.",
  },
  {
    icon: DollarSign,
    title: "Lucro real por veículo",
    description: "Preço de aquisição, preço anunciado, despesas e comissões em um só lugar. Veja o lucro líquido de cada venda automaticamente.",
  },
  {
    icon: Search,
    title: "Tabela FIPE integrada",
    description: "Consulta automática de preços de mercado, histórico dos últimos 5 anos e preenchimento inteligente dos dados do veículo.",
  },
  {
    icon: BarChart3,
    title: "Dashboard financeiro",
    description: "Faturamento, despesas e estatísticas do estoque em tempo real, com relatório financeiro mensal de receitas, custos e lucro.",
  },
  {
    icon: Users,
    title: "Sua equipe, seus acessos",
    description: "Perfis de Administrador, Gerente, Vendedor e Financeiro com permissões separadas por módulo. Cada um vê só o que precisa.",
  },
  {
    icon: Shield,
    title: "Auditoria completa",
    description: "Toda ação importante fica registrada com o usuário responsável. Rastreabilidade total do que acontece na sua loja.",
  },
  {
    icon: Globe,
    title: "Catálogo público da loja",
    description: "Uma vitrine online com os veículos disponíveis, fotos e preços — com link próprio para divulgar e contato direto por WhatsApp. (Plano Profissional)",
  },
  {
    icon: Camera,
    title: "Galeria de fotos",
    description: "Múltiplas fotos por veículo, com galeria e visualização em tela cheia — as mesmas fotos alimentam o catálogo público.",
  },
];

const steps = [
  {
    icon: Store,
    title: "1. Cadastre sua loja",
    description: `Crie a conta em menos de 2 minutos e ganhe ${TRIAL_DAYS} dias grátis. Sem cartão de crédito.`,
  },
  {
    icon: ClipboardList,
    title: "2. Registre seus veículos",
    description: "Importe seu estoque com ajuda da FIPE: os dados técnicos são preenchidos automaticamente.",
  },
  {
    icon: Rocket,
    title: "3. Venda com controle",
    description: "Acompanhe vendas, trocas, comissões e lucro por veículo desde o primeiro dia.",
  },
];

const metrics = [
  { value: `${TRIAL_DAYS} dias`, label: "de teste grátis" },
  { value: "5 anos", label: "de histórico FIPE" },
  { value: "4 perfis", label: "de acesso por loja" },
  { value: "100%", label: "na nuvem, sem instalação" },
];

const faq = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: `Não. O teste de ${TRIAL_DAYS} dias é grátis e sem compromisso. Você só escolhe um plano se gostar.`,
  },
  {
    q: "Meus dados ficam separados de outras lojas?",
    a: "Sim. Cada loja tem seus dados totalmente isolados — usuários, veículos e finanças são exclusivos da sua conta.",
  },
  {
    q: "Quantas pessoas da minha equipe podem usar?",
    a: "Depende do plano: cada um inclui um número de usuários, com perfis e permissões separados por função (Administrador, Gerente, Vendedor e Financeiro).",
  },
  {
    q: "O que acontece quando o teste grátis termina?",
    a: "Seus dados ficam guardados e você escolhe um plano para continuar. Nada é apagado.",
  },
  {
    q: "Como funciona o catálogo público?",
    a: "No plano Profissional, sua loja ganha uma página com endereço próprio mostrando os veículos disponíveis, com fotos, preços e botão de WhatsApp em cada carro.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim, a interface é responsiva e funciona em qualquer navegador, no computador, tablet ou celular.",
  },
];

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// Mockup ilustrativo do dashboard (decorativo, puro CSS)
function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative max-w-3xl mx-auto mt-14"
      style={{ perspective: 1000 }}
      aria-hidden="true"
    >
      <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-3xl rounded-full" />
      <div className="relative rounded-xl border border-border/60 bg-card shadow-2xl overflow-hidden">
        {/* barra do navegador */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/40">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex-1 max-w-xs h-5 rounded-md bg-muted text-[10px] text-muted-foreground flex items-center px-2 truncate">
            vehiro.app — Dashboard
          </div>
        </div>
        {/* conteúdo fake */}
        <div className="p-4 md:p-6 grid grid-cols-3 gap-3 md:gap-4">
          {[
            { icon: Car, label: "Disponíveis", value: "23", color: "text-primary" },
            { icon: TrendingUp, label: "Vendas no mês", value: "8", color: "text-emerald-500" },
            { icon: Gauge, label: "Lucro do mês", value: "R$ 64,2 mil", color: "text-blue-500" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border/50 p-3 md:p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                {c.label}
              </div>
              <p className={`text-base md:text-2xl font-bold font-display ${c.color}`}>{c.value}</p>
            </div>
          ))}
          {/* gráfico fake */}
          <div className="col-span-3 rounded-lg border border-border/50 p-4 flex items-end gap-2 h-28 md:h-36">
            {[35, 55, 40, 70, 52, 85, 64, 92, 75, 100, 88, 96].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: 0.9 + i * 0.05, ease: "easeOut" }}
                className={`flex-1 rounded-t-sm ${i % 3 === 0 ? "bg-primary/80" : "bg-primary/30"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage({ onGoToLogin, onGoToRegister }: LandingPageProps) {
  const goToRegister = onGoToRegister ?? onGoToLogin;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLinks = [
    { id: "funcionalidades", label: "Funcionalidades" },
    { id: "como-funciona", label: "Como funciona" },
    { id: "precos", label: "Planos" },
    { id: "faq", label: "FAQ" },
  ];

  const pricing = [
    {
      key: "basico",
      name: PLANS.basico.name,
      price: formatPrice(PLANS.basico.priceMonthly),
      period: "/mês",
      description: "Para lojas menores que estão começando a se organizar.",
      features: [
        `Até ${PLANS.basico.maxVehicles} veículos no estoque`,
        `Até ${PLANS.basico.maxUsers} usuários`,
        "Dashboard e relatórios financeiros",
        "Vendas, despesas e lucro por veículo",
        "Log de auditoria",
      ],
      cta: "Começar com o Básico",
      highlighted: false,
    },
    {
      key: "avancado",
      name: PLANS.avancado.name,
      price: formatPrice(PLANS.avancado.priceMonthly),
      period: "/mês",
      description: "Para lojas em crescimento, com equipe e giro maiores.",
      features: [
        `Até ${PLANS.avancado.maxVehicles} veículos no estoque`,
        `Até ${PLANS.avancado.maxUsers} usuários`,
        "Tudo do plano Básico",
        "Integração FIPE completa",
        "Histórico de preços FIPE (5 anos)",
        "Preenchimento automático via FIPE",
      ],
      cta: "Escolher o Avançado",
      highlighted: true,
    },
    {
      key: "profissional",
      name: PLANS.profissional.name,
      price: formatPrice(PLANS.profissional.priceMonthly),
      period: "/mês",
      description: "Para operações grandes ou múltiplas equipes, sem limites.",
      features: [
        "Veículos ilimitados",
        "Usuários ilimitados",
        "Tudo do plano Avançado",
        "Catálogo público da loja com link próprio",
        "Contato por WhatsApp em cada veículo",
        "Suporte prioritário",
      ],
      cta: "Escolher o Profissional",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className={`border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-border shadow-md" : "border-border/40"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VEHIRO
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
                data-testid={`nav-landing-${link.id}`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onGoToLogin} data-testid="button-header-login">
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <Button onClick={goToRegister} data-testid="button-header-register">
              Criar conta grátis
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative pt-20 md:pt-28 pb-16 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
            }}
          />

          <motion.div
            className="max-w-4xl mx-auto text-center space-y-8 relative"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="px-4 py-1.5 text-sm no-default-hover-elevate no-default-active-elevate">
                <Rocket className="w-3.5 h-3.5 mr-1.5" />
                {TRIAL_DAYS} dias grátis · sem cartão de crédito
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight">
              A gestão do seu
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> pátio de veículos</span>,
              sem planilhas
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Estoque, vendas, despesas, comissões e lucro por veículo em um único sistema.
              Feito para lojas e revendas que querem crescer com controle.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button size="lg" className="text-lg px-8 group" onClick={goToRegister} data-testid="button-hero-register">
                Começar teste grátis
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={onGoToLogin} data-testid="button-hero-login">
                Já tenho conta
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Configuração em minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dados isolados por loja</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancele quando quiser</span>
            </motion.div>
          </motion.div>

          <DashboardMockup />
        </section>

        {/* Métricas */}
        <section className="py-10 px-6 border-y border-border/30 bg-muted/20">
          <motion.div
            className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            {metrics.map((m) => (
              <motion.div key={m.label} variants={fadeUp} className="text-center space-y-1">
                <p className="text-2xl md:text-3xl font-bold font-display text-primary">{m.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{m.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="py-20 px-6 scroll-mt-16">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-12 space-y-3">
              <h2 className="text-3xl font-bold font-display">Feito para o dia a dia da sua loja</h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Do cadastro do veículo ao lucro da venda, tudo integrado.
              </p>
            </Reveal>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={fadeUp}>
                  <Card className="border-border/50 h-full transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-5 space-y-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 w-fit">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold font-display">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="py-20 px-6 bg-muted/30 border-y border-border/30 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-14 space-y-3">
              <h2 className="text-3xl font-bold font-display">Comece em 3 passos</h2>
            </Reveal>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-10 relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              {/* linha conectando os passos (desktop) */}
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />
              {steps.map((step) => (
                <motion.div key={step.title} variants={fadeUp} className="text-center space-y-3 relative">
                  <div className="mx-auto p-4 rounded-full bg-primary/10 ring-8 ring-background w-fit relative">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg font-display">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Preços */}
        <section id="precos" className="py-20 px-6 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-12 space-y-3">
              <h2 className="text-3xl font-bold font-display">Planos simples e transparentes</h2>
              <p className="text-muted-foreground text-lg">
                Comece grátis e evolua conforme sua loja cresce.
              </p>
            </Reveal>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              {pricing.map((plan) => (
                <motion.div key={plan.key} variants={fadeUp} className="h-full">
                  <Card
                    className={`h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 ${
                      plan.highlighted
                        ? "border-primary shadow-lg relative md:scale-[1.03]"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    {plan.highlighted && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 no-default-hover-elevate no-default-active-elevate">
                        Mais popular
                      </Badge>
                    )}
                    <CardContent className="p-6 flex flex-col h-full space-y-5">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg font-display">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold font-display">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                      <ul className="space-y-2.5 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm">
                            {f.includes("ilimitad") ? (
                              <InfinityIcon className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                        onClick={goToRegister}
                        data-testid={`button-plan-${plan.key}`}
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            <Reveal className="text-center mt-10" delay={0.15}>
              <p className="text-sm text-muted-foreground">
                Todos os planos começam com <strong>{TRIAL_DAYS} dias grátis</strong> (até {PLANS.trial.maxVehicles} veículos
                e {PLANS.trial.maxUsers} usuários no período de teste), sem cartão de crédito.
                Sem fidelidade, cancele quando quiser.
              </p>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 px-6 bg-muted/30 border-y border-border/30 scroll-mt-16">
          <div className="max-w-3xl mx-auto">
            <Reveal className="text-center mb-10 space-y-3">
              <h2 className="text-3xl font-bold font-display">Perguntas frequentes</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <Accordion type="single" collapsible className="w-full">
                {faq.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left font-display" data-testid={`faq-trigger-${i}`}>
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <Reveal className="max-w-2xl mx-auto text-center space-y-6 relative">
            <div className="flex items-center justify-center gap-2">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold font-display">
              Aposente as planilhas do seu pátio
            </h2>
            <p className="text-muted-foreground text-lg">
              Cadastre sua loja agora e tenha controle total de estoque, vendas e finanças
              nos próximos {TRIAL_DAYS} dias — de graça.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="text-lg px-8 group" onClick={goToRegister} data-testid="button-cta-register">
                Criar conta grátis
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={onGoToLogin} data-testid="button-cta-login">
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/50 py-10 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">VEHIRO</span>
            </div>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
          <p className="text-center sm:text-left text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} VEHIRO v{APP_VERSION} — Gestão de Pátio de Veículos.
          </p>
        </div>
      </footer>
    </div>
  );
}
