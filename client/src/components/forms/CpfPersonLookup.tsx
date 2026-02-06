import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCreatePerson } from "@/hooks/use-people";
import { Check, X, Search, UserPlus, Loader2 } from "lucide-react";
import type { Person } from "@shared/schema";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

interface CpfPersonLookupProps {
  label: string;
  personType: "Proprietário" | "Cliente";
  selectedPerson: Person | null;
  onPersonChange: (person: Person | null) => void;
  optional?: boolean;
}

export function CpfPersonLookup({ label, personType, selectedPerson, onPersonChange, optional = false }: CpfPersonLookupProps) {
  const [cpf, setCpf] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const searchByCpf = useCallback(async (document: string) => {
    const cleaned = document.replace(/\D/g, "");
    if (cleaned.length < 3) return;
    setSearching(true);
    setSearched(false);
    setNotFound(false);
    try {
      const res = await fetch(`/api/people/search-by-document?document=${encodeURIComponent(cleaned)}`, { credentials: "include" });
      const person = await res.json();
      if (person && person.id) {
        onPersonChange(person);
        setNotFound(false);
      } else {
        onPersonChange(null);
        setNotFound(true);
      }
      setSearched(true);
    } catch {
      setNotFound(true);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }, [onPersonChange]);

  const handleCpfChange = (value: string) => {
    const formatted = formatCpf(value);
    setCpf(formatted);
    setSearched(false);
    setNotFound(false);
    onPersonChange(null);
  };

  const handleCpfKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchByCpf(cpf);
    }
  };

  useEffect(() => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length === 11) {
      const timer = setTimeout(() => searchByCpf(cpf), 500);
      return () => clearTimeout(timer);
    }
  }, [cpf, searchByCpf]);

  const clearSelection = () => {
    setCpf("");
    onPersonChange(null);
    setSearched(false);
    setNotFound(false);
  };

  if (selectedPerson) {
    return (
      <div className="space-y-1.5">
        <Label>{label}{optional ? " (opcional)" : ""}</Label>
        <div className="flex items-center gap-2 rounded-md border p-2.5 bg-muted/50">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-person-name">{selectedPerson.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedPerson.document} {selectedPerson.phone ? `- ${selectedPerson.phone}` : ""}
            </p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={clearSelection} data-testid="button-clear-person">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label>{label}{optional ? " (opcional)" : ""}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Digite o CPF..."
              value={cpf}
              onChange={(e) => handleCpfChange(e.target.value)}
              onKeyDown={handleCpfKeyDown}
              maxLength={14}
              data-testid="input-cpf-search"
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => searchByCpf(cpf)}
            disabled={searching || cpf.replace(/\D/g, "").length < 3}
            data-testid="button-search-cpf"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {searched && notFound && (
          <div className="flex items-center gap-2 pt-1">
            <p className="text-sm text-muted-foreground">Nenhum cadastro encontrado.</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-sm"
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-new-person"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Cadastrar
            </Button>
          </div>
        )}
      </div>

      <CreatePersonDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        personType={personType}
        initialCpf={cpf}
        onCreated={(person) => {
          onPersonChange(person);
          setCpf(person.document || "");
          setNotFound(false);
          setSearched(true);
          setShowCreateDialog(false);
        }}
      />
    </>
  );
}

interface CreatePersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personType: "Proprietário" | "Cliente";
  initialCpf: string;
  onCreated: (person: Person) => void;
}

function CreatePersonDialog({ open, onOpenChange, personType, initialCpf, onCreated }: CreatePersonDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState(initialCpf);
  const createPerson = useCreatePerson();

  useEffect(() => {
    if (open) {
      setDocument(initialCpf);
      setName("");
      setPhone("");
      setEmail("");
    }
  }, [open, initialCpf]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    createPerson.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      document: document.trim() || null,
      type: personType,
    }, {
      onSuccess: (person) => {
        onCreated(person);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar {personType}</DialogTitle>
          <DialogDescription>
            Preencha os dados para cadastrar um novo {personType.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              placeholder="João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-new-person-name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
                data-testid="input-new-person-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={document}
                onChange={(e) => setDocument(formatCpf(e.target.value))}
                maxLength={14}
                data-testid="input-new-person-cpf"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-new-person-email"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPerson.isPending} data-testid="button-save-new-person">
              {createPerson.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
