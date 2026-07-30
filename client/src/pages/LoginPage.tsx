import { useAuth } from "@/hooks/use-auth";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Car, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/models/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { z } from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type LoginForm = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onBackToLanding?: () => void;
  onGoToRegister?: () => void;
  onForgotPassword?: () => void;
}

export default function LoginPage({ onBackToLanding, onGoToRegister, onForgotPassword }: LoginPageProps) {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (data: LoginForm) => {
    setError("");
    try {
      await login(data);
      toast({ title: "Login realizado com sucesso!" });
    } catch (err: any) {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        setError(parsed.message || "E-mail ou senha inválidos");
      } catch {
        setError(err.message || "E-mail ou senha inválidos");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {onBackToLanding && (
          <Button
            variant="ghost"
            onClick={onBackToLanding}
            className="mb-2"
            data-testid="button-back-to-landing"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="w-10 h-10 text-primary" />
            <span className="text-3xl font-bold font-display bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VEHIRO
            </span>
          </div>
          <p className="text-muted-foreground">Sistema de Controle de Pátio de Veículos</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>Digite suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-login-error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha"
                            {...field}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {onForgotPassword && (
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-sm text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoggingIn} data-testid="button-submit-login">
                  {isLoggingIn ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <GoogleSignInButton label="Entrar com Google" />

            {onGoToRegister && (
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Ainda não tem conta? </span>
                <button
                  onClick={onGoToRegister}
                  className="text-primary font-medium hover:underline"
                  data-testid="link-register"
                >
                  Cadastre sua loja
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      <AppFooter />
    </div>
  );
}
