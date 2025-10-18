// src/components/crm/FileUploadButton.tsx
'use client'

import { useRef } from 'react'
import { Paperclip } from 'lucide-react'
import type { FileWithPreview } from './FilePreview'

interface FileUploadButtonProps {
  onFilesSelected: (files: FileWithPreview[]) => void
  disabled?: boolean
}

export default function FileUploadButton({ onFilesSelected, disabled }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const filesWithPreview: FileWithPreview[] = []

    for (const file of filesArray) {
      // Validar tipo de archivo
      if (!allAllowedTypes.includes(file.type)) {
        alert(`Tipo de archivo no permitido: ${file.name}`)
        continue
      }

      // Validar tamaño (máximo 25MB)
      if (file.size > 25 * 1024 * 1024) {
        alert(`El archivo ${file.name} es demasiado grande (máximo 25MB)`)
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
      onFilesSelected(filesWithPreview)
    }

    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allAllowedTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Adjuntar"
      >
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
    </>
  )
}


