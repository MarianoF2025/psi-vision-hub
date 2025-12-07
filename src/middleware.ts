import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión y está intentando acceder a /crm, redirigir a login
  if (!session && request.nextUrl.pathname.startsWith('/crm')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay sesión y está en login, redirigir a /crm
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/crm', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/crm/:path*', '/login'],
};
