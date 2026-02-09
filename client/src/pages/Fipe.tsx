import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Car, Bike, Truck, Fuel, Calendar, DollarSign, Tag, Info, TrendingUp, TrendingDown, History } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

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

interface FipeHistoryEntry {
  month: string;
  price: string;
  reference: string;
}

const vehicleTypes: { value: VehicleType; label: string; icon: typeof Car }[] = [
  { value: "cars", label: "Carros", icon: Car },
  { value: "motorcycles", label: "Motos", icon: Bike },
  { value: "trucks", label: "Caminhões", icon: Truck },
];

function parseFipePrice(price: string): number {
  return parseFloat(price.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTH_MAP: Record<string, string> = {
  "janeiro": "jan", "fevereiro": "fev", "março": "mar", "abril": "abr",
  "maio": "mai", "junho": "jun", "julho": "jul", "agosto": "ago",
  "setembro": "set", "outubro": "out", "novembro": "nov", "dezembro": "dez",
};

function shortenMonth(ref: string): string {
  const parts = ref.split(" de ");
  if (parts.length === 2) {
    const abbr = MONTH_MAP[parts[0].toLowerCase()] || parts[0].substring(0, 3);
    return `${abbr}/${parts[1].slice(-2)}`;
  }
  return ref;
}

function getMonthDate(ref: string): Date {
  const parts = ref.split(" de ");
  if (parts.length === 2) {
    const monthNames = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const monthIdx = monthNames.indexOf(parts[0].toLowerCase());
    const year = parseInt(parts[1]);
    if (monthIdx >= 0 && !isNaN(year)) {
      return new Date(year, monthIdx, 1);
    }
  }
  return new Date(0);
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string; priceFormatted: string } }>;
}

function ChartTooltipContent({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground border rounded-md p-2 shadow-md text-sm">
      <p className="font-medium">{data.label}</p>
      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">{data.priceFormatted}</p>
    </div>
  );
}

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

  const { data: historyRaw, isLoading: loadingHistory } = useQuery<FipeHistoryEntry[]>({
    queryKey: [`/api/fipe/${vehicleType}/${result?.codeFipe}/years/${yearId}/history`],
    enabled: !!result?.codeFipe && !!yearId,
    staleTime: 1000 * 60 * 30,
  });

  const historyData = useMemo(() => {
    if (!historyRaw || !Array.isArray(historyRaw) || historyRaw.length === 0) return null;

    const sorted = [...historyRaw]
      .sort((a, b) => getMonthDate(a.reference).getTime() - getMonthDate(b.reference).getTime());

    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), 1);
    const filtered = sorted.filter(entry => getMonthDate(entry.reference) >= fiveYearsAgo);

    const entries = (filtered.length > 0 ? filtered : sorted.slice(-60));

    return entries.map(entry => ({
      label: shortenMonth(entry.reference),
      price: parseFipePrice(entry.price),
      priceFormatted: entry.price,
      reference: entry.reference,
    }));
  }, [historyRaw]);

  const historyStats = useMemo(() => {
    if (!historyData || historyData.length < 2) return null;
    const first = historyData[0];
    const last = historyData[historyData.length - 1];
    const diff = last.price - first.price;
    const pct = ((diff / first.price) * 100);
    const min = Math.min(...historyData.map(d => d.price));
    const max = Math.max(...historyData.map(d => d.price));
    return { diff, pct, min, max, firstLabel: first.label, lastLabel: last.label, isPositive: diff >= 0 };
  }, [historyData]);

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
                  <p className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-fipe-price-detail">{result.price}</p>
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

      {result && !loadingResult && !fetchingResult && (
        <Card data-testid="card-fipe-history">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Preços FIPE
              <span className="text-sm font-normal text-muted-foreground ml-1">(últimos 5 anos)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory && (
              <div className="space-y-4">
                <Skeleton className="h-[250px] w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </div>
            )}

            {!loadingHistory && historyData && historyData.length > 0 && (
              <div className="space-y-6">
                {historyStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-muted/50 rounded-md" data-testid="stat-history-variation">
                      <p className="text-xs text-muted-foreground mb-1">Variação no Período</p>
                      <div className="flex items-center gap-1.5">
                        {historyStats.isPositive ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        )}
                        <span className={`font-semibold text-sm ${historyStats.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {historyStats.isPositive ? "+" : ""}{historyStats.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-md" data-testid="stat-history-diff">
                      <p className="text-xs text-muted-foreground mb-1">Diferença (R$)</p>
                      <p className={`font-semibold text-sm ${historyStats.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {historyStats.isPositive ? "+" : ""}{formatBRL(historyStats.diff)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-md" data-testid="stat-history-min">
                      <p className="text-xs text-muted-foreground mb-1">Menor Valor</p>
                      <p className="font-semibold text-sm">{formatBRL(historyStats.min)}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-md" data-testid="stat-history-max">
                      <p className="text-xs text-muted-foreground mb-1">Maior Valor</p>
                      <p className="font-semibold text-sm">{formatBRL(historyStats.max)}</p>
                    </div>
                  </div>
                )}

                <div className="h-[280px] w-full" data-testid="chart-fipe-history">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        width={50}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="max-h-[300px] overflow-y-auto" data-testid="table-fipe-history">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Referência</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Preço FIPE</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...historyData].reverse().map((entry, idx, arr) => {
                        const prev = arr[idx + 1];
                        const diff = prev ? entry.price - prev.price : 0;
                        const pct = prev && prev.price > 0 ? ((diff / prev.price) * 100) : 0;
                        return (
                          <tr key={entry.label} className="border-b last:border-0" data-testid={`row-history-${idx}`}>
                            <td className="py-2 px-3 capitalize">{entry.reference}</td>
                            <td className="py-2 px-3 text-right font-mono">{entry.priceFormatted}</td>
                            <td className="py-2 px-3 text-right">
                              {prev ? (
                                <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                                  {diff > 0 ? "+" : ""}{pct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loadingHistory && (!historyData || historyData.length === 0) && (
              <div className="py-8 text-center">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Histórico de preços não disponível para este veículo.
                </p>
              </div>
            )}
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
