import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Camera, ImagePlus, X, Check, Loader2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle,
} from "lucide-react";

// Categorias na ordem do passo a passo. Externas primeiro (principais dos anúncios).
const CATS = [
  { key: "externa", title: "Fotos externas", hint: "Frente, traseira e laterais. São as principais dos anúncios." },
  { key: "interna", title: "Fotos internas", hint: "Painel, bancos, porta-malas e detalhes." },
  { key: "placa", title: "Fotos da placa", hint: "Placa dianteira e traseira." },
] as const;

type CatKey = (typeof CATS)[number]["key"];
type LocalPhoto = { id: string; file: File; url: string };
type VehicleInfo = { brand: string; model: string; plate: string };

const emptyPhotos = (): Record<CatKey, LocalPhoto[]> => ({ externa: [], interna: [], placa: [] });

export default function PhotoUploadPage() {
  const [, params] = useRoute("/enviar-fotos/:token");
  const token = params?.token ?? "";

  const [loadState, setLoadState] = useState<"loading" | "ready" | "invalid" | "error">("loading");
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Record<CatKey, LocalPhoto[]>>(emptyPhotos);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = CATS[step];
  const totalPhotos = photos.externa.length + photos.interna.length + photos.placa.length;

  // Valida o token e carrega os dados mínimos do veículo.
  useEffect(() => {
    if (!token) { setLoadState("invalid"); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/public/photo-upload/${token}`);
        if (!alive) return;
        if (res.status === 410 || res.status === 404) { setLoadState("invalid"); return; }
        if (!res.ok) { setLoadState("error"); return; }
        const data = await res.json();
        setVehicle(data.vehicle);
        setLoadState("ready");
      } catch {
        if (alive) setLoadState("error");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // Libera as URLs de preview ao desmontar.
  useEffect(() => {
    return () => {
      Object.values(photos).flat().forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: LocalPhoto[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f) }));
    if (added.length === 0) return;
    setPhotos((prev) => ({ ...prev, [current.key]: [...prev[current.key], ...added] }));
  }, [current.key]);

  const removePhoto = (catKey: CatKey, id: string) => {
    setPhotos((prev) => {
      const target = prev[catKey].find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return { ...prev, [catKey]: prev[catKey].filter((p) => p.id !== id) };
    });
  };

  const handleSave = async () => {
    setUploading(true);
    setErrorMsg(null);
    const total = totalPhotos;
    setProgress({ done: 0, total });
    let uploaded = 0;
    try {
      for (const cat of CATS) {
        const list = photos[cat.key];
        // Envia em lotes de até 20 (limite do backend).
        for (let i = 0; i < list.length; i += 20) {
          const chunk = list.slice(i, i + 20);
          const form = new FormData();
          form.append("category", cat.key);
          for (const p of chunk) form.append("images", p.file, p.file.name);
          const res = await fetch(`/api/public/photo-upload/${token}`, { method: "POST", body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || "Falha ao enviar as fotos. Verifique a conexão e tente novamente.");
          }
          uploaded += chunk.length;
          setProgress({ done: uploaded, total });
        }
      }
      setDone(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao enviar as fotos.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Telas de estado ──────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <Centered>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Centered>
    );
  }

  if (loadState === "invalid") {
    return (
      <Centered>
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h1 className="text-lg font-semibold">Link inválido ou expirado</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Este QR code não é mais válido. Peça à loja para gerar um novo e escaneie de novo.
        </p>
      </Centered>
    );
  }

  if (loadState === "error") {
    return (
      <Centered>
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h1 className="text-lg font-semibold">Não foi possível carregar</h1>
        <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
      </Centered>
    );
  }

  if (done) {
    return (
      <Centered>
        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        <h1 className="text-xl font-bold">Fotos enviadas!</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          As {progress.total} fotos foram adicionadas ao veículo no sistema. Você já pode fechar esta página.
        </p>
      </Centered>
    );
  }

  const currentPhotos = photos[current.key];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabeçalho fixo */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3 shadow">
        <h1 className="text-base font-bold leading-tight">Enviar fotos</h1>
        {vehicle && (
          <p className="text-xs opacity-90">
            {vehicle.brand} {vehicle.model} · {vehicle.plate}
          </p>
        )}
      </header>

      {/* Indicador de passos */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          {CATS.map((c, i) => (
            <div key={c.key} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i < step ? "bg-emerald-500" : i === step ? "bg-primary" : "bg-muted"}`}
              />
              <p className={`mt-1 text-[10px] text-center ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {c.title.replace("Fotos ", "")}
                {photos[c.key].length > 0 && ` (${photos[c.key].length})`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo do passo atual */}
      <main className="flex-1 px-4 py-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold">{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.hint}</p>
        </div>

        {/* Botões de adicionar */}
        <div className="grid grid-cols-2 gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <Button variant="default" className="h-20 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
            <Camera className="w-6 h-6" />
            <span className="text-xs">Tirar foto</span>
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <div className="h-20 flex flex-col items-center justify-center gap-1 rounded-md border border-input bg-background hover:bg-accent text-sm">
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">Da galeria</span>
            </div>
          </label>
        </div>

        {/* Miniaturas */}
        {currentPhotos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma foto ainda nesta etapa.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {currentPhotos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(current.key, p.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                  aria-label="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive text-sm p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </main>

      {/* Rodapé de navegação fixo */}
      <footer className="sticky bottom-0 bg-background border-t px-4 py-3 flex items-center gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={uploading}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        )}
        {step < CATS.length - 1 ? (
          <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={uploading}>
            Próximo <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSave} disabled={uploading || totalPhotos === 0}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando {progress.done}/{progress.total}…</>
            ) : (
              <><Check className="w-4 h-4 mr-1" /> Salvar {totalPhotos > 0 ? `(${totalPhotos})` : ""}</>
            )}
          </Button>
        )}
      </footer>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}
