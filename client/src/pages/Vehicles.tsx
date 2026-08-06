import { useState } from "react";
import { Link } from "wouter";
import { useVehicles, useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, ShoppingCart, Camera, Copy, Check } from "lucide-react";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { SellVehicleDialog } from "@/components/forms/SellVehicleDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEHICLE_STATUS } from "@shared/schema";
import { StatusBadge } from "@/components/ui/status-badge";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<{ id: number; name: string; price: number } | null>(null);
  const [photoTarget, setPhotoTarget] = useState<{ id: number; name: string } | null>(null);
  const [photoLink, setPhotoLink] = useState<{ url: string; expiresInMinutes: number } | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const openPhotoQr = async (vehicle: { id: number; name: string }) => {
    setPhotoTarget(vehicle);
    setPhotoLink(null);
    setCopied(false);
    setPhotoLoading(true);
    try {
      const res = await apiRequest("POST", `/api/vehicles/${vehicle.id}/photo-link`);
      const { token, expiresInMinutes } = await res.json();
      setPhotoLink({ url: `${window.location.origin}/enviar-fotos/${token}`, expiresInMinutes });
    } catch (err: any) {
      toast({ title: "Não foi possível gerar o QR code", description: err.message, variant: "destructive" });
      setPhotoTarget(null);
    } finally {
      setPhotoLoading(false);
    }
  };

  const copyPhotoLink = async () => {
    if (!photoLink) return;
    try {
      await navigator.clipboard.writeText(photoLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

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
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
              <TableHead className="text-center">Status</TableHead>
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
                  <TableCell>{vehicle.yearFab && vehicle.yearModel ? `${vehicle.yearFab}/${vehicle.yearModel}` : vehicle.yearFab || vehicle.yearModel || "-"}</TableCell>
                  <TableCell className="font-medium text-emerald-600 font-mono">
                    {formatCurrency(vehicle.price || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {vehicle.status === "Vendido" ? (
                      <StatusBadge status="Vendido" data-testid={`badge-status-${vehicle.id}`} />
                    ) : (
                      <Select
                        value={vehicle.status}
                        onValueChange={(newStatus: string) => {
                          updateMutation.mutate({ id: vehicle.id, status: newStatus as typeof VEHICLE_STATUS[number] });
                        }}
                      >
                        <SelectTrigger className="w-auto border-0 bg-transparent shadow-none p-0 h-auto justify-center gap-1" data-testid={`select-change-status-${vehicle.id}`}>
                          <StatusBadge status={vehicle.status} />
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
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPhotoQr({ id: vehicle.id, name: `${vehicle.brand} ${vehicle.model}` });
                        }}
                        data-testid={`button-photos-${vehicle.id}`}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Inserir fotos
                      </Button>
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
                    </div>
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

      <Dialog open={!!photoTarget} onOpenChange={(open) => { if (!open) { setPhotoTarget(null); setPhotoLink(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Inserir fotos — {photoTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR code com o celular para tirar e enviar as fotos deste veículo.
            </p>
            {photoLoading && <p className="text-sm text-muted-foreground py-8">Gerando QR code…</p>}
            {photoLink && (
              <>
                <div className="rounded-lg bg-white p-4">
                  <QRCodeSVG value={photoLink.url} size={200} level="M" />
                </div>
                <p className="text-xs text-muted-foreground">
                  O link vale por {Math.round(photoLink.expiresInMinutes / 60)}h. Depois é só gerar outro.
                </p>
                <div className="flex w-full items-center gap-2">
                  <Input readOnly value={photoLink.url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="outline" size="icon" onClick={copyPhotoLink} data-testid="button-copy-photo-link">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
