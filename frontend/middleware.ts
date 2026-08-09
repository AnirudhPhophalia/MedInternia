import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Naya import

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // Agar token exist hi nahi karta
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      console.error('JWT_SECRET is not configured');
      return new NextResponse('Internal Server Error', { status: 500 });
    }
    const secret = new TextEncoder().encode(secretKey);

    // Jose library se token ka signature aur expiry verify karo
    await jwtVerify(token, secret);

    // Agar token ekdum sahi hai, toh aage jane do
    return NextResponse.next();
  } catch (error) {
    console.error('Invalid ya expired token:', error);
    
    // Agar token fake ya expired hai, toh us cookie ko delete karke login pe bhej do
    const response = NextResponse.redirect(new URL('//auth/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

// Ye define karta hai ki kin routes par security lagani hai
export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/cases/create'],
};