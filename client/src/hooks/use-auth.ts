import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, SignupInput, CompleteProfileInput } from "@shared/models/auth";
import { planIncludesFipe, planIncludesCatalog } from "@shared/models/tenancy";
import { supabase } from "@/lib/supabase";
import { apiFetch, apiRequest } from "@/lib/queryClient";

export type AuthUser = User & {
  isSuperAdmin?: boolean;
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

/**
 * Conta autenticada (via Google) que ainda não concluiu o cadastro: existe no
 * Supabase Auth mas não tem loja/perfil. A UI usa isso para abrir a tela de
 * "Concluir cadastro" em vez de deslogar.
 */
export type NeedsProfile = {
  needsProfile: true;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type AuthState = AuthUser | NeedsProfile;

export function isNeedsProfile(v: AuthState | null | undefined): v is NeedsProfile {
  return !!v && (v as NeedsProfile).needsProfile === true;
}

async function fetchUser(): Promise<AuthState | null> {
  const response = await apiFetch("/api/auth/user");

  if (response.status === 401) {
    return null;
  }

  if (response.status === 403) {
    const body = await response.json().catch(() => null);
    // Conta administrativa do SaaS: não pertence a loja alguma
    if (body?.code === "SUPER_ADMIN") {
      return { isSuperAdmin: true } as unknown as AuthUser;
    }
    // Conta autenticada no Supabase mas ainda sem perfil/loja (login social ou
    // cadastro interrompido): leva o usuário a concluir o cadastro. Aproveitamos
    // o nome que o Google já forneceu para pré-preencher o formulário.
    if (body?.code === "NO_PROFILE") {
      const { data } = await supabase.auth.getUser();
      const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      const fullName = String(meta.full_name ?? meta.name ?? "").trim();
      const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [];
      return {
        needsProfile: true,
        email: data.user?.email ?? null,
        firstName: firstName ?? null,
        lastName: rest.length ? rest.join(" ") : null,
      };
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
  const { data: authState, isLoading } = useQuery<AuthState | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Separa os dois estados: `user` é sempre um perfil real (ou super admin);
  // `needsProfile` é o pré-cadastro via Google. Assim os consumidores de `user`
  // continuam vendo o mesmo tipo de antes.
  const needsProfile = isNeedsProfile(authState) ? authState : null;
  const user = needsProfile ? null : (authState ?? null);

  // Mantém o cache em sincronia com a sessão do Supabase (expiração, logout em
  // outra aba, e o retorno do login social do Google)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.setQueryData(["/api/auth/user"], null);
      } else if (event === "SIGNED_IN") {
        // Volta do OAuth do Google com a sessão já criada: busca o perfil
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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

  // Login social: redireciona ao Google. Ao voltar, o supabase-js recria a
  // sessão a partir da URL e o onAuthStateChange (SIGNED_IN) refaz o fetch.
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) throw new Error("Não foi possível iniciar o login com Google.");
  };

  // Conclui o cadastro de quem entrou via Google (cria loja + perfil).
  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfileInput) => {
      await apiRequest("POST", "/api/auth/complete-profile", data);
      return fetchUser();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/auth/user"], result);
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
    user: user as AuthUser | null,
    isLoading,
    isAuthenticated: !!user,
    needsProfile,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    loginWithGoogle,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    isRegistering: registerMutation.isPending,
    completeProfile: completeProfileMutation.mutateAsync,
    isCompletingProfile: completeProfileMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
