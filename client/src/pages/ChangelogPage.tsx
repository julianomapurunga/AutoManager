import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHANGELOG, APP_VERSION } from "@shared/version";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tag, CalendarDays, CheckCircle2 } from "lucide-react";

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Changelog"
        description={`Histórico de atualizações do sistema. Versão atual: ${APP_VERSION}`}
      />

      <div className="space-y-6">
        {CHANGELOG.map((entry, index) => (
          <Card key={entry.version} data-testid={`card-changelog-${entry.version}`}>
            <CardHeader className="flex flex-row items-start gap-4 space-y-0 flex-wrap">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-xl">{entry.title}</CardTitle>
                  {index === 0 && (
                    <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate">
                      Atual
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    v{entry.version}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {format(parseISO(entry.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
