import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Eye, EyeOff, AlertCircle, LockKeyhole, CheckCircle2 } from "lucide-react";

type LinkState = "checking" | "valid" | "invalid";

/**
 * Página aberta pelo link enviado por e-mail (expira em ~1h, controlado pelo Supabase).
 * O supabase-js detecta o token na URL e cria uma sessão temporária de recuperação;
 * com ela, atualizamos a senha e deslogamos.
 */
export default function ResetPasswordPage() {
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Link expirado/inválido vem com erro no hash da URL
    const hash = window.location.hash;
    if (hash.includes("error=") || hash.includes("error_code=")) {
      setLinkState("invalid");
      return;
    }

    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (resolved) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolved = true;
        setLinkState("valid");
      }
    });

    // Fallback: dá tempo do supabase-js processar o token da URL
    const timer = setTimeout(async () => {
      if (resolved) return;
      const { data } = await supabase.auth.getSession();
      resolved = true;
      setLinkState(data.session ? "valid" : "invalid");
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    setIsSaving(true);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password });
      if (sbError) {
        setError(
          sbError.message.includes("different from the old")
            ? "A nova senha deve ser diferente da anterior"
            : "Erro ao salvar a nova senha. O link pode ter expirado — solicite um novo.",
        );
        return;
      }

      setSaved(true);
      await supabase.auth.signOut().catch(() => {});
      // Redireciona para o login
      setTimeout(() => {
        window.location.href = "/login";
      }, 1800);
    } catch {
      setError("Erro ao salvar a nova senha. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="w-10 h-10 text-primary" />
            <span className="text-3xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VEHIRO
            </span>
          </div>
        </div>

        <Card>
          {linkState === "checking" && (
            <CardContent className="p-8 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground text-center">Validando link...</p>
            </CardContent>
          )}

          {linkState === "invalid" && (
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold font-display" data-testid="text-link-invalid">Link inválido ou expirado</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O link de redefinição expirou ou já foi usado. Solicite um novo na tela de login.
              </p>
              <Button className="w-full" onClick={() => (window.location.href = "/login")} data-testid="button-invalid-back-login">
                Voltar para o login
              </Button>
            </CardContent>
          )}

          {linkState === "valid" && saved && (
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto p-4 rounded-full bg-emerald-500/10 w-fit">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold font-display" data-testid="text-password-saved">Senha alterada!</h2>
              <p className="text-sm text-muted-foreground">
                Redirecionando para o login...
              </p>
            </CardContent>
          )}

          {linkState === "valid" && !saved && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <LockKeyhole className="w-5 h-5 text-primary" />
                  Criar nova senha
                </CardTitle>
                <CardDescription>Digite e confirme a sua nova senha de acesso.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-reset-error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nova senha (mínimo 6 caracteres)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-new-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>

                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-testid="input-confirm-password"
                  />

                  <Button type="submit" className="w-full" disabled={isSaving} data-testid="button-save-password">
                    {isSaving ? "Salvando..." : "Salvar nova senha"}
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
