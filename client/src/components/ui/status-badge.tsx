import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  "Disponível": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Vendido": "bg-blue-100 text-blue-700 border-blue-200",
  "Em Manutenção": "bg-amber-100 text-amber-700 border-amber-200",
  "Aguardando Preparação": "bg-slate-100 text-slate-700 border-slate-200",
  "Reservado": "bg-purple-100 text-purple-700 border-purple-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const styles = statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm whitespace-nowrap",
        styles,
        className
      )}
    >
      {status}
    </span>
  );
}
