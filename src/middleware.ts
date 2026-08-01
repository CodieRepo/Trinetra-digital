import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and public API routes bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api/public') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check auth session cookie
  const authCookie = request.cookies.get('trinetra-session') || request.cookies.get('sb-access-token');

  // Protected routes require authentication
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/pos') || pathname.startsWith('/kds');
  const isAuthRoute = pathname === '/login';

  if (isProtectedRoute && !authCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && authCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
