/**
 * Generador de ticket_id en formato YYYYMMDD-HHMMSS-XXXX
 */
export function generarTicketId(): string {
  const now = new Date();
  
  // YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  
  // HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timePart = `${hours}${minutes}${seconds}`;
  
  // XXXX - 4 caracteres aleatorios alfanuméricos
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, '0');
  
  return `${datePart}-${timePart}-${randomPart}`;
}







