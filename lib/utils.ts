import { type ClassValue, clsx } from 'clsx';
import { UserRole } from './types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function hasAdminAccess(role?: UserRole): boolean {
  return role === 'admin' || role === 'developer';
}

