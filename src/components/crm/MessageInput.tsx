"use client"

import { useRef, useEffect } from "react"

interface MessageInputProps {
  messageText: string
  onMessageChange: (text: string) => void
  onSendMessage: () => void
  attachedFiles: File[]
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (index: number) => void
  disabled?: boolean
}

export default function MessageInput({
  messageText,
  onMessageChange,
  onSendMessage,
  attachedFiles,
  onFilesSelected,
  onRemoveFile,
  disabled = false
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [messageText])

  // Handler para teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  // Handler para archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  // Handler para emoji
  const handleEmojiSelect = (emoji: string) => {
    onMessageChange(messageText + emoji)
  }

  return (
    <div className="space-y-3">
      {/* Preview de archivos adjuntos */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                onClick={() => onRemoveFile(index)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input principal - EXACTO de Chatwoot */}
      <div className="flex items-end gap-3">
        {/* Botones izquierda */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        
        <button 
          onClick={() => handleEmojiSelect('😊')}
          disabled={disabled}
          className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          disabled={disabled}
          className="min-h-[40px] max-h-[120px] resize-none flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
        />
        
        {/* Botón enviar */}
        <button 
          onClick={onSendMessage}
          disabled={disabled || (!messageText.trim() && attachedFiles.length === 0)}
          className="h-9 w-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Input oculto para archivos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  )
}

