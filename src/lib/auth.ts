export type AuthUser = { id: string; email: string } | null;

const STORAGE_KEY = "psi-auth-user";

export function getStoredUser(): AuthUser {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  // Simulación de login: acepta cualquier email con password >= 4 chars
  await new Promise((r) => setTimeout(r, 400));
  if (!email || password.length < 4) throw new Error("Credenciales inválidas");
  const user = { id: "u_1", email };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Reserva: recuperación de contraseña se añadirá más adelante


