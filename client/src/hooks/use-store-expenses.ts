import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { StoreExpense, InsertStoreExpense } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useStoreExpenses() {
  return useQuery<StoreExpense[]>({
    queryKey: [api.storeExpenses.list.path],
    queryFn: async () => {
      const res = await fetch(api.storeExpenses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch store expenses");
      return res.json();
    },
  });
}

export function useCreateStoreExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertStoreExpense) => {
      const res = await fetch(api.storeExpenses.create.path, {
        method: api.storeExpenses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create store expense");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.storeExpenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Sucesso", description: "Despesa da loja registrada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteStoreExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.storeExpenses.delete.path, { id });
      const res = await fetch(url, { method: api.storeExpenses.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete store expense");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.storeExpenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Removido", description: "Despesa da loja removida." });
    },
  });
}
