import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, BarChart3, Users, Shield, ArrowRight, Wrench } from "lucide-react";

const features = [
  {
    icon: Car,
    title: "Controle de Veículos",
    description: "Cadastre e gerencie todos os veículos do pátio com informações completas de marca, modelo, placa e status.",
  },
  {
    icon: Users,
    title: "Gestão de Pessoas",
    description: "Mantenha o cadastro de proprietários e clientes organizado, com dados de contato e documentos.",
  },
  {
    icon: Wrench,
    title: "Controle de Despesas",
    description: "Registre todas as despesas por veículo e acompanhe o custo total de manutenção e preparação.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e Dashboard",
    description: "Visualize estatísticas do estoque, veículos disponíveis, vendidos e o resumo financeiro em tempo real.",
  },
];

export default function LandingPage() {
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
          <a href="/api/login">
            <Button data-testid="button-login">
              Entrar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="py-20 md:py-32 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Sistema seguro e confiável
            </div>

            <h1 className="text-4xl md:text-6xl font-bold font-display leading-tight">
              Controle completo do
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> pátio de veículos</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Gerencie seu estoque de veículos, proprietários, clientes e despesas em um único lugar. 
              Substitua suas planilhas por um sistema moderno e eficiente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href="/api/login">
                <Button size="lg" className="text-lg px-8" data-testid="button-get-started">
                  Comece Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>

            <p className="text-sm text-muted-foreground">
              Acesso gratuito. Sem necessidade de cartão de crédito.
            </p>
          </div>
        </section>

        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-display mb-3">Tudo que você precisa</h2>
              <p className="text-muted-foreground text-lg">
                Funcionalidades pensadas para o dia a dia da sua loja de veículos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border/50">
                  <CardContent className="p-6 flex gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 h-fit">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 px-6 text-center text-sm text-muted-foreground">
        <p>AutoManager &copy; {new Date().getFullYear()}. Sistema de Controle de Pátio de Veículos.</p>
      </footer>
    </div>
  );
}
