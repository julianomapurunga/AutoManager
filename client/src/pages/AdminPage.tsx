import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { couponDurationLabel } from "@shared/schema";
import {
  ShieldCheck, LogOut, Store, Users, Car, LifeBuoy, CreditCard,
  TicketPercent, TrendingUp, Plus, Ban, CheckCircle2, Clock3, XCircle,
  Settings2, FlaskConical, Rocket, PlugZap, Trash2,
} from "lucide-react";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Visão Geral ─────────────────────────────────────────────────────────────

interface Overview {
  totalOrganizations: number;
  totalUsers: number;
  totalVehicles: number;
  totalTickets: number;
  activeSubscriptions: number;
  trialing: number;
  mrr: number;
  byPlan: Record<string, number>;
}

function OverviewTab() {
  const { data, isLoading } = useQuery<Overview>({ queryKey: ["/api/admin/overview"] });
  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;

  const cards = [
    { icon: Store, label: "Lojas cadastradas", value: data.totalOrganizations },
    { icon: Users, label: "Usuários", value: data.totalUsers },
    { icon: Car, label: "Veículos na plataforma", value: data.totalVehicles },
    { icon: LifeBuoy, label: "Chamados de suporte", value: data.totalTickets },
    { icon: CreditCard, label: "Assinaturas ativas", value: data.activeSubscriptions },
    { icon: TrendingUp, label: "Receita mensal (MRR)", value: brl(data.mrr) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <c.icon className="w-4 h-4 text-primary" />
                {c.label}
              </div>
              <p className="text-2xl font-bold font-display">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Lojas por plano</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {Object.entries(data.byPlan).map(([plan, n]) => (
            <Badge key={plan} variant="secondary" className="text-sm no-default-hover-elevate no-default-active-elevate">
              {plan}: {n}
            </Badge>
          ))}
          <span className="text-sm text-muted-foreground self-center">
            ({data.trialing} em período de teste ativo)
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Lojas ───────────────────────────────────────────────────────────────────

interface OrgRow {
  id: number; name: string; plan: string; planName: string;
  subscriptionStatus: string; trialEndsAt: string | null; pendingPlan: string | null;
  createdAt: string | null; userCount: number; vehicleCount: number; adminEmail: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    active: { label: "Ativa", variant: "default" },
    trialing: { label: "Teste", variant: "secondary" },
    past_due: { label: "Pendente", variant: "destructive" },
    canceled: { label: "Cancelada", variant: "destructive" },
  };
  const s = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant} className="no-default-hover-elevate no-default-active-elevate">{s.label}</Badge>;
}

function OrgsTab() {
  const { data, isLoading } = useQuery<OrgRow[]>({ queryKey: ["/api/admin/organizations"] });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground text-center py-8">Nenhuma loja cadastrada.</p>;

  return (
    <div className="space-y-2">
      {data.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold">{o.name} <span className="text-xs text-muted-foreground font-normal">#{o.id}</span></p>
              <p className="text-sm text-muted-foreground truncate">
                {o.adminEmail ?? "sem admin"} · {o.userCount} usuário(s) · {o.vehicleCount} veículo(s)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">{o.planName}</Badge>
              <StatusBadge status={o.subscriptionStatus} />
              <span className="text-xs text-muted-foreground">
                desde {o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Chamados ────────────────────────────────────────────────────────────────

interface TicketRow {
  id: number; ticketNumber: string; category: string; message: string;
  emailSent: boolean; createdAt: string | null; orgName: string | null;
  openedBy: string; userEmail: string | null;
}

function TicketsTab() {
  const { data, isLoading } = useQuery<TicketRow[]>({ queryKey: ["/api/admin/tickets"] });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data?.length) return <p className="text-muted-foreground text-center py-8">Nenhum chamado aberto.</p>;

  return (
    <div className="space-y-2">
      {data.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-primary">#{t.ticketNumber}</span>
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{t.category}</Badge>
              <span className="text-sm font-medium">{t.orgName ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {t.createdAt ? new Date(t.createdAt).toLocaleString("pt-BR") : "—"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t.message}</p>
            <p className="text-xs text-muted-foreground">
              {t.openedBy} {t.userEmail ? `· ${t.userEmail}` : ""}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Pagamentos ──────────────────────────────────────────────────────────────

interface PaymentsResponse {
  configured: boolean;
  payments: Array<{
    id: string; status: string; value: number; dueDate: string;
    paymentDate?: string | null; billingType: string; description?: string; invoiceUrl: string;
  }>;
  summary: {
    revenue: number;        // reais
    netRevenue: number;     // reais (após taxas do Asaas)
    paidCount: number;
    overdueCount: number;
    overdueValue: number;
    refundedCount: number;
    refundedValue: number;
    canceledOrgs: number;
  } | null;
}

function brlReais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_STATUS_PT: Record<string, string> = {
  PENDING: "Pendente", RECEIVED: "Recebido", CONFIRMED: "Confirmado",
  RECEIVED_IN_CASH: "Recebido (manual)", OVERDUE: "Vencido", REFUNDED: "Estornado",
};

function PaymentsTab() {
  const { data, isLoading } = useQuery<PaymentsResponse>({ queryKey: ["/api/admin/payments"] });
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data?.configured) return <p className="text-muted-foreground text-center py-8">Asaas não configurado no servidor.</p>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Resumo financeiro */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-emerald-500/30">
            <CardContent className="p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Faturamento
              </div>
              <p className="text-2xl font-bold font-display text-emerald-600" data-testid="text-admin-revenue">
                {brlReais(s.revenue)}
              </p>
              <p className="text-xs text-muted-foreground">{s.paidCount} cobrança(s) paga(s)</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                Lucro (líquido)
              </div>
              <p className="text-2xl font-bold font-display text-primary" data-testid="text-admin-net">
                {brlReais(s.netRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                após taxas do Asaas ({brlReais(s.revenue - s.netRevenue)} em taxas)
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30">
            <CardContent className="p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="w-4 h-4 text-amber-600" />
                Desistências
              </div>
              <p className="text-2xl font-bold font-display text-amber-600" data-testid="text-admin-overdue">
                {s.overdueCount}
              </p>
              <p className="text-xs text-muted-foreground">
                fatura(s) vencida(s) sem pagamento · {brlReais(s.overdueValue)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardContent className="p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4 text-destructive" />
                Cancelamentos
              </div>
              <p className="text-2xl font-bold font-display text-destructive" data-testid="text-admin-canceled">
                {s.canceledOrgs}
              </p>
              <p className="text-xs text-muted-foreground">
                assinatura(s) cancelada(s)
                {s.refundedCount > 0 ? ` · ${s.refundedCount} estorno(s) (${brlReais(s.refundedValue)})` : ""}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de cobranças */}
      {!data.payments.length ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma cobrança encontrada.</p>
      ) : (
      <div className="space-y-2">
      {data.payments.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{p.description || p.id}</p>
              <p className="text-xs text-muted-foreground">
                Venc.: {new Date(p.dueDate + "T12:00:00").toLocaleDateString("pt-BR")} · {p.billingType}
                {p.paymentDate ? ` · pago em ${new Date(p.paymentDate + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold">{p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              <Badge
                variant={["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status) ? "default" : p.status === "PENDING" ? "secondary" : "destructive"}
                className="no-default-hover-elevate no-default-active-elevate"
              >
                {PAYMENT_STATUS_PT[p.status] ?? p.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
      )}
    </div>
  );
}

// ─── Cupons ──────────────────────────────────────────────────────────────────

interface CouponRow {
  id: number; code: string; percentOff: number; durationCycles: number | null;
  maxUses: number | null;
  usedCount: number; expiresAt: string | null; active: boolean; createdAt: string | null;
}

/** Valor "permanente" do Select — string vazia não é aceita como SelectItem value. */
const DURATION_FOREVER = "forever";

function CouponsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<CouponRow[]>({ queryKey: ["/api/admin/coupons"] });

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [duration, setDuration] = useState("1");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/coupons", {
        code: code.trim().toUpperCase(),
        percentOff: Number(percentOff),
        durationCycles: duration === DURATION_FOREVER ? null : Number(duration),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setCode(""); setPercentOff(""); setDuration("1"); setMaxUses(""); setExpiresAt("");
      toast({ title: "Cupom criado!" });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        toast({ title: parsed.message || "Erro ao criar cupom", variant: "destructive" });
      } catch {
        toast({ title: "Erro ao criar cupom", variant: "destructive" });
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await apiRequest("PATCH", `/api/admin/coupons/${id}`, { active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Novo cupom</CardTitle></CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end"
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Código *</Label>
              <Input placeholder="VEHIRO20" value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                maxLength={30} data-testid="input-coupon-code" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desconto (%) *</Label>
              <Input type="number" min={1} max={100} placeholder="20" value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)} data-testid="input-coupon-percent" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duração *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger data-testid="select-coupon-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Só a 1ª mensalidade</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value={DURATION_FOREVER}>Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Limite de usos</Label>
              <Input type="number" min={1} placeholder="Ilimitado" value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)} data-testid="input-coupon-maxuses" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Validade</Label>
              <Input type="date" value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)} data-testid="input-coupon-expires" />
            </div>
            <Button type="submit" disabled={!code || !percentOff || createMutation.isPending} data-testid="button-create-coupon">
              <Plus className="w-4 h-4 mr-1" />
              Criar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            O desconto é percentual. Terminada a duração escolhida, a mensalidade
            volta automaticamente ao valor cheio na assinatura do cliente.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data?.length ? (
        <p className="text-muted-foreground text-center py-6">Nenhum cupom criado.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c) => (
            <Card key={c.id} className={c.active ? "" : "opacity-60"}>
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <TicketPercent className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-mono font-bold">
                      {c.code} <span className="text-primary">−{c.percentOff}%</span>
                      <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                        {couponDurationLabel(c.durationCycles)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.usedCount}{c.maxUses != null ? `/${c.maxUses}` : ""} uso(s)
                      {c.expiresAt ? ` · expira ${new Date(c.expiresAt).toLocaleDateString("pt-BR")}` : " · sem validade"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.active
                    ? <Badge className="no-default-hover-elevate no-default-active-elevate">Ativo</Badge>
                    : <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">Inativo</Badge>}
                  <Button variant="outline" size="sm"
                    onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                    data-testid={`button-toggle-coupon-${c.id}`}>
                    {c.active ? <><Ban className="w-3.5 h-3.5 mr-1" /> Desativar</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ativar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Configurações (Asaas) ───────────────────────────────────────────────────

interface AsaasSettings {
  env: "sandbox" | "production";
  baseUrl: string;
  configured: boolean;
  sandboxKeyMasked: string | null;
  sandboxKeyFromEnv: boolean;
  productionKeyMasked: string | null;
  webhookTokenMasked: string | null;
  webhookTokenFromEnv: boolean;
  webhookPath: string;
}

function SettingsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AsaasSettings>({ queryKey: ["/api/admin/settings/asaas"] });

  const [sandboxKey, setSandboxKey] = useState("");
  const [productionKey, setProductionKey] = useState("");
  const [webhookToken, setWebhookToken] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/asaas"] });

  const showError = (err: any, fallback: string) => {
    const msg = err.message || "";
    try {
      const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
      toast({ title: parsed.message || fallback, variant: "destructive" });
    } catch {
      toast({ title: fallback, variant: "destructive" });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await apiRequest("PUT", "/api/admin/settings/asaas", body);
      return res.json();
    },
    onSuccess: () => {
      refresh();
      setSandboxKey(""); setProductionKey(""); setWebhookToken("");
      toast({ title: "Configurações salvas!" });
    },
    onError: (err: any) => showError(err, "Erro ao salvar configurações"),
  });

  const toggleEnv = useMutation({
    mutationFn: async (env: "sandbox" | "production") => {
      const res = await apiRequest("PUT", "/api/admin/settings/asaas", { env });
      return res.json();
    },
    onSuccess: (r: any) => {
      refresh();
      toast({
        title: r.env === "production" ? "Modo PRODUÇÃO ativado" : "Modo Sandbox ativado",
        description: r.env === "production" ? "As cobranças agora são reais." : "Ambiente de testes — nenhuma cobrança real.",
      });
    },
    onError: (err: any) => showError(err, "Erro ao trocar de ambiente"),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/settings/asaas/test");
      return res.json();
    },
    onSuccess: (r: any) => toast({ title: r.message }),
    onError: (err: any) => showError(err, "Falha na conexão com o Asaas"),
  });

  const removeKey = useMutation({
    mutationFn: async (key: string) => {
      await apiRequest("DELETE", `/api/admin/settings/asaas/${key}`);
    },
    onSuccess: () => { refresh(); toast({ title: "Chave removida (fallback: .env, se houver)" }); },
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  const isProd = data.env === "production";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Ambiente */}
      <Card className={isProd ? "border-destructive/40" : "border-amber-500/40"}>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {isProd
              ? <Rocket className="w-6 h-6 text-destructive shrink-0" />
              : <FlaskConical className="w-6 h-6 text-amber-600 shrink-0" />}
            <div>
              <p className="font-semibold" data-testid="text-asaas-env">
                Ambiente: {isProd ? "PRODUÇÃO" : "Sandbox (testes)"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isProd
                  ? "Cobranças reais estão sendo emitidas."
                  : "Nenhuma cobrança real — ideal para testes."}
                {" "}API: <span className="font-mono text-xs">{data.baseUrl}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sandbox</span>
            <Switch
              checked={isProd}
              onCheckedChange={(v) => {
                if (v && !data.productionKeyMasked) {
                  toast({ title: "Defina a chave de PRODUÇÃO antes de ativar", variant: "destructive" });
                  return;
                }
                if (v && !window.confirm("Ativar modo PRODUÇÃO? As cobranças passam a ser reais.")) return;
                toggleEnv.mutate(v ? "production" : "sandbox");
              }}
              data-testid="switch-asaas-env"
            />
            <span className="text-sm font-medium">Produção</span>
          </div>
        </CardContent>
      </Card>

      {/* Chaves de API */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-primary" />
            Chaves de API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Chave Sandbox</Label>
              {data.sandboxKeyMasked && (
                <span className="text-xs text-muted-foreground font-mono">
                  {data.sandboxKeyMasked}{data.sandboxKeyFromEnv ? " (.env)" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={data.sandboxKeyMasked ? "Substituir chave atual..." : "$aact_hmlg_..."}
                value={sandboxKey}
                onChange={(e) => setSandboxKey(e.target.value)}
                data-testid="input-sandbox-key"
              />
              {!data.sandboxKeyFromEnv && data.sandboxKeyMasked && (
                <Button variant="outline" size="icon" onClick={() => removeKey.mutate("sandbox")} title="Remover">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Chave Produção</Label>
              {data.productionKeyMasked && (
                <span className="text-xs text-muted-foreground font-mono">{data.productionKeyMasked}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={data.productionKeyMasked ? "Substituir chave atual..." : "$aact_prod_..."}
                value={productionKey}
                onChange={(e) => setProductionKey(e.target.value)}
                data-testid="input-production-key"
              />
              {data.productionKeyMasked && (
                <Button variant="outline" size="icon" onClick={() => removeKey.mutate("production")} title="Remover">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Token do Webhook</Label>
              {data.webhookTokenMasked && (
                <span className="text-xs text-muted-foreground font-mono">
                  {data.webhookTokenMasked}{data.webhookTokenFromEnv ? " (.env)" : ""}
                </span>
              )}
            </div>
            <Input
              type="password"
              placeholder="Mesmo token cadastrado no painel do Asaas"
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
              data-testid="input-webhook-token"
            />
            <p className="text-xs text-muted-foreground">
              URL do webhook para cadastrar no Asaas:{" "}
              <span className="font-mono">{window.location.origin}{data.webhookPath}</span>
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => saveMutation.mutate({
                ...(sandboxKey.trim() ? { sandboxApiKey: sandboxKey.trim() } : {}),
                ...(productionKey.trim() ? { productionApiKey: productionKey.trim() } : {}),
                ...(webhookToken.trim() ? { webhookToken: webhookToken.trim() } : {}),
              })}
              disabled={saveMutation.isPending || (!sandboxKey.trim() && !productionKey.trim() && !webhookToken.trim())}
              data-testid="button-save-asaas"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar chaves"}
            </Button>
            <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending} data-testid="button-test-asaas">
              <PlugZap className="w-4 h-4 mr-2" />
              {testMutation.isPending ? "Testando..." : "Testar conexão"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            As chaves ficam no banco (exibidas mascaradas) e valem imediatamente, sem reiniciar o servidor.
            Valores do .env são usados quando nada foi definido aqui. Lembre-se: sandbox e produção
            têm chaves e webhooks separados no painel do Asaas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Painel ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold font-display">VEHIRO <span className="text-primary">Admin</span></span>
          </div>
          <Button variant="ghost" onClick={() => logout()} data-testid="button-admin-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="orgs" data-testid="tab-orgs">Lojas</TabsTrigger>
            <TabsTrigger value="tickets" data-testid="tab-tickets">Chamados</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="coupons" data-testid="tab-coupons">Cupons</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="orgs"><OrgsTab /></TabsContent>
          <TabsContent value="tickets"><TicketsTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="coupons"><CouponsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
