import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/queryClient";

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.get.path],
    queryFn: async () => {
      const res = await apiFetch(api.dashboard.get.path, { });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.dashboard.get.responses[200].parse(await res.json());
    },
  });
}
