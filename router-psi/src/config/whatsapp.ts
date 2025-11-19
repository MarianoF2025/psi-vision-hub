import axios from 'axios';
import { Env } from './environment';

export const whatsappClient = axios.create({
  baseURL: Env.whatsapp.baseUrl,
  headers: {
    Authorization: `Bearer ${Env.whatsapp.token}`,
    'Content-Type': 'application/json',
  },
});

export const getPhoneId = (context: 'wsp4' | 'ventas1' | 'administracion' | 'alumnos' | 'comunidad') => {
  return Env.whatsapp.phoneIds[context];
};
