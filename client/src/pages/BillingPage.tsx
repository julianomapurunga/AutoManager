import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, CheckCircle2, Infinity as InfinityIcon, ExternalLink,
  RefreshCw, AlertTriangle, Clock,
} from "lucide-react";

interface BillingStatus {
  configured: boolean;
  plan: string;
  planName: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  active: boolean;
  pendingPlan: string | null;
  pendingInvoiceUrl: string | null;
  plans: Record<string, {
    name: string;
    priceMonthly: number;
    maxVehicles: number | null;
    maxUsers: number | null;
    fipeIntegration: boolean;
    publicCatalog: boolean;
  }>;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function BillingPage({ blocked = false }: { blocked?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const isAdmin = user?.role === "Administrador";

  const { data, isLoading, refetch, isRefetching } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout", {
        plan,
        ...(couponCode.trim() ? { couponCode: couponCode.trim().toUpperCase() } : {}),
      });
      return res.json() as Promise<{ invoiceUrl: string | null; message: string }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      if (result.invoiceUrl) {
        window.open(result.invoiceUrl, "_blank", "noopener");
        toast({
          title: "Fatura gerada!",
          description: "Conclua o pagamento na aba que abrimos. O acesso é liberado automaticamente após a confirmação.",
        });
      } else {
        toast({ title: result.message });
      }
    },
    onError: (err: any) => {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        toast({ title: parsed.message || "Erro ao iniciar assinatura", variant: "destructive" });
      } catch {
        toast({ title: "Erro ao iniciar assinatura", variant: "destructive" });
      }
    },
    onSettled: () => setCheckingOut(null),
  });

  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    setSyncing(true);
    try {
      // Consulta o Asaas diretamente (não depende do webhook)
      const res = await apiRequest("POST", "/api/billing/sync");
      const result = await res.json();
      if (result.updated && result.status === "active") {
        toast({ title: "Pagamento confirmado! Plano ativado. 🎉" });
      } else if (!result.updated) {
        toast({
          title: "Pagamento ainda não identificado",
          description: "Se você acabou de pagar, aguarde alguns instantes e tente novamente.",
        });
      }
    } catch {
      toast({ title: "Erro ao verificar pagamento", variant: "destructive" });
    } finally {
      setSyncing(false);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const paidPlans = Object.entries(data.plans).filter(([key]) => key !== "trial");

  return (
    <div className={`space-y-6 max-w-4xl ${blocked ? "mx-auto px-6 py-10" : ""}`}>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-billing-title">
          <CreditCard className="w-7 h-7 text-primary" />
          Plano e Assinatura
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie o plano da sua loja. Pagamento por Pix, boleto ou cartão via Asaas.
        </p>
      </div>

      {/* Status atual */}
      <Card className={data.active ? "border-emerald-500/30" : "border-destructive/40"}>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {data.active ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            )}
            <div>
              <p className="font-medium" data-testid="text-current-plan">
                Plano atual: <strong>{data.planName}</strong>{" "}
                <Badge variant={data.active ? "secondary" : "destructive"} className="ml-1 no-default-hover-elevate no-default-active-elevate">
                  {data.subscriptionStatus === "trialing"
                    ? `Teste — ${data.trialDaysLeft ?? 0} dia(s) restante(s)`
                    : data.subscriptionStatus === "active"
                    ? "Ativo"
                    : data.subscriptionStatus === "past_due"
                    ? "Pagamento pendente"
                    : "Cancelado"}
                </Badge>
              </p>
              {!data.active && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {blocked
                    ? "O acesso ao sistema está pausado. Assine um plano para continuar — seus dados estão guardados."
                    : "Assine um plano para manter o acesso."}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={syncing || isRefetching} data-testid="button-refresh-billing">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing || isRefetching ? "animate-spin" : ""}`} />
            {syncing ? "Verificando..." : "Já paguei, atualizar"}
          </Button>
        </CardContent>
      </Card>

      {/* Fatura pendente */}
      {data.pendingPlan && data.pendingInvoiceUrl && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm">
                Há uma fatura em aberto do plano <strong>{data.plans[data.pendingPlan]?.name ?? data.pendingPlan}</strong>.
                Após o pagamento, o plano é ativado automaticamente.
              </p>
            </div>
            <Button size="sm" onClick={() => window.open(data.pendingInvoiceUrl!, "_blank", "noopener")} data-testid="button-open-invoice">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir fatura
            </Button>
          </CardContent>
        </Card>
      )}

      {!data.configured && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Os pagamentos ainda não foram configurados no servidor (ASAAS_API_KEY ausente).
          </CardContent>
        </Card>
      )}

      {/* Cupom de desconto */}
      {isAdmin && data.configured && (
        <div className="flex items-end gap-3 max-w-sm">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">Cupom de desconto (opcional)</Label>
            <Input
              placeholder="Ex.: VEHIRO20"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              maxLength={30}
              data-testid="input-coupon"
            />
          </div>
        </div>
      )}

      {/* Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {paidPlans.map(([key, plan]) => {
          const isCurrent = data.plan === key && data.subscriptionStatus === "active";
          return (
            <Card key={key} className={isCurrent ? "border-primary shadow-md" : "border-border/50"}>
              <CardContent className="p-5 flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold font-display">{plan.name}</h3>
                  {isCurrent && (
                    <Badge className="no-default-hover-elevate no-default-active-elevate">Plano atual</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-display">{formatPrice(plan.priceMonthly)}</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                <ul className="space-y-2 flex-1 text-sm">
                  <li className="flex items-center gap-2">
                    {plan.maxVehicles == null
                      ? <InfinityIcon className="w-4 h-4 text-primary shrink-0" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {plan.maxVehicles == null ? "Veículos ilimitados" : `Até ${plan.maxVehicles} veículos`}
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.maxUsers == null
                      ? <InfinityIcon className="w-4 h-4 text-primary shrink-0" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {plan.maxUsers == null ? "Usuários ilimitados" : `Até ${plan.maxUsers} usuários`}
                  </li>
                  {plan.fipeIntegration && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Integração FIPE
                    </li>
                  )}
                  {plan.publicCatalog && (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Catálogo público da loja
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || !isAdmin || !data.configured || checkingOut !== null}
                  onClick={() => {
                    setCheckingOut(key);
                    checkoutMutation.mutate(key);
                  }}
                  data-testid={`button-subscribe-${key}`}
                >
                  {isCurrent
                    ? "Assinado"
                    : checkingOut === key
                    ? "Gerando fatura..."
                    : data.plan === key
                    ? "Renovar plano"
                    : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground text-center">
          Apenas o Administrador da loja pode alterar a assinatura.
        </p>
      )}

      <p className="text-xs text-muted-foreground text-center pb-4">
        Ao clicar em Assinar, uma fatura mensal é gerada no Asaas — pague por Pix, boleto ou cartão.
        O acesso é liberado automaticamente após a confirmação do pagamento.
      </p>
    </div>
  );
}
