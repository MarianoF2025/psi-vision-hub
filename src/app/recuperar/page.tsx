'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RecuperarPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await resetPassword(email);

    if (error) {
      setError(error);
    } else {
      setEnviado(true);
    }
    setLoading(false);
  };

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Email enviado</h2>
            <p className="text-slate-400 mb-6">
              Revisa tu bandeja de entrada en <strong className="text-white">{email}</strong>.
              Te enviamos un link para restablecer tu contraseña.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Si no lo ves, revisa tu carpeta de spam.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={18} />
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            PSI
          </div>
          <h1 className="text-2xl font-bold text-white">Vision Hub</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-300 text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>

          <h2 className="text-xl font-semibold text-white mb-2">Recuperar contraseña</h2>
          <p className="text-slate-400 text-sm mb-6">
            Ingresa tu email y te enviaremos un link para restablecer tu contraseña.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full mt-6 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              loading
                ? 'bg-indigo-500/50 text-indigo-200 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/30'
            )}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar link de recuperacion'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
