// src/app/crm/components/Header.tsx
'use client'

export function Header() {
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">PSI Vision Hub</h1>
        <span className="text-sm text-gray-500">CRM-COM v2.1</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Usuario:</span> Admin
        </div>
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">A</span>
        </div>
      </div>
    </div>
  )
}
