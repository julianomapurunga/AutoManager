// Tokens assinados para o envio público de fotos de veículos via QR code.
//
// O dono da loja gera um QR code para um veículo específico; quem escaneia
// (normalmente no celular) abre uma página pública que só permite anexar fotos
// àquele veículo, e apenas por 2 horas. O token carrega { vehicleId, organizationId }
// e expira sozinho — nenhuma sessão/login é necessária na página do celular.

import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const TTL_SECONDS = 2 * 60 * 60; // 2 horas
export const PHOTO_TOKEN_TTL_MINUTES = TTL_SECONDS / 60;

// Segredo dedicado ao token de fotos. Se não houver env, gera um temporário
// (os links de foto passam a invalidar a cada restart — aceitável, mas avisamos).
const rawSecret = process.env.PHOTO_UPLOAD_SECRET || process.env.SUPABASE_JWT_SECRET;
if (!rawSecret) {
  console.warn(
    "[photo-token] PHOTO_UPLOAD_SECRET não definido — usando segredo temporário. " +
      "Os QR codes de foto invalidam a cada reinício do servidor.",
  );
}
const secret = new TextEncoder().encode(rawSecret || crypto.randomBytes(32).toString("hex"));

export type PhotoTokenPayload = { vehicleId: number; organizationId: number };

export async function signPhotoToken(payload: PhotoTokenPayload): Promise<string> {
  return await new SignJWT({ vehicleId: payload.vehicleId, organizationId: payload.organizationId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyPhotoToken(token: string): Promise<PhotoTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const vehicleId = payload.vehicleId;
    const organizationId = payload.organizationId;
    if (typeof vehicleId === "number" && typeof organizationId === "number") {
      return { vehicleId, organizationId };
    }
    return null;
  } catch {
    return null;
  }
}
