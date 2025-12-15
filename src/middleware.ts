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

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  console.log('🔐 Middleware:', pathname, 'User:', user?.email || 'null');

  const isProtectedPage = pathname.startsWith('/crm');
  const isAuthPage = pathname === '/login' || pathname === '/recuperar';

  if (!user && isProtectedPage) {
    console.log('🚫 No user, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    console.log('✅ User logged in, redirecting to home');
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/crm/:path*', '/login', '/recuperar', '/reset-password'],
};
