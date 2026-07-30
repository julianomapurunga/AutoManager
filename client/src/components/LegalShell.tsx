import type { ReactNode } from "react";
import { Link } from "wouter";
import { Car } from "lucide-react";
import { AppFooter } from "@/components/AppFooter";

/** Layout das páginas legais (Termos, Privacidade): cabeçalho com marca + rodapé institucional. */
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-legal-home">
            <Car className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-lg">VEHIRO</span>
          </Link>
          <Link href="/" className="text-sm text-primary hover:underline">Voltar</Link>
        </div>
      </header>
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold font-display">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Última atualização: {updated}</p>
          </div>
          {children}
        </article>
      </main>
      <AppFooter />
    </div>
  );
}

/** Seção de texto legal com título e corpo. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold font-display">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
