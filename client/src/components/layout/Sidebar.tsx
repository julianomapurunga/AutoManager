import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, Users, LogOut, Menu, X, BarChart3, Receipt, Settings, Search, UserCog, History, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const items = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
  { href: "/vehicles", icon: Car, label: "Veículos", adminOnly: false },
  { href: "/people", icon: Users, label: "Pessoas", adminOnly: false },
  { href: "/store-expenses", icon: Receipt, label: "Despesas da Loja", adminOnly: false },
  { href: "/financial", icon: BarChart3, label: "Financeiro", adminOnly: false },
  { href: "/fipe", icon: Search, label: "FIPE", adminOnly: false },
  { href: "/permissions", icon: Shield, label: "Permissões", roles: ["Administrador", "Gerente"] },
  { href: "/activity-log", icon: History, label: "Log de Atividades", adminOnly: true },
  { href: "/settings", icon: Settings, label: "Configurações", adminOnly: true },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (first?: string | null, last?: string | null) => {
    const f = first?.charAt(0) || "";
    const l = last?.charAt(0) || "";
    return (f + l).toUpperCase() || "U";
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 flex-col hidden md:flex" data-testid="sidebar">
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
          <Car className="w-8 h-8 text-primary" />
          AutoManager
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items
          .filter((item) => {
            if (item.adminOnly) return user?.role === "Administrador";
            if (item.roles) return item.roles.includes(user?.role || "");
            return true;
          })
          .map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover-elevate"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <Link href="/profile">
          <div className="flex items-center gap-3 mb-3 px-2 py-1 rounded-md cursor-pointer hover-elevate" data-testid="link-profile">
            <Avatar className="h-9 w-9">
              {user?.profileImageUrl && (
                <AvatarImage src={user.profileImageUrl} alt={user.firstName || ""} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" data-testid="text-username">
                {user?.firstName} {user?.lastName}
              </p>
              <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid="text-user-role">
                {user?.role}
              </Badge>
            </div>
            <UserCog className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="md:hidden h-16 border-b border-border flex items-center justify-between gap-4 px-4 bg-card sticky top-0 z-50">
        <h1 className="text-xl font-bold font-display text-primary flex items-center gap-2">
          <Car className="w-6 h-6" />
          AutoManager
        </h1>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} data-testid="button-mobile-menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {open && (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 space-y-1 sticky top-16 z-40">
          {items
            .filter((item) => {
              if (item.adminOnly) return user?.role === "Administrador";
              if (item.roles) return item.roles.includes(user?.role || "");
              return true;
            })
            .map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-md font-medium cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          <Link href="/profile">
            <div
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-md font-medium cursor-pointer text-muted-foreground"
            >
              <UserCog className="w-5 h-5" />
              Meu Perfil
            </div>
          </Link>
          <div
            onClick={() => logout()}
            className="flex items-center gap-3 px-4 py-3 text-muted-foreground cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </div>
        </div>
      )}
    </>
  );
}
