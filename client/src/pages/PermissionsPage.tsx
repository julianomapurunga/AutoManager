import { Shield, Users, Car, DollarSign, Settings, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const permissions = [
  {
    role: "Administrador",
    description: "Acesso total ao sistema, incluindo gerenciamento de usuários e auditoria.",
    color: "bg-red-500",
    modules: [
      { name: "Dashboard", access: "Total" },
      { name: "Veículos", access: "Criar, Editar, Excluir, Vender" },
      { name: "Pessoas", access: "Criar, Editar, Excluir" },
      { name: "Financeiro", access: "Total" },
      { name: "Configurações", access: "Gerenciar Usuários" },
      { name: "Auditoria", access: "Visualizar Logs" },
    ],
  },
  {
    role: "Gerente",
    description: "Gestão operacional completa, sem acesso a configurações críticas do sistema.",
    color: "bg-blue-500",
    modules: [
      { name: "Dashboard", access: "Visualizar" },
      { name: "Veículos", access: "Criar, Editar, Vender" },
      { name: "Pessoas", access: "Criar, Editar" },
      { name: "Financeiro", access: "Visualizar" },
      { name: "Configurações", access: "Sem Acesso" },
      { name: "Auditoria", access: "Sem Acesso" },
    ],
  },
  {
    role: "Financeiro",
    description: "Focado em controle de custos, despesas da loja e relatórios financeiros.",
    color: "bg-green-500",
    modules: [
      { name: "Dashboard", access: "Visualizar" },
      { name: "Veículos", access: "Visualizar, Adicionar Despesas" },
      { name: "Pessoas", access: "Visualizar" },
      { name: "Financeiro", access: "Total" },
      { name: "Configurações", access: "Sem Acesso" },
      { name: "Auditoria", access: "Sem Acesso" },
    ],
  },
  {
    role: "Vendedor",
    description: "Acesso limitado a operações de venda e consulta de estoque.",
    color: "bg-yellow-500",
    modules: [
      { name: "Dashboard", access: "Visualizar" },
      { name: "Veículos", access: "Visualizar, Vender" },
      { name: "Pessoas", access: "Visualizar, Criar" },
      { name: "Financeiro", access: "Sem Acesso" },
      { name: "Configurações", access: "Sem Acesso" },
      { name: "Auditoria", access: "Sem Acesso" },
    ],
  },
];

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz de Permissões"
        description="Entenda o que cada nível de acesso pode realizar no sistema."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {permissions.map((p) => (
          <Card key={p.role} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className={`w-3 h-10 rounded-full ${p.color}`} />
              <div>
                <CardTitle>{p.role}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {p.description}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Módulo</TableHead>
                    <TableHead>Nível de Acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.modules.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="pl-6 font-medium">
                        {m.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.access === "Sem Acesso" ? "secondary" : "outline"}>
                          {m.access}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
