import "dotenv/config";
import { db } from "../server/db";
import { supabaseAdmin } from "../server/supabase";
import { users } from "../shared/models/auth";
import { organizations, TRIAL_DAYS } from "../shared/models/tenancy";

/**
 * Cria uma loja (organização) + usuário administrador manualmente.
 * Uso:
 *   TENANT_NAME="Minha Loja" ADMIN_EMAIL=admin@loja.com ADMIN_PASSWORD=senha123 npm run create-tenant
 */
const TENANT_NAME = process.env.TENANT_NAME ?? "Loja Demonstração";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function main() {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error || !created?.user) {
    throw new Error(`Erro ao criar usuário no Supabase Auth: ${error?.message}`);
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const [org] = await db
    .insert(organizations)
    .values({
      name: TENANT_NAME,
      plan: "trial",
      subscriptionStatus: "trialing",
      trialEndsAt,
    })
    .returning();

  await db.insert(users).values({
    id: created.user.id,
    organizationId: org.id,
    email: ADMIN_EMAIL,
    firstName: "Administrador",
    lastName: "Sistema",
    phone: "11999999999",
    cpf: "52998224725", // CPF de exemplo válido
    gender: "Outro",
    role: "Administrador",
  });

  console.log("Loja e administrador criados com sucesso.");
  console.log("  Loja:", TENANT_NAME);
  console.log("  Login:", ADMIN_EMAIL);
  console.log("  Senha:", ADMIN_PASSWORD);
  console.log("  (Altere a senha após o primeiro acesso)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
