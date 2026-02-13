import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car, BarChart3, Users, Shield, ArrowRight, Wrench,
  DollarSign, FileText, Search, TrendingUp, CheckCircle2, LogIn, History
} from "lucide-react";

interface LandingPageProps {
  onGoToLogin: () => void;
}

const features = [
  {
    icon: Car,
    title: "Controle de Veículos",
    description: "Cadastre e gerencie todos os veículos do pátio com informações completas: marca, modelo, placa, ano, condição, quilometragem e fotos.",
  },
  {
    icon: Users,
    title: "Gestão de Pessoas",
    description: "Mantenha o cadastro de proprietários, clientes e intermediários organizado, com dados de contato e documentos.",
  },
  {
    icon: Wrench,
    title: "Controle de Despesas",
    description: "Registre todas as despesas por veículo e despesas operacionais da loja. Acompanhe os custos em tempo real.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Visualize estatísticas do estoque, veículos disponíveis, vendidos e o resumo financeiro completo.",
  },
  {
    icon: Shield,
    title: "Segurança e Auditoria",
    description: "Rastreabilidade total com log de atividades detalhado. Matriz de permissões clara para Administradores, Gerentes, Vendedores e Financeiro.",
  },
  {
    icon: Search,
    title: "Inteligência FIPE",
    description: "Consulta automática de preços de mercado, histórico de valores dos últimos anos e preenchimento inteligente de dados técnicos.",
  },
];

const highlights = [
  "Cadastro completo de veículos com fotos",
  "Preço de aquisição e preço anunciado separados",
  "Controle de veículos de troca",
  "Comissão de intermediários",
  "Relatórios financeiros detalhados",
  "Consulta automática Tabela FIPE",
  "Histórico de preços FIPE dos últimos 5 anos",
  "Despesas por veículo e da loja",
  "Gestão de usuários com permissões",
  "Log de auditoria completo para administradores",
  "Matriz de acesso por cargo (Gerente, Vendedor, Financeiro)",
];

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AutoManager
            </span>
          </div>
          <Button onClick={onGoToLogin} data-testid="button-header-login">
            <LogIn className="w-4 h-4 mr-2" />
            Entrar
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="relative py-20 md:py-28 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
          <div className="max-w-4xl mx-auto text-center space-y-8 relative">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm no-default-hover-elevate no-default-active-elevate">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Sistema seguro e confiável
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight">
              Controle completo do seu
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> pátio de veículos</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Gerencie estoque, vendas, despesas e finanças em um único lugar.
              Substitua suas planilhas por um sistema moderno e eficiente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="text-lg px-8" onClick={onGoToLogin} data-testid="button-hero-login">
                Acessar o Sistema
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-muted/30 border-y border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 space-y-3">
              <h2 className="text-3xl font-bold font-display">Tudo que você precisa</h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Funcionalidades pensadas para o dia a dia da sua loja de veículos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border/50">
                  <CardContent className="p-6 space-y-3">
                    <div className="p-3 rounded-lg bg-primary/10 w-fit">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg font-display">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 space-y-3">
              <h2 className="text-3xl font-bold font-display">Recursos inclusos</h2>
              <p className="text-muted-foreground text-lg">
                Tudo integrado para facilitar sua gestão.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-2xl mx-auto">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-muted/30 border-t border-border/30">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display">
              Pronto para organizar seu pátio?
            </h2>
            <p className="text-muted-foreground">
              Acesse o sistema e tenha o controle total dos seus veículos, vendas e finanças.
            </p>
            <Button size="lg" onClick={onGoToLogin} data-testid="button-cta-login">
              <LogIn className="w-5 h-5 mr-2" />
              Entrar no Sistema
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold">AutoManager</span>
          </div>
          <p>&copy; {new Date().getFullYear()} AutoManager. Sistema de Controle de Pátio de Veículos.</p>
        </div>
      </footer>
    </div>
  );
}
