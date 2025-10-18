// src/components/crm/AIAssistant.tsx
'use client'

import { useState, useCallback } from 'react'
import { X, Sparkles, Send, Loader2 } from 'lucide-react'

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  onInsertText: (text: string) => void
  currentMessage?: string
}

export default function AIAssistant({ isOpen, onClose, onInsertText, currentMessage }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')

  const aiSuggestions = [
    { label: '✨ Mejorar redacción', prompt: 'Mejora la redacción de este mensaje: ' },
    { label: '🎯 Hacer más profesional', prompt: 'Haz este mensaje más profesional: ' },
    { label: '😊 Hacer más amigable', prompt: 'Haz este mensaje más amigable y cercano: ' },
    { label: '📝 Resumir', prompt: 'Resume este mensaje: ' },
    { label: '🔄 Reformular', prompt: 'Reformula este mensaje de otra manera: ' },
    { label: '🌐 Traducir al inglés', prompt: 'Traduce este mensaje al inglés: ' },
  ]

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    
    // Simular generación de texto con IA
    // En producción, aquí iría la llamada real a la API de IA
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const fullPrompt = prompt + (currentMessage || '')
    
    // Simulación de respuesta
    const responses: Record<string, string> = {
      'Mejora': `Estimado cliente,\n\nGracias por contactarnos. Estamos trabajando en su solicitud y le responderemos a la brevedad.\n\nSaludos cordiales,\nEquipo de PSI Vision Hub`,
      'profesional': `Estimado/a,\n\nGracias por ponerse en contacto con nosotros. Hemos recibido su mensaje y nuestro equipo está revisando su solicitud.\n\nNos comunicaremos con usted a la mayor brevedad posible.\n\nAtentamente,\nPSI Vision Hub`,
      'amigable': `¡Hola! 😊\n\n¡Muchas gracias por escribirnos! Ya recibimos tu mensaje y estamos trabajando en ello.\n\n¡Te responderemos muy pronto!\n\nUn abrazo,\nEquipo PSI`,
      'Resume': currentMessage ? currentMessage.split(' ').slice(0, 10).join(' ') + '...' : 'Resumen del mensaje',
      'Reformula': currentMessage || 'Mensaje reformulado con palabras diferentes pero el mismo significado.',
      'Traduce': `Hello,\n\nThank you for contacting us. We have received your message and our team is reviewing your request.\n\nBest regards,\nPSI Vision Hub Team`
    }
    
    // Buscar respuesta simulada
    let response = ''
    for (const [key, value] of Object.entries(responses)) {
      if (fullPrompt.includes(key)) {
        response = value
        break
      }
    }
    
    if (!response) {
      response = `Texto generado por IA basado en: "${fullPrompt}"\n\nEste es un ejemplo de cómo la IA puede ayudarte a mejorar tus mensajes. En producción, aquí se mostraría el texto generado por un modelo de IA real.`
    }
    
    setGeneratedText(response)
    setIsGenerating(false)
  }, [prompt, currentMessage])

  const handleInsert = useCallback(() => {
    onInsertText(generatedText)
    setGeneratedText('')
    setPrompt('')
    onClose()
  }, [generatedText, onInsertText, onClose])

  const handleUseSuggestion = useCallback((suggestion: string) => {
    setPrompt(suggestion)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-blue-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Asistencia AI</h2>
            <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Sugerencias rápidas */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">✨ Sugerencias rápidas:</h3>
            <div className="grid grid-cols-2 gap-2">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleUseSuggestion(suggestion.prompt)}
                  className="text-left p-2 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje actual */}
          {currentMessage && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-1">📝 Mensaje actual:</h3>
              <p className="text-sm text-gray-600">{currentMessage}</p>
            </div>
          )}

          {/* Input para prompt personalizado */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              🎯 ¿Qué quieres que haga la IA?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Mejora la redacción de este mensaje, Hazlo más formal, etc."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={3}
            />
          </div>

          {/* Botón generar */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generar con IA
              </>
            )}
          </button>

          {/* Texto generado */}
          {generatedText && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Texto generado:
              </h3>
              <div className="bg-white rounded p-3 mb-3 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{generatedText}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInsert}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Insertar en mensaje
                </button>
                <button
                  onClick={() => setGeneratedText('')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            💡 La IA te ayuda a mejorar tus mensajes de forma profesional y rápida
          </p>
        </div>
      </div>
    </div>
  )
}


