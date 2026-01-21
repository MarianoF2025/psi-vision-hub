'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Mensaje {
  id: string;
  rol: 'user' | 'assistant';
  contenido: string;
  timestamp: Date;
}

interface SugerenciaRapida {
  texto: string;
  icono: React.ElementType;
}

// ============================================
// DATOS
// ============================================

const sugerenciasRapidas: SugerenciaRapida[] = [
  { texto: '¿Cómo están las ventas este mes?', icono: TrendingUp },
  { texto: '¿Qué cursos tienen más abandono?', icono: AlertTriangle },
  { texto: 'Dame un resumen del día', icono: BarChart3 },
  { texto: '¿Qué acciones me recomendás?', icono: Lightbulb },
];

const respuestasMock: Record<string, string> = {
  'ventas': `📊 **Resumen de Ventas - Enero 2025**

- **Leads totales:** 456 (+12% vs mes anterior)
- **Tasa de conversión:** 14.7%
- **TTF promedio:** 12 minutos
- **Ingresos:** $5.7M

**Top performer:** Sofía García con 17.9% de conversión

⚠️ **Atención:** 12 leads llevan +24hs sin contactar. Recomiendo asignarlos urgente.`,

  'abandono': `📉 **Análisis de Abandono por Curso**

Los cursos con mayor tasa de abandono son:

1. **Biodescodificación:** 61% (muy alto)
2. **Trauma y Disociación:** 58%
3. **Neurociencias:** 55%

El promedio general es 54%.

💡 **Recomendación:** Implementar seguimiento proactivo en las primeras 3 cuotas. Esto reduce abandono hasta 25% según datos históricos.`,

  'resumen': `☀️ **Buenos días! Resumen del día**

**🟢 Positivo:**
- Ingresos +18% vs mismo día mes anterior
- 3 inscripciones nuevas en AT
- Sofía cerró 2 ventas esta mañana

**🟡 Atención:**
- 12 leads sin contactar (+24hs)
- $890K en cobros vencidos
- Workshop de mañana al 90% capacidad

**🔴 Urgente:**
- Campaña AT con frecuencia 4.2 (fatiga de audiencia)

¿Querés que profundice en algún tema?`,

  'acciones': `🎯 **Acciones Recomendadas para Hoy**

**Prioridad Alta:**
1. Asignar los 12 leads pendientes a vendedoras
2. Contactar a los 5 morosos críticos (+$890K)
3. Pausar o ampliar audiencia de campaña AT

**Prioridad Media:**
4. Revisar contenido de Biodescodificación (61% abandono)
5. Enviar recordatorio del workshop de mañana
6. Preparar reporte semanal para Nina

**Quick wins:**
7. Felicitar a Sofía por su performance
8. Compartir el video de regulación emocional (1250 vistas)

¿Empezamos por alguna?`,

  'default': `Entiendo tu consulta. Basándome en los datos actuales del sistema:

📊 **Datos relevantes:**
- Tenemos 31,206 inscripciones históricas
- 4,850 miembros en la comunidad
- 456 leads activos en el pipeline

¿Podrías ser más específico sobre qué información necesitás? Puedo ayudarte con:
- Métricas de ventas y conversión
- Análisis de retención de alumnos
- Performance de campañas
- Cobros y facturación
- Engagement de la comunidad`
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PupiPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: '1',
      rol: 'assistant',
      contenido: `¡Hola! 👋 Soy **Pupi**, tu asistente de inteligencia de negocios.

Puedo ayudarte a:
- Analizar métricas de todas las áreas
- Detectar problemas y oportunidades
- Sugerir acciones basadas en datos
- Responder preguntas sobre el negocio

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  const enviarMensaje = async (texto: string) => {
    if (!texto.trim()) return;

    const mensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      rol: 'user',
      contenido: texto,
      timestamp: new Date()
    };

    setMensajes(prev => [...prev, mensajeUsuario]);
    setInput('');
    setIsTyping(true);

    // Simular delay de respuesta
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determinar respuesta
    let respuesta = respuestasMock.default;
    const textoLower = texto.toLowerCase();
    
    if (textoLower.includes('venta') || textoLower.includes('lead') || textoLower.includes('conversión')) {
      respuesta = respuestasMock.ventas;
    } else if (textoLower.includes('abandono') || textoLower.includes('retención') || textoLower.includes('baja')) {
      respuesta = respuestasMock.abandono;
    } else if (textoLower.includes('resumen') || textoLower.includes('día') || textoLower.includes('hoy')) {
      respuesta = respuestasMock.resumen;
    } else if (textoLower.includes('accion') || textoLower.includes('recomend') || textoLower.includes('hacer')) {
      respuesta = respuestasMock.acciones;
    }

    const mensajeAsistente: Mensaje = {
      id: (Date.now() + 1).toString(),
      rol: 'assistant',
      contenido: respuesta,
      timestamp: new Date()
    };

    setMensajes(prev => [...prev, mensajeAsistente]);
    setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarMensaje(input);
  };

  const handleSugerencia = (texto: string) => {
    enviarMensaje(texto);
  };

  const copiarMensaje = (id: string, contenido: string) => {
    navigator.clipboard.writeText(contenido);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const limpiarChat = () => {
    setMensajes([{
      id: '1',
      rol: 'assistant',
      contenido: `¡Chat reiniciado! 🔄

¿En qué puedo ayudarte?`,
      timestamp: new Date()
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Pupi</h1>
              <p className="text-[10px] text-gray-500">Asistente IA de PSI Vision Hub</p>
            </div>
          </div>
          <button
            onClick={limpiarChat}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Limpiar chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {mensajes.map((mensaje) => (
            <div
              key={mensaje.id}
              className={`flex gap-3 ${mensaje.rol === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {mensaje.rol === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  mensaje.rol === 'user'
                    ? 'bg-[#e63946] text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <div 
                  className={`text-sm whitespace-pre-wrap ${mensaje.rol === 'assistant' ? 'prose prose-sm max-w-none' : ''}`}
                  dangerouslySetInnerHTML={{ 
                    __html: mensaje.contenido
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br>')
                  }}
                />
                
                {mensaje.rol === 'assistant' && (
                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => copiarMensaje(mensaje.id, mensaje.contenido)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      {copiedId === mensaje.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {mensaje.rol === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sugerencias rápidas */}
      {mensajes.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-[10px] text-gray-500 uppercase font-medium mb-2">Sugerencias</p>
            <div className="flex flex-wrap gap-2">
              {sugerenciasRapidas.map((sugerencia, index) => (
                <button
                  key={index}
                  onClick={() => handleSugerencia(sugerencia.texto)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 hover:border-[#e63946] hover:text-[#e63946] transition-colors"
                >
                  <sugerencia.icono className="w-3.5 h-3.5" />
                  {sugerencia.texto}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntale algo a Pupi..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e63946] focus:border-transparent"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-4 py-3 bg-[#e63946] text-white rounded-xl hover:bg-[#c1121f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Pupi analiza datos en tiempo real de todas las áreas de PSI
          </p>
        </form>
      </div>
    </div>
  );
}
