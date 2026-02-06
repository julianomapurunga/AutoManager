import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  "Disponível": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  "Vendido": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  "Em Manutenção": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  "Aguardando Preparação": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  "Reservado": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  "data-testid"?: string;
}

export function StatusBadge({ status, className, "data-testid": testId }: StatusBadgeProps) {
  const styles = statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm whitespace-nowrap",
        styles,
        className
      )}
      data-testid={testId}
    >
      {status}
    </span>
  );
}
