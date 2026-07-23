import { useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileHeader } from "@/components/layout/Sidebar";
import { useAuth, useFipeAccess } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import VehicleDetails from "@/pages/VehicleDetails";
import People from "@/pages/People";
import StoreExpenses from "@/pages/StoreExpenses";
import Financial from "@/pages/Financial";
import Fipe from "@/pages/Fipe";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import ActivityLog from "@/pages/ActivityLog";
import PermissionsPage from "@/pages/PermissionsPage";
import ChangelogPage from "@/pages/ChangelogPage";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CompleteProfilePage from "@/pages/CompleteProfilePage";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import PublicCatalog from "@/pages/PublicCatalog";
import CatalogSettings from "@/pages/CatalogSettings";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import HelpPage from "@/pages/HelpPage";
import SupportPage from "@/pages/SupportPage";
import BillingPage from "@/pages/BillingPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function AdminRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user } = useAuth();
  if (user?.role !== "Administrador") {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function PermissionsRoute() {
  const { user } = useAuth();
  if (user?.role !== "Administrador" && user?.role !== "Gerente") {
    return <Redirect to="/" />;
  }
  return <PermissionsPage />;
}

function ChangelogRoute() {
  const { user } = useAuth();
  if (user?.role !== "Administrador" && user?.role !== "Gerente") {
    return <Redirect to="/" />;
  }
  return <ChangelogPage />;
}

function FipeUpgradeNotice() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full border-primary/30">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold font-display">Integração FIPE</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A consulta à Tabela FIPE, o histórico de preços e o preenchimento
            automático de dados estão disponíveis a partir do plano <strong>Avançado</strong>.
          </p>
          <Button className="w-full" data-testid="button-fipe-upgrade" onClick={() => window.location.assign("/billing")}>
            <Sparkles className="w-4 h-4 mr-2" />
            Fazer upgrade de plano
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FipeRoute() {
  const fipeAccess = useFipeAccess();
  if (!fipeAccess) return <FipeUpgradeNotice />;
  return <Fipe />;
}

function CatalogRoute() {
  const { user } = useAuth();
  if (user?.role !== "Administrador" && user?.role !== "Gerente") {
    return <Redirect to="/" />;
  }
  return <CatalogSettings />;
}

function AuthenticatedRouter() {
  const { user } = useAuth();

  // Trial expirado ou assinatura inativa: mostra apenas a tela de assinatura.
  // Exceção: o super admin em impersonation entra mesmo em lojas suspensas.
  if (user && !user.organization.active && !user.impersonating) {
    return (
      <div className="min-h-screen bg-background">
        <BillingPage blocked />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Switch>
              <Route path="/" component={Dashboard} />
              {/* Usuário logado na rota /login → sempre para o Dashboard */}
              <Route path="/login">{() => <Redirect to="/" />}</Route>
              <Route path="/vehicles" component={Vehicles} />
              <Route path="/vehicles/:id" component={VehicleDetails} />
              <Route path="/people" component={People} />
              <Route path="/store-expenses" component={StoreExpenses} />
              <Route path="/financial" component={Financial} />
              <Route path="/fipe" component={FipeRoute} />
              <Route path="/catalog" component={CatalogRoute} />
              <Route path="/help" component={HelpPage} />
              <Route path="/support" component={SupportPage} />
              <Route path="/billing" component={BillingPage} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings">{() => <AdminRoute component={Settings} />}</Route>
              <Route path="/activity-log">{() => <AdminRoute component={ActivityLog} />}</Route>
              <Route path="/permissions" component={PermissionsRoute} />
              <Route path="/changelog" component={ChangelogRoute} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="space-y-4 text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function UnauthenticatedPages() {
  // /login abre direto na tela de login (usado após redefinir a senha)
  const [page, setPage] = useState<"landing" | "login" | "register" | "forgot">(() =>
    window.location.pathname === "/login" ? "login" : "landing",
  );

  if (page === "login") {
    return (
      <LoginPage
        onBackToLanding={() => setPage("landing")}
        onGoToRegister={() => setPage("register")}
        onForgotPassword={() => setPage("forgot")}
      />
    );
  }
  if (page === "register") {
    return <RegisterPage onSwitchToLogin={() => setPage("login")} />;
  }
  if (page === "forgot") {
    return <ForgotPasswordPage onBackToLogin={() => setPage("login")} />;
  }
  return (
    <LandingPage
      onGoToLogin={() => setPage("login")}
      onGoToRegister={() => setPage("register")}
    />
  );
}

function AppContent() {
  const [location] = useLocation();
  const { user, needsProfile, isLoading } = useAuth();

  // Catálogo público: acessível sem login
  if (location.startsWith("/loja/")) return <PublicCatalog />;

  // Redefinição de senha: aberta pelo link do e-mail, antes de qualquer checagem
  // de sessão (o link de recuperação cria uma sessão temporária no Supabase)
  if (location === "/redefinir-senha") return <ResetPasswordPage />;

  if (isLoading) return <LoadingScreen />;

  // Entrou via Google mas ainda não tem loja/perfil: conclui o cadastro
  if (needsProfile) return <CompleteProfilePage info={needsProfile} />;

  if (!user) return <UnauthenticatedPages />;

  // Dono do SaaS: painel administrativo exclusivo, sem nada da interface de loja
  if (user.isSuperAdmin) return <AdminPage />;

  // Super admin acessando uma loja: mesma interface de loja + faixa de aviso
  if (user.impersonating) {
    return (
      <>
        <ImpersonationBanner orgName={user.organization.name} />
        <AuthenticatedRouter />
      </>
    );
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
