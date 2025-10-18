// src/components/crm/EmojiPicker.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { EmojiClickData } from 'emoji-picker-react'

// Importar EmojiPicker dinámicamente para evitar problemas de SSR
const Picker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
)

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Cerrar el picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji)
    setShowPicker(false)
  }

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Emoji"
      >
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <Picker
            onEmojiClick={handleEmojiClick}
            width={350}
            height={400}
            searchPlaceHolder="Buscar emojis..."
            previewConfig={{
              showPreview: false
            }}
          />
        </div>
      )}
    </div>
  )
}


