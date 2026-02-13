import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileHeader } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/use-auth";
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
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
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

function AuthenticatedRouter() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/vehicles" component={Vehicles} />
              <Route path="/vehicles/:id" component={VehicleDetails} />
              <Route path="/people" component={People} />
              <Route path="/store-expenses" component={StoreExpenses} />
              <Route path="/financial" component={Financial} />
              <Route path="/fipe" component={Fipe} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings">{() => <AdminRoute component={Settings} />}</Route>
              <Route path="/activity-log">{() => <AdminRoute component={ActivityLog} />}</Route>
              <Route path="/permissions" component={PermissionsRoute} />
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
  const [page, setPage] = useState<"landing" | "login">("landing");

  if (page === "login") {
    return <LoginPage onBackToLanding={() => setPage("landing")} />;
  }
  return <LandingPage onGoToLogin={() => setPage("login")} />;
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <UnauthenticatedPages />;
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
