import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Intermediary } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useIntermediaries() {
  return useQuery<Intermediary[]>({
    queryKey: [api.intermediaries.list.path],
  });
}

export function useCreateIntermediary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.intermediaries.create.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao criar intermediário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.intermediaries.list.path] });
      toast({ title: "Intermediário cadastrado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateIntermediary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const url = buildUrl(api.intermediaries.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        body: data,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao atualizar intermediário");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.intermediaries.list.path] });
      toast({ title: "Intermediário atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteIntermediary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.intermediaries.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erro ao excluir intermediário");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.intermediaries.list.path] });
      toast({ title: "Intermediário excluído" });
    },
  });
}
