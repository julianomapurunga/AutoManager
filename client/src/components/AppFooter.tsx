import { Link } from "wouter";
import { Car } from "lucide-react";
import { APP_VERSION } from "@shared/version";
import { COMPANY } from "@/lib/company";

/**
 * Rodapé institucional exibido em todas as telas do produto (exceto o painel do
 * super admin). Traz a marca, links legais, a empresa responsável e o link para
 * o site da Iron Tech.
 */
export function AppFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit"
            data-testid="link-footer-home"
          >
            <Car className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold">{COMPANY.product}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/termos" className="hover:text-foreground transition-colors" data-testid="link-terms">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-foreground transition-colors" data-testid="link-privacy">
              Privacidade
            </Link>
            <a
              href={COMPANY.site}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              data-testid="link-irontech"
            >
              um produto <span className="font-semibold text-foreground">{COMPANY.brand}</span>
            </a>
          </nav>
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
          <p>{COMPANY.legalName} · CNPJ {COMPANY.cnpj}</p>
          <p>{COMPANY.address}</p>
          <p className="mt-1.5">
            © {new Date().getFullYear()} {COMPANY.product} v{APP_VERSION}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
