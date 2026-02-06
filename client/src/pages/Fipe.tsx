import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Car, Bike, Truck, Fuel, Calendar, DollarSign, Tag, Info } from "lucide-react";

type VehicleType = "cars" | "motorcycles" | "trucks";

interface FipeBrand {
  code: string;
  name: string;
}

interface FipeModel {
  code: string;
  name: string;
}

interface FipeYear {
  code: string;
  name: string;
}

interface FipeResult {
  brand: string;
  codeFipe: string;
  fuel: string;
  fuelAcronym: string;
  model: string;
  modelYear: number;
  price: string;
  referenceMonth: string;
  vehicleType: number;
}

const vehicleTypes: { value: VehicleType; label: string; icon: typeof Car }[] = [
  { value: "cars", label: "Carros", icon: Car },
  { value: "motorcycles", label: "Motos", icon: Bike },
  { value: "trucks", label: "Caminhões", icon: Truck },
];

export default function Fipe() {
  const [vehicleType, setVehicleType] = useState<VehicleType>("cars");
  const [brandId, setBrandId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [yearId, setYearId] = useState<string>("");

  const { data: brands, isLoading: loadingBrands } = useQuery<FipeBrand[]>({
    queryKey: [`/api/fipe/${vehicleType}/brands`],
    staleTime: 1000 * 60 * 30,
  });

  const { data: models, isLoading: loadingModels } = useQuery<FipeModel[]>({
    queryKey: [`/api/fipe/${vehicleType}/brands/${brandId}/models`],
    enabled: !!brandId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: years, isLoading: loadingYears } = useQuery<FipeYear[]>({
    queryKey: [`/api/fipe/${vehicleType}/brands/${brandId}/models/${modelId}/years`],
    enabled: !!brandId && !!modelId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: result, isLoading: loadingResult, isFetching: fetchingResult } = useQuery<FipeResult>({
    queryKey: [`/api/fipe/${vehicleType}/brands/${brandId}/models/${modelId}/years/${yearId}`],
    enabled: !!brandId && !!modelId && !!yearId,
    staleTime: 1000 * 60 * 10,
  });

  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type);
    setBrandId("");
    setModelId("");
    setYearId("");
  };

  const handleBrandChange = (value: string) => {
    setBrandId(value);
    setModelId("");
    setYearId("");
  };

  const handleModelChange = (value: string) => {
    setModelId(value);
    setYearId("");
  };

  const handleClear = () => {
    setBrandId("");
    setModelId("");
    setYearId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Consulta FIPE</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">Consulte o valor de veículos na Tabela FIPE</p>
        </div>
        {(brandId || modelId || yearId) && (
          <Button variant="outline" onClick={handleClear} data-testid="button-clear-fipe">
            Limpar Consulta
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block" data-testid="label-vehicle-type">Tipo de Veículo</label>
            <div className="flex gap-2 flex-wrap">
              {vehicleTypes.map((type) => {
                const Icon = type.icon;
                const isActive = vehicleType === type.value;
                return (
                  <Button
                    key={type.value}
                    variant={isActive ? "default" : "outline"}
                    onClick={() => handleVehicleTypeChange(type.value)}
                    data-testid={`button-type-${type.value}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block" data-testid="label-brand">Marca</label>
              {loadingBrands ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={brandId} onValueChange={handleBrandChange}>
                  <SelectTrigger data-testid="select-fipe-brand">
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map((brand) => (
                      <SelectItem key={brand.code} value={brand.code} data-testid={`option-brand-${brand.code}`}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block" data-testid="label-model">Modelo</label>
              {loadingModels ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={modelId} onValueChange={handleModelChange} disabled={!brandId}>
                  <SelectTrigger data-testid="select-fipe-model">
                    <SelectValue placeholder={brandId ? "Selecione o modelo" : "Selecione a marca primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.code} value={String(model.code)} data-testid={`option-model-${model.code}`}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block" data-testid="label-year">Ano</label>
              {loadingYears ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={yearId} onValueChange={setYearId} disabled={!modelId}>
                  <SelectTrigger data-testid="select-fipe-year">
                    <SelectValue placeholder={modelId ? "Selecione o ano" : "Selecione o modelo primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {years?.map((year) => (
                      <SelectItem key={year.code} value={year.code} data-testid={`option-year-${year.code}`}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(loadingResult || fetchingResult) && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loadingResult && !fetchingResult && (
        <Card data-testid="card-fipe-result">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-xl" data-testid="text-fipe-result-model">{result.model}</CardTitle>
                <p className="text-muted-foreground mt-1" data-testid="text-fipe-result-brand">{result.brand}</p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1 no-default-hover-elevate no-default-active-elevate" data-testid="text-fipe-result-price">
                {result.price}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="info-fipe-code">
                <Tag className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Código FIPE</p>
                  <p className="font-medium font-mono" data-testid="text-fipe-code">{result.codeFipe}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="info-fipe-year">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Ano Modelo</p>
                  <p className="font-medium" data-testid="text-fipe-year">{result.modelYear}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="info-fipe-fuel">
                <Fuel className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Combustível</p>
                  <p className="font-medium" data-testid="text-fipe-fuel">{result.fuel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="info-fipe-price">
                <DollarSign className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Preço FIPE</p>
                  <p className="font-medium text-emerald-600" data-testid="text-fipe-price-detail">{result.price}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="info-fipe-reference">
                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Mês Referência</p>
                  <p className="font-medium capitalize" data-testid="text-fipe-reference">{result.referenceMonth}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="info-fipe-type">
                {vehicleType === "cars" && <Car className="w-5 h-5 text-muted-foreground shrink-0" />}
                {vehicleType === "motorcycles" && <Bike className="w-5 h-5 text-muted-foreground shrink-0" />}
                {vehicleType === "trucks" && <Truck className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium" data-testid="text-fipe-vehicle-type">
                    {vehicleType === "cars" ? "Carro" : vehicleType === "motorcycles" ? "Moto" : "Caminhão"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!result && !loadingResult && !fetchingResult && yearId === "" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Consulte a Tabela FIPE</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Selecione o tipo de veículo, marca, modelo e ano para consultar o valor na Tabela FIPE.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
