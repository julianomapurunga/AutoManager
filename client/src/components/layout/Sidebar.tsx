import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Car,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  Receipt,
  Settings,
  Search,
  UserCog,
  History,
  Shield,
  FileText,
  ChevronDown,
  ChevronRight,
  Globe,
  HelpCircle,
  CreditCard,
  Lock,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useFipeAccess, useCatalogAccess } from "@/hooks/use-auth";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, type ReactNode } from "react";
import { APP_VERSION } from "@shared/version";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  adminOnly: boolean;
  roles?: readonly string[];
  requiresFipe?: boolean;
  requiresCatalog?: boolean;
}

const items: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
  { href: "/vehicles", icon: Car, label: "Veículos", adminOnly: false },
  { href: "/people", icon: Users, label: "Pessoas", adminOnly: false },
  { href: "/store-expenses", icon: Receipt, label: "Despesas da Loja", adminOnly: false },
  { href: "/financial", icon: BarChart3, label: "Financeiro", adminOnly: false },
  { href: "/fipe", icon: Search, label: "FIPE", adminOnly: false, requiresFipe: true },
  { href: "/catalog", icon: Globe, label: "Catálogo Público", adminOnly: false, roles: ["Administrador", "Gerente"], requiresCatalog: true },
  { href: "/billing", icon: CreditCard, label: "Assinatura", adminOnly: false, roles: ["Administrador"] },
  { href: "/help", icon: HelpCircle, label: "Ajuda", adminOnly: false },
  { href: "/settings", icon: Settings, label: "Configurações", adminOnly: true },
];

const settingsSubItems = [
  { href: "/permissions", icon: Shield, label: "Permissões", roles: ["Administrador", "Gerente"] as const },
  { href: "/changelog", icon: FileText, label: "Changelog", roles: ["Administrador", "Gerente"] as const },
  { href: "/activity-log", icon: History, label: "Log de Atividades", roles: ["Administrador"] as const },
];

/** Item de menu bloqueado pelo plano: desabilitado, com cadeado e tooltip. */
function LockedNavItem({ item, reason, collapsed = false }: { item: NavItem; reason: string; collapsed?: boolean }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div
          aria-disabled="true"
          data-testid={`nav-locked-${item.label.toLowerCase()}`}
          className={cn(
            "flex items-center rounded-md font-medium cursor-not-allowed select-none text-muted-foreground/50",
            collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3",
          )}
        >
          <item.icon className="w-5 h-5 opacity-50" />
          {!collapsed && <span className="flex-1">{item.label}</span>}
          {!collapsed && <Lock className="w-3.5 h-3.5 shrink-0" />}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-56">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}

/** Retorna o motivo do bloqueio pelo plano, ou null se o item está liberado. */
function useItemLock() {
  const fipeAccess = useFipeAccess();
  const catalogAccess = useCatalogAccess();
  return (item: NavItem): string | null => {
    if (item.requiresFipe && !fipeAccess) {
      return "A integração FIPE está disponível a partir do plano Avançado. Acesse Assinatura para fazer upgrade.";
    }
    if (item.requiresCatalog && !catalogAccess) {
      return "O Catálogo Público está disponível no plano Profissional. Acesse Assinatura para fazer upgrade.";
    }
    return null;
  };
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const getLock = useItemLock();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("vehiro_sidebar_collapsed") === "1",
  );

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("vehiro_sidebar_collapsed", next ? "1" : "0");
      return next;
    });

  const getInitials = (first?: string | null, last?: string | null) => {
    const f = first?.charAt(0) || "";
    const l = last?.charAt(0) || "";
    return (f + l).toUpperCase() || "U";
  };

  // Quando recolhido, envolve o item num tooltip com o rótulo (à direita).
  const withTip = (label: string, node: ReactNode) =>
    collapsed ? (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      node
    );

  const rowClass = (active: boolean) =>
    cn(
      "flex items-center rounded-md font-medium transition-all duration-200 cursor-pointer",
      collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover-elevate",
    );

  return (
    <aside
      className={cn(
        "bg-card border-r border-border h-screen sticky top-0 flex-col hidden md:flex transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
      data-testid="sidebar"
    >
      {/* Cabeçalho + botão de recolher/expandir */}
      <div
        className={cn(
          "h-16 border-b border-border/50 flex items-center shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <h1 className="text-xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
            <Car className="w-7 h-7 text-primary" />
            VEHIRO
          </h1>
        )}
        {withTip(
          collapsed ? "Expandir menu" : "Recolher menu",
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="shrink-0 text-muted-foreground"
            data-testid="button-toggle-sidebar"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
          </Button>,
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto space-y-1", collapsed ? "p-2" : "p-4")}>
        {items
          .filter((item) => {
            if (item.adminOnly) return user?.role === "Administrador";
            if (item.roles) return item.roles.includes(user?.role || "");
            return true;
          })
          .map((item) => {
            const lockReason = getLock(item);
            if (lockReason) {
              return <LockedNavItem key={item.href} item={item} reason={lockReason} collapsed={collapsed} />;
            }
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const isSettingsItem = item.label === "Configurações";

            if (isSettingsItem) {
              const settingsSectionActive =
                location.startsWith("/settings") ||
                location.startsWith("/permissions") ||
                location.startsWith("/changelog") ||
                location.startsWith("/activity-log");

              // Recolhido: sem submenu — o ícone leva direto às Configurações.
              if (collapsed) {
                return (
                  <div key={item.href}>
                    {withTip(
                      item.label,
                      <Link href={item.href}>
                        <div data-testid={`nav-${item.label.toLowerCase()}`} className={rowClass(settingsSectionActive || isActive)}>
                          <item.icon className={cn("w-5 h-5", settingsSectionActive || isActive ? "text-primary" : "text-muted-foreground")} />
                        </div>
                      </Link>,
                    )}
                  </div>
                );
              }

              return (
                <div key={item.href} className="space-y-1">
                  <Link href={item.href}>
                    <div
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      className={rowClass(settingsSectionActive || isActive)}
                      onClick={() => setShowSettingsMenu((prev) => !prev)}
                    >
                      <item.icon
                        className={cn("w-5 h-5", settingsSectionActive || isActive ? "text-primary" : "text-muted-foreground")}
                      />
                      <span className="flex-1">{item.label}</span>
                      {showSettingsMenu ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </Link>

                  {showSettingsMenu && (
                    <div className="ml-8 space-y-1">
                      {settingsSubItems
                        .filter((sub) => sub.roles.includes(user?.role || ("" as any)))
                        .map((sub) => {
                          const isSubActive =
                            location === sub.href || (sub.href !== "/" && location.startsWith(sub.href));
                          return (
                            <Link key={sub.href} href={sub.href}>
                              <div
                                data-testid={`nav-${sub.label.toLowerCase()}`}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                                  isSubActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60",
                                )}
                              >
                                <sub.icon className={cn("w-4 h-4", isSubActive ? "text-primary" : "text-muted-foreground")} />
                                {sub.label}
                              </div>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.href}>
                {withTip(
                  item.label,
                  <Link href={item.href}>
                    <div data-testid={`nav-${item.label.toLowerCase()}`} className={rowClass(isActive)}>
                      <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                      {!collapsed && item.label}
                    </div>
                  </Link>,
                )}
              </div>
            );
          })}
      </nav>

      {/* Rodapé: perfil + sair (sempre visível) */}
      <div className={cn("border-t border-border/50 shrink-0", collapsed ? "p-2 flex flex-col items-center gap-2" : "p-4 space-y-3")}>
        {collapsed ? (
          <>
            {withTip(
              `${user?.firstName ?? ""} ${user?.lastName ?? ""} · ${user?.role ?? ""}`.trim(),
              <Link href="/profile">
                <Avatar className="h-9 w-9 cursor-pointer" data-testid="link-profile">
                  {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.firstName || ""} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
              </Link>,
            )}
            {withTip(
              "Sair",
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => logout()} data-testid="button-logout" aria-label="Sair">
                <LogOut className="w-5 h-5" />
              </Button>,
            )}
          </>
        ) : (
          <>
            <Link href="/profile">
              <div className="flex items-center gap-3 px-2 py-1 rounded-md cursor-pointer hover-elevate" data-testid="link-profile">
                <Avatar className="h-9 w-9">
                  {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.firstName || ""} />}
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
            <p className="text-xs text-muted-foreground/60 text-center" data-testid="text-app-version">
              v{APP_VERSION}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const getLock = useItemLock();

  return (
    <>
      <div className="md:hidden h-16 border-b border-border flex items-center justify-between gap-4 px-4 bg-card sticky top-0 z-50">
        <h1 className="text-xl font-bold font-display text-primary flex items-center gap-2">
          <Car className="w-6 h-6" />
          VEHIRO
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
              const lockReason = getLock(item);
              if (lockReason) {
                return <LockedNavItem key={item.href} item={item} reason={lockReason} />;
              }
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isSettingsItem = item.label === "Configurações";

              if (isSettingsItem) {
                const settingsSectionActive =
                  location.startsWith("/settings") ||
                  location.startsWith("/permissions") ||
                  location.startsWith("/changelog") ||
                  location.startsWith("/activity-log");

                return (
                  <div key={item.href} className="space-y-1">
                    <Link href={item.href}>
                      <div
                        onClick={() => {
                          setShowSettingsMenu((prev) => !prev);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-md font-medium cursor-pointer",
                          settingsSectionActive || isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                        <span className="ml-auto">
                          {showSettingsMenu ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </span>
                      </div>
                    </Link>

                    {showSettingsMenu && (
                      <div className="ml-8 space-y-1">
                        {settingsSubItems
                          .filter((sub) => sub.roles.includes(user?.role || "" as any))
                          .map((sub) => {
                            const isSubActive =
                              location === sub.href || (sub.href !== "/" && location.startsWith(sub.href));
                            return (
                              <Link key={sub.href} href={sub.href}>
                                <div
                                  onClick={() => setOpen(false)}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer",
                                    isSubActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  <sub.icon className="w-4 h-4" />
                                  {sub.label}
                                </div>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              }

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
