import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@/lib/auth-types';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/access-denied', '/forgot-password', '/reset-password', '/contact', '/become-instructor', '/auth/callback', '/api/auth/forgot-password', '/api/auth/reset-password'];

const PREFIX_PUBLIC_ROUTES = ['/verify'];

const ROLE_PREFIXES: Record<string, Role> = {
  '/learner': 'learner',
  '/educator': 'educator',
  '/admin': 'admin',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname) || PREFIX_PUBLIC_ROUTES.some((p) => pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const role = (user.user_metadata?.role as Role) || 'learner';

  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      if (role === 'admin') continue;
      if (role !== requiredRole) {
        const url = request.nextUrl.clone();
        url.pathname = '/access-denied';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
