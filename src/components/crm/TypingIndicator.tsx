// src/components/crm/TypingIndicator.tsx
'use client'

interface TypingIndicatorProps {
  userName?: string
}

export default function TypingIndicator({ userName = 'Usuario' }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-t border-blue-100 animate-fade-in">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-xs text-blue-600 font-medium">
        {userName} está escribiendo...
      </span>
    </div>
  )
}


