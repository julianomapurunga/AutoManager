import nodemailer from "nodemailer";

/**
 * Envio de e-mails via SMTP (nodemailer).
 *
 * Para Gmail (irontechti@gmail.com):
 * 1. Ative a verificação em 2 etapas na conta Google
 * 2. Crie uma "Senha de app" em https://myaccount.google.com/apppasswords
 * 3. No .env:
 *    SMTP_HOST=smtp.gmail.com
 *    SMTP_PORT=465
 *    SMTP_USER=irontechti@gmail.com
 *    SMTP_PASS=<senha de app de 16 letras>
 */
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export function isMailerConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  if (!isMailerConfigured()) {
    throw new Error("SMTP não configurado (defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env)");
  }
  await getTransporter().sendMail({
    from: `"VEHIRO" <${SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    replyTo: options.replyTo,
  });
}
