import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { VehicleImage } from "@shared/schema";

export function useVehicleImages(vehicleId: number) {
  return useQuery<VehicleImage[]>({
    queryKey: ["/api/vehicles", vehicleId, "images"],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${vehicleId}/images`, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar imagens");
      return res.json();
    },
    enabled: !!vehicleId,
  });
}

export function useUploadVehicleImages() {
  return useMutation({
    mutationFn: async ({ vehicleId, files }: { vehicleId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      const res = await fetch(`/api/vehicles/${vehicleId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erro ao enviar imagens" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vars.vehicleId, "images"] });
    },
  });
}

export function useDeleteVehicleImage() {
  return useMutation({
    mutationFn: async ({ imageId, vehicleId }: { imageId: number; vehicleId: number }) => {
      await apiRequest("DELETE", `/api/vehicle-images/${imageId}`);
      return vehicleId;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vars.vehicleId, "images"] });
    },
  });
}

export function useDeleteAllVehicleImages() {
  return useMutation({
    mutationFn: async (vehicleId: number) => {
      await apiRequest("DELETE", `/api/vehicles/${vehicleId}/images`);
      return vehicleId;
    },
    onSuccess: (_data, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "images"] });
    },
  });
}
