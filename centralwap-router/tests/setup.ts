/**
 * Setup global para tests
 */

// Configurar variables de entorno de prueba si no existen
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://test.evolution.api';
process.env.EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'test-api-key';
process.env.EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'test-instance';

// Timeout global para tests
jest.setTimeout(30000);




