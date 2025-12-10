import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PSIBot/1.0)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: 'No se pudo obtener la página' }, { status: 400 });
    }

    const html = await response.text();

    const getMetaContent = (property: string): string | null => {
      const ogProp = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
      const ogProp2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
      const nameProp = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
      const nameProp2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i');
      
      const patterns = [ogProp, ogProp2, nameProp, nameProp2];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleTag = titleTagMatch ? titleTagMatch[1].trim() : null;

    const preview = {
      url: url,
      title: getMetaContent('og:title') || getMetaContent('twitter:title') || titleTag || parsedUrl.hostname,
      description: getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description') || null,
      image: getMetaContent('og:image') || getMetaContent('twitter:image') || null,
      siteName: getMetaContent('og:site_name') || parsedUrl.hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`,
    };

    if (preview.image && !preview.image.startsWith('http')) {
      preview.image = new URL(preview.image, url).href;
    }

    return NextResponse.json(preview);

  } catch (error) {
    console.error('Error obteniendo link preview:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
