import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Globe, Copy, ExternalLink, Sparkles, Store } from "lucide-react";
import { formatPhone } from "@/lib/masks";

interface CatalogSettingsData {
  available: boolean;
  catalogEnabled: boolean;
  catalogSlug: string | null;
  catalogDescription: string | null;
  catalogWhatsapp: string | null;
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

  const { data, isLoading } = useQuery<CatalogSettingsData>({
    queryKey: ["/api/catalog/settings"],
  });

  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (data) {
      setEnabled(data.catalogEnabled);
      setSlug(data.catalogSlug ?? "");
      setDescription(data.catalogDescription ?? "");
      setWhatsapp(data.catalogWhatsapp ?? "");
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/catalog/settings", {
        catalogEnabled: enabled,
        catalogSlug: slug || null,
        catalogDescription: description || null,
        catalogWhatsapp: whatsapp || null,
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
                className="flex-1 min-w-40"
                placeholder="minha-loja"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                data-testid="input-catalog-slug"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Letras minúsculas, números e hífens. Ex.: auto-center-silva
            </p>
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

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save-catalog"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
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
