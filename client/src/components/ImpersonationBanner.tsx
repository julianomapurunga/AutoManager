import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getImpersonateOrgId, setImpersonateOrgId } from "@/lib/impersonation";

/**
 * Faixa fixa exibida quando o super admin está acessando uma loja.
 * O botão volta à central de controle: registra a saída, limpa o estado e
 * recarrega o perfil (que volta a ser o do super admin, sem o cabeçalho).
 */
export function ImpersonationBanner({ orgName }: { orgName: string }) {
  const queryClient = useQueryClient();
  const [exiting, setExiting] = useState(false);

  const exit = async () => {
    setExiting(true);
    const orgId = getImpersonateOrgId();
    try {
      if (orgId) await apiRequest("POST", `/api/admin/impersonate/${orgId}/exit`);
    } catch {
      // Mesmo se o registro de saída falhar, saímos da impersonation localmente.
    }
    setImpersonateOrgId(null);
    // Limpa o cache para não vazar dados desta loja ao voltar/entrar em outra.
    queryClient.clear();
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium min-w-0">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Modo super admin — você está acessando <strong>{orgName}</strong> como administrador da loja.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={exit}
          disabled={exiting}
          className="bg-amber-100 border-amber-700 text-amber-950 hover:bg-amber-50 shrink-0"
          data-testid="button-exit-impersonation"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {exiting ? "Voltando..." : "Voltar à central"}
        </Button>
      </div>
    </div>
  );
}
