import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env. " +
      "Encontre-os no painel do Supabase em Settings > API.",
  );
}

/**
 * Cliente administrativo do Supabase (service role).
 * Usado APENAS no servidor para criar/atualizar/excluir usuários no Supabase Auth.
 * Nunca exponha a service role key no frontend.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export { supabaseUrl };
