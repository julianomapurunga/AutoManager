import { useVehicle, useUpdateVehicle, useDeleteVehicle } from "@/hooks/use-vehicles";
import { useCreateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useVehicleImages, useUploadVehicleImages, useDeleteVehicleImage, useDeleteAllVehicleImages } from "@/hooks/use-vehicle-images";
import { useRoute, useLocation } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Edit2, Plus, Calendar, ShoppingCart, ImagePlus, X, Trash, Loader2 } from "lucide-react";
import { VEHICLE_STATUS } from "@shared/schema";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { SellVehicleDialog } from "@/components/forms/SellVehicleDialog";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function VehicleDetails() {
  const [match, params] = useRoute("/vehicles/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: vehicle, isLoading } = useVehicle(id);
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();
  const expenseMutation = useCreateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  const { data: images = [], isLoading: imagesLoading } = useVehicleImages(id);
  const uploadMutation = useUploadVehicleImages();
  const deleteImageMutation = useDeleteVehicleImage();
  const deleteAllImagesMutation = useDeleteAllVehicleImages();

  if (isLoading) return <div className="p-8">Carregando detalhes...</div>;
  if (!vehicle) return <div className="p-8">Veículo não encontrado.</div>;

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este veículo?")) {
      await deleteMutation.mutateAsync(id);
      setLocation("/vehicles");
    }
  };

  const handleUpdate = (data: any) => {
    updateMutation.mutate({ id, ...data }, {
      onSuccess: () => setIsEditOpen(false),
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    expenseMutation.mutate({
      vehicleId: id,
      description: expenseDesc,
      amount: Math.round(Number(expenseAmount) * 100),
    }, {
      onSuccess: () => {
        setIsExpenseOpen(false);
        setExpenseDesc("");
        setExpenseAmount("");
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    uploadMutation.mutate({ vehicleId: id, files }, {
      onSuccess: () => {
        toast({ title: `${files.length} imagem(ns) anexada(s) com sucesso!` });
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err: any) => {
        toast({ title: "Erro ao anexar imagens", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleDeleteImage = (imageId: number) => {
    deleteImageMutation.mutate({ imageId, vehicleId: id });
  };

  const handleDeleteAllImages = () => {
    if (confirm("Tem certeza que deseja remover todas as imagens deste veículo?")) {
      deleteAllImagesMutation.mutate(id, {
        onSuccess: () => toast({ title: "Todas as imagens foram removidas." }),
      });
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);

  const totalExpenses = vehicle.expenses.reduce((sum, e) => sum + e.amount, 0);
  const saleValue = vehicle.salePrice || vehicle.price || 0;
  const netProfit = saleValue - totalExpenses;
  const isSold = vehicle.status === "Vendido";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => setLocation("/vehicles")} data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Veículos
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold font-display" data-testid="text-vehicle-name">{vehicle.brand} {vehicle.model}</h1>
            {isSold ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-sm px-3 py-1 no-default-hover-elevate no-default-active-elevate" data-testid="badge-vehicle-status">
                Vendido
              </Badge>
            ) : (
              <Select
                value={vehicle.status}
                onValueChange={(newStatus: string) => {
                  updateMutation.mutate({ id, status: newStatus as typeof VEHICLE_STATUS[number] });
                }}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-vehicle-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUS.filter(s => s !== "Vendido").map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-xl text-muted-foreground mt-1 uppercase tracking-wider">{vehicle.plate} - {vehicle.yearFab && vehicle.yearModel ? `${vehicle.yearFab}/${vehicle.yearModel}` : vehicle.yearFab || vehicle.yearModel || ""}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!isSold && (
            <Button onClick={() => setIsSellOpen(true)} data-testid="button-sell-vehicle">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Vender
            </Button>
          )}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-edit-vehicle">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Veículo</DialogTitle>
              </DialogHeader>
              <VehicleForm
                defaultValues={{
                  plate: vehicle.plate,
                  brand: vehicle.brand,
                  model: vehicle.model,
                  color: vehicle.color,
                  yearFab: vehicle.yearFab ?? undefined,
                  yearModel: vehicle.yearModel ?? undefined,
                  price: vehicle.price ?? undefined,
                  status: vehicle.status,
                  ownerId: vehicle.ownerId,
                  notes: vehicle.notes ?? undefined,
                }}
                defaultOwner={vehicle.owner}
                onSubmit={handleUpdate}
                isPending={updateMutation.isPending}
                onCancel={() => setIsEditOpen(false)}
                isEdit
              />
            </DialogContent>
          </Dialog>

          <Button variant="destructive" onClick={handleDelete} data-testid="button-delete-vehicle">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações do Veículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground">Cor</Label>
                <div className="font-medium text-lg">{vehicle.color}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Preço Pedido</Label>
                <div className="font-medium text-lg text-emerald-600 font-mono" data-testid="text-asking-price">
                  {formatCurrency(vehicle.price || 0)}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Proprietário</Label>
                <div className="font-medium text-lg">{vehicle.owner?.name || "Não informado"}</div>
                {vehicle.owner?.phone && (
                  <div className="text-sm text-muted-foreground">{vehicle.owner.phone}</div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Data de Entrada</Label>
                <div className="font-medium text-lg">
                  {vehicle.entryDate ? format(new Date(vehicle.entryDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </div>
              </div>
            </div>

            {isSold && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-muted-foreground">Valor de Venda</Label>
                    <div className="font-medium text-lg text-blue-600 font-mono" data-testid="text-sale-price">
                      {formatCurrency(vehicle.salePrice || 0)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data da Venda</Label>
                    <div className="font-medium text-lg" data-testid="text-sale-date">
                      {vehicle.saleDate ? format(new Date(vehicle.saleDate), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </div>
                  </div>
                  {vehicle.buyer && (
                    <div>
                      <Label className="text-muted-foreground">Comprador</Label>
                      <div className="font-medium text-lg" data-testid="text-buyer-name">{vehicle.buyer.name}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.buyer.phone}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div>
              <Label className="text-muted-foreground mb-2 block">Observações</Label>
              <div className="bg-muted/50 p-4 rounded-md text-sm leading-relaxed">
                {vehicle.notes || "Nenhuma observação registrada."}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none">
            <CardHeader>
              <CardTitle className="text-slate-100">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSold && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Valor de Venda</span>
                  <span className="font-mono font-medium">{formatCurrency(vehicle.salePrice || 0)}</span>
                </div>
              )}
              {!isSold && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Preço Pedido</span>
                  <span className="font-mono font-medium">{formatCurrency(vehicle.price || 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2 text-rose-300">
                <span>(-) Despesas</span>
                <span className="font-mono font-medium">{formatCurrency(totalExpenses)}</span>
              </div>
              <Separator className="bg-slate-700" />
              <div className="flex justify-between items-center gap-2 text-lg font-bold">
                <span className="text-emerald-400">Lucro {isSold ? "" : "Estimado"}</span>
                <span className="font-mono text-emerald-400">{formatCurrency(netProfit)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-base">Despesas</CardTitle>
              <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-add-expense">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Despesa</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddExpense} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Ex: Troca de óleo"
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        required
                        data-testid="input-expense-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        required
                        data-testid="input-expense-amount"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={expenseMutation.isPending} data-testid="button-submit-expense">
                      {expenseMutation.isPending ? "Adicionando..." : "Adicionar Despesa"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {vehicle.expenses.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed border-border">
                  Nenhuma despesa registrada.
                </div>
              ) : (
                <ul className="space-y-3">
                  {vehicle.expenses.map((expense) => (
                    <li key={expense.id} className="flex justify-between items-center text-sm p-3 rounded-md bg-muted/20 group" data-testid={`expense-item-${expense.id}`}>
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {expense.date ? format(new Date(expense.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-rose-600">
                          - {formatCurrency(expense.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive invisible group-hover:visible"
                          onClick={() => deleteExpenseMutation.mutate({ id: expense.id, vehicleId: id })}
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Fotos do Veículo</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {images.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAllImages}
                disabled={deleteAllImagesMutation.isPending}
                data-testid="button-delete-all-images"
              >
                <Trash className="w-4 h-4 mr-1" />
                Remover Todas
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              data-testid="button-add-images"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4 mr-1" />
              )}
              {uploadMutation.isPending ? "Enviando..." : "Anexar Imagens"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-images"
            />
          </div>
        </CardHeader>
        <CardContent>
          {imagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div
              className="text-center py-12 text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed border-border cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-images"
            >
              <ImagePlus className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>Nenhuma foto anexada.</p>
              <p className="text-xs mt-1">Clique aqui ou no botão acima para adicionar fotos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-md overflow-visible"
                  data-testid={`image-item-${img.id}`}
                >
                  <img
                    src={img.filePath}
                    alt={img.fileName}
                    className="w-full h-full object-cover rounded-md cursor-pointer"
                    onClick={() => setPreviewImage(img.filePath)}
                    data-testid={`image-preview-${img.id}`}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteImage(img.id)}
                    disabled={deleteImageMutation.isPending}
                    data-testid={`button-delete-image-${img.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl p-2">
            <img
              src={previewImage}
              alt="Foto do veículo"
              className="w-full h-auto max-h-[80vh] object-contain rounded-md"
              data-testid="image-fullscreen"
            />
          </DialogContent>
        </Dialog>
      )}

      <SellVehicleDialog
        vehicleId={id}
        vehicleName={`${vehicle.brand} ${vehicle.model}`}
        askingPrice={vehicle.price || 0}
        open={isSellOpen}
        onOpenChange={setIsSellOpen}
      />
    </div>
  );
}
