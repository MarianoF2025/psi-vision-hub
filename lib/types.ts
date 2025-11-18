export type UserRole = 'admin' | 'developer' | 'staff' | 'alumno';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

