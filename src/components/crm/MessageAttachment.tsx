// src/components/crm/MessageAttachment.tsx
'use client'

import { useState } from 'react'
import { FileText, Download, X, Eye } from 'lucide-react'
import type { MessageAttachment } from '@/lib/supabase'

interface MessageAttachmentProps {
  attachment: MessageAttachment
  isOutgoing?: boolean
}

export default function MessageAttachment({ attachment, isOutgoing = false }: MessageAttachmentProps) {
  const [imageError, setImageError] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(attachment.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al descargar archivo:', error)
    }
  }

  // Renderizado para imágenes
  if (attachment.type === 'image' && !imageError) {
    return (
      <>
        <div className="relative group cursor-pointer" onClick={() => setShowFullImage(true)}>
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-[300px] max-h-[300px] rounded-lg object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
            <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Descargar"
          >
            <Download size={16} />
          </button>
        </div>

        {/* Modal para ver imagen completa */}
        {showFullImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full"
            >
              <X size={24} />
            </button>
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    )
  }

  // Renderizado para videos
  if (attachment.type === 'video') {
    return (
      <div className="max-w-[400px]">
        <video
          src={attachment.url}
          controls
          className="w-full rounded-lg"
        >
          Tu navegador no soporta el elemento de video.
        </video>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-600'}`}>
            {attachment.name} • {formatFileSize(attachment.size)}
          </span>
          <button
            onClick={handleDownload}
            className={`p-1 rounded hover:bg-opacity-20 ${
              isOutgoing ? 'hover:bg-white' : 'hover:bg-gray-400'
            }`}
            title="Descargar"
          >
            <Download size={14} className={isOutgoing ? 'text-blue-100' : 'text-gray-600'} />
          </button>
        </div>
      </div>
    )
  }

  // Renderizado para documentos y otros archivos
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isOutgoing 
          ? 'bg-blue-600 border-blue-400' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className={`p-2 rounded ${isOutgoing ? 'bg-blue-700' : 'bg-white'}`}>
        <FileText className={isOutgoing ? 'text-blue-100' : 'text-blue-500'} size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isOutgoing ? 'text-white' : 'text-gray-900'
        }`}>
          {attachment.name}
        </p>
        <p className={`text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <button
        onClick={handleDownload}
        className={`p-2 rounded-full transition-colors ${
          isOutgoing 
            ? 'hover:bg-blue-700 text-blue-100' 
            : 'hover:bg-gray-200 text-gray-600'
        }`}
        title="Descargar"
      >
        <Download size={18} />
      </button>
    </div>
  )
}

