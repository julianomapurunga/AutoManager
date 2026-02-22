import { useState, useRef, useEffect } from "react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { useIntermediaries, useCreateIntermediary, useUpdateIntermediary, useDeleteIntermediary } from "@/hooks/use-intermediaries";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, updateUserSchema, USER_ROLES, USER_GENDERS } from "@shared/models/auth";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Settings as SettingsIcon, UserPlus, Pencil, Trash2, Shield, ShieldCheck, Search, Eye, EyeOff, Users, Camera, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Intermediary } from "@shared/schema";

type CreateUserForm = z.infer<typeof registerSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = users?.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(term) ||
      (u.lastName?.toLowerCase().includes(term)) ||
      u.username.toLowerCase().includes(term) ||
      u.cpf.includes(term) ||
      u.phone.includes(term)
    );
  });

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      toast({ title: "Usuário excluído com sucesso" });
      setDeletingUser(null);
    } catch (err: any) {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        toast({ title: parsed.message || "Erro ao excluir", variant: "destructive" });
      } catch {
        toast({ title: "Erro ao excluir usuário", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
            <SettingsIcon className="w-7 h-7 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os usuários, intermediários e permissões do sistema</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-user">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-users"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-md border border-border flex-wrap"
                  data-testid={`row-user-${u.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {u.role === "Administrador" ? (
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      ) : (
                        <Shield className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate" data-testid={`text-user-name-${u.id}`}>
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{u.username} &middot; {u.cpf} &middot; {u.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={u.role === "Administrador" ? "default" : "secondary"}
                      data-testid={`badge-role-${u.id}`}
                    >
                      {u.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingUser(u)}
                      data-testid={`button-edit-user-${u.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {u.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(u)}
                        data-testid={`button-delete-user-${u.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
          )}
        </CardContent>
      </Card>

      <IntermediarySection />

      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (data) => {
          await createUser.mutateAsync(data);
          toast({ title: "Usuário criado com sucesso" });
          setShowCreateDialog(false);
        }}
        isPending={createUser.isPending}
      />

      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSubmit={async (data) => {
            await updateUser.mutateAsync({ id: editingUser.id, data });
            toast({ title: "Usuário atualizado com sucesso" });
            setEditingUser(null);
          }}
          isPending={updateUser.isPending}
        />
      )}

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o usuário <strong>{deletingUser?.firstName} {deletingUser?.lastName}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingUser(null)} data-testid="button-cancel-delete">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUser.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntermediarySection() {
  const { data: intermediaries, isLoading } = useIntermediaries();
  const createIntermediary = useCreateIntermediary();
  const updateIntermediary = useUpdateIntermediary();
  const deleteIntermediary = useDeleteIntermediary();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Intermediary | null>(null);
  const [deleting, setDeleting] = useState<Intermediary | null>(null);
  const [search, setSearch] = useState("");

  const filtered = intermediaries?.filter((i) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return i.name.toLowerCase().includes(term) || i.cpf.includes(term);
  });

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteIntermediary.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (err: any) {
      toast({ title: "Erro ao excluir intermediário", variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Intermediários (Corretores)
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-intermediaries"
              />
            </div>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-intermediary">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="space-y-2">
              {filtered.map((int) => (
                <div
                  key={int.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-md border border-border flex-wrap"
                  data-testid={`row-intermediary-${int.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="w-10 h-10 shrink-0">
                      {int.photoUrl ? (
                        <AvatarImage src={int.photoUrl} alt={int.name} />
                      ) : null}
                      <AvatarFallback>{int.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate" data-testid={`text-intermediary-name-${int.id}`}>
                        {int.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        CPF: {int.cpf}
                        {int.birthDate && (
                          <span className="ml-2">
                            <CalendarDays className="w-3 h-3 inline mr-0.5" />
                            {new Date(int.birthDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(int)} data-testid={`button-edit-intermediary-${int.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(int)} data-testid={`button-delete-intermediary-${int.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {intermediaries?.length === 0 ? "Nenhum intermediário cadastrado." : "Nenhum resultado encontrado."}
            </p>
          )}
        </CardContent>
      </Card>

      <IntermediaryFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={async (formData) => {
          await createIntermediary.mutateAsync(formData);
          setShowCreate(false);
        }}
        isPending={createIntermediary.isPending}
      />

      {editing && (
        <IntermediaryFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          intermediary={editing}
          onSubmit={async (formData) => {
            await updateIntermediary.mutateAsync({ id: editing.id, data: formData });
            setEditing(null);
          }}
          isPending={updateIntermediary.isPending}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o intermediário <strong>{deleting?.name}</strong>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteIntermediary.isPending} data-testid="button-confirm-delete-intermediary">
              {deleteIntermediary.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IntermediaryFormDialog({
  open,
  onOpenChange,
  intermediary,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intermediary?: Intermediary;
  onSubmit: (data: FormData) => Promise<void>;
  isPending: boolean;
}) {
  const [name, setName] = useState(intermediary?.name || "");
  const [cpf, setCpf] = useState(intermediary?.cpf || "");
  const [birthDate, setBirthDate] = useState(
    intermediary?.birthDate ? new Date(intermediary.birthDate).toISOString().split("T")[0] : ""
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(intermediary?.photoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(intermediary?.name || "");
      setCpf(intermediary?.cpf || "");
      setBirthDate(intermediary?.birthDate ? new Date(intermediary.birthDate).toISOString().split("T")[0] : "");
      setPhotoFile(null);
      setPhotoPreview(intermediary?.photoUrl || null);
    }
  }, [open, intermediary]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cpf.trim()) return;

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("cpf", cpf.trim());
    if (birthDate) formData.append("birthDate", birthDate);
    if (photoFile) formData.append("photo", photoFile);

    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{intermediary ? "Editar Intermediário" : "Novo Intermediário"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {photoPreview ? (
                  <AvatarImage src={photoPreview} alt="Foto" />
                ) : null}
                <AvatarFallback>
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                data-testid="input-intermediary-photo"
              />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Foto do Intermediário</p>
              <p className="text-xs text-muted-foreground">Clique no avatar para selecionar</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-intermediary-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                maxLength={14}
                required
                data-testid="input-intermediary-cpf"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                data-testid="input-intermediary-birthdate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} data-testid="button-submit-intermediary">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserForm) => Promise<void>;
  isPending: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      cpf: "",
      gender: undefined,
      role: undefined,
    },
  });

  const handleSubmit = async (data: CreateUserForm) => {
    setError("");
    try {
      await onSubmit(data);
      form.reset();
    } catch (err: any) {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        setError(parsed.message || "Erro ao criar usuário");
      } catch {
        setError("Erro ao criar usuário");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input placeholder="Nome" {...field} data-testid="input-create-firstName" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl><Input placeholder="Sobrenome" {...field} value={field.value ?? ""} data-testid="input-create-lastName" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Usuário *</FormLabel>
                <FormControl><Input placeholder="Nome de usuário" {...field} data-testid="input-create-username" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Senha *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" {...field} data-testid="input-create-password" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cpf" render={({ field }) => (
              <FormItem>
                <FormLabel>CPF *</FormLabel>
                <FormControl>
                  <Input placeholder="000.000.000-00" {...field} onChange={(e) => field.onChange(formatCpf(e.target.value))} data-testid="input-create-cpf" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone *</FormLabel>
                <FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} data-testid="input-create-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-gender"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissão *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-role"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending} data-testid="button-submit-create-user">
                {isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSubmit: (data: UpdateUserForm) => Promise<void>;
  isPending: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const editSchema = updateUserSchema.extend({
    firstName: z.string().min(2, "Nome é obrigatório"),
    phone: z.string().min(10, "Telefone inválido"),
    cpf: z.string().min(11, "CPF inválido"),
    gender: z.enum(USER_GENDERS),
    role: z.enum(USER_ROLES),
    password: z.string().optional().refine((val) => !val || val.length >= 6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  });

  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName || "",
      phone: user.phone,
      cpf: user.cpf,
      gender: user.gender,
      role: user.role,
      password: "",
    },
  });

  const handleSubmit = async (data: UpdateUserForm) => {
    setError("");
    const cleanData = { ...data };
    if (!cleanData.password) delete cleanData.password;
    try {
      await onSubmit(cleanData);
    } catch (err: any) {
      const msg = err.message || "";
      try {
        const parsed = JSON.parse(msg.split(": ").slice(1).join(": "));
        setError(parsed.message || "Erro ao atualizar");
      } catch {
        setError("Erro ao atualizar usuário");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-firstName" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-edit-lastName" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="cpf" render={({ field }) => (
              <FormItem>
                <FormLabel>CPF *</FormLabel>
                <FormControl>
                  <Input {...field} onChange={(e) => field.onChange(formatCpf(e.target.value))} data-testid="input-edit-cpf" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone *</FormLabel>
                <FormControl>
                  <Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} data-testid="input-edit-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-gender"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissão *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Nova Senha (opcional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Deixe em branco para manter" {...field} data-testid="input-edit-password" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={isPending} data-testid="button-submit-edit-user">
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
