import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Search, MessageCircle, Gauge, Calendar, Paintbrush, ImageOff } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { ImageLightbox } from "@/components/ImageLightbox";

interface CatalogVehicle {
  id: number;
  brand: string;
  model: string;
  color: string;
  yearFab: number | null;
  yearModel: number | null;
  condition: string | null;
  mileage: number | null;
  price: number | null;
  images: string[];
}

interface CatalogData {
  store: {
    name: string;
    description: string | null;
    whatsapp: string | null;
    banner: string | null;
    themeColor: string | null;
  };
  vehicles: CatalogVehicle[];
}

/** Converte "#rrggbb" nos componentes HSL "H S% L%" que o Tailwind (--primary) espera. */
function hexToHslParts(hex: string): { hsl: string; light: boolean } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return {
    hsl: `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`,
    light: l > 0.6, // fundo claro → texto escuro
  };
}

/** Variáveis CSS que sobrescrevem a cor de destaque só dentro do catálogo. */
function themeStyle(color: string | null): React.CSSProperties {
  const parts = color ? hexToHslParts(color) : null;
  if (!parts) return {};
  return {
    ["--primary" as any]: parts.hsl,
    ["--ring" as any]: parts.hsl,
    ["--primary-foreground" as any]: parts.light ? "0 0% 10%" : "0 0% 100%",
  };
}

function formatPrice(cents: number | null) {
  if (cents == null) return "Consulte";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatMileage(km: number | null) {
  if (km == null) return null;
  return `${km.toLocaleString("pt-BR")} km`;
}

function whatsappLink(phone: string, vehicle?: CatalogVehicle) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const text = vehicle
    ? `Olá! Vi o ${vehicle.brand} ${vehicle.model}${vehicle.yearModel ? ` ${vehicle.yearModel}` : ""} no catálogo e tenho interesse.`
    : "Olá! Vi o catálogo de veículos e gostaria de mais informações.";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function VehicleCard({
  vehicle,
  whatsapp,
  onOpenPhotos,
}: {
  vehicle: CatalogVehicle;
  whatsapp: string | null;
  onOpenPhotos: (images: string[], index: number, title: string) => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const hasImages = vehicle.images.length > 0;

  return (
    <Card className="overflow-hidden border-border/50 flex flex-col" data-testid={`card-catalog-vehicle-${vehicle.id}`}>
      <div className="aspect-[4/3] bg-muted relative">
        {hasImages ? (
          <>
            <img
              src={vehicle.images[imgIndex]}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full h-full object-cover cursor-zoom-in"
              loading="lazy"
              onClick={() => onOpenPhotos(vehicle.images, imgIndex, `${vehicle.brand} ${vehicle.model}`)}
            />
            {vehicle.images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {vehicle.images.slice(0, 6).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-2 h-2 rounded-full ${i === imgIndex ? "bg-white" : "bg-white/50"}`}
                    aria-label={`Foto ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="w-10 h-10" />
          </div>
        )}
        {vehicle.condition && (
          <Badge className="absolute top-2 left-2 no-default-hover-elevate no-default-active-elevate" variant="secondary">
            {vehicle.condition}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div>
          <h3 className="font-semibold font-display leading-tight">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-2xl font-bold text-primary mt-1">{formatPrice(vehicle.price)}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {(vehicle.yearFab || vehicle.yearModel) && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {vehicle.yearFab ?? "—"}/{vehicle.yearModel ?? "—"}
            </span>
          )}
          {vehicle.mileage != null && (
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              {formatMileage(vehicle.mileage)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Paintbrush className="w-3.5 h-3.5" />
            {vehicle.color}
          </span>
        </div>

        {whatsapp && (
          <Button
            className="w-full mt-auto"
            onClick={() => window.open(whatsappLink(whatsapp, vehicle), "_blank", "noopener")}
            data-testid={`button-whatsapp-${vehicle.id}`}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Tenho interesse
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicCatalog() {
  const [, params] = useRoute("/loja/:slug");
  const slug = params?.slug ?? "";
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openPhotos = (images: string[], index: number, title: string) => {
    setLightbox({ images, index, title });
    setLightboxOpen(true);
  };

  const { data, isLoading, isError } = useQuery<CatalogData>({
    queryKey: [`/api/public/catalog/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/catalog/${slug}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60,
  });

  // Título da guia com o nome da loja
  useEffect(() => {
    if (data?.store.name) {
      document.title = `${data.store.name} — Veículos disponíveis`;
    }
    return () => {
      document.title = "VEHIRO — Gestão de Pátio de Veículos";
    };
  }, [data?.store.name]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Car className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold font-display">Catálogo não encontrado</h1>
          <p className="text-muted-foreground">
            Este catálogo não existe ou não está disponível no momento.
          </p>
        </div>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = term
    ? data.vehicles.filter((v) =>
        `${v.brand} ${v.model} ${v.color}`.toLowerCase().includes(term),
      )
    : data.vehicles;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={themeStyle(data.store.themeColor)}>
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Car className="w-6 h-6 text-primary shrink-0" />
            <span className="text-lg font-bold font-display truncate" data-testid="text-store-name">
              {data.store.name}
            </span>
          </div>
          {data.store.whatsapp && (
            <Button
              size="sm"
              onClick={() => window.open(whatsappLink(data.store.whatsapp!), "_blank", "noopener")}
              data-testid="button-store-whatsapp"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Fale conosco
            </Button>
          )}
        </div>
      </header>

      {data.store.banner && (
        <div className="w-full bg-muted">
          <img
            src={data.store.banner}
            alt={`Banner ${data.store.name}`}
            className="w-full max-h-72 object-cover"
            data-testid="img-catalog-banner"
          />
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold font-display">Veículos disponíveis</h1>
          {data.store.description && (
            <p className="text-muted-foreground max-w-2xl">{data.store.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo ou cor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-catalog-search"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "veículo" : "veículos"}
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} whatsapp={data.store.whatsapp} onOpenPhotos={openPhotos} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            {data.vehicles.length === 0
              ? "Nenhum veículo disponível no momento. Volte em breve!"
              : "Nenhum veículo encontrado para essa busca."}
          </div>
        )}
      </main>

      <AppFooter />

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          alt={lightbox.title}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </div>
  );
}
