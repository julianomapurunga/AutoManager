import { useDashboardStats } from "@/hooks/use-dashboard";
import { useVehicles } from "@/hooks/use-vehicles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrendingUp, TrendingDown, Minus, DollarSign, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function Financial() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: soldVehicles, isLoading: vehiclesLoading } = useVehicles({ status: "Vendido" });

  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const previousMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const revenueChange = stats ? stats.currentMonthRevenue - stats.previousMonthRevenue : 0;
  const salesChange = stats ? stats.currentMonthSales - stats.previousMonthSales : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatório Financeiro"
        description="Acompanhe vendas, receitas e despesas."
      />

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-total-revenue">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-emerald-600" data-testid="text-total-revenue">
                  {formatCurrency(stats.currentMonthRevenue + stats.previousMonthRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stats.totalSold} veículos vendidos no total</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-expenses">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Totais</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-rose-600" data-testid="text-expenses-total">
                  {formatCurrency(stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">veículos + loja</p>
              </CardContent>
            </Card>

            <Card data-testid="card-net-profit">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido Estimado</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono" data-testid="text-net-profit">
                  {formatCurrency((stats.currentMonthRevenue + stats.previousMonthRevenue) - stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">receita menos despesas</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Comparativo Mensal</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base capitalize">{currentMonthName}</CardTitle>
                    <span className="text-xs text-muted-foreground">Mês Atual</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Vendas realizadas</span>
                    <span className="font-bold" data-testid="text-current-sales-count">{stats.currentMonthSales}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Receita de vendas</span>
                    <span className="font-bold text-emerald-600 font-mono">{formatCurrency(stats.currentMonthRevenue)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Despesas do mês</span>
                    <span className="font-bold text-rose-600 font-mono">- {formatCurrency(stats.currentMonthExpenses)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between gap-2">
                    <span className="text-sm font-medium">Lucro do mês</span>
                    <span className="font-bold font-mono" data-testid="text-current-profit">
                      {formatCurrency(stats.currentMonthRevenue - stats.currentMonthExpenses)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base capitalize">{previousMonthName}</CardTitle>
                    <span className="text-xs text-muted-foreground">Mês Anterior</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Vendas realizadas</span>
                    <span className="font-bold" data-testid="text-previous-sales-count">{stats.previousMonthSales}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Receita de vendas</span>
                    <span className="font-bold text-emerald-600 font-mono">{formatCurrency(stats.previousMonthRevenue)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Despesas do mês</span>
                    <span className="font-bold text-rose-600 font-mono">- {formatCurrency(stats.previousMonthExpenses)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between gap-2">
                    <span className="text-sm font-medium">Lucro do mês</span>
                    <span className="font-bold font-mono" data-testid="text-previous-profit">
                      {formatCurrency(stats.previousMonthRevenue - stats.previousMonthExpenses)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(salesChange !== 0 || revenueChange !== 0) && (
              <Card className="mt-4">
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  {salesChange > 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  ) : salesChange < 0 ? (
                    <TrendingDown className="h-5 w-5 text-rose-600 flex-shrink-0" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {salesChange > 0
                      ? `Aumento de ${salesChange} venda(s) em relação ao mês anterior.`
                      : salesChange < 0
                      ? `Redução de ${Math.abs(salesChange)} venda(s) em relação ao mês anterior.`
                      : "Mesmo número de vendas que o mês anterior."}
                    {revenueChange !== 0 && (
                      <> Diferença de receita: <strong className="font-mono">{formatCurrency(Math.abs(revenueChange))}</strong> {revenueChange > 0 ? "a mais" : "a menos"}.</>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}

      <div>
        <h2 className="text-xl font-bold mb-4">Veículos Vendidos</h2>
        {vehiclesLoading ? (
          <Skeleton className="h-48 rounded-md" />
        ) : soldVehicles && soldVehicles.length > 0 ? (
          <div className="bg-card rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Veículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Preço Pedido</TableHead>
                  <TableHead>Valor Vendido</TableHead>
                  <TableHead>Proprietário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} data-testid={`row-sold-${vehicle.id}`}>
                    <TableCell>
                      <Link href={`/vehicles/${vehicle.id}`}>
                        <span className="font-medium cursor-pointer hover:underline">
                          {vehicle.brand} {vehicle.model}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono uppercase">{vehicle.plate}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{formatCurrency(vehicle.price || 0)}</TableCell>
                    <TableCell className="font-mono font-medium text-emerald-600">
                      {vehicle.salePrice ? formatCurrency(vehicle.salePrice) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{vehicle.owner?.name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum veículo vendido ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
