import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertExpense } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertExpense) => {
      const res = await fetch(api.expenses.create.path, {
        method: api.expenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add expense");
      }
      return api.expenses.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.get.path, variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Despesa adicionada", description: "Valor registrado no veículo." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: number; vehicleId: number }) => {
      const url = buildUrl(api.expenses.delete.path, { id });
      const res = await fetch(url, { method: api.expenses.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete expense");
      return { vehicleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.get.path, data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Despesa removida", description: "Valor estornado do veículo." });
    },
  });
}
