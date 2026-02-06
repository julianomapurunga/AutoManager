import { useState } from "react";
import { usePeople, useCreatePerson, useDeletePerson } from "@/hooks/use-people";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2, Phone, Mail, FileText } from "lucide-react";
import { PersonForm } from "@/components/forms/PersonForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function People() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Proprietário");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Cast activeTab to specific type expected by hook
  const { data: people, isLoading } = usePeople(
    activeTab as "Proprietário" | "Cliente", 
    search
  );

  const createMutation = useCreatePerson();
  const deleteMutation = useDeletePerson();

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cadastro?")) {
      deleteMutation.mutate(id);
    }
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Pessoas" 
        description="Gerencie proprietários e clientes."
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cadastro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Cadastro</DialogTitle>
              </DialogHeader>
              <PersonForm 
                onSubmit={handleCreate} 
                isPending={createMutation.isPending}
                onCancel={() => setIsCreateOpen(false)}
                defaultValues={{ type: activeTab as any }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="Proprietário">Proprietários</TabsTrigger>
            <TabsTrigger value="Cliente">Clientes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : people?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum cadastro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              people?.map((person) => (
                <TableRow key={person.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 bg-primary/10 text-primary border border-primary/20">
                        <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      {person.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {person.phone}
                      </div>
                      {person.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {person.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {person.document ? (
                       <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                         <FileText className="w-3 h-3" />
                         {person.document}
                       </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm italic">Não informado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(person.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
