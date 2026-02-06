import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertVehicleSchema, VEHICLE_STATUS, VEHICLE_BRANDS } from "@shared/schema";
import type { Person } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CpfPersonLookup } from "./CpfPersonLookup";
import { Search, Check, ChevronDown, ChevronUp } from "lucide-react";

const formSchema = insertVehicleSchema.extend({
  price: z.string().optional(),
  yearFab: z.coerce.number().min(1900).max(2100).optional().nullable(),
  yearModel: z.coerce.number().min(1900).max(2100).optional().nullable(),
  ownerId: z.coerce.number().nullable().optional(),
  fipeCode: z.string().nullable().optional(),
  fipePrice: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
  model: string;
  modelYear: number;
  price: string;
  referenceMonth: string;
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const reais = (cents / 100).toFixed(2);
  const [intPart, decPart] = reais.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formatted},${decPart}`;
}

function parseCurrencyToNumber(value: string): number {
  const digits = value.replace(/\D/g, "");
  return parseInt(digits, 10) || 0;
}

function centsToFormattedCurrency(cents: number): string {
  if (!cents) return "";
  const reais = (cents / 100).toFixed(2);
  const [intPart, decPart] = reais.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formatted},${decPart}`;
}

const FIPE_BRAND_TO_SYSTEM: Record<string, string> = {
  "toyota": "Toyota",
  "honda": "Honda",
  "ford": "Ford",
  "gm - chevrolet": "Chevrolet",
  "chevrolet": "Chevrolet",
  "vw - volkswagen": "Volkswagen",
  "volkswagen": "Volkswagen",
  "fiat": "Fiat",
  "hyundai": "Hyundai",
  "renault": "Renault",
  "nissan": "Nissan",
  "jeep": "Jeep",
};

function matchFipeBrandToSystem(fipeBrandName: string): string {
  const lower = fipeBrandName.toLowerCase();
  for (const [key, value] of Object.entries(FIPE_BRAND_TO_SYSTEM)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }
  return "Outra";
}

interface VehicleFormProps {
  defaultValues?: Partial<FormData & { price: any }>;
  defaultOwner?: Person | null;
  onSubmit: (data: any) => void;
  isPending: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}

export function VehicleForm({ defaultValues, defaultOwner, onSubmit, isPending, onCancel, isEdit = false }: VehicleFormProps) {
  const [selectedOwner, setSelectedOwner] = useState<Person | null>(defaultOwner || null);
  const [priceDisplay, setPriceDisplay] = useState(() => {
    const p = defaultValues?.price;
    if (typeof p === "number" && p > 0) return centsToFormattedCurrency(p);
    return "";
  });

  const [fipeOpen, setFipeOpen] = useState(false);
  const [fipeVehicleType, setFipeVehicleType] = useState<VehicleType>("cars");
  const [fipeBrandId, setFipeBrandId] = useState("");
  const [fipeModelId, setFipeModelId] = useState("");
  const [fipeYearId, setFipeYearId] = useState("");
  const [fipeApplied, setFipeApplied] = useState(false);

  const { data: fipeBrands, isLoading: loadingFipeBrands } = useQuery<FipeBrand[]>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands`],
    enabled: fipeOpen,
    staleTime: 1000 * 60 * 30,
  });

  const { data: fipeModels, isLoading: loadingFipeModels } = useQuery<FipeModel[]>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands/${fipeBrandId}/models`],
    enabled: fipeOpen && !!fipeBrandId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: fipeYears, isLoading: loadingFipeYears } = useQuery<FipeYear[]>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands/${fipeBrandId}/models/${fipeModelId}/years`],
    enabled: fipeOpen && !!fipeBrandId && !!fipeModelId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: fipeResult, isLoading: loadingFipeResult } = useQuery<FipeResult>({
    queryKey: [`/api/fipe/${fipeVehicleType}/brands/${fipeBrandId}/models/${fipeModelId}/years/${fipeYearId}`],
    enabled: fipeOpen && !!fipeBrandId && !!fipeModelId && !!fipeYearId,
    staleTime: 1000 * 60 * 10,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "Aguardando Preparação",
      brand: "Toyota",
      notes: "",
      ...defaultValues,
      price: defaultValues?.price ? String(defaultValues.price) : "",
      ownerId: defaultValues?.ownerId || null,
    },
  });

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCurrencyInput(raw);
    setPriceDisplay(formatted);
    form.setValue("price", String(parseCurrencyToNumber(raw)));
  };

  const handleSubmit = (data: FormData) => {
    const priceInCents = parseCurrencyToNumber(priceDisplay);
    onSubmit({
      ...data,
      price: priceInCents,
      ownerId: selectedOwner?.id || null,
    });
  };

  const handleFipeVehicleTypeChange = (type: VehicleType) => {
    setFipeVehicleType(type);
    setFipeBrandId("");
    setFipeModelId("");
    setFipeYearId("");
    setFipeApplied(false);
  };

  const handleFipeBrandChange = (value: string) => {
    setFipeBrandId(value);
    setFipeModelId("");
    setFipeYearId("");
    setFipeApplied(false);
  };

  const handleFipeModelChange = (value: string) => {
    setFipeModelId(value);
    setFipeYearId("");
    setFipeApplied(false);
  };

  const handleFipeYearChange = (value: string) => {
    setFipeYearId(value);
    setFipeApplied(false);
  };

  const applyFipeData = () => {
    if (!fipeResult) return;

    const matchedBrand = matchFipeBrandToSystem(fipeResult.brand);
    form.setValue("brand", matchedBrand as any);
    form.setValue("model", fipeResult.model);
    form.setValue("yearModel", fipeResult.modelYear);
    form.setValue("fipeCode", fipeResult.codeFipe);
    form.setValue("fipePrice", fipeResult.price);
    setFipeApplied(true);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="cursor-pointer pb-3" onClick={() => setFipeOpen(!fipeOpen)} data-testid="button-toggle-fipe-lookup">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar na Tabela FIPE
              </CardTitle>
              {fipeOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Preencha os dados do veículo a partir da FIPE</p>
          </CardHeader>
          {fipeOpen && (
            <CardContent className="space-y-3 pt-0">
              <div className="flex gap-2 flex-wrap">
                {(["cars", "motorcycles", "trucks"] as VehicleType[]).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant={fipeVehicleType === type ? "default" : "outline"}
                    onClick={() => handleFipeVehicleTypeChange(type)}
                    data-testid={`button-fipe-type-${type}`}
                  >
                    {type === "cars" ? "Carros" : type === "motorcycles" ? "Motos" : "Caminhões"}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Marca FIPE</label>
                  {loadingFipeBrands ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={fipeBrandId} onValueChange={handleFipeBrandChange}>
                      <SelectTrigger data-testid="select-fipe-brand-form">
                        <SelectValue placeholder="Marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {fipeBrands?.map((b) => (
                          <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo FIPE</label>
                  {loadingFipeModels ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={fipeModelId} onValueChange={handleFipeModelChange} disabled={!fipeBrandId}>
                      <SelectTrigger data-testid="select-fipe-model-form">
                        <SelectValue placeholder={fipeBrandId ? "Modelo" : "Selecione a marca"} />
                      </SelectTrigger>
                      <SelectContent>
                        {fipeModels?.map((m) => (
                          <SelectItem key={m.code} value={String(m.code)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ano FIPE</label>
                  {loadingFipeYears ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={fipeYearId} onValueChange={handleFipeYearChange} disabled={!fipeModelId}>
                      <SelectTrigger data-testid="select-fipe-year-form">
                        <SelectValue placeholder={fipeModelId ? "Ano" : "Selecione o modelo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {fipeYears?.map((y) => (
                          <SelectItem key={y.code} value={y.code}>{y.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {loadingFipeResult && (
                <Skeleton className="h-12 w-full" />
              )}

              {fipeResult && !loadingFipeResult && (
                <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-md flex-wrap">
                  <div className="text-sm">
                    <span className="font-medium">{fipeResult.model}</span>
                    <span className="text-muted-foreground mx-2">-</span>
                    <span className="font-mono font-bold text-emerald-600">{fipeResult.price}</span>
                    <span className="text-muted-foreground ml-2 text-xs">({fipeResult.codeFipe})</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyFipeData}
                    disabled={fipeApplied}
                    data-testid="button-apply-fipe"
                  >
                    {fipeApplied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Aplicado
                      </>
                    ) : (
                      "Aplicar Dados"
                    )}
                  </Button>
                </div>
              )}

              {fipeApplied && (
                <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid="badge-fipe-applied">
                  Dados FIPE aplicados ao formulário
                </Badge>
              )}
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa</FormLabel>
                <FormControl>
                  <Input placeholder="ABC-1234" {...field} className="uppercase" maxLength={8} data-testid="input-plate" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-brand">
                      <SelectValue placeholder="Selecione a marca" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VEHICLE_BRANDS.map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Corolla XEi" {...field} data-testid="input-model" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Prata" {...field} data-testid="input-color" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="yearFab"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano Fabricação</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2024" {...field} value={field.value ?? ""} data-testid="input-year-fab" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="yearModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano Modelo</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2025" {...field} value={field.value ?? ""} data-testid="input-year-model" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={() => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="R$ 0,00"
                    value={priceDisplay}
                    onChange={handlePriceChange}
                    data-testid="input-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <CpfPersonLookup
          label="Proprietário"
          personType="Proprietário"
          selectedPerson={selectedOwner}
          onPersonChange={setSelectedOwner}
          optional
        />

        {isEdit && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VEHICLE_STATUS.filter(s => s !== "Vendido").map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input placeholder="Detalhes adicionais..." {...field} value={field.value || ""} data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-vehicle">
            {isPending ? "Salvando..." : "Salvar Veículo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
