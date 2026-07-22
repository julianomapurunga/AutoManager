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

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy de produção. Restringe de onde scripts, estilos,
 * imagens e conexões podem vir — a principal defesa contra XSS (que, com o JWT
 * do Supabase no navegador, viraria roubo de sessão).
 *
 * Aplicada só em produção: em dev o Vite injeta scripts inline e usa WebSocket
 * de HMR, que uma CSP estrita quebraria. As origens do Supabase são liberadas
 * em connect-src (auth/refresh de token e realtime via wss).
 */
const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' em estilos: bibliotecas de UI injetam style inline e o
  // index.css importa a fonte do Google Fonts.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProd) {
    res.setHeader("Content-Security-Policy", CSP_PROD);
    // Força HTTPS por 1 ano. Só em produção (atrás de TLS); em localhost isso
    // prenderia o navegador a https e quebraria o dev.
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

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
