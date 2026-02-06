import { useState } from "react";
import { useStoreExpenses, useCreateStoreExpense, useDeleteStoreExpense } from "@/hooks/use-store-expenses";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Calendar, DollarSign, Search } from "lucide-react";
import { STORE_EXPENSE_CATEGORIES } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

const categoryColors: Record<string, string> = {
  "Aluguel": "bg-blue-100 text-blue-700 border-blue-200",
  "Internet": "bg-violet-100 text-violet-700 border-violet-200",
  "Água": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Energia": "bg-amber-100 text-amber-700 border-amber-200",
  "Produto de Limpeza": "bg-green-100 text-green-700 border-green-200",
  "Material de Escritório": "bg-slate-100 text-slate-700 border-slate-200",
  "Telefone": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Seguro": "bg-rose-100 text-rose-700 border-rose-200",
  "Impostos": "bg-red-100 text-red-700 border-red-200",
  "Salários": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Outros": "bg-gray-100 text-gray-700 border-gray-200",
};

export default function StoreExpenses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");

  const { data: expenses, isLoading } = useStoreExpenses();
  const createMutation = useCreateStoreExpense();
  const deleteMutation = useDeleteStoreExpense();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents <= 0 || !category) return;

    createMutation.mutate({
      description,
      amount: amountCents,
      category: category as typeof STORE_EXPENSE_CATEGORIES[number],
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setDescription("");
        setAmount("");
        setCategory("");
      }
    });
  };

  const filtered = expenses?.filter((exp) => {
    const matchSearch = !search || exp.description.toLowerCase().includes(search.toLowerCase()) || exp.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || exp.category === categoryFilter;
    return matchSearch && matchCategory;
  }) || [];

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);
  const totalAll = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Despesas da Loja"
        description="Controle as despesas operacionais da loja."
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-store-expense">
                <Plus className="w-4 h-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Despesa da Loja</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-expense-category">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Aluguel de janeiro"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    data-testid="input-store-expense-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-store-expense-amount"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-store-expense">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || !category} data-testid="button-submit-store-expense">
                    {createMutation.isPending ? "Registrando..." : "Registrar Despesa"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
            <DollarSign className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-rose-600" data-testid="text-total-store-expenses">
              {formatCurrency(totalAll)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{expenses?.length || 0} registros no total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filtrado</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-filtered-store-expenses">
              {formatCurrency(totalFiltered)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} registros exibidos</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-store-expenses"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {STORE_EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-md" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {expenses?.length === 0
              ? "Nenhuma despesa da loja registrada. Clique em 'Nova Despesa' para começar."
              : "Nenhuma despesa encontrada para o filtro selecionado."}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow key={expense.id} className="group" data-testid={`row-store-expense-${expense.id}`}>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {expense.date ? format(new Date(expense.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${categoryColors[expense.category] || categoryColors["Outros"]} no-default-hover-elevate no-default-active-elevate`}>
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="font-mono font-medium text-rose-600">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive invisible group-hover:visible"
                      onClick={() => deleteMutation.mutate(expense.id)}
                      data-testid={`button-delete-store-expense-${expense.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
