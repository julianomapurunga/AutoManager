/**
 * Máscaras de entrada centralizadas.
 * Todas recebem o valor digitado e devolvem o valor formatado para exibição.
 */

/** CPF: 000.000.000-00 */
export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** CNPJ: 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** CPF ou CNPJ: alterna automaticamente conforme a quantidade de dígitos. */
export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits.length <= 11 ? formatCpf(digits) : formatCnpj(digits);
}

/** Telefone/WhatsApp: (00) 0000-0000 ou (00) 00000-0000 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Placa de veículo: aceita o padrão antigo (ABC-1234) e o Mercosul (ABC1D23).
 * Sempre em maiúsculas; o hífen é inserido automaticamente no padrão antigo.
 */
export function formatPlate(value: string): string {
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (chars.length <= 3) return chars;
  // Padrão Mercosul: 3 letras + dígito + letra + 2 dígitos (ABC1D23) — sem hífen
  const isMercosul = chars.length >= 5 && /[A-Z]/.test(chars[4]);
  if (isMercosul) return chars;
  // Padrão antigo: 3 letras + 4 dígitos → ABC-1234
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}
