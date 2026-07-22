import type { Express } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { guard } from "../auth";
import { rateLimit } from "../security";
import { sendMail, isMailerConfigured } from "../mailer";
import { supportTickets, SUPPORT_CATEGORIES } from "@shared/schema";
import { users } from "@shared/models/auth";

const SUPPORT_EMAIL = "irontechti@gmail.com";

const ticketSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  message: z.string().min(10, "Descreva sua solicitação com pelo menos 10 caracteres").max(3000, "Máximo de 3000 caracteres"),
});

/** Formata o número do atendimento: 1 → 001, 42 → 042, 1250 → 1250. */
export function formatTicketNumber(id: number): string {
  return String(id).padStart(3, "0");
}

export function registerSupportRoutes(app: Express): void {
  const supportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: "Muitos chamados em sequência. Aguarde alguns minutos.",
  });

  /**
   * Registra o chamado com número sequencial global e envia o e-mail
   * automaticamente via SMTP. Se o SMTP não estiver configurado ou falhar,
   * devolve emailSent=false e o cliente oferece o envio manual (mailto).
   */
  app.post("/api/support/tickets", guard(), supportLimiter, async (req, res) => {
    try {
      const input = ticketSchema.parse(req.body);
      const user = req.user!;
      const org = req.organization!;

      const [ticket] = await db
        .insert(supportTickets)
        .values({
          organizationId: user.organizationId,
          userId: user.id,
          category: input.category,
          message: input.message,
        })
        .returning();

      const ticketNumber = formatTicketNumber(ticket.id);
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      const subject = `Atendimento #${ticketNumber} - ${org.name} [${input.category}]`;
      const body = [
        `Número do atendimento: #${ticketNumber}`,
        `Nome: ${fullName}`,
        `Loja: ${org.name}`,
        `E-mail: ${user.email}`,
        `Categoria: ${input.category}`,
        `Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
        "",
        "Solicitação:",
        input.message,
      ].join("\n");

      // Envio automático pelo servidor
      let emailSent = false;
      if (isMailerConfigured()) {
        try {
          await sendMail({
            to: SUPPORT_EMAIL,
            subject,
            text: body,
            replyTo: user.email, // responder vai direto para quem abriu
          });
          emailSent = true;
          await db.update(supportTickets)
            .set({ emailSent: true })
            .where(eq(supportTickets.id, ticket.id));
        } catch (mailErr) {
          console.error(`[support] Falha ao enviar e-mail do chamado #${ticketNumber}:`, mailErr);
        }
      } else {
        console.warn("[support] SMTP não configurado — chamado registrado sem envio automático.");
      }

      res.status(201).json({
        ticketNumber,
        id: ticket.id,
        emailSent,
        // dados para o fallback manual (mailto) quando o envio automático falha
        fallback: emailSent ? null : { to: SUPPORT_EMAIL, subject, body },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      console.error("Support ticket error:", err);
      res.status(500).json({ message: "Erro ao registrar o chamado" });
    }
  });

  /** Lista os chamados da loja do usuário (mais recentes primeiro). */
  app.get("/api/support/tickets", guard(), async (req, res) => {
    try {
      const rows = await db
        .select({
          id: supportTickets.id,
          category: supportTickets.category,
          message: supportTickets.message,
          emailSent: supportTickets.emailSent,
          createdAt: supportTickets.createdAt,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(supportTickets)
        .leftJoin(users, eq(supportTickets.userId, users.id))
        .where(eq(supportTickets.organizationId, req.user!.organizationId))
        .orderBy(desc(supportTickets.createdAt))
        .limit(50);

      res.json(rows.map((r) => ({
        ...r,
        ticketNumber: formatTicketNumber(r.id),
        openedBy: [r.userFirstName, r.userLastName].filter(Boolean).join(" ") || "—",
      })));
    } catch (err) {
      console.error("Support list error:", err);
      res.status(500).json({ message: "Erro ao listar chamados" });
    }
  });
}
