// Validación de identificadores fiscales españoles: NIF, NIE y CIF.
// Sin dependencias externas. Todas las funciones normalizan mayúsculas.

const LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

function normalize(s: string): string {
  return (s ?? "").toString().trim().toUpperCase().replace(/[\s-]/g, "");
}

export function validateNIF(s: string): boolean {
  const v = normalize(s);
  if (!/^[0-9]{8}[A-Z]$/.test(v)) return false;
  const num = parseInt(v.slice(0, 8), 10);
  const expected = LETTERS.charAt(num % 23);
  return expected === v.charAt(8);
}

export function validateNIE(s: string): boolean {
  const v = normalize(s);
  if (!/^[XYZ][0-9]{7}[A-Z]$/.test(v)) return false;
  const prefixMap: Record<string, string> = { X: "0", Y: "1", Z: "2" };
  const prefix = prefixMap[v.charAt(0)] ?? "0";
  const num = parseInt(prefix + v.slice(1, 8), 10);
  const expected = LETTERS.charAt(num % 23);
  return expected === v.charAt(8);
}

export function validateCIF(s: string): boolean {
  const v = normalize(s);
  if (!/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(v)) return false;

  const digits = v.slice(1, 8);
  const control = v.charAt(8);

  let sumEven = 0;
  let sumOdd = 0;

  for (let i = 0; i < 7; i++) {
    const n = parseInt(digits.charAt(i), 10);
    if ((i + 1) % 2 === 0) {
      // posición par (2, 4, 6)
      sumEven += n;
    } else {
      // posición impar (1, 3, 5, 7) se duplica y se suman dígitos
      const doubled = n * 2;
      sumOdd += Math.floor(doubled / 10) + (doubled % 10);
    }
  }

  const total = sumEven + sumOdd;
  const controlDigit = (10 - (total % 10)) % 10;
  const controlLetter = "JABCDEFGHI".charAt(controlDigit);

  // Algunas letras iniciales requieren letra como control, otras dígito,
  // y otras admiten ambos. Aceptamos cualquiera de las dos formas válidas.
  const firstLetter = v.charAt(0);
  const onlyLetter = ["K", "P", "Q", "S", "N", "W"].includes(firstLetter);
  const onlyDigit = ["A", "B", "E", "H"].includes(firstLetter);

  if (onlyLetter) return control === controlLetter;
  if (onlyDigit) return control === controlDigit.toString();
  return control === controlLetter || control === controlDigit.toString();
}

export function validateSpanishTaxId(s: string): boolean {
  if (!s) return false;
  return validateNIF(s) || validateNIE(s) || validateCIF(s);
}
