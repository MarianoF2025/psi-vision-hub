'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

export default function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-300 hover:text-gray-500 transition-colors ml-1.5"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-2.5 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl z-50">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          {text}
        </div>
      )}
    </span>
  );
}
