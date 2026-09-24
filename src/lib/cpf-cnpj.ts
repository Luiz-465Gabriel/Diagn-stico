export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function validarCpf(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const nums = d.split("").map(Number);
  const dv = (base: number[]) => {
    const soma = base.reduce((acc, n, i) => acc + n * (base.length + 1 - i), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = dv(nums.slice(0, 9));
  const d2 = dv([...nums.slice(0, 9), d1]);
  return d1 === nums[9] && d2 === nums[10];
}

export function validarCnpj(cnpj: string): boolean {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const nums = d.split("").map(Number);
  const calc = (base: number[], pesos: number[]) => {
    const soma = base.reduce((acc, n, i) => acc + n * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(nums.slice(0, 12), p1);
  const d2 = calc([...nums.slice(0, 12), d1], p2);
  return d1 === nums[12] && d2 === nums[13];
}

export function validarCpfCnpj(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length === 11) return validarCpf(d);
  if (d.length === 14) return validarCnpj(d);
  return false;
}

export function formatarCpfCnpj(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function telefoneValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  return d.length === 10 || d.length === 11;
}
