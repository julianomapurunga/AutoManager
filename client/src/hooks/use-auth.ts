import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, SignupInput } from "@shared/models/auth";
import { planIncludesFipe, planIncludesCatalog } from "@shared/models/tenancy";
import { supabase } from "@/lib/supabase";
import { apiFetch, apiRequest } from "@/lib/queryClient";

export type AuthUser = User & {
  organization: {
    id: number;
    name: string;
    plan: string;
    planName: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    active: boolean;
  };
};

async function fetchUser(): Promise<AuthUser | null> {
  const response = await apiFetch("/api/auth/user");

  if (response.status === 401) {
    return null;
  }

  if (response.status === 403) {
    // Conta autenticada no Supabase mas sem perfil/loja (cadastro interrompido):
    // desloga para não travar num estado inconsistente
    const body = await response.json().catch(() => null);
    if (body?.code === "NO_PROFILE") {
      await supabase.auth.signOut().catch(() => {});
      return null;
    }
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/** Indica se o plano da loja inclui a integração FIPE. */
export function useFipeAccess(): boolean {
  const { user } = useAuth();
  return user ? planIncludesFipe(user.organization.plan) : false;
}

/** Indica se o plano da loja inclui o catálogo público. */
export function useCatalogAccess(): boolean {
  const { user } = useAuth();
  return user ? planIncludesCatalog(user.organization.plan) : false;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Mantém o cache em sincronia com a sessão do Supabase (expiração, logout em outra aba)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.setQueryData(["/api/auth/user"], null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        throw new Error("E-mail ou senha inválidos");
      }
      return fetchUser();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: SignupInput) => {
      // Cria loja + admin no servidor, depois autentica no Supabase
      await apiRequest("POST", "/api/auth/signup", data);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        throw new Error("Conta criada, mas houve um erro ao entrar. Tente fazer login.");
      }
      return fetchUser();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
