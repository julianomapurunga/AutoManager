import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertPerson } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/queryClient";

export function usePeople(type?: 'Proprietário' | 'Cliente', search?: string) {
  const queryKey = [api.people.list.path, { type, search }];
  
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (search) params.append("search", search);
  const queryString = params.toString() ? `?${params.toString()}` : "";

  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiFetch(api.people.list.path + queryString, { });
      if (!res.ok) throw new Error("Failed to fetch people");
      return api.people.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertPerson) => {
      const res = await apiFetch(api.people.create.path, {
        method: api.people.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create person");
      }
      return api.people.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.people.list.path] });
      toast({ title: "Sucesso", description: "Cadastro realizado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.people.delete.path, { id });
      const res = await apiFetch(url, { method: api.people.delete.method });
      if (!res.ok) throw new Error("Failed to delete person");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.people.list.path] });
      toast({ title: "Removido", description: "Cadastro removido." });
    },
  });
}
