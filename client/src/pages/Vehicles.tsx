import { useState } from "react";
import { Link } from "wouter";
import { useVehicles, useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, ShoppingCart } from "lucide-react";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { SellVehicleDialog } from "@/components/forms/SellVehicleDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEHICLE_STATUS } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<{ id: number; name: string; price: number } | null>(null);

  const { data: vehicles, isLoading } = useVehicles({
    search,
    status: statusFilter === "all" ? undefined : statusFilter
  });

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        description="Gerencie o estoque de veículos."
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-vehicle">
                <Plus className="w-4 h-4 mr-2" />
                Novo Veículo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Veículo</DialogTitle>
              </DialogHeader>
              <VehicleForm
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, modelo ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-vehicles"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {VEHICLE_STATUS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Veículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando veículos...
                </TableCell>
              </TableRow>
            ) : vehicles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum veículo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id} className="group" data-testid={`row-vehicle-${vehicle.id}`}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/vehicles/${vehicle.id}`}>
                      <span className="cursor-pointer hover:underline">
                        {vehicle.brand} {vehicle.model}
                      </span>
                    </Link>
                    <div className="text-xs text-muted-foreground">{vehicle.color}</div>
                  </TableCell>
                  <TableCell className="font-mono uppercase">{vehicle.plate}</TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell className="font-medium text-emerald-600 font-mono">
                    {formatCurrency(vehicle.price || 0)}
                  </TableCell>
                  <TableCell>
                    {vehicle.status === "Vendido" ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${vehicle.id}`}>
                        Vendido
                      </Badge>
                    ) : (
                      <Select
                        value={vehicle.status}
                        onValueChange={(newStatus: string) => {
                          updateMutation.mutate({ id: vehicle.id, status: newStatus as typeof VEHICLE_STATUS[number] });
                        }}
                      >
                        <SelectTrigger className="w-[180px]" data-testid={`select-change-status-${vehicle.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_STATUS.filter(s => s !== "Vendido").map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicle.owner?.name || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {vehicle.status !== "Vendido" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSellTarget({
                            id: vehicle.id,
                            name: `${vehicle.brand} ${vehicle.model}`,
                            price: vehicle.price || 0,
                          });
                        }}
                        data-testid={`button-sell-${vehicle.id}`}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Vender
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sellTarget && (
        <SellVehicleDialog
          vehicleId={sellTarget.id}
          vehicleName={sellTarget.name}
          askingPrice={sellTarget.price}
          open={!!sellTarget}
          onOpenChange={(open) => { if (!open) setSellTarget(null); }}
        />
      )}
    </div>
  );
}
