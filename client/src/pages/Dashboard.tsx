import { useDashboardStats } from "@/hooks/use-dashboard";
import { useVehicles } from "@/hooks/use-vehicles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Car, TrendingUp, TrendingDown, DollarSign, ArrowRight, ShoppingCart, Minus } from "lucide-react";
import { Link } from "wouter";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function StatSkeleton() {
  return <Skeleton className="h-28 rounded-md" />;
}

function VehicleCardSkeleton() {
  return <Skeleton className="h-40 rounded-md" />;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: availableVehicles, isLoading: vehiclesLoading } = useVehicles({ status: "Disponível" });

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const previousMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel do Pátio"
        description="Visão geral dos veículos e vendas."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : stats ? (
          <>
            <Card data-testid="stat-available">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">No Pátio</CardTitle>
                <Car className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-available-count">{stats.totalAvailable}</div>
                <p className="text-xs text-muted-foreground mt-1">veículos disponíveis</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-current-sales">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vendas - {currentMonthName}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-current-month-sales">{stats.currentMonthSales}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stats.currentMonthRevenue)} em receita
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-previous-sales">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vendas - {previousMonthName}</CardTitle>
                {stats.currentMonthSales > stats.previousMonthSales ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : stats.currentMonthSales < stats.previousMonthSales ? (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-previous-month-sales">{stats.previousMonthSales}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stats.previousMonthRevenue)} em receita
                </p>
              </CardContent>
            </Card>

            <Card data-testid="stat-expenses">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Totais</CardTitle>
                <DollarSign className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-expenses">{formatCurrency(stats.totalExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">em manutenção e serviços</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-bold">Veículos no Pátio</h2>
          <Link href="/vehicles">
            <Button variant="outline" size="sm" data-testid="link-all-vehicles">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {vehiclesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <VehicleCardSkeleton />
            <VehicleCardSkeleton />
            <VehicleCardSkeleton />
          </div>
        ) : availableVehicles && availableVehicles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableVehicles.map((vehicle) => (
              <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-vehicle-${vehicle.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{vehicle.brand} {vehicle.model}</h3>
                        <p className="text-sm text-muted-foreground font-mono uppercase">{vehicle.plate}</p>
                      </div>
                      <StatusBadge status={vehicle.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{vehicle.color}</span>
                        <span>{vehicle.year}</span>
                      </div>
                      <span className="font-bold text-emerald-600 font-mono" data-testid={`text-price-${vehicle.id}`}>
                        {formatCurrency(vehicle.price || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Proprietário: {vehicle.owner.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum veículo disponível no pátio.</p>
              <Link href="/vehicles">
                <Button variant="outline" className="mt-4" data-testid="button-add-vehicle-empty">
                  Cadastrar Veículo
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {stats && (stats.currentMonthSales > 0 || stats.previousMonthSales > 0) && (
        <div>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h2 className="text-xl font-bold">Resumo de Vendas</h2>
            <Link href="/financial">
              <Button variant="outline" size="sm" data-testid="link-financial-report">
                Relatório Completo
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base capitalize">{currentMonthName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Vendas realizadas</span>
                  <span className="font-bold">{stats.currentMonthSales}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Receita</span>
                  <span className="font-bold text-emerald-600 font-mono">{formatCurrency(stats.currentMonthRevenue)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Despesas</span>
                  <span className="font-bold text-rose-600 font-mono">- {formatCurrency(stats.currentMonthExpenses)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between gap-2">
                  <span className="text-sm font-medium">Lucro estimado</span>
                  <span className="font-bold font-mono">
                    {formatCurrency(stats.currentMonthRevenue - stats.currentMonthExpenses)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base capitalize">{previousMonthName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Vendas realizadas</span>
                  <span className="font-bold">{stats.previousMonthSales}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Receita</span>
                  <span className="font-bold text-emerald-600 font-mono">{formatCurrency(stats.previousMonthRevenue)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Despesas</span>
                  <span className="font-bold text-rose-600 font-mono">- {formatCurrency(stats.previousMonthExpenses)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between gap-2">
                  <span className="text-sm font-medium">Lucro estimado</span>
                  <span className="font-bold font-mono">
                    {formatCurrency(stats.previousMonthRevenue - stats.previousMonthExpenses)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
