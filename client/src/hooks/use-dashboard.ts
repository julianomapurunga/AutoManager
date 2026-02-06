import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.get.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.dashboard.get.responses[200].parse(await res.json());
    },
  });
}
