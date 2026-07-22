import { useState } from "react";
import { useAuth, type NeedsProfile } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, AlertCircle, Store, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeProfileSchema, USER_GENDERS, type CompleteProfileInput } from "@shared/models/auth";
import { TRIAL_DAYS } from "@shared/models/tenancy";
import { formatCpf, formatPhone } from "@/lib/masks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface CompleteProfilePageProps {
  info: NeedsProfile;
}

export default function CompleteProfilePage({ info }: CompleteProfilePageProps) {
  const { completeProfile, isCompletingProfile, logout } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState("");

  const form = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      organizationName: "",
      firstName: info.firstName ?? "",
      lastName: info.lastName ?? "",
      phone: "",
      cpf: "",
      gender: undefined,
    },
  });

  const handleSubmit = async (data: CompleteProfileInput) => {
    setError("");
    try {
      await completeProfile(data);
      toast({ title: "Cadastro concluído! Bem-vindo ao VEHIRO." });
    } catch (err: any) {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        setError(parsed.message || "Erro ao concluir cadastro");
      } catch {
        setError(msg || "Erro ao concluir cadastro");
      }
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
          <p className="text-muted-foreground">
            Falta pouco! Complete o cadastro da sua loja e comece com {TRIAL_DAYS} dias grátis
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Concluir cadastro</CardTitle>
            <CardDescription>
              {info.email
                ? <>Você entrou com <strong>{info.email}</strong>. Precisamos de mais alguns dados para criar sua loja.</>
                : "Precisamos de mais alguns dados para criar sua loja."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-complete-error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Loja / Pátio *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="Ex.: Auto Center Silva" {...field} data-testid="input-organizationName" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome" {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input placeholder="Sobrenome" {...field} value={field.value ?? ""} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          onChange={(e) => field.onChange(formatCpf(e.target.value))}
                          data-testid="input-cpf"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {USER_GENDERS.map((g) => (
                            <SelectItem key={g} value={g} data-testid={`option-gender-${g}`}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isCompletingProfile} data-testid="button-submit-complete">
                  {isCompletingProfile ? "Concluindo..." : "Concluir cadastro"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                data-testid="button-cancel-complete"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair e usar outra conta
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
