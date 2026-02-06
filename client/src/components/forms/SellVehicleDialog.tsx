import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePeople } from "@/hooks/use-people";
import { useMarkAsSold } from "@/hooks/use-vehicles";
import { DollarSign, Calendar } from "lucide-react";

interface SellVehicleDialogProps {
  vehicleId: number;
  vehicleName: string;
  askingPrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function SellVehicleDialog({ vehicleId, vehicleName, askingPrice, open, onOpenChange }: SellVehicleDialogProps) {
  const [salePrice, setSalePrice] = useState(askingPrice > 0 ? (askingPrice / 100).toString() : "");
  const [buyerId, setBuyerId] = useState<string>("");
  const [saleDate, setSaleDate] = useState(todayStr());
  const { data: clients } = usePeople("Cliente");
  const sellMutation = useMarkAsSold();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salePriceCents = Math.round(Number(salePrice) * 100);
    if (salePriceCents <= 0) return;

    sellMutation.mutate({
      id: vehicleId,
      salePrice: salePriceCents,
      buyerId: buyerId && buyerId !== "none" ? Number(buyerId) : null,
      saleDate,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSalePrice("");
        setBuyerId("");
        setSaleDate(todayStr());
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Venda</DialogTitle>
          <DialogDescription>
            Marcar <strong>{vehicleName}</strong> como vendido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Valor de Venda (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-10"
                required
                data-testid="input-sale-price"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data da Venda</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="pl-10"
                required
                data-testid="input-sale-date"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Comprador (opcional)</Label>
            <Select value={buyerId} onValueChange={setBuyerId}>
              <SelectTrigger data-testid="select-buyer">
                <SelectValue placeholder="Selecione o comprador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem comprador definido</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={sellMutation.isPending} data-testid="button-confirm-sale">
              {sellMutation.isPending ? "Registrando..." : "Confirmar Venda"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
