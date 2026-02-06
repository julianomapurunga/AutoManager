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
  price: z.coerce.number(),
  year: z.coerce.number(),
  ownerId: z.coerce.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VehicleFormProps {
  defaultValues?: Partial<FormData>;
  defaultOwner?: Person | null;
  onSubmit: (data: any) => void;
  isPending: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}

export function VehicleForm({ defaultValues, defaultOwner, onSubmit, isPending, onCancel, isEdit = false }: VehicleFormProps) {
  const [selectedOwner, setSelectedOwner] = useState<Person | null>(defaultOwner || null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "Aguardando Preparação",
      brand: "Toyota",
      notes: "",
      ...defaultValues,
      price: defaultValues?.price ? defaultValues.price / 100 : undefined,
      ownerId: defaultValues?.ownerId || null,
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      price: Math.round(data.price * 100),
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
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2024" {...field} data-testid="input-year" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-price" />
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
