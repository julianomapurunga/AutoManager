import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Globe, Copy, ExternalLink, Sparkles, Store, Loader2, CheckCircle2, AlertCircle, ImagePlus, Trash2, Palette } from "lucide-react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { formatPhone } from "@/lib/masks";

const DEFAULT_THEME_COLOR = "#2563eb"; // cor padrão do sistema

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,49}$/;

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok" }
  | { state: "error"; message: string };

interface CatalogSettingsData {
  available: boolean;
  catalogEnabled: boolean;
  catalogSlug: string | null;
  catalogDescription: string | null;
  catalogWhatsapp: string | null;
  catalogBannerPath: string | null;
  catalogThemeColor: string | null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export default function CatalogSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<CatalogSettingsData>({
    queryKey: ["/api/catalog/settings"],
  });

  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" });

  useEffect(() => {
    if (data) {
      setEnabled(data.catalogEnabled);
      setSlug(data.catalogSlug ?? "");
      setDescription(data.catalogDescription ?? "");
      setWhatsapp(data.catalogWhatsapp ?? "");
      setThemeColor(data.catalogThemeColor ?? DEFAULT_THEME_COLOR);
    }
  }, [data]);

  // Checa a disponibilidade do endereço enquanto o usuário digita (debounced).
  useEffect(() => {
    const savedSlug = data?.catalogSlug ?? "";
    if (slug === "") { setSlugStatus({ state: "idle" }); return; }
    // O próprio slug já salvo é sempre válido — nem consulta o servidor.
    if (slug === savedSlug) { setSlugStatus({ state: "ok" }); return; }
    if (!SLUG_RE.test(slug)) {
      setSlugStatus({ state: "error", message: "Use apenas letras minúsculas, números e hífens (3 a 50 caracteres)" });
      return;
    }

    let ignore = false;
    setSlugStatus({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/catalog/slug-available?slug=${encodeURIComponent(slug)}`);
        const body = await res.json();
        if (ignore) return;
        if (body.available) setSlugStatus({ state: "ok" });
        else setSlugStatus({ state: "error", message: body.message || "Endereço indisponível" });
      } catch {
        if (!ignore) setSlugStatus({ state: "error", message: "Não foi possível verificar o endereço" });
      }
    }, 450);

    return () => { ignore = true; clearTimeout(timer); };
  }, [slug, data?.catalogSlug]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/catalog/settings", {
        catalogEnabled: enabled,
        catalogSlug: slug || null,
        catalogDescription: description || null,
        catalogWhatsapp: whatsapp || null,
        catalogThemeColor: themeColor || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/settings"] });
      toast({ title: "Configurações do catálogo salvas!" });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        toast({ title: parsed.message || "Erro ao salvar", variant: "destructive" });
      } catch {
        toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      }
    },
  });

  const bannerMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("banner", file);
      const res = await apiFetch("/api/catalog/banner", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Erro ao enviar o banner");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/settings"] });
      toast({ title: "Banner atualizado!" });
    },
    onError: (err: any) => toast({ title: err.message || "Erro ao enviar o banner", variant: "destructive" }),
  });

  const bannerDeleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/catalog/banner", { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover o banner");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/settings"] });
      toast({ title: "Banner removido" });
    },
    onError: () => toast({ title: "Erro ao remover o banner", variant: "destructive" }),
  });

  // Não deixa salvar/publicar com um endereço inválido ou em uso.
  const canSave =
    !saveMutation.isPending &&
    slugStatus.state !== "checking" &&
    slugStatus.state !== "error" &&
    (!enabled || slugStatus.state === "ok");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (data && !data.available) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full border-primary/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-display">Catálogo Público</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Divulgue os veículos disponíveis do seu pátio em uma página pública com
              fotos, preços e contato direto por WhatsApp. Disponível no plano{" "}
              <strong>Profissional</strong>.
            </p>
            <Button className="w-full" onClick={() => window.location.assign("/billing")} data-testid="button-catalog-upgrade">
              <Sparkles className="w-4 h-4 mr-2" />
              Fazer upgrade de plano
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-catalog-title">
          <Globe className="w-7 h-7 text-primary" />
          Catálogo Público
        </h1>
        <p className="text-muted-foreground mt-1">
          Uma vitrine online dos veículos disponíveis do seu pátio, para compartilhar com clientes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Publicação</CardTitle>
              <CardDescription>
                Quando ativo, qualquer pessoa com o link vê os veículos com status "Disponível".
              </CardDescription>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-catalog-enabled"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Endereço da página *</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground shrink-0">{window.location.origin}/loja/</span>
              <Input
                className={`flex-1 min-w-40 ${slugStatus.state === "error" ? "border-destructive focus-visible:ring-destructive" : slugStatus.state === "ok" ? "border-emerald-500 focus-visible:ring-emerald-500" : ""}`}
                placeholder="minha-loja"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                data-testid="input-catalog-slug"
              />
            </div>
            {slugStatus.state === "checking" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5" data-testid="text-slug-status">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando disponibilidade…
              </p>
            )}
            {slugStatus.state === "ok" && slug !== "" && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5" data-testid="text-slug-status">
                <CheckCircle2 className="w-3.5 h-3.5" /> Endereço disponível
              </p>
            )}
            {slugStatus.state === "error" && (
              <p className="text-xs text-destructive flex items-center gap-1.5" data-testid="text-slug-status">
                <AlertCircle className="w-3.5 h-3.5" /> {slugStatus.message}
              </p>
            )}
            {slugStatus.state === "idle" && (
              <p className="text-xs text-muted-foreground">
                Letras minúsculas, números e hífens. Ex.: auto-center-silva
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição da loja (opcional)</Label>
            <Textarea
              placeholder="Ex.: Há 15 anos oferecendo os melhores seminovos da região, com procedência e garantia."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              data-testid="input-catalog-description"
            />
          </div>

          <div className="space-y-2">
            <Label>WhatsApp para contato (opcional)</Label>
            <Input
              placeholder="(00) 00000-0000 — se vazio, usa o telefone da loja"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
              maxLength={15}
              data-testid="input-catalog-whatsapp"
            />
            <p className="text-xs text-muted-foreground">
              Os visitantes poderão enviar mensagem direto sobre cada veículo.
            </p>
          </div>

          {/* Banner da loja */}
          <div className="space-y-2 border-t pt-5">
            <Label className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-primary" /> Banner da loja (opcional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Imagem de destaque exibida no topo do catálogo, de ponta a ponta. Recomendado ~1600×400px.
            </p>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) bannerMutation.mutate(file);
                e.target.value = "";
              }}
              data-testid="input-catalog-banner"
            />
            {data?.catalogBannerPath ? (
              <div className="space-y-2">
                <div className="rounded-md overflow-hidden border bg-muted">
                  <img
                    src={data.catalogBannerPath}
                    alt="Banner do catálogo"
                    className="w-full h-32 object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={bannerMutation.isPending}
                    data-testid="button-change-banner"
                  >
                    {bannerMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                    Trocar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bannerDeleteMutation.mutate()}
                    disabled={bannerDeleteMutation.isPending}
                    data-testid="button-remove-banner"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remover
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerMutation.isPending}
                data-testid="button-upload-banner"
              >
                {bannerMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                Enviar banner
              </Button>
            )}
          </div>

          {/* Cor da loja */}
          <div className="space-y-3 border-t pt-5">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Cor da loja
            </Label>
            <p className="text-xs text-muted-foreground">
              Personalize a cor de destaque da sua página (botões, preços e ícones), como se fosse seu próprio site.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="catalog-color-picker">
                <HexColorPicker color={themeColor} onChange={setThemeColor} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">#</span>
                  <HexColorInput
                    color={themeColor}
                    onChange={setThemeColor}
                    prefixed={false}
                    className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="input-theme-color-hex"
                  />
                  <div
                    className="w-9 h-9 rounded-md border shrink-0"
                    style={{ backgroundColor: themeColor }}
                    aria-hidden
                  />
                </div>
                {themeColor.toLowerCase() !== DEFAULT_THEME_COLOR && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setThemeColor(DEFAULT_THEME_COLOR)}
                    data-testid="button-reset-theme-color"
                  >
                    Restaurar cor padrão
                  </Button>
                )}
                <p className="text-xs text-muted-foreground max-w-48">
                  Arraste no seletor ou digite o código hexadecimal. Salve para aplicar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave}
              data-testid="button-save-catalog"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            {enabled && slug !== "" && slugStatus.state === "error" && (
              <span className="text-xs text-muted-foreground">Corrija o endereço para publicar.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {data?.catalogEnabled && data.catalogSlug && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Store className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Seu catálogo está no ar!</p>
                <p className="text-sm text-muted-foreground truncate" data-testid="text-catalog-url">
                  {window.location.origin}/loja/{data.catalogSlug}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/loja/${data.catalogSlug}`);
                  toast({ title: "Link copiado!" });
                }}
                data-testid="button-copy-catalog-link"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar link
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(`/loja/${data.catalogSlug}`, "_blank", "noopener")}
                data-testid="button-open-catalog"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
