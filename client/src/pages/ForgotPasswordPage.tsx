import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Car, ArrowLeft, MailCheck, AlertCircle, KeyRound } from "lucide-react";

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Digite um e-mail válido");
      return;
    }

    setIsSending(true);
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (sbError && sbError.status === 429) {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
      // Mesmo se o e-mail não existir, mostramos sucesso (evita revelar contas cadastradas)
      setSent(true);
    } catch {
      setError("Erro ao enviar o e-mail. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" onClick={onBackToLogin} className="mb-2" data-testid="button-back-to-login">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o login
        </Button>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="w-10 h-10 text-primary" />
            <span className="text-3xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VEHIRO
            </span>
          </div>
        </div>

        <Card>
          {sent ? (
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto p-4 rounded-full bg-emerald-500/10 w-fit">
                <MailCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold font-display" data-testid="text-reset-sent">Verifique seu e-mail</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Se <strong>{email}</strong> estiver cadastrado, você receberá um link para
                redefinir sua senha. O link expira em 1 hora — confira também a caixa de spam.
              </p>
              <Button variant="outline" className="w-full" onClick={onBackToLogin} data-testid="button-sent-back-login">
                Voltar para o login
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  Esqueci minha senha
                </CardTitle>
                <CardDescription>
                  Digite o e-mail cadastrado e enviaremos um link para criar uma nova senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-forgot-error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    data-testid="input-forgot-email"
                  />
                  <Button type="submit" className="w-full" disabled={isSending} data-testid="button-send-reset">
                    {isSending ? "Enviando..." : "Enviar link de redefinição"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
