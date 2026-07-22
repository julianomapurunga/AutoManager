import { eq } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "@shared/schema";

/**
 * Configurações da plataforma em banco (editáveis pelo painel do super admin),
 * com cache em memória para leitura síncrona. O .env funciona como fallback
 * quando a chave não existe no banco.
 */
let cache: Map<string, string> | null = null;

export async function loadSettings(): Promise<void> {
  const rows = await db.select().from(appSettings);
  cache = new Map(rows.map((r) => [r.key, r.value]));
  console.log(`[settings] ${rows.length} configuração(ões) carregada(s) do banco`);
}

/** Leitura síncrona (do cache). Retorna undefined se não definida no banco. */
export function getSetting(key: string): string | undefined {
  return cache?.get(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  cache?.set(key, value);
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, key));
  cache?.delete(key);
}
