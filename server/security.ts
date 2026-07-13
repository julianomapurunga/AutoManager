import type { Request, Response, NextFunction, RequestHandler } from "express";
import fs from "fs";

// ─── Rate limiting (em memória, sem dependências) ──────────────────────────
// Janela deslizante simples por IP. Suficiente para uma instância única;
// se escalar horizontalmente, troque por um limitador com Redis.

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(options: { windowMs: number; max: number; message?: string }): RequestHandler {
  const buckets = new Map<string, Bucket>();

  // Limpeza periódica para não acumular IPs antigos
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, options.windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count++;
    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({
        message: options.message ?? "Muitas requisições. Tente novamente em instantes.",
      });
    }
    next();
  };
}

// ─── Headers de segurança ────────────────────────────────────────────────────

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
};

// ─── Validação de imagem por conteúdo (magic bytes) ─────────────────────────
// A extensão do arquivo é fácil de falsificar; aqui conferimos os primeiros
// bytes reais do arquivo gravado pelo multer.

const SIGNATURES: Array<{ check: (buf: Buffer) => boolean }> = [
  { check: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }, // JPEG
  { check: (b) => b.length > 7 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }, // PNG
  { check: (b) => b.length > 5 && (b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a") }, // GIF
  { check: (b) => b.length > 11 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" }, // WebP
];

export function isRealImage(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    return SIGNATURES.some((s) => s.check(buf));
  } catch {
    return false;
  }
}

/** Remove do disco os arquivos enviados que não são imagens reais. Retorna true se todos são válidos. */
export function validateUploadedImages(files: Express.Multer.File[]): boolean {
  const invalid = files.filter((f) => !isRealImage(f.path));
  for (const f of invalid) {
    fs.promises.unlink(f.path).catch(() => {});
  }
  if (invalid.length > 0) {
    // remove também os válidos do mesmo lote para não deixar upload parcial
    for (const f of files.filter((x) => !invalid.includes(x))) {
      fs.promises.unlink(f.path).catch(() => {});
    }
    return false;
  }
  return true;
}
