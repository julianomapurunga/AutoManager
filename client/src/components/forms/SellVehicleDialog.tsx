import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useMarkAsSold } from "@/hooks/use-vehicles";
import { useIntermediaries } from "@/hooks/use-intermediaries";
import { CpfPersonLookup } from "./CpfPersonLookup";
import { formatCurrencyInput, parseCurrencyToNumber, centsToFormattedCurrency, formatMileageInput, parseMileageToNumber } from "./VehicleForm";
import { Calendar, Car, Users, Search, Check, ChevronDown, ChevronUp } from "lucide-react";
import { VEHICLE_BRANDS, VEHICLE_CONDITIONS } from "@shared/schema";
import type { Person } from "@shared/schema";

type VehicleType = "cars" | "motorcycles" | "trucks";
interface FipeBrand { code: string; name: string; }
interface FipeModel { code: string; name: string; }
interface FipeYear { code: string; name: string; }
interface FipeResult {
  brand: string; codeFipe: string; fuel: string;
  model: string; modelYear: number; price: string; referenceMonth: string;
}

const FIPE_BRAND_TO_SYSTEM: Record<string, string> = {
  "toyota": "Toyota", "honda": "Honda", "ford": "Ford",
  "gm - chevrolet": "Chevrolet", "chevrolet": "Chevrolet",
  "vw - volkswagen": "Volkswagen", "volkswagen": "Volkswagen",
  "fiat": "Fiat", "hyundai": "Hyundai", "renault": "Renault",
  "nissan": "Nissan", "jeep": "Jeep",
};

function matchFipeBrandToSystem(fipeBrandName: string): string {
  const lower = fipeBrandName.toLowerCase();
  for (const [key, value] of Object.entries(FIPE_BRAND_TO_SYSTEM)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return "Outra";
}

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
  const [salePriceDisplay, setSalePriceDisplay] = useState(() =>
    askingPrice > 0 ? centsToFormattedCurrency(askingPrice) : ""
  );
  const [selectedBuyer, setSelectedBuyer] = useState<Person | null>(null);
  const [saleDate, setSaleDate] = useState(todayStr());
  const [saleMileage, setSaleMileage] = useState("");

  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeInPlate, setTradeInPlate] = useState("");
  const [tradeInBrand, setTradeInBrand] = useState<string>("Fiat");
  const [tradeInModel, setTradeInModel] = useState("");
  const [tradeInColor, setTradeInColor] = useState("");
  const [tradeInYearFab, setTradeInYearFab] = useState("");
  const [tradeInYearModel, setTradeInYearModel] = useState("");
  const [tradeInCondition, setTradeInCondition] = useState("");
  const [tradeInMileage, setTradeInMileage] = useState("");
  const [tradeInValueDisplay, setTradeInValueDisplay] = useState("");
  const [tradeInFipeCode, setTradeInFipeCode] = useState<string | null>(null);
  const [tradeInFipePrice, setTradeInFipePrice] = useState<string | null>(null);

  const [fipeOpen, setFipeOpen] = useState(false);
  const [fipeVehicleType, setFipeVehicleType] = useState<VehicleType>("cars");
  const [fipeBrandId, setFipeBrandId] = useState("");
  const [fipeModelId, setFipeModelId] = useState("");
  const [fipeYearId, setFipeYearId] = useState("");
  const [fipeApplied, setFipeApplied] = useState(false);

  const [hasIntermediary, setHasIntermediary] = useState(false);
  const [selectedIntermediaryId, setSelectedIntermediaryId] = useState<string>("");
  const [commissionDisplay, setCommissionDisplay] = useState("");

  const sellMutation = useMarkAsSold();
  const { data: intermediaries } = useIntermediaries();

  const { data: fipeBrands, isLoading: loadingFipeBrands } = useQuery<FipeBrand[]>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands`],
    enabled: fipeOpen && hasTradeIn,
    staleTime: 1000 * 60 * 30,
  });
  const { data: fipeModels, isLoading: loadingFipeModels } = useQuery<FipeModel[]>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands/${fipeBrandId}/models`],
    enabled: fipeOpen && hasTradeIn && !!fipeBrandId,
    staleTime: 1000 * 60 * 30,
  });
  const { data: fipeYears, isLoading: loadingFipeYears } = useQuery<FipeYear[]>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands/${fipeBrandId}/models/${fipeModelId}/years`],
    enabled: fipeOpen && hasTradeIn && !!fipeBrandId && !!fipeModelId,
    staleTime: 1000 * 60 * 30,
  });
  const { data: fipeResult, isLoading: loadingFipeResult } = useQuery<FipeResult>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands/${fipeBrandId}/models/${fipeModelId}/years/${fipeYearId}`],
    enabled: fipeOpen && hasTradeIn && !!fipeBrandId && !!fipeModelId && !!fipeYearId,
    staleTime: 1000 * 60 * 10,
  });

  const applyFipeData = () => {
    if (!fipeResult) return;
    setTradeInBrand(matchFipeBrandToSystem(fipeResult.brand));
    setTradeInModel(fipeResult.model);
    setTradeInYearModel(String(fipeResult.modelYear));
    setTradeInFipeCode(fipeResult.codeFipe);
    setTradeInFipePrice(fipeResult.price);
    setFipeApplied(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salePriceCents = parseCurrencyToNumber(salePriceDisplay);
    if (salePriceCents <= 0) return;

    const data: any = {
      id: vehicleId,
      salePrice: salePriceCents,
      buyerId: selectedBuyer?.id || null,
      saleDate,
      saleMileage: saleMileage ? parseMileageToNumber(saleMileage) : null,
    };

    if (hasTradeIn && tradeInPlate && tradeInModel) {
      data.tradeInVehicle = {
        plate: tradeInPlate,
        brand: tradeInBrand,
        model: tradeInModel,
        color: tradeInColor || "N/I",
        yearFab: tradeInYearFab ? Number(tradeInYearFab) : null,
        yearModel: tradeInYearModel ? Number(tradeInYearModel) : null,
        condition: tradeInCondition || null,
        mileage: tradeInMileage ? parseMileageToNumber(tradeInMileage) : null,
        acquisitionPrice: parseCurrencyToNumber(tradeInValueDisplay) || null,
        fipeCode: tradeInFipeCode,
        fipePrice: tradeInFipePrice,
      };
      data.tradeInValue = parseCurrencyToNumber(tradeInValueDisplay) || null;
    }

    if (hasIntermediary && selectedIntermediaryId) {
      data.intermediaryId = Number(selectedIntermediaryId);
      data.intermediaryCommission = parseCurrencyToNumber(commissionDisplay) || null;
    }

    sellMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      }
    });
  };

  const resetForm = () => {
    setSalePriceDisplay("");
    setSelectedBuyer(null);
    setSaleDate(todayStr());
    setSaleMileage("");
    setHasTradeIn(false);
    setTradeInPlate("");
    setTradeInModel("");
    setTradeInColor("");
    setTradeInYearFab("");
    setTradeInYearModel("");
    setTradeInCondition("");
    setTradeInMileage("");
    setTradeInValueDisplay("");
    setTradeInFipeCode(null);
    setTradeInFipePrice(null);
    setFipeOpen(false);
    setFipeBrandId("");
    setFipeModelId("");
    setFipeYearId("");
    setFipeApplied(false);
    setHasIntermediary(false);
    setSelectedIntermediaryId("");
    setCommissionDisplay("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Venda</DialogTitle>
          <DialogDescription>
            Marcar <strong>{vehicleName}</strong> como vendido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor de Venda (R$)</Label>
              <Input
                placeholder="R$ 0,00"
                value={salePriceDisplay}
                onChange={(e) => setSalePriceDisplay(formatCurrencyInput(e.target.value))}
                required
                data-testid="input-sale-price"
              />
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
          </div>

          <div className="space-y-2">
            <Label>Quilometragem na Venda (km)</Label>
            <Input
              placeholder="Ex: 55.000"
              value={saleMileage}
              onChange={(e) => setSaleMileage(formatMileageInput(e.target.value))}
              data-testid="input-sale-mileage"
            />
          </div>

          <CpfPersonLookup
            label="Comprador"
            personType="Cliente"
            selectedPerson={selectedBuyer}
            onPersonChange={setSelectedBuyer}
            optional
          />

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="hasTradeIn"
              checked={hasTradeIn}
              onCheckedChange={(checked) => setHasTradeIn(!!checked)}
              data-testid="checkbox-trade-in"
            />
            <Label htmlFor="hasTradeIn" className="flex items-center gap-1.5 cursor-pointer">
              <Car className="w-4 h-4" />
              Veículo de troca (entrada)
            </Label>
          </div>

          {hasTradeIn && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dados do Veículo de Troca</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Card>
                  <CardHeader className="cursor-pointer pb-2 py-2 px-3" onClick={() => setFipeOpen(!fipeOpen)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        Buscar na FIPE
                      </span>
                      {fipeOpen ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                  {fipeOpen && (
                    <CardContent className="space-y-2 pt-0 px-3 pb-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {(["cars", "motorcycles", "trucks"] as VehicleType[]).map((type) => (
                          <Button
                            key={type}
                            type="button"
                            size="sm"
                            variant={fipeVehicleType === type ? "default" : "outline"}
                            onClick={() => { setFipeVehicleType(type); setFipeBrandId(""); setFipeModelId(""); setFipeYearId(""); setFipeApplied(false); }}
                            data-testid={`button-trade-fipe-type-${type}`}
                          >
                            {type === "cars" ? "Carros" : type === "motorcycles" ? "Motos" : "Caminhões"}
                          </Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Marca</label>
                          {loadingFipeBrands ? <Skeleton className="h-9 w-full" /> : (
                            <Select value={fipeBrandId} onValueChange={(v) => { setFipeBrandId(v); setFipeModelId(""); setFipeYearId(""); setFipeApplied(false); }}>
                              <SelectTrigger data-testid="select-trade-fipe-brand"><SelectValue placeholder="Marca" /></SelectTrigger>
                              <SelectContent>{fipeBrands?.map((b) => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Modelo</label>
                          {loadingFipeModels ? <Skeleton className="h-9 w-full" /> : (
                            <Select value={fipeModelId} onValueChange={(v) => { setFipeModelId(v); setFipeYearId(""); setFipeApplied(false); }} disabled={!fipeBrandId}>
                              <SelectTrigger data-testid="select-trade-fipe-model"><SelectValue placeholder="Modelo" /></SelectTrigger>
                              <SelectContent>{fipeModels?.map((m) => <SelectItem key={m.code} value={String(m.code)}>{m.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Ano</label>
                          {loadingFipeYears ? <Skeleton className="h-9 w-full" /> : (
                            <Select value={fipeYearId} onValueChange={(v) => { setFipeYearId(v); setFipeApplied(false); }} disabled={!fipeModelId}>
                              <SelectTrigger data-testid="select-trade-fipe-year"><SelectValue placeholder="Ano" /></SelectTrigger>
                              <SelectContent>{fipeYears?.map((y) => <SelectItem key={y.code} value={y.code}>{y.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                      {loadingFipeResult && <Skeleton className="h-10 w-full" />}
                      {fipeResult && !loadingFipeResult && (
                        <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md text-xs flex-wrap">
                          <div>
                            <span className="font-medium">{fipeResult.model}</span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className="font-mono font-bold text-emerald-600">{fipeResult.price}</span>
                          </div>
                          <Button type="button" size="sm" onClick={applyFipeData} disabled={fipeApplied} data-testid="button-apply-trade-fipe">
                            {fipeApplied ? <><Check className="w-3 h-3 mr-1" />Aplicado</> : "Aplicar"}
                          </Button>
                        </div>
                      )}
                      {fipeApplied && (
                        <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate">
                          Dados FIPE aplicados
                        </Badge>
                      )}
                    </CardContent>
                  )}
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Placa *</Label>
                    <Input placeholder="ABC-1234" value={tradeInPlate} onChange={(e) => setTradeInPlate(e.target.value.toUpperCase())} maxLength={8} required data-testid="input-trade-plate" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Marca</Label>
                    <Select value={tradeInBrand} onValueChange={setTradeInBrand}>
                      <SelectTrigger data-testid="select-trade-brand"><SelectValue placeholder="Marca" /></SelectTrigger>
                      <SelectContent>{VEHICLE_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modelo *</Label>
                    <Input placeholder="Ex: Civic" value={tradeInModel} onChange={(e) => setTradeInModel(e.target.value)} required data-testid="input-trade-model" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <Input placeholder="Ex: Branco" value={tradeInColor} onChange={(e) => setTradeInColor(e.target.value)} data-testid="input-trade-color" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano Fab.</Label>
                    <Input type="number" placeholder="2020" value={tradeInYearFab} onChange={(e) => setTradeInYearFab(e.target.value)} data-testid="input-trade-year-fab" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano Modelo</Label>
                    <Input type="number" placeholder="2021" value={tradeInYearModel} onChange={(e) => setTradeInYearModel(e.target.value)} data-testid="input-trade-year-model" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Condição</Label>
                    <Select value={tradeInCondition} onValueChange={setTradeInCondition}>
                      <SelectTrigger data-testid="select-trade-condition"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{VEHICLE_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">KM</Label>
                    <Input placeholder="45.000" value={tradeInMileage} onChange={(e) => setTradeInMileage(formatMileageInput(e.target.value))} data-testid="input-trade-mileage" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor da Troca (R$)</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={tradeInValueDisplay}
                    onChange={(e) => setTradeInValueDisplay(formatCurrencyInput(e.target.value))}
                    data-testid="input-trade-value"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasIntermediary"
              checked={hasIntermediary}
              onCheckedChange={(checked) => setHasIntermediary(!!checked)}
              data-testid="checkbox-intermediary"
            />
            <Label htmlFor="hasIntermediary" className="flex items-center gap-1.5 cursor-pointer">
              <Users className="w-4 h-4" />
              Intermediário (corretor)
            </Label>
          </div>

          {hasIntermediary && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Selecionar Intermediário</Label>
                  <Select value={selectedIntermediaryId} onValueChange={setSelectedIntermediaryId}>
                    <SelectTrigger data-testid="select-intermediary">
                      <SelectValue placeholder="Selecione um intermediário" />
                    </SelectTrigger>
                    <SelectContent>
                      {intermediaries?.map((int) => (
                        <SelectItem key={int.id} value={String(int.id)}>
                          {int.name} - {int.cpf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Comissão (R$)</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={commissionDisplay}
                    onChange={(e) => setCommissionDisplay(formatCurrencyInput(e.target.value))}
                    data-testid="input-commission"
                  />
                </div>
              </CardContent>
            </Card>
          )}

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
