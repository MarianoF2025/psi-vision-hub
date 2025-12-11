'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewData {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  siteName: string;
  favicon: string;
}

interface LinkPreviewProps {
  url: string;
  isOutgoing?: boolean;
}

const previewCache = new Map<string, LinkPreviewData>();

export function LinkPreview({ url, isOutgoing = false }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      if (previewCache.has(url)) {
        setPreview(previewCache.get(url)!);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) throw new Error('Failed');

        const data = await response.json();
        previewCache.set(url, data);
        setPreview(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className={cn(
        "mt-2 rounded-lg overflow-hidden border animate-pulse",
        isOutgoing ? "border-indigo-400/30 bg-indigo-400/10" : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
      )}>
        <div className="p-3 space-y-2">
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 block rounded-lg overflow-hidden border transition-colors max-w-[280px]",
        isOutgoing 
          ? "border-indigo-400/30 bg-indigo-400/10 hover:bg-indigo-400/20" 
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
      )}
    >
      {preview.image && (
        <div className="w-full h-24 overflow-hidden bg-slate-200 dark:bg-slate-700">
          <img 
            src={preview.image} 
            alt={preview.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="p-2">
        <div className="flex items-center gap-1.5 mb-1">
          <img 
            src={preview.favicon} 
            alt="" 
            className="w-4 h-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className={cn(
            "text-[10px] uppercase tracking-wide",
            isOutgoing ? "text-indigo-200" : "text-slate-500"
          )}>
            {preview.siteName}
          </span>
          <ExternalLink size={10} className={isOutgoing ? "text-indigo-200" : "text-slate-400"} />
        </div>
        
        <p className={cn(
          "text-sm font-medium line-clamp-2",
          isOutgoing ? "text-white" : "text-slate-800 dark:text-white"
        )}>
          {preview.title}
        </p>
        
        {preview.description && (
          <p className={cn(
            "text-xs mt-1 line-clamp-2",
            isOutgoing ? "text-indigo-200" : "text-slate-500"
          )}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.match(urlRegex) || [];
}
