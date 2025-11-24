/**
 * Utilidades de validación
 */

/**
 * Validar formato de teléfono argentino
 */
export function validarTelefonoArgentina(telefono: string): boolean {
  // Remover espacios y caracteres especiales
  const cleaned = telefono.replace(/[\s\-\(\)]/g, '');

  // Debe empezar con +54 y tener 11-13 dígitos adicionales
  const regex = /^\+549\d{8,10}$/;
  return regex.test(cleaned);
}

/**
 * Normalizar teléfono argentino a formato E.164
 */
export function normalizarTelefonoArgentina(telefono: string): string | null {
  // Limpiar espacios, guiones, paréntesis
  let cleaned = telefono.replace(/[\s\-\(\)]/g, '');

  // Si ya tiene +, verificar que empiece con +54
  if (cleaned.startsWith('+')) {
    if (!cleaned.startsWith('+54')) {
      return null;
    }
    return cleaned;
  }

  // Si empieza con 54, agregar +
  if (cleaned.startsWith('54')) {
    return '+' + cleaned;
  }

  // Si empieza con 9 (celular argentino sin código país)
  if (cleaned.startsWith('9') && cleaned.length >= 10) {
    return '+54' + cleaned;
  }

  // Si es un número local (10 dígitos sin 9 inicial)
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    // Asumir que es celular y agregar 9 + código país
    return '+549' + cleaned;
  }

  // Si tiene 11-13 dígitos sin código, asumir que incluye el 9
  if (cleaned.length >= 11 && cleaned.length <= 13 && /^\d+$/.test(cleaned)) {
    return '+54' + cleaned;
  }

  return null;
}




