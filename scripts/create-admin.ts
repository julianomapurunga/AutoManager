import "dotenv/config";
import bcrypt from "bcryptjs";
import { users } from "../shared/models/auth";
import { db } from "../server/db";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await db.insert(users).values({
    username: ADMIN_USERNAME,
    password: hashedPassword,
    firstName: "Administrador",
    lastName: "Sistema",
    phone: "11999999999",
    cpf: "00000000000",
    gender: "Outro",
    role: "Administrador",
  });

  console.log("Usuário administrador criado com sucesso.");
  console.log("  Login:", ADMIN_USERNAME);
  console.log("  Senha:", ADMIN_PASSWORD);
  console.log("  (Altere a senha após o primeiro acesso)");
}

main().catch((err) => {
  if (err?.code === "23505") {
    console.error("Erro: já existe um usuário com esse username ou CPF.");
  } else {
    console.error(err);
  }
  process.exit(1);
});
