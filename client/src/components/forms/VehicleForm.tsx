import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { CpfPersonLookup } from "./CpfPersonLookup";

const formSchema = insertVehicleSchema.extend({
  price: z.string().optional(),
  yearFab: z.coerce.number().min(1900).max(2100).optional().nullable(),
  yearModel: z.coerce.number().min(1900).max(2100).optional().nullable(),
  ownerId: z.coerce.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
