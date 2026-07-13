/** Valida CPF pelos dígitos verificadores (aceita com ou sem máscara). */
export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const digits = cpf.split("").map(Number);

  const calc = (count: number) => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += digits[i] * (count + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calc(9) === digits[9] && calc(10) === digits[10];
}
