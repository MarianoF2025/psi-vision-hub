// src/components/crm/FilePreview.tsx
'use client'

import { X, FileText, Image as ImageIcon, Video, File } from 'lucide-react'

export interface FileWithPreview {
  file: File
  preview?: string
  type: 'image' | 'video' | 'document' | 'other'
}

interface FilePreviewProps {
  files: FileWithPreview[]
  onRemove: (index: number) => void
}

export default function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-6 h-6 text-blue-500" />
      case 'video':
        return <Video className="w-6 h-6 text-purple-500" />
      case 'document':
        return <FileText className="w-6 h-6 text-red-500" />
      default:
        return <File className="w-6 h-6 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap gap-2">
        {files.map((fileData, index) => (
          <div
            key={index}
            className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden"
            style={{ width: '120px', height: '120px' }}
          >
            {/* Botón de eliminar */}
            <button
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <X size={14} />
            </button>

            {/* Preview del archivo */}
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              {fileData.type === 'image' && fileData.preview ? (
                <img
                  src={fileData.preview}
                  alt={fileData.file.name}
                  className="w-full h-full object-cover"
                />
              ) : fileData.type === 'video' && fileData.preview ? (
                <video
                  src={fileData.preview}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  {getFileIcon(fileData.type)}
                  <p className="text-xs text-gray-600 mt-2 text-center truncate w-full px-1">
                    {fileData.file.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatFileSize(fileData.file.size)}
                  </p>
                </div>
              )}
            </div>

            {/* Nombre y tamaño para imágenes */}
            {(fileData.type === 'image' || fileData.type === 'video') && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs truncate">{fileData.file.name}</p>
                <p className="text-xs">{formatFileSize(fileData.file.size)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}




