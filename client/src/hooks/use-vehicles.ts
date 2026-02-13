import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertVehicle, Vehicle, Person, Expense, VehicleWithDetails } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

type VehicleListItem = Vehicle & { owner: Person };

export function useVehicles(filters?: { status?: string; search?: string }) {
  const queryKey = [api.vehicles.list.path, filters];
  
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);
  const queryString = params.toString() ? `?${params.toString()}` : "";

  return useQuery<VehicleListItem[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(api.vehicles.list.path + queryString, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
  });
}

export function useVehicle(id: number) {
  return useQuery<VehicleWithDetails | null>({
    queryKey: [api.vehicles.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.vehicles.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch vehicle details");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertVehicle) => {
      const res = await fetch(api.vehicles.create.path, {
        method: api.vehicles.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create vehicle");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Sucesso", description: "Veículo cadastrado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertVehicle>) => {
      const url = buildUrl(api.vehicles.update.path, { id });
      const res = await fetch(url, {
        method: api.vehicles.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update vehicle");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Atualizado", description: "Dados do veículo atualizados." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.vehicles.delete.path, { id });
      const res = await fetch(url, { method: api.vehicles.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Removido", description: "Veículo removido do sistema." });
    },
  });
}

interface SellData {
  id: number;
  salePrice: number;
  buyerId: number | null;
  saleDate?: string;
  saleMileage?: number | null;
  tradeInVehicle?: {
    plate: string;
    brand: string;
    model: string;
    color: string;
    yearFab?: number | null;
    yearModel?: number | null;
    condition?: string | null;
    mileage?: number | null;
    acquisitionPrice?: number | null;
    price?: number | null;
    fipeCode?: string | null;
    fipePrice?: string | null;
    ownerId?: number | null;
    notes?: string | null;
  } | null;
  tradeInValue?: number | null;
  intermediaryId?: number | null;
  intermediaryCommission?: number | null;
}

export function useMarkAsSold() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: SellData) => {
      const url = buildUrl(api.sales.markAsSold.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao registrar venda");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Venda registrada", description: "Veículo marcado como vendido." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
