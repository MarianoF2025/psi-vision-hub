// src/components/crm/DragDropZone.tsx
'use client'

import { useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import type { FileWithPreview } from './FilePreview'

interface DragDropZoneProps {
  onFilesDropped: (files: FileWithPreview[]) => void
  children: React.ReactNode
}

export default function DragDropZone({ onFilesDropped, children }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [, setDragCounter] = useState(0)

  // Tipos de archivos permitidos
  const allowedTypes = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
  }

  const allAllowedTypes = [
    ...allowedTypes.images,
    ...allowedTypes.videos,
    ...allowedTypes.documents
  ]

  const getFileType = (mimeType: string): 'image' | 'video' | 'document' | 'other' => {
    if (allowedTypes.images.includes(mimeType)) return 'image'
    if (allowedTypes.videos.includes(mimeType)) return 'video'
    if (allowedTypes.documents.includes(mimeType)) return 'document'
    return 'other'
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragging(false)
      }
      return newCounter
    })
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const filesWithPreview: FileWithPreview[] = []

    for (const file of filesArray) {
      // Validar tipo de archivo
      if (!allAllowedTypes.includes(file.type)) {
        console.warn(`Tipo de archivo no permitido: ${file.name}`)
        continue
      }

      // Validar tamaño (máximo 25MB)
      if (file.size > 25 * 1024 * 1024) {
        console.warn(`El archivo ${file.name} es demasiado grande (máximo 25MB)`)
        continue
      }

      const fileType = getFileType(file.type)
      let preview: string | undefined

      // Crear preview para imágenes y videos
      if (fileType === 'image' || fileType === 'video') {
        preview = URL.createObjectURL(file)
      }

      filesWithPreview.push({
        file,
        preview,
        type: fileType
      })
    }

    if (filesWithPreview.length > 0) {
      onFilesDropped(filesWithPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilesDropped])

  return (
    <div
      className="relative w-full h-full"
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {children}
      
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-90 flex flex-col items-center justify-center z-50 pointer-events-none">
          <Upload className="w-16 h-16 text-white mb-4" />
          <p className="text-white text-xl font-semibold">Suelta los archivos aquí</p>
          <p className="text-white text-sm mt-2">Imágenes, videos y documentos</p>
        </div>
      )}
    </div>
  )
}

