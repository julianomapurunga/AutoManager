import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Car, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/models/auth";
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
}

export default function LoginPage({ onBackToLanding }: LoginPageProps) {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
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
        setError(parsed.message || "Usuário ou senha inválidos");
      } catch {
        setError("Usuário ou senha inválidos");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
              AutoManager
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
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu nome de usuário"
                          {...field}
                          data-testid="input-username"
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

                <Button type="submit" className="w-full" disabled={isLoggingIn} data-testid="button-submit-login">
                  {isLoggingIn ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
