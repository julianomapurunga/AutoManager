import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SUPPORT_CATEGORIES } from "@shared/schema";
import { ArrowLeft, LifeBuoy, Send, CheckCircle2, Mail, AlertCircle } from "lucide-react";

const SUPPORT_EMAIL = "irontechti@gmail.com";

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [category, setCategory] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sentTicket, setSentTicket] = useState<string | null>(null);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const storeName = user?.organization.name ?? "";
  const email = user?.email ?? "";

  const [autoSent, setAutoSent] = useState(true);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/support/tickets", { category, message });
      return res.json() as Promise<{
        ticketNumber: string;
        emailSent: boolean;
        fallback: { to: string; subject: string; body: string } | null;
      }>;
    },
    onSuccess: ({ ticketNumber, emailSent, fallback }) => {
      setAutoSent(emailSent);
      if (!emailSent && fallback) {
        // SMTP indisponível: abre o cliente de e-mail com tudo preenchido
        window.location.href = `mailto:${fallback.to}?subject=${encodeURIComponent(fallback.subject)}&body=${encodeURIComponent(fallback.body)}`;
      }
      setSentTicket(ticketNumber);
      toast({
        title: `Chamado #${ticketNumber} registrado!`,
        description: emailSent ? "E-mail enviado para a equipe de suporte." : undefined,
      });
    },
    onError: (err: any) => {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        setError(parsed.message || "Erro ao registrar o chamado");
      } catch {
        setError("Erro ao registrar o chamado. Tente novamente.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!category) {
      setError("Selecione o tipo da solicitação");
      return;
    }
    if (message.trim().length < 10) {
      setError("Descreva sua solicitação com pelo menos 10 caracteres");
      return;
    }
    submitMutation.mutate();
  };

  if (sentTicket) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Card className="border-emerald-500/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto p-4 rounded-full bg-emerald-500/10 w-fit">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold font-display" data-testid="text-ticket-created">
              Chamado #{sentTicket} registrado!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {autoSent ? (
                <>Sua solicitação foi enviada para a equipe de suporte. Responderemos
                em <strong>{email}</strong> citando o número <strong>#{sentTicket}</strong>.</>
              ) : (
                <>Abrimos seu aplicativo de e-mail com a mensagem pronta — basta clicar em enviar.
                Se ele não abriu, envie manualmente para <strong>{SUPPORT_EMAIL}</strong> citando
                o número <strong>#{sentTicket}</strong>.</>
              )}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => { setSentTicket(null); setMessage(""); setCategory(""); }} data-testid="button-new-ticket">
                Abrir outro chamado
              </Button>
              <Button onClick={() => navigate("/help")} data-testid="button-back-help">
                Voltar para a Ajuda
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => navigate("/help")} data-testid="button-back-to-help">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para a Ajuda
      </Button>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-support-title">
          <LifeBuoy className="w-7 h-7 text-primary" />
          Suporte
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie sua solicitação para a equipe do VEHIRO. Responderemos no seu e-mail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Abrir chamado
          </CardTitle>
          <CardDescription>
            Seus dados já estão preenchidos — é só escolher o tipo e descrever a solicitação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-support-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seu nome</Label>
                <Input value={fullName} readOnly className="bg-muted/50" data-testid="input-support-name" />
              </div>
              <div className="space-y-2">
                <Label>Loja</Label>
                <Input value={storeName} readOnly className="bg-muted/50" data-testid="input-support-store" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Seu e-mail</Label>
              <Input value={email} readOnly className="bg-muted/50" data-testid="input-support-email" />
            </div>

            <div className="space-y-2">
              <Label>Tipo da solicitação *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-support-category">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} data-testid={`option-support-${c}`}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descreva sua solicitação *</Label>
              <Textarea
                placeholder="Conte com detalhes o que você precisa: o que aconteceu, em qual tela, o que esperava que acontecesse..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={3000}
                data-testid="input-support-message"
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/3000</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitMutation.isPending} data-testid="button-send-support">
              <Send className="w-4 h-4 mr-2" />
              {submitMutation.isPending ? "Enviando..." : "Enviar solicitação"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ao enviar, geramos seu número de atendimento e a solicitação vai direto
              para a equipe de suporte.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
