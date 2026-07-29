import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_ROUTES = ['/dashboard', '/profile', '/cases/create', '/certificates/create'];
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

const getJwtSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || '';
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // For protected routes: verify the token signature and expiry
  if (isProtected) {
    if (!token || !(await verifyToken(token))) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // For auth routes (login/register): redirect to dashboard if already authenticated
  if (isAuthRoute && token && (await verifyToken(token))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/auth/:path*', '/cases/create', '/certificates/create'],
};
