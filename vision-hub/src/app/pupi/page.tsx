'use client';

import { useState } from 'react';
import { Bot, Send, Sparkles, Lightbulb, TrendingUp, Users, Loader2 } from 'lucide-react';

export default function PupiPage() {
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState<{rol: 'user' | 'pupi', texto: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const sugerencias = [
    { icon: TrendingUp, text: '¿Cómo está el CPL hoy?' },
    { icon: Users, text: '¿Cuántos leads entraron?' },
    { icon: Lightbulb, text: 'Dame el resumen del día' },
  ];

  const handleEnviar = () => {
    if (!mensaje.trim()) return;
    
    setConversacion([...conversacion, { rol: 'user', texto: mensaje }]);
    setMensaje('');
    setIsTyping(true);
    
    // Simular respuesta
    setTimeout(() => {
      setConversacion(prev => [...prev, { 
        rol: 'pupi', 
        texto: '¡Hola! Soy Pupi, tu asistente de BI. Todavía estoy en desarrollo, pero pronto podré ayudarte con consultas sobre métricas, alertas y recomendaciones. 🚀' 
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSugerencia = (texto: string) => {
    setMensaje(texto);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Header simple para Pupi */}
      <div className="bg-white border-b border-gray-200 sticky top-12 lg:top-0 z-20 px-3 sm:px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Pupi</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Asistente IA de PSI Vision Hub
            </p>
          </div>
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        {conversacion.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#e63946]/10 to-[#c1121f]/10 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-[#e63946]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">¡Hola! Soy Pupi</h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-6">
              Tu asistente inteligente para consultar métricas, recibir alertas y obtener recomendaciones.
            </p>
            
            <div className="w-full max-w-sm space-y-2">
              <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Prueba preguntar</p>
              {sugerencias.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSugerencia(s.text)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-[#e63946] hover:bg-red-50/50 transition-all text-left"
                >
                  <s.icon className="w-4 h-4 text-[#e63946] flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            {conversacion.map((msg, i) => (
              <div key={i} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                  msg.rol === 'user' 
                    ? 'bg-[#e63946] text-white rounded-br-md' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}>
                  <p className="text-xs sm:text-sm">{msg.texto}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
            placeholder="Preguntale a Pupi..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e63946]/20 focus:border-[#e63946]"
          />
          <button
            onClick={handleEnviar}
            disabled={!mensaje.trim()}
            className="p-2 sm:p-3 bg-[#e63946] text-white rounded-xl hover:bg-[#c1121f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
