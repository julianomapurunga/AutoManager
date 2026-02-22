import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { User as UserIcon } from "lucide-react";

export default function ActivityLog() {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
  });

  if (user?.role !== "Administrador") {
    return <Redirect to="/" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log de Atividades"
        description="Rastreabilidade de todas as ações importantes no sistema."
      />

      <div className="bg-card rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Data/Hora</TableHead>
              <TableHead className="w-[150px]">Usuário</TableHead>
              <TableHead className="w-[120px]">Ação</TableHead>
              <TableHead className="w-[120px]">Entidade</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando logs...
                </TableCell>
              </TableRow>
            ) : (logs as any)?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              (logs as any)?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {log.user ? `${log.user.firstName} ${log.user.lastName || ""}` : "Sistema"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{log.entityType}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground italic">
                    {log.details || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
